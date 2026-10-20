const R = window.PropPlan, $ = (id) => document.getElementById(id);
const f = (n) => n === Infinity ? 'No limit' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
document.querySelector('.v').textContent = R.VERIFIED;
const src = (u) => `<a href="${u}" target="_blank" rel="noopener">source · verified ${R.VERIFIED}</a>`;
function kpi(label, val, cls, s, note, id) { return `<div class="kpi ${cls||''}"${id?` data-k="${id}"`:''}><small>${label}</small><b>${val}</b>${note?`<small>${note}</small><br>`:''}${s?src(s):''}</div>`; }
let lastType = null;
function fillSizes(type) {
  const sel = $('size'), cur = sel.value;
  const opts = type === 'LEGACY' ? Object.entries(R.LEGACY).map(([k, v]) => [k, v.label]) : Object.keys(R.SIZES).map((k) => [k, (k / 1000) + 'K']);
  sel.innerHTML = opts.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  sel.value = opts.some(([k]) => k === cur) ? cur : '50000';
}
function render() {
  const type = $('type').value, phase = $('phase').value, L = type === 'LEGACY';
  if (type !== lastType) { fillSizes(type); lastType = type; }
  document.querySelectorAll('.pa').forEach((e) => e.style.display = phase === 'PA' ? '' : 'none');
  document.querySelectorAll('.lg').forEach((e) => e.style.display = phase === 'PA' && L ? '' : 'none');
  document.querySelectorAll('.ev').forEach((e) => e.style.display = phase === 'EVAL' ? '' : 'none');
  $('peakLbl').textContent = type === 'EOD' ? 'Highest EOD (closing) balance ($)' : 'Highest peak balance incl. unrealized ($)';
  const p = R.plan({ size: $('size').value, type, phase, platform: $('platform').value, balance: $('balance').value, peak: $('peak').value,
    todayPnl: $('today').value, payoutsTaken: $('payouts').value, profitSinceLastPayout: $('since').value, reachedSafetyNet: !!$('reached').value,
    days: $('days').value.split(/[,\s]+/).filter(Boolean) });
  window.__lastPlan = p;
  const S = R.SRC;
  const ddSrc = L ? (phase === 'PA' ? S.legacyPA : S.legacyEval) : (type === 'EOD' ? S.eodDD : S.intraDD);
  const acct = L ? (phase === 'PA' ? S.legacyPA : S.legacyEval) : phase === 'EVAL' ? (type === 'EOD' ? S.evalEod : S.evalIntra) : (type === 'EOD' ? S.paEod : S.paIntra);
  const sz = L ? R.LEGACY[$('size').value] : null;
  const legSrc = L && $('size').value === '75000' ? S.legacy75kPlan : acct;
  let h = `<h2>Today's Plan${L ? ` — Legacy ${sz.label}` : ''}</h2><div class="kpis">`;
  h += kpi('Max you can lose today', f(p.maxLossToday), 'red', p.dll != null && p.dllRoom <= p.distanceToThreshold ? S.dll : ddSrc, `Binding: ${p.bindingLimit}`, 'maxLoss');
  const thNote = `${f(p.distanceToThreshold)} away` + (phase === 'EVAL' && !(L && p.static) ? (p.trailStopsAt ? ` · locks at ${f(p.trailStopsAt)}` : ' · trails indefinitely (Tradovate)') : '') + (L && p.static ? ' · static, never trails' : '');
  h += kpi('Drawdown threshold', f(p.threshold), '', phase === 'EVAL' && !L ? (type === 'EOD' ? S.eodDD : S.intraDD) : ddSrc, thNote, 'threshold');
  h += kpi('Daily loss limit', p.dll == null ? 'None' : f(p.dll), '', L ? S.legacyEval : S.dll, p.dll == null ? (L ? 'Legacy accounts have no DLL' : 'Intraday evals have no DLL') : `${f(p.dllRoom)} left today`, 'dll');
  const cNote = L ? (phase === 'PA' ? (p.scaling.reached ? 'full size unlocked' : `half size until EOD ≥ ${f(p.scaling.halfUntilEodBalance)}`) : 'minis; 10 micros = 1 mini') : 'minis; 10 micros = 1 mini';
  h += kpi('Max contracts now', p.contracts + (p.tier ? ` (Tier ${p.tier.level})` : ''), '', L ? (phase === 'PA' ? S.legacyPA : legSrc) : (phase === 'PA' ? S.scaling : acct), cNote, 'contracts');
  if (phase === 'EVAL') h += kpi('Left to profit target', f(p.toTarget), 'grn', L ? legSrc : acct, `Target balance ${f(p.targetBalance)} · ${L ? 'min 7 trading days' : 'no min days'}`, 'toTarget');
  else if (L) {
    const c = p.consistency, py = p.payout;
    h += kpi('Max loss per trade (30% MAE)', f(p.maePerTrade), 'red', S.legacyPA, 'open negative P&L, per trade; 5:1 max risk:reward', 'mae');
    h += kpi('Max profit today (30% rule)', !c.applies ? 'n/a (6th+ payout)' : c.priorNet > 0 ? 'up to ' + f(c.maxProfitTodayExclusive) : 'n/a', 'grn', S.legacyConsistency,
      !c.applies ? 'rule ends at 6th payout' : c.priorNet <= 0 ? 'enter days / profit since payout' : c.met ? `Met now (${(c.pct*100).toFixed(1)}%)` : `Need total profit ≥ ${f(c.minTotalProfitRequired)}${c.pct ? ` (now ${(c.pct*100).toFixed(1)}%)` : ''}`, 'consistency');
    h += kpi('Trading days left', py.daysLeft, '', S.legacyPay, `${py.tradingDays}/8 days · ${py.profitDays}/5 days ≥ $50`, 'daysLeft');
    h += kpi('$ left to request payout', f(py.amountLeft), '', $('size').value === '75000' ? S.legacy75kPay : S.legacyPay, `Min balance ${f(py.minBalanceToRequest)}${py.safetyNetApplies ? ' (safety net, payouts 1–3)' : ''}`, 'amountLeft');
    h += kpi('Next payout cap', `#${py.nextPayoutNumber}: ${f(py.nextPayoutCap)}`, '', $('size').value === '75000' ? S.legacy75kPay : S.legacyPay, `Requestable now ≈ ${f(py.requestableNow)} · split ${py.split}`, 'cap');
  } else {
    const c = p.consistency, py = p.payout, pS = type === 'EOD' ? S.payEod : S.payIntra;
    h += kpi('Max profit today (consistency)', c.priorNet > 0 ? 'under ' + f(c.maxProfitTodayExclusive) : 'n/a', 'grn', S.consistency,
      c.met ? `Met now (${(c.pct*100).toFixed(0)}%)` : (c.achievableToday ? `Need over ${f(c.minProfitTodayToMeetExclusive)} today to meet` : `Not met${c.pct?` (${(c.pct*100).toFixed(0)}%)`:''}; needs more days`), 'consistency');
    h += kpi('Qualifying days left', py.daysLeft, '', pS, `${py.qualifyingDays}/5 days ≥ ${f(py.minDailyProfit)}`, 'daysLeft');
    h += kpi('$ left to request payout', f(py.amountLeft), '', pS, `Min balance ${f(py.minBalanceToRequest)} · safety net ${f(py.safetyNet)}`, 'amountLeft');
    h += kpi('Next payout cap', py.nextPayoutNumber ? `#${py.nextPayoutNumber}: ${f(py.nextPayoutCap)}` : 'Max 6 reached', '', pS, `Requestable now ≈ ${f(py.requestableNow >= 500 ? py.requestableNow : 0)}`, 'cap');
  }
  h += `</div><ul class="ifthen">`;
  h += `<li><b>If</b> balance reaches <b>${f(p.stopAtBalance)}</b> (−${f(p.maxLossToday)} more) → <b>${p.dll != null && p.dllRoom <= p.distanceToThreshold ? 'stop trading for the day' : 'account is liquidated — stop well before this'}</b>.</li>`;
  h += `<li><b>Never</b> hold more than <b>${p.contracts}</b> minis (or ${p.contracts*10} micros) combined.</li>`;
  if (phase === 'PA' && !L) {
    const c = p.consistency;
    if (c.priorNet > 0) h += `<li><b>If</b> today's profit nears <b>${f(c.maxProfitTodayExclusive)}</b> → stop; one day ≥50% of net profit blocks payouts.</li>`;
    if (p.payout.daysLeft) h += `<li><b>If</b> you close today ≥ ${f(p.payout.minDailyProfit)} → it counts as a qualifying day (${p.payout.daysLeft} needed).</li>`;
  }
  if (phase === 'PA' && L) {
    const c = p.consistency;
    if (c.applies && c.priorNet > 0) h += `<li><b>If</b> today's profit nears <b>${f(c.maxProfitTodayExclusive)}</b> → stop; any day &gt;30% of profit since last payout blocks payouts.</li>`;
    h += `<li><b>Never</b> let one open trade go more than <b>${f(p.maePerTrade)}</b> negative; keep stop ≤ 5× target.</li>`;
  }
  if (type !== 'EOD' && !(L && p.static)) h += `<li>Live trailing: every new peak (incl. unrealized) raises your threshold — update "peak" as you trade.</li>`;
  $('plan').innerHTML = h + '</ul>';
}
// Prefill from URL, e.g. ?type=LEGACY&size=50000&phase=PA&balance=52300 (shareable plans).
const Q = new URLSearchParams(location.search);
if (Q.get('type')) { $('type').value = Q.get('type'); fillSizes($('type').value); lastType = $('type').value; }
['size','phase','platform','balance','peak','today','payouts','since','reached','days'].forEach((k) => { if (Q.has(k)) $(k).value = Q.get(k); });
document.querySelectorAll('input,select').forEach((e) => e.addEventListener('input', render)); render();
$('srcs').innerHTML = Object.entries(R.SRC).map(([k, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${u.replace('https://apextraderfunding.com','')}</a> — verified ${R.VERIFIED}</li>`).join('');
$('sub').addEventListener('submit', async (e) => { e.preventDefault();
  const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: $('email').value }) });
  $('subMsg').textContent = r.ok ? "You're on the list. Thanks!" : 'Something went wrong — try again.'; });
