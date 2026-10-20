const R = window.PropPlan, $ = (id) => document.getElementById(id);
const f = (n) => n === Infinity ? 'No limit' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();
document.querySelector('.v').textContent = R.VERIFIED;
const src = (u) => `<a href="${u}" target="_blank" rel="noopener">source · verified ${R.VERIFIED}</a>`;
function kpi(label, val, cls, s, note) { return `<div class="kpi ${cls||''}"><small>${label}</small><b>${val}</b>${note?`<small>${note}</small><br>`:''}${s?src(s):''}</div>`; }
function render() {
  const type = $('type').value, phase = $('phase').value;
  document.querySelectorAll('.pa').forEach((e) => e.style.display = phase === 'PA' ? '' : 'none');
  $('peakLbl').textContent = type === 'EOD' ? 'Highest EOD (closing) balance ($)' : 'Highest peak balance incl. unrealized ($)';
  const p = R.plan({ size: $('size').value, type, phase, balance: $('balance').value, peak: $('peak').value, todayPnl: $('today').value,
    payoutsTaken: $('payouts').value, days: $('days').value.split(/[,\s]+/).filter(Boolean) });
  const S = R.SRC, ddSrc = type === 'EOD' ? S.eodDD : S.intraDD, acct = phase === 'EVAL' ? (type === 'EOD' ? S.evalEod : S.evalIntra) : (type === 'EOD' ? S.paEod : S.paIntra);
  let h = `<h2>Today's Plan</h2><div class="kpis">`;
  h += kpi('Max you can lose today', f(p.maxLossToday), 'red', p.dll != null && p.dllRoom <= p.distanceToThreshold ? S.dll : ddSrc, `Binding: ${p.bindingLimit}`);
  h += kpi('Drawdown threshold', f(p.threshold), '', ddSrc, `${f(p.distanceToThreshold)} away`);
  h += kpi('Daily loss limit', p.dll == null ? 'None' : f(p.dll), '', S.dll, p.dll == null ? 'Intraday evals have no DLL' : `${f(p.dllRoom)} left today`);
  h += kpi('Max contracts now', p.contracts + (p.tier ? ` (Tier ${p.tier.level})` : ''), '', phase === 'PA' ? S.scaling : acct, 'minis; 10 micros = 1 mini');
  if (phase === 'EVAL') h += kpi('Left to profit target', f(p.toTarget), 'grn', acct, `Target balance ${f(p.targetBalance)} · no min days`);
  else {
    const c = p.consistency, py = p.payout, pS = type === 'EOD' ? S.payEod : S.payIntra;
    h += kpi('Max profit today (consistency)', c.priorNet > 0 ? 'under ' + f(c.maxProfitTodayExclusive) : 'n/a', 'grn', S.consistency,
      c.met ? `Met now (${(c.pct*100).toFixed(0)}%)` : (c.achievableToday ? `Need over ${f(c.minProfitTodayToMeetExclusive)} today to meet` : `Not met${c.pct?` (${(c.pct*100).toFixed(0)}%)`:''}; needs more days`));
    h += kpi('Qualifying days left', py.daysLeft, '', pS, `${py.qualifyingDays}/5 days ≥ ${f(py.minDailyProfit)}`);
    h += kpi('$ left to request payout', f(py.amountLeft), '', pS, `Min balance ${f(py.minBalanceToRequest)} · safety net ${f(py.safetyNet)}`);
    h += kpi('Next payout cap', py.nextPayoutNumber ? `#${py.nextPayoutNumber}: ${f(py.nextPayoutCap)}` : 'Max 6 reached', '', pS, `Requestable now ≈ ${f(py.requestableNow >= 500 ? py.requestableNow : 0)}`);
  }
  h += `</div><ul class="ifthen">`;
  h += `<li><b>If</b> balance reaches <b>${f(p.stopAtBalance)}</b> (−${f(p.maxLossToday).replace('$','$')} more) → <b>stop trading for the day</b>.</li>`;
  h += `<li><b>Never</b> hold more than <b>${p.contracts}</b> minis (or ${p.contracts*10} micros) combined.</li>`;
  if (phase === 'PA') {
    const c = p.consistency;
    if (c.priorNet > 0) h += `<li><b>If</b> today's profit nears <b>${f(c.maxProfitTodayExclusive)}</b> → stop; one day ≥50% of net profit blocks payouts.</li>`;
    if (p.payout.daysLeft) h += `<li><b>If</b> you close today ≥ ${f(p.payout.minDailyProfit)} → it counts as a qualifying day (${p.payout.daysLeft} needed).</li>`;
  }
  if (type === 'INTRADAY') h += `<li>Intraday trailing: every new peak (incl. unrealized) raises your threshold — update "peak" as you trade.</li>`;
  $('plan').innerHTML = h + '</ul>';
}
document.querySelectorAll('input,select').forEach((e) => e.addEventListener('input', render)); render();
$('srcs').innerHTML = Object.entries(R.SRC).map(([k, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${u.replace('https://apextraderfunding.com','')}</a> — verified ${R.VERIFIED}</li>`).join('');
$('sub').addEventListener('submit', async (e) => { e.preventDefault();
  const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: $('email').value }) });
  $('subMsg').textContent = r.ok ? "You're on the list. Thanks!" : 'Something went wrong — try again.'; });
