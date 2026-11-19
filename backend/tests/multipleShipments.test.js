import test from 'node:test';
import assert from 'node:assert/strict';
import Order from '../models/order/Order.js';
import { getOrderShipments, findOrderShipment, storeOrderShipment, getCombinedShipmentStatus, getClearedShipment } from '../utils/shipmentHelpers.js';

function makeOrder() {
  return new Order({ status: 'shipping', shipment: { trackingNumber: 'FIRST', labelUrl: 'https://example.com/first.pdf', codCollectAmount: 1000 } });
}

test('multiple parcels persist independently while legacy primary shipment stays available', () => {
  const order = makeOrder();
  storeOrderShipment(order, { trackingNumber: 'SECOND', labelUrl: 'https://example.com/second.pdf', codCollectAmount: 0 }, { additional: true });
  storeOrderShipment(order, { trackingNumber: 'THIRD', note: 'Last parcel' }, { additional: true });
  const reloaded = new Order(order.toObject());
  assert.equal(reloaded.shipment.trackingNumber, 'FIRST');
  assert.equal(reloaded.shipment.codCollectAmount, 1000);
  assert.equal(getOrderShipments(reloaded).length, 3);
  assert.equal(findOrderShipment(reloaded, 'SECOND').labelUrl, 'https://example.com/second.pdf');
  assert.equal(findOrderShipment(reloaded, 'THIRD').note, 'Last parcel');
  assert.throws(() => findOrderShipment(order, 'UNKNOWN'), /not found/);
  assert.throws(() => storeOrderShipment(order, { trackingNumber: 'FIRST' }, { additional: true }), /already linked/);
});

test('parcel refresh and cancellation leave sibling labels intact', () => {
  const order = makeOrder();
  storeOrderShipment(order, { trackingNumber: 'SECOND', status: 'in transit' }, { additional: true });
  storeOrderShipment(order, { trackingNumber: 'SECOND', status: 'delivered' }, { trackingNumber: 'SECOND' });
  assert.equal(order.shipment.trackingNumber, 'FIRST');
  assert.equal(getCombinedShipmentStatus(order), 'shipping');
  order.shipment.status = 'delivered';
  assert.equal(getCombinedShipmentStatus(order), 'delivered');
  storeOrderShipment(order, getClearedShipment(), { trackingNumber: 'SECOND' });
  assert.equal(getOrderShipments(order).length, 1);
  assert.equal(order.shipment.labelUrl, 'https://example.com/first.pdf');
});

test('clearing primary promotes the next parcel for legacy order displays', () => {
  const order = makeOrder();
  storeOrderShipment(order, { trackingNumber: 'SECOND', codCollectAmount: 0 }, { additional: true });
  storeOrderShipment(order, getClearedShipment(), { trackingNumber: 'FIRST' });
  assert.equal(order.shipment.trackingNumber, 'SECOND');
  assert.equal(order.additionalShipments.length, 0);
  assert.equal(order.shipment.codCollectAmount, 0);
});

test('cancelled orders stay cancelled and single shipment status remains backward compatible', () => {
  const order = makeOrder();
  order.status = 'processing';
  assert.equal(getCombinedShipmentStatus(order), 'processing');
  order.status = 'cancelled';
  order.shipment.status = 'delivered';
  assert.equal(getCombinedShipmentStatus(order), 'cancelled');
});

import { processEnviaWebhookEvent } from '../services/enviaWebhookProcessor.js';

test('webhooks route by parcel tracking number without overwriting the primary label', async (t) => {
  const order = makeOrder();
  storeOrderShipment(order, { trackingNumber: 'SECOND', status: 'in transit' }, { additional: true });
  t.mock.method(Order, 'findOne', async (filter) => {
    assert.ok(filter.$or.some((entry) => entry['additionalShipments.trackingNumber'] === 'SECOND'));
    return order;
  });
  t.mock.method(order, 'save', async () => order);
  const result = await processEnviaWebhookEvent({ trackingNumber: 'SECOND', status: 'delivered' });
  assert.equal(result.ok, true);
  assert.equal(order.shipment.trackingNumber, 'FIRST');
  assert.equal(findOrderShipment(order, 'SECOND').status, 'delivered');
  assert.equal(order.status, 'shipping');
});

test('an unmatched webhook tracking number cannot overwrite an existing parcel via order reference', async (t) => {
  const order = makeOrder();
  t.mock.method(Order, 'findOne', async (filter) => filter.orderNumber ? order : null);
  const result = await processEnviaWebhookEvent({ trackingNumber: 'UNKNOWN', orderNumber: '123456', status: 'delivered' });
  assert.equal(result.reason, 'shipment_not_found');
  assert.equal(order.shipment.trackingNumber, 'FIRST');
});
