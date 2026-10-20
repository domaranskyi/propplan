// Worked examples per account type (rules verified 2026-10-19; see public/rules.js SRC).
const test = require('node:test'); const assert = require('node:assert');
const R = require('../public/rules.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`);

test('Intraday Eval 50K: platform selector (Rithmic/Wealthcharts lock at target, Tradovate trails)', () => {
  const base = { size: 50000, type: 'INTRADAY', phase: 'EVAL', balance: 55200, peak: 56000, todayPnl: 0 };
  const rith = R.plan({ ...base, platform: 'RITHMIC' });
  assert.equal(rith.threshold, 53000); assert.equal(rith.maxLossToday, 2200); assert.equal(rith.trailStopsAt, 53000);
  assert.equal(R.plan({ ...base, platform: 'WEALTHCHARTS' }).threshold, 53000);
  const tdv = R.plan({ ...base, platform: 'TRADOVATE' });
  assert.equal(tdv.threshold, 54000); assert.equal(tdv.maxLossToday, 1200); assert.equal(tdv.trailStopsAt, null);
});
test('EOD Eval 100K Rithmic: threshold locks at 106,000; DLL still applies', () => {
  const p = R.plan({ size: 100000, type: 'EOD', phase: 'EVAL', platform: 'RITHMIC', balance: 108500, peak: 110000, todayPnl: -500 });
  assert.equal(p.threshold, 106000); assert.equal(p.dllRoom, 1000); assert.equal(p.maxLossToday, 1000); assert.match(p.bindingLimit, /DLL/);
});
test('EOD PA 50K: profit-since-last-payout field overrides day sum for 50% rule', () => {
  const p = R.plan({ size: 50000, type: 'EOD', phase: 'PA', balance: 52600, peak: 52600, todayPnl: 0, days: [800, 600, 300, 300], profitSinceLastPayout: 2400 });
  assert.equal(p.consistency.priorNet, 2400); assert.equal(p.consistency.maxProfitTodayExclusive, 2400);
  assert.equal(p.consistency.met, true); near(p.consistency.pct, 1 / 3);
});
test('Intraday PA 150K: trail stops at 150,100', () => {
  const p = R.plan({ size: 150000, type: 'INTRADAY', phase: 'PA', balance: 154500, peak: 155000, todayPnl: 0, days: [] });
  assert.equal(p.threshold, 150100); assert.equal(p.distanceToThreshold, 4400);
});
test('Legacy 50K Eval: Rithmic locks at 53,000, Tradovate trails, no DLL, 7 days', () => {
  const r = R.plan({ size: 50000, type: 'LEGACY', phase: 'EVAL', platform: 'RITHMIC', balance: 55200, peak: 56000, todayPnl: 200 });
  assert.equal(r.threshold, 53000); assert.equal(r.maxLossToday, 2200); assert.equal(r.dll, null);
  assert.equal(r.contracts, 10); assert.equal(r.toTarget, 0); assert.equal(r.minTradingDays, 7);
  const t = R.plan({ size: 50000, type: 'LEGACY', phase: 'EVAL', platform: 'TRADOVATE', balance: 55200, peak: 56000, todayPnl: 200 });
  assert.equal(t.threshold, 53500); assert.equal(t.maxLossToday, 1700);
});
test('Legacy trailing example from Apex (50K: peak 50,875 -> threshold 48,375)', () => {
  assert.equal(R.threshold(50000, 'EVAL', 50875, 'TRADOVATE', 'LEGACY'), 48375);
});
test('Legacy 300K Eval Tradovate', () => {
  const p = R.plan({ size: 300000, type: 'LEGACY', phase: 'EVAL', platform: 'TRADOVATE', balance: 301000, peak: 302000, todayPnl: 0 });
  assert.equal(p.threshold, 294500); assert.equal(p.maxLossToday, 6500); assert.equal(p.contracts, 35); assert.equal(p.toTarget, 19000);
});
test('Legacy 50K PA: half contracts, MAE on threshold, 30% consistency, 8-day payout', () => {
  const p = R.plan({ size: 50000, type: 'LEGACY', phase: 'PA', balance: 52300, peak: 52400, todayPnl: 300,
    days: [400, 300, 500, 250, 250], payoutsTaken: 0 });
  assert.equal(p.threshold, 49900); assert.equal(p.maxLossToday, 2400);
  assert.equal(p.contracts, 5); assert.equal(p.scaling.halfUntilEodBalance, 52600);
  assert.equal(p.maePerTrade, 750);
  const c = p.consistency; assert.equal(c.netSincePayout, 2000); assert.equal(c.biggestDay, 500); assert.equal(c.met, true);
  near(c.maxProfitTodayExclusive, 728.57);
  assert.equal(p.payout.tradingDays, 6); assert.equal(p.payout.daysLeft, 2); assert.equal(p.payout.profitDaysLeft, 0);
  assert.equal(p.payout.minBalanceToRequest, 52600); assert.equal(p.payout.amountLeft, 300); assert.equal(p.payout.requestableNow, 0);
  assert.equal(p.payout.nextPayoutCap, 2000);
});
test('Legacy 30% consistency: Apex example $1,500 / 0.3 = $5,000', () => {
  const c = R.consistency([1500, 1000], 0, { ratio: 0.3, strict: false, profitSince: 5000 });
  assert.equal(c.met, true); near(c.minTotalProfitRequired, 5000);
  const c2 = R.consistency([1500, 1000], 0, { ratio: 0.3, strict: false, profitSince: 4000 });
  assert.equal(c2.met, false); near(c2.minProfitTodayToMeetExclusive, 1000);
});
test('Legacy MAE grows to 50% once profit doubles safety net (50K: 6,000 profit -> 3,000)', () => {
  const p = R.plan({ size: 50000, type: 'LEGACY', phase: 'PA', balance: 56000, peak: 56000, todayPnl: 0, days: [] });
  assert.equal(p.maePerTrade, 3000); assert.equal(p.contracts, 10); assert.equal(p.threshold, 50100);
});
test('Legacy 100K Static PA: fixed 99,375 threshold, Apex MAE example ($3,000 profit -> $900), payout #1', () => {
  const p = R.plan({ size: '100000S', type: 'LEGACY', phase: 'PA', balance: 103000, peak: 103200, todayPnl: 0, days: [], payoutsTaken: 0 });
  assert.equal(p.threshold, 99375); assert.equal(p.contracts, 2); assert.equal(p.maePerTrade, 900);
  assert.equal(p.payout.minBalanceToRequest, 102600); assert.equal(p.payout.requestableNow, 900);
  const lo = R.plan({ size: '100000S', type: 'LEGACY', phase: 'PA', balance: 101000, peak: 101000, todayPnl: 0, days: [] });
  assert.equal(lo.contracts, 1); assert.equal(lo.maePerTrade, 187.5);
});
test('Legacy 100K Static Eval: fixed drawdown never trails', () => {
  const p = R.plan({ size: '100000S', type: 'LEGACY', phase: 'EVAL', platform: 'RITHMIC', balance: 101500, peak: 101800, todayPnl: 0 });
  assert.equal(p.threshold, 99375); assert.equal(p.toTarget, 500);
});
test('Legacy 75K PA payout #4: no safety net, cap 2,250, full contracts after reaching net', () => {
  const p = R.plan({ size: 75000, type: 'LEGACY', phase: 'PA', balance: 80000, peak: 81000, todayPnl: 0, days: [], payoutsTaken: 3, reachedSafetyNet: true });
  assert.equal(p.threshold, 75100); assert.equal(p.contracts, 12); assert.equal(p.payout.safetyNetApplies, false);
  assert.equal(p.payout.nextPayoutCap, 2250); assert.equal(p.payout.requestableNow, 2250);
});
test('Legacy payout #6: no cap, 30% rule no longer applies', () => {
  const p = R.plan({ size: 25000, type: 'LEGACY', phase: 'PA', balance: 30000, peak: 30000, todayPnl: 0, days: [3000], payoutsTaken: 5 });
  assert.equal(p.payout.nextPayoutCap, Infinity); assert.equal(p.payout.requestableNow, 4900); assert.equal(p.consistency.applies, false);
});
