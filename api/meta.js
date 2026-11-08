'use strict';
const PIXEL_ID = '1794863211794229';
const ALLOWED_ORIGIN = 'https://escoladeafiliados.vercel.app';
const EVENTS = new Set(['PageView', 'ViewContent', 'InitiateCheckout']);
const recent = new Map();

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const production = process.env.VERCEL_ENV === 'production';
  const token = process.env.META_ACCESS_TOKEN;
  if (req.method === 'GET') return res.status(200).json({ pixelId: PIXEL_ID, production, serverEnabled: production && !!token });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (req.headers.origin !== ALLOWED_ORIGIN) return res.status(403).json({ error: 'origin_not_allowed' });
  if (!production) return res.status(200).json({ skipped: 'preview' });
  if (!token) return res.status(503).json({ error: 'server_not_configured' });
  if (req.headers.dnt === '1' || req.headers['sec-gpc'] === '1') return res.status(200).json({ skipped: 'privacy_preference' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ error: 'json_required' });
  let body;
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw) > 4096) throw new Error();
    body = typeof req.body === 'string' ? JSON.parse(raw) : req.body;
  } catch (_) { return res.status(400).json({ error: 'invalid_body' }); }
  const now = Math.floor(Date.now() / 1000);
  if (!body || (body.measurement_allowed !== true && body.consent !== true) || !EVENTS.has(body.event_name) ||
      !/^[A-Za-z0-9_-]{8,100}$/.test(body.event_id || '') ||
      !Number.isInteger(body.event_time) || body.event_time < now - 3600 || body.event_time > now + 60) {
    return res.status(400).json({ error: 'invalid_event' });
  }
  let source;
  try {
    source = new URL(body.event_source_url);
    if (source.origin !== ALLOWED_ORIGIN || source.pathname !== '/') throw new Error();
  } catch (_) { return res.status(400).json({ error: 'invalid_source' }); }
  const key = body.event_name + ':' + body.event_id;
  for (const [id, entry] of recent) if (entry.expires < Date.now()) recent.delete(id);
  if (recent.has(key)) return res.status(200).json(await recent.get(key).promise);
  const user = { client_user_agent: String(req.headers['user-agent'] || '').slice(0, 1000) };
  // Vercel supplies the trusted client address at its edge.
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (ip) user.client_ip_address = ip;
  if (/^fb\.1\.\d{10,16}\.\d{1,20}$/.test(body.fbp || '')) user.fbp = body.fbp;
  if (/^fb\.1\.\d{10,16}\.[A-Za-z0-9_-]{1,500}$/.test(body.fbc || '')) user.fbc = body.fbc;
  const event = { event_name: body.event_name, event_id: body.event_id, event_time: body.event_time,
    action_source: 'website', event_source_url: ALLOWED_ORIGIN + '/', user_data: user };
  if (body.event_name !== 'PageView') event.custom_data = {
    content_name: 'Escola de Afiliados Elite', content_type: 'product', currency: 'BRL', value: 157.90
  };
  const payload = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  const version = process.env.META_GRAPH_VERSION || 'v25.0';
  if (!/^v\d+\.0$/.test(version)) return res.status(503).json({ error: 'invalid_api_version' });
  const promise = (async () => {
    try {
      const response = await fetch(`https://graph.facebook.com/${version}/${PIXEL_ID}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(7000)
      });
      const result = await response.json();
      if (!response.ok || result.events_received !== 1) {
        console.error('meta_delivery_failed', { status: response.status, code: result.error?.code });
        return { delivered: false };
      }
      return { delivered: true };
    } catch (_) { console.error('meta_delivery_unavailable'); return { delivered: false }; }
  })();
  if (recent.size >= 5000) recent.delete(recent.keys().next().value);
  recent.set(key, { expires: Date.now() + 600000, promise });
  const result = await promise;
  if (!result.delivered) recent.delete(key);
  return res.status(result.delivered ? 200 : 502).json(result);
};
