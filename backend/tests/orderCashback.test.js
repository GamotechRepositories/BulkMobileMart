import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderCashback } from '../utils/orderCashback.js';
import { normalizeWalletSettings } from '../utils/storeSettingsHelpers.js';

test('cashback scales with order value and supports fractional percentages', () => {
  assert.equal(calculateOrderCashback(6000, 1, 1000), 60);
  assert.equal(calculateOrderCashback(12000, 1, 1000), 120);
  assert.equal(calculateOrderCashback(6000, 1.25, 1000), 75);
});

test('threshold is inclusive and rewards round to whole wallet points', () => {
  assert.equal(calculateOrderCashback(999, 1, 1000), 0);
  assert.equal(calculateOrderCashback(1000, 1, 1000), 10);
  assert.equal(calculateOrderCashback(6050, 1), 61);
  assert.equal(calculateOrderCashback(6049, 1), 60);
});

test('invalid or disabled rates cannot award points', () => {
  for (const rate of [0, -1, 101, Infinity, 'invalid']) {
    assert.equal(calculateOrderCashback(6000, rate), 0);
  }
  assert.equal(calculateOrderCashback(-6000, 1), 0);
});

test('legacy flat rewards default to 1 percent; configured rates retain decimals', () => {
  assert.equal(normalizeWalletSettings({ orderRewardPoints: 50 }).orderRewardPercentage, 1);
  assert.equal(normalizeWalletSettings({ orderRewardPercentage: 1.25 }).orderRewardPercentage, 1.25);
  assert.equal(normalizeWalletSettings({ orderRewardPercentage: 0 }).orderRewardPercentage, 0);
  assert.equal(normalizeWalletSettings({ orderRewardPercentage: 150 }).orderRewardPercentage, 100);
});
