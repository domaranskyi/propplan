// PropPlan — Apex Trader Funding rule data + math. Verified 2026-10-19 from apextraderfunding.com/help-center.
(function (root) {
  const V = '2026-10-19';
  const HC = 'https://apextraderfunding.com/help-center/';
  const SRC = {
    evalEod: HC + 'eod-trailing-drawdown-accounts/eod-evaluations/',
    evalIntra: HC + 'evaluation-accounts-ea/intraday-trailing-drawdown-evaluations/',
    paEod: HC + 'eod-trailing-drawdown-accounts/eod-performance-accounts-pa/',
    paIntra: HC + 'intraday-trailing-drawdown-accounts/intraday-trailing-drawdown-performance-accounts-pa/',
    eodDD: HC + 'eod-trailing-drawdown-accounts/eod-drawdown-explained/',
    intraDD: HC + 'intraday-trailing-drawdown-accounts/intraday-trailing-drawdown-explained/',
    dll: HC + 'additional-helpful-items/daily-loss-limit-explained/',
    scaling: HC + 'additional-helpful-items/scaling-levels-pa-explained/',
    consistency: HC + 'additional-helpful-items/50-consistency-requirement/',
    payEod: HC + 'eod-trailing-drawdown-accounts/eod-payouts/',
    payIntra: HC + 'intraday-trailing-drawdown-accounts/intraday-trailing-drawdown-payouts/',
  };
  const SIZES = {
    25000: { dd: 1000, target: 1500, evalContracts: 4, evalDll: 500,
      tiers: [[0, 1, 500], [1000, 2, 500], [2000, 2, 1250]],
      pay: { EOD: 100, INTRADAY: 100 }, caps: { EOD: [1000,1000,1000,1000,1000,1000], INTRADAY: [1000,1000,1000,1000,1000,1000] } },
    50000: { dd: 2000, target: 3000, evalContracts: 6, evalDll: 1000,
      tiers: [[0, 2, 1000], [1500, 3, 1000], [3000, 4, 2000], [6000, 4, 3000]],
      pay: { EOD: 250, INTRADAY: 200 }, caps: { EOD: [1500,1500,2000,2500,2500,3000], INTRADAY: [1500,2000,2500,2500,3000,3000] } },
    100000: { dd: 3000, target: 6000, evalContracts: 8, evalDll: 1500,
      tiers: [[0, 3, 1750], [2000, 4, 1750], [3000, 5, 1750], [5000, 6, 2500], [10000, 6, 3500]],
      pay: { EOD: 300, INTRADAY: 250 }, caps: { EOD: [2000,2500,2500,3000,4000,4000], INTRADAY: [2000,2500,3000,3000,4000,4000] } },
    150000: { dd: 4000, target: 9000, evalContracts: 12, evalDll: 2000,
      tiers: [[0, 4, 2500], [2000, 5, 2500], [3000, 7, 2500], [5000, 10, 3000], [10000, 10, 4000]],
      pay: { EOD: 350, INTRADAY: 300 }, caps: { EOD: [2500,3000,3000,3000,4000,5000], INTRADAY: [2500,3000,3000,4000,4000,5000] } },
  };
  const MIN_PAYOUT = 500, MIN_DAYS = 5, MAX_PAYOUTS = 6;

  function tierFor(size, profit) {
    const t = SIZES[size].tiers; let cur = t[0], lvl = 1;
    t.forEach((r, i) => { if (profit >= r[0]) { cur = r; lvl = i + 1; } });
    return { level: lvl, contracts: cur[1], dll: cur[2] };
  }

  // Trailing threshold. EOD: peak = highest EOD close. INTRADAY: peak = highest balance incl. unrealized.
  // PA: stops trailing at start + 100. Eval: trails indefinitely (Tradovate behaviour; see ambiguities).
  function threshold(size, phase, peak) {
    const s = SIZES[size]; const start = +size;
    let th = Math.max(start, peak) - s.dd;
    if (phase === 'PA') th = Math.min(th, start + 100);
    return th;
  }

  // Consistency: largest profitable day must be < 50% of net profit since last approved payout.
  function consistency(days, todayPnl) {
    const prior = days.slice();
    const P = prior.reduce((a, b) => a + b, 0);
    const H = Math.max(0, ...prior);
    const all = prior.concat(todayPnl ? [todayPnl] : []);
    const net = all.reduce((a, b) => a + b, 0);
    const big = Math.max(0, ...all);
    const met = net > 0 && big < 0.5 * net;
    // Today's final profit x must satisfy x < P (so x isn't >=50% itself) and x > 2H - P (to dilute old max).
    const maxToday = P; // strict upper bound (exclusive)
    const minToday = Math.max(0, 2 * H - P); // exclusive lower bound to reach consistency today
    return { netSincePayout: net, priorNet: P, biggestDay: big, pct: net > 0 ? big / net : null, met,
      maxProfitTodayExclusive: maxToday, minProfitTodayToMeetExclusive: minToday,
      achievableToday: maxToday > minToday && P > 0 };
  }

  function plan(inp) {
    const size = +inp.size, s = SIZES[size], type = inp.type, phase = inp.phase;
    const start = size, bal = +inp.balance, today = +inp.todayPnl || 0;
    const peak = Math.max(+inp.peak || start, start);
    const th = threshold(size, phase, peak);
    const toThreshold = bal - th;
    const sod = bal - today; // start-of-day balance (≈ prior close; tiers use prior close)
    let dll = null, contracts, tier = null;
    if (phase === 'EVAL') { contracts = s.evalContracts; dll = type === 'EOD' ? s.evalDll : null; }
    else { tier = tierFor(size, sod - start); contracts = tier.contracts; dll = tier.dll; }
    // DLL counts net intraday loss: remaining = dll + today (if today positive, more room).
    const dllRoom = dll == null ? Infinity : dll + today;
    const maxLoss = Math.max(0, Math.min(dllRoom, toThreshold));
    const out = { size, type, phase, threshold: th, distanceToThreshold: toThreshold, dll, dllRoom,
      maxLossToday: maxLoss, stopAtBalance: bal - maxLoss, contracts, tier,
      bindingLimit: dllRoom <= toThreshold ? 'DLL (pauses day)' : 'Trailing threshold (closes account)' };
    if (phase === 'EVAL') {
      out.targetBalance = start + s.target; out.toTarget = Math.max(0, out.targetBalance - bal);
    } else {
      const days = (inp.days || []).map(Number).filter((x) => !isNaN(x));
      const minDay = s.pay[type];
      const qualDays = days.filter((d) => d >= minDay).length + (today >= minDay ? 1 : 0);
      const c = consistency(days, today);
      const minReq = start + s.dd + 100 + MIN_PAYOUT;
      const n = Math.min(MAX_PAYOUTS, (+inp.payoutsTaken || 0) + 1);
      out.payout = { minDailyProfit: minDay, qualifyingDays: qualDays, daysLeft: Math.max(0, MIN_DAYS - qualDays),
        safetyNet: start + s.dd + 100, minBalanceToRequest: minReq, amountLeft: Math.max(0, minReq - bal),
        nextPayoutNumber: (+inp.payoutsTaken || 0) >= MAX_PAYOUTS ? null : n,
        nextPayoutCap: (+inp.payoutsTaken || 0) >= MAX_PAYOUTS ? 0 : s.caps[type][n - 1],
        requestableNow: Math.max(0, Math.min(bal - (start + s.dd + 100), s.caps[type][n - 1])) };
      out.consistency = c;
    }
    return out;
  }
  const api = { VERIFIED: V, SRC, SIZES, MIN_PAYOUT, MIN_DAYS, MAX_PAYOUTS, tierFor, threshold, consistency, plan };
  if (typeof module !== 'undefined') module.exports = api; else root.PropPlan = api;
})(this);
