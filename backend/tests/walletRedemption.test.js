import test from 'node:test';
import assert from 'node:assert/strict';
import { getMaxRedeemablePoints } from '../utils/walletRedemption.js';
import { normalizeWalletSettings } from '../utils/storeSettingsHelpers.js';

test('redemption respects admin limit, balance and order total', () => {
  assert.equal(getMaxRedeemablePoints(500, 6000, 100), 100);
  assert.equal(getMaxRedeemablePoints(50, 6000, 100), 50);
  assert.equal(getMaxRedeemablePoints(500, 60.75, 100), 60);
});
test('blank limit preserves unlimited redemption and zero disables it', () => {
  assert.equal(getMaxRedeemablePoints(500, 6000), 500);
  assert.equal(getMaxRedeemablePoints(500, 6000, 0), 0);
  assert.equal(normalizeWalletSettings({}).maxRedemptionPoints, null);
  assert.equal(normalizeWalletSettings({ maxRedemptionPoints: '' }).maxRedemptionPoints, null);
  assert.equal(normalizeWalletSettings({ maxRedemptionPoints: 0 }).maxRedemptionPoints, 0);
  assert.equal(normalizeWalletSettings({ maxRedemptionPoints: 100.9 }).maxRedemptionPoints, 100);
});

test('checkout value unlocks redemption at the threshold regardless of wallet balance', () => {
  assert.equal(getMaxRedeemablePoints(500, 99.99, null, 100), 0);
  assert.equal(getMaxRedeemablePoints(10, 100, null, 100), 10);
  assert.equal(getMaxRedeemablePoints(500, 150, 50, 100), 50);
  assert.equal(getMaxRedeemablePoints(500, 100.49, null, 100.5), 0);
  assert.equal(getMaxRedeemablePoints(500, 100.5, null, 100.5), 100);
  assert.equal(normalizeWalletSettings({}).minRedemptionOrderValue, 0);
  assert.equal(normalizeWalletSettings({ minRedemptionOrderValue: -10 }).minRedemptionOrderValue, 0);
  assert.equal(normalizeWalletSettings({ minRedemptionOrderValue: 100.5 }).minRedemptionOrderValue, 100.5);
});
