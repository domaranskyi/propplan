// MVP: signups are logged to Vercel function logs (search "PROPPLAN_SIGNUP"). TODO: persist to a private store.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'invalid email' });
  const rec = { email, ts: new Date().toISOString() };
  console.log('PROPPLAN_SIGNUP', JSON.stringify(rec));
  res.status(200).json({ ok: true });
};
