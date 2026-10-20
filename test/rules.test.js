const test = require('node:test'); const assert = require('node:assert');
const R = require('../public/rules.js');
test('Example A: 50K EOD PA', () => {
  const p = R.plan({ size: 50000, type: 'EOD', phase: 'PA', balance: 51800, peak: 52000, todayPnl: -200, days: [800, 600, 300, 300] });
  assert.equal(p.threshold, 50000); assert.equal(p.distanceToThreshold, 1800);
  assert.deepEqual(p.tier, { level: 2, contracts: 3, dll: 1000 });
  assert.equal(p.dllRoom, 800); assert.equal(p.maxLossToday, 800); assert.equal(p.stopAtBalance, 51000);
  assert.equal(p.payout.qualifyingDays, 4); assert.equal(p.payout.daysLeft, 1);
  assert.equal(p.payout.amountLeft, 800); assert.equal(p.payout.nextPayoutCap, 1500);
  assert.equal(p.consistency.maxProfitTodayExclusive, 2000); assert.equal(p.consistency.met, true);
});
test('Example B: 100K Intraday Eval', () => {
  const p = R.plan({ size: 100000, type: 'INTRADAY', phase: 'EVAL', balance: 101500, peak: 102200, todayPnl: 300 });
  assert.equal(p.threshold, 99200); assert.equal(p.dll, null); assert.equal(p.maxLossToday, 2300);
  assert.equal(p.contracts, 8); assert.equal(p.toTarget, 4500);
});
test('Example C: 25K EOD Eval, DLL binds', () => {
  const p = R.plan({ size: 25000, type: 'EOD', phase: 'EVAL', balance: 24700, peak: 25000, todayPnl: -350 });
  assert.equal(p.threshold, 24000); assert.equal(p.maxLossToday, 150); assert.equal(p.stopAtBalance, 24550);
  assert.match(p.bindingLimit, /DLL/);
});
test('PA threshold stops at start+100', () => {
  assert.equal(R.threshold(50000, 'PA', 60000), 50100);
  assert.equal(R.threshold(50000, 'EVAL', 60000), 58000);
});
test('Tiers', () => {
  assert.deepEqual(R.tierFor(150000, 5000), { level: 4, contracts: 10, dll: 3000 });
  assert.deepEqual(R.tierFor(25000, -500), { level: 1, contracts: 1, dll: 500 });
});
test('Consistency: Apex loss example (1000 then -200 = 125%)', () => {
  const c = R.consistency([1000, -200], 0); assert.equal(c.pct, 1.25); assert.equal(c.met, false);
  assert.equal(c.minProfitTodayToMeetExclusive, 1200); assert.equal(c.achievableToday, false);
});
test('Consistency: exactly 50% treated as NOT met (strict reading)', () => {
  const c = R.consistency([0, 500, 200, 0, -200, -600, 1000, 600], 500);
  assert.equal(c.pct, 0.5); assert.equal(c.met, false);
});
