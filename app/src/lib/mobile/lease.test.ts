import test from 'node:test';
import assert from 'node:assert/strict';
import { invitePayload, parseInvite, seedLeases, transitionLease, validAmount } from './lease';

test('a portable invitation keeps valid terms and rejects malformed amounts', () => {
  const lease = seedLeases()[1];
  const decoded = parseInvite(invitePayload(lease));
  assert.equal(decoded?.address, lease.address);
  assert.equal(decoded?.amount, lease.amount);
  assert.equal(parseInvite('%7B%22amount%22%3A%22Infinity%22%7D'), null);
  assert.equal(validAmount('0'), false);
  assert.equal(validAmount('1.000000001'), true);
  assert.equal(validAmount('1.0000000001'), false);
});

test('tenant refund unlocks at the exact deadline and cannot be claimed twice', () => {
  const active = { ...seedLeases()[0], status: 'active' as const };
  const review = transitionLease(active, { type: 'review', now: 1000 });
  assert.throws(() => transitionLease(review, { type: 'refund', now: review.deadline! - 1 }));
  const settled = transitionLease(review, { type: 'refund', now: review.deadline! });
  assert.equal(settled.status, 'settled');
  assert.throws(() => transitionLease(settled, { type: 'refund', now: review.deadline! + 1 }));
});

test('reporting an issue before expiry freezes the refund', () => {
  const review = transitionLease(seedLeases()[0], { type: 'review', now: 1000 });
  assert.throws(() => transitionLease(review, { type: 'dispute', reason: ' ', now: 1001 }));
  assert.throws(() => transitionLease(review, { type: 'dispute', reason: 'Damage', now: review.deadline! }));
  const disputed = transitionLease(review, { type: 'dispute', reason: 'Damage', now: 1001 });
  assert.equal(disputed.status, 'disputed');
  assert.throws(() => transitionLease(disputed, { type: 'refund', now: review.deadline! + 1 }));
  assert.equal(transitionLease(disputed, { type: 'release', now: review.deadline! + 1 }).status, 'settled');
});
