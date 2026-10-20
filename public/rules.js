// PropPlan — Apex Trader Funding rule data + math. All rules verified 2026-10-19 (source URL per rule below).
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
    // Legacy (accounts purchased before 2026-03-01)
    legacyOverview: HC + 'legacy-products/legacy-products-overview/',
    legacyEval: HC + 'evaluation-accounts-ea/legacy-evaluation-rules/',
    legacyPA: HC + 'performance-accounts-pa/legacy-performance-account-pa-compliance/',
    legacyPay: HC + 'legacy-payouts/legacy-pa-payout-parameters/',
    legacyConsistency: HC + 'legacy-helpful-items/legacy-30-consistency-rule-windfall/',
    legacyProducts: 'https://apextraderfunding.com/legacy-products/',
    // 75K is no longer listed on the current help center; values from Apex's archived plan page and older official help desk.
    legacy75kPlan: 'https://web.archive.org/web/20250101002142/https://apextraderfunding.com/',
    legacy75kPay: 'https://support.atf.com/hc/en-us/articles/10403497070363-How-Do-Payouts-Work-Payouts-Withdrawals-Performance-Split-Percentages',
  };
  // ---- Current (post-2026-03-01) EOD / Intraday accounts ----
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

  // ---- LEGACY accounts (purchased before 2026-03-01). Live (intraday) trailing threshold, no DLL. ----
  // key: start balance, or '100000S' for 100K Static. dd = max loss/trailing threshold, target = eval profit goal,
  // contracts = max minis, cap = max payout for payouts 1-5 (none from 6th), minBal = min balance to request payout.
  const LEGACY = {
    '25000':   { label: '25K Full',    start: 25000,  dd: 1500, target: 1500,  contracts: 4,  cap: 1500, minBal: 26600,  src: SRC.legacyEval },
    '50000':   { label: '50K Full',    start: 50000,  dd: 2500, target: 3000,  contracts: 10, cap: 2000, minBal: 52600,  src: SRC.legacyEval },
    '75000':   { label: '75K Full',    start: 75000,  dd: 2750, target: 4250,  contracts: 12, cap: 2250, minBal: 77850,  src: SRC.legacyEval },
    '100000':  { label: '100K Full',   start: 100000, dd: 3000, target: 6000,  contracts: 14, cap: 2500, minBal: 103100, src: SRC.legacyEval },
    '150000':  { label: '150K Full',   start: 150000, dd: 5000, target: 9000,  contracts: 17, cap: 2750, minBal: 155100, src: SRC.legacyEval },
    '250000':  { label: '250K Full',   start: 250000, dd: 6500, target: 15000, contracts: 27, cap: 3000, minBal: 256600, src: SRC.legacyEval },
    '300000':  { label: '300K Full',   start: 300000, dd: 7500, target: 20000, contracts: 35, cap: 3500, minBal: 307600, src: SRC.legacyEval },
    '100000S': { label: '100K Static', start: 100000, dd: 625,  target: 2000,  contracts: 2,  cap: 1000, minBal: 102600, static: true, staticNet: 2600, src: SRC.legacyEval },
  };
  const LEGACY_RULES = { evalMinDays: 7, payDays: 8, payProfitDays: 5, payMinDay: 50, consistencyPct: 0.30,
    capPayouts: 5, safetyNetPayouts: 3, maePct: 0.30, maePctHigh: 0.50, rr: 5, split: '100% of first $25,000 per account, then 90%' };

  function legacySpec(size) { const s = LEGACY[String(size)]; if (!s) throw new Error('Unknown legacy size ' + size); return s; }
  function legacyNet(s) { return s.static ? s.staticNet : s.dd + 100; } // safety net (profit amount)

  function tierFor(size, profit) {
    const t = SIZES[size].tiers; let cur = t[0], lvl = 1;
    t.forEach((r, i) => { if (profit >= r[0]) { cur = r; lvl = i + 1; } });
    return { level: lvl, contracts: cur[1], dll: cur[2] };
  }

  // Trailing threshold. EOD: peak = highest EOD close. INTRADAY / LEGACY: peak = highest balance incl. unrealized.
  // PA: stops trailing at start + 100.
  // EVAL: Rithmic & Wealthcharts stop trailing once threshold = profit-target balance; Tradovate trails indefinitely (default).
  // LEGACY Static: fixed threshold (start - 625), never trails.
  function threshold(size, phase, peak, platform, type) {
    platform = platform || 'TRADOVATE';
    let start, dd, target;
    if (type === 'LEGACY') {
      const s = legacySpec(size); start = s.start; dd = s.dd; target = s.target;
      if (s.static) return start - dd;
    } else { const s = SIZES[size]; start = +size; dd = s.dd; target = s.target; }
    let th = Math.max(start, +peak || start) - dd;
    if (phase === 'PA') th = Math.min(th, start + 100);
    else if (platform === 'RITHMIC' || platform === 'WEALTHCHARTS') th = Math.min(th, start + target);
    return th;
  }

  // Consistency: largest profitable day vs. net profit since last payout.
  // ratio 0.5 (current accounts, strict <) or 0.3 (legacy, <= allowed).
  // days = daily P&L since last payout excluding today; profitSince (optional) = net profit since last payout excluding today
  // (overrides sum(days) as denominator, e.g. when you only know the total).
  function consistency(days, todayPnl, opts) {
    opts = opts || {}; const r = opts.ratio || 0.5, strict = opts.strict !== undefined ? opts.strict : r === 0.5;
    const prior = days.slice();
    const sumDays = prior.reduce((a, b) => a + b, 0);
    const P = (opts.profitSince !== undefined && opts.profitSince !== null && opts.profitSince !== '' && !isNaN(+opts.profitSince)) ? +opts.profitSince : sumDays;
    const H = Math.max(0, ...prior);
    const t = +todayPnl || 0;
    const net = P + t;
    const big = Math.max(H, t, 0);
    const met = net > 0 && (strict ? big < r * net : big <= r * net + 1e-9);
    // Today's final profit x: x <= r(P+x) -> x <= rP/(1-r); and H <= r(P+x) -> x >= H/r - P.
    const maxToday = r * P / (1 - r);
    const minToday = Math.max(0, H / r - P);
    return { ratio: r, strict, netSincePayout: net, priorNet: P, biggestDay: big, pct: net > 0 ? big / net : null, met,
      maxProfitTodayExclusive: maxToday, minProfitTodayToMeetExclusive: minToday,
      minTotalProfitRequired: big / r, achievableToday: maxToday > minToday && P > 0 };
  }

  // Legacy 30% negative P&L (MAE) per-trade limit. sodProfit = start-of-day balance - start.
  function legacyMae(s, sodProfit) {
    const net = legacyNet(s);
    if (s.static) return sodProfit < net ? 0.3 * s.dd : (sodProfit >= 2 * net ? 0.5 : 0.3) * sodProfit;
    const base = sodProfit < s.dd ? s.dd : sodProfit;
    return (sodProfit >= 2 * net ? LEGACY_RULES.maePctHigh : LEGACY_RULES.maePct) * base;
  }

  function planLegacy(inp) {
    const s = legacySpec(inp.size), phase = inp.phase, platform = inp.platform || 'TRADOVATE';
    const start = s.start, bal = +inp.balance, today = +inp.todayPnl || 0;
    const peak = Math.max(+inp.peak || start, start, bal);
    const th = threshold(inp.size, phase, peak, platform, 'LEGACY');
    const toThreshold = bal - th, maxLoss = Math.max(0, toThreshold);
    const sod = bal - today, net = legacyNet(s);
    const out = { size: String(inp.size), label: s.label, type: 'LEGACY', phase, platform, static: !!s.static,
      threshold: th, distanceToThreshold: toThreshold, dll: null, dllRoom: Infinity, maxLossToday: maxLoss,
      stopAtBalance: bal - maxLoss, maxContracts: s.contracts, bindingLimit: 'Trailing threshold (closes account)' };
    if (phase === 'EVAL') {
      out.contracts = s.contracts; out.targetBalance = start + s.target; out.toTarget = Math.max(0, out.targetBalance - bal);
      out.minTradingDays = LEGACY_RULES.evalMinDays;
      out.trailStopsAt = s.static ? null : (platform === 'TRADOVATE' ? null : start + s.target);
      return out;
    }
    const reached = !!inp.reachedSafetyNet || sod >= start + net;
    out.contracts = reached ? s.contracts : Math.floor(s.contracts / 2);
    out.scaling = { halfUntilEodBalance: start + net, reached };
    out.maePerTrade = legacyMae(s, sod - start);
    const days = (inp.days || []).map(Number).filter((x) => !isNaN(x));
    const taken = +inp.payoutsTaken || 0, n = taken + 1;
    const c = consistency(days, today, { ratio: LEGACY_RULES.consistencyPct, strict: false, profitSince: inp.profitSinceLastPayout });
    c.applies = n <= 5; // rule applies until the sixth payout
    out.consistency = c;
    const tradingDays = days.length + (today ? 1 : 0);
    const profitDays = days.filter((d) => d >= LEGACY_RULES.payMinDay).length + (today >= LEGACY_RULES.payMinDay ? 1 : 0);
    const cap = n <= LEGACY_RULES.capPayouts ? s.cap : Infinity;
    const safety = n <= LEGACY_RULES.safetyNetPayouts;
    const minReq = safety ? s.minBal : start + 100 + MIN_PAYOUT;
    // Payouts 1-3: $500 may encroach on safety net; above $500 needs balance >= net + (amount - 500).
    const room = safety ? (bal >= s.minBal ? MIN_PAYOUT + (bal - s.minBal) : 0) : Math.max(0, bal - (start + 100));
    const req = Math.min(cap, room);
    out.payout = { tradingDays, daysLeft: Math.max(0, LEGACY_RULES.payDays - tradingDays),
      profitDays, profitDaysLeft: Math.max(0, LEGACY_RULES.payProfitDays - profitDays), minDailyProfit: LEGACY_RULES.payMinDay,
      safetyNetApplies: safety, safetyNet: start + net, minBalanceToRequest: minReq, amountLeft: Math.max(0, minReq - bal),
      nextPayoutNumber: n, nextPayoutCap: cap, requestableNow: req >= MIN_PAYOUT ? req : 0, split: LEGACY_RULES.split };
    return out;
  }

  function plan(inp) {
    if (inp.type === 'LEGACY') return planLegacy(inp);
    const size = +inp.size, s = SIZES[size], type = inp.type, phase = inp.phase, platform = inp.platform || 'TRADOVATE';
    const start = size, bal = +inp.balance, today = +inp.todayPnl || 0;
    const peak = Math.max(+inp.peak || start, start);
    const th = threshold(size, phase, peak, platform, type);
    const toThreshold = bal - th;
    const sod = bal - today; // start-of-day balance (≈ prior close; tiers use prior close)
    let dll = null, contracts, tier = null;
    if (phase === 'EVAL') { contracts = s.evalContracts; dll = type === 'EOD' ? s.evalDll : null; }
    else { tier = tierFor(size, sod - start); contracts = tier.contracts; dll = tier.dll; }
    // DLL counts net intraday loss: remaining = dll + today (if today positive, more room).
    const dllRoom = dll == null ? Infinity : dll + today;
    const maxLoss = Math.max(0, Math.min(dllRoom, toThreshold));
    const out = { size, type, phase, platform, threshold: th, distanceToThreshold: toThreshold, dll, dllRoom,
      maxLossToday: maxLoss, stopAtBalance: bal - maxLoss, contracts, tier,
      bindingLimit: dllRoom <= toThreshold ? 'DLL (pauses day)' : 'Trailing threshold (closes account)' };
    if (phase === 'EVAL') {
      out.targetBalance = start + s.target; out.toTarget = Math.max(0, out.targetBalance - bal);
      out.trailStopsAt = platform === 'TRADOVATE' ? null : start + s.target;
    } else {
      const days = (inp.days || []).map(Number).filter((x) => !isNaN(x));
      const minDay = s.pay[type];
      const qualDays = days.filter((d) => d >= minDay).length + (today >= minDay ? 1 : 0);
      const c = consistency(days, today, { profitSince: inp.profitSinceLastPayout });
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
  const api = { VERIFIED: V, SRC, SIZES, LEGACY, LEGACY_RULES, MIN_PAYOUT, MIN_DAYS, MAX_PAYOUTS, tierFor, threshold, consistency, legacyMae, plan };
  if (typeof module !== 'undefined') module.exports = api; else root.PropPlan = api;
})(this);
