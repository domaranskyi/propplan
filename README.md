# PropPlan
Free daily risk-plan calculator for Apex Trader Funding futures accounts: current EOD & Intraday (eval & PA) and **Legacy** accounts
(purchased before 2026-03-01: 25K/50K/75K/100K/150K/250K/300K Full and 100K Static). Not affiliated with Apex. Not financial advice.

- Rules data + math: `public/rules.js` (verified 2026-10-19, source URL per rule in `SRC`).
- Platform selector: Rithmic/Wealthcharts eval thresholds lock at the profit-target balance; Tradovate evals trail indefinitely.
- Optional "profit since last payout" overrides the sum of daily P&L for the consistency rule (50% current / 30% legacy).
- Tests: `npm test`. Build the single-file page Vercel serves: `npm run build` → `dist/index.html`
  (deploy `dist/index.html` as `public/index.html`, plus `public/robots.txt`, `api/subscribe.js`).
- URL prefill: `?type=LEGACY&size=100000S&phase=PA&balance=103000&peak=103200&today=0`.
