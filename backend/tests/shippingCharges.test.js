import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeliveryCharges, getEnviaLabelCharge, getOrderProductBalance, getVolumetricWeight } from '../../shared/shipping/deliveryCharges.js';
import { calculateShippingCharge as backendEstimate } from '../utils/storeSettingsHelpers.js';
import { calculateShippingCharge as adminEstimate } from '../../admin/src/utils/orderSettings.js';
import { calculateShippingCharge as storefrontEstimate } from '../../frontend/src/utils/orderSettings.js';
import { calculatePayableAmount as backendPayable } from '../utils/paymentHelpers.js';
import { calculatePayableAmount as storefrontPayable } from '../../frontend/src/utils/payment.js';
import Order from '../models/order/Order.js';

test('₹10,000 order: ₹1,000 advance, ₹9,000 COD principal, label charge + ₹225', () => {
  const charges = calculateDeliveryCharges({ baseShippingCharge: 300, orderValue: 10000 });
  assert.deepEqual(charges, { baseShippingCharge: 300, codBalance: 9000, codFee: 225, deliveryCharges: 525 });
  for (const payable of [backendPayable, storefrontPayable]) {
    assert.equal(payable(10525, 'cod_advance'), 1052.5);
    assert.equal(payable(10525, 'online'), 10525);
  }
});

test('backend, admin and storefront estimates ignore old slabs and agree for COD/prepaid/zero base', () => {
  for (const calculate of [backendEstimate, adminEstimate, storefrontEstimate]) {
    const settings = { minimumShippingCharge: 280, shippingSlabs: [{ orderAmount: 0, shippingCharge: 800 }] };
    assert.equal(calculate(10000, settings), 505);
    assert.equal(calculate(10000, settings, { isCod: false }), 280);
    assert.equal(calculate(10000, { minimumShippingCharge: 0 }), 225);
    assert.equal(calculate(0, settings), 280);
  }
});

test('final charge uses recorded advance and discounted merchandise without charging fee on delivery', () => {
  const order = { subtotal: 10000, couponDiscount: 500, walletDiscount: 500, total: 9505, deliveryCharges: 505 };
  const charges = calculateDeliveryCharges({ baseShippingCharge: 320, orderValue: getOrderProductBalance(order), advanceAmount: 1000 });
  assert.equal(charges.codBalance, 8000);
  assert.equal(charges.codFee, 200);
  assert.equal(charges.deliveryCharges, 520);
  assert.equal(calculateDeliveryCharges({ orderValue: 10000, advanceAmount: 0 }).codFee, 250);
  assert.equal(calculateDeliveryCharges({ orderValue: 10000, advanceAmount: 11000 }).codFee, 0);
  assert.equal(calculateDeliveryCharges({ baseShippingCharge: 320, orderValue: 10000, isCod: false }).deliveryCharges, 320);
});

test('Envia missing/invalid cost stays unknown; zero and decimal charges remain valid', () => {
  for (const totalPrice of [undefined, null, '', 'invalid', -1, Infinity]) {
    assert.equal(getEnviaLabelCharge({ totalPrice }), null);
  }
  assert.equal(getEnviaLabelCharge({ totalPrice: '125.50' }), 125.5);
  assert.equal(getEnviaLabelCharge({ totalPrice: 0 }), 0);
});

test('volumetric weight uses centimetres and stays blank until dimensions are valid', () => {
  assert.equal(getVolumetricWeight({ length: 50, width: 40, height: 30 }), 12);
  assert.equal(getVolumetricWeight({ length: '10', width: '10', height: '10' }), 0.2);
  for (const height of ['', 0, -1, 'invalid']) {
    assert.equal(getVolumetricWeight({ length: 50, width: 40, height }), null);
  }
});

test('shipment schema preserves label cost, COD breakdown, collection and volumetric weight', () => {
  const shipment = { baseShippingCharge: 300, codFee: 225, codBalance: 9000, codCollectAmount: 9525, volumetricWeight: 12 };
  const saved = new Order({ shipment }).toObject().shipment;
  for (const [key, value] of Object.entries(shipment)) assert.equal(saved[key], value);
});

// Exercise the checkout pricing path with local database stand-ins; no payments or carrier calls.
import { computeOrderPricing } from '../utils/orderHelpers.js';
import StoreSettings from '../models/StoreSettings.js';
import Wallet from '../models/wallet/Wallet.js';
import { clearStoreSettingsCache } from '../utils/storeSettingsHelpers.js';

test('checkout pricing applies the lower COD fee after wallet redemption and caps full redemption', async (t) => {
  t.mock.method(StoreSettings, 'findOne', async () => ({ minimumShippingCharge: 280, walletSettings: { enabled: true } }));
  t.mock.method(Wallet, 'findOne', async () => ({ pointsBalance: 20000 }));
  clearStoreSettingsCache();
  t.after(clearStoreSettingsCache);
  const partial = await computeOrderPricing(10000, '', { userId: 'test', useWalletPoints: true, walletPoints: 1000, paymentMode: 'cod_advance' });
  assert.equal(partial.walletDiscount, 1000);
  assert.equal(partial.deliveryCharges, 482.5);
  assert.equal(partial.total, 9482.5);
  assert.equal(backendPayable(partial.total, 'cod_advance'), 948.25);
  const full = await computeOrderPricing(10000, '', { userId: 'test', useWalletPoints: true, paymentMode: 'cod_advance' });
  assert.equal(full.walletPointsRedeemed, 10280);
  assert.equal(full.deliveryCharges, 280);
  assert.equal(full.total, 0);
  const prepaid = await computeOrderPricing(10000, '', { paymentMode: 'online' });
  assert.equal(prepaid.deliveryCharges, 280);
  assert.equal(prepaid.total, 10280);
});


test('checkout COD advance is 10% of the full payable total, including delivery', () => {
  for (const payable of [backendPayable, storefrontPayable]) {
    for (const [total, advance] of [[3280, 328], [2948.88, 294.89], [0, 0], [280, 28]]) {
      assert.equal(payable(total, 'cod_advance'), advance);
      assert.equal(payable(total, 'online'), total);
      const balance = Math.round((total - advance) * 100) / 100;
      assert.equal(Math.round((advance + balance) * 100) / 100, total);
    }
  }
});
