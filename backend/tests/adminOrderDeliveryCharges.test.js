import test from 'node:test';
import assert from 'node:assert/strict';
import Order from '../models/order/Order.js';
import { updateOrder } from '../controllers/orderController.js';

for (const scenario of [
  { name: 'retains wallet redemption when delivery increases', charges: [150], expected: [950] },
  { name: 'retains wallet redemption across repeated delivery edits', charges: [150, 50, 0], expected: [950, 850, 800] },
  { name: 'combines coupon and wallet discounts', couponDiscount: 100, charges: [50], expected: [750] },
  { name: 'supports orders without wallet redemption', walletDiscount: undefined, charges: [50], expected: [1050] },
  { name: 'never produces a negative total', walletDiscount: 1100, charges: [0], expected: [0] },
  { name: 'rounds the payable total to two decimals', subtotal: 1000.25, charges: [50.125], expected: [850.38] },
]) {
  test(scenario.name, async (t) => {
    const walletDiscount = 'walletDiscount' in scenario ? scenario.walletDiscount : 200;
    const order = {
      _id: 'test-order', status: 'confirm', paymentStatus: 'unpaid', items: [],
      subtotal: scenario.subtotal ?? 1000, couponDiscount: scenario.couponDiscount ?? 0,
      deliveryCharges: 100, walletDiscount, walletPointsRedeemed: walletDiscount ?? 0,
      total: 900,
    };
    t.mock.method(Order, 'findById', () => ({
      populate() { return this; },
      then(resolve, reject) { return Promise.resolve({ ...order }).then(resolve, reject); },
    }));
    const save = t.mock.method(Order, 'findByIdAndUpdate', async (id, update) => {
      assert.equal(id, order._id);
      Object.assign(order, update.$set);
      return order;
    });

    for (const [index, deliveryCharges] of scenario.charges.entries()) {
      const res = {
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
      };
      await updateOrder({ params: { id: order._id }, body: { deliveryCharges } }, res);
      assert.equal(res.statusCode, 200, res.body?.message);
      assert.equal(order.total, scenario.expected[index]);
      assert.equal(res.body.data.total, scenario.expected[index]);
      assert.equal(res.body.data.walletDiscount, walletDiscount);
      assert.equal(res.body.data.walletPointsRedeemed, walletDiscount ?? 0);
      assert.equal(res.body.data.deliveryCharges, deliveryCharges);
    }
    assert.equal(save.mock.callCount(), scenario.charges.length);
  });
}
