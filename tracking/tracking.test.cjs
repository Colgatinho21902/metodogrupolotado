const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const handler = require('../api/meta.js');
const browser = fs.readFileSync(require('node:path').join(__dirname, 'browser.js'), 'utf8');
const origin = 'https://escoladeafiliados.vercel.app';

function browserHarness(settings, privacy = {}) {
  const requests = [], cookies = new Map(), scripts = [];
  const document = { head: { appendChild: s => scripts.push(s) }, createElement: () => ({}) };
  Object.defineProperty(document, 'cookie', {
    get: () => [...cookies].map(([k,v]) => k+'='+v).join('; '),
    set: value => { const [pair] = value.split(';'); const pos = pair.indexOf('='); cookies.set(pair.slice(0,pos),pair.slice(pos+1)); }
  });
  const context = vm.createContext({ window: {}, document, navigator: privacy,
    localStorage: { getItem: () => privacy.denied ? 'denied' : null },
    location: { origin, pathname: '/', search: '?fbclid=realClick123' },
    crypto: webcrypto, URLSearchParams, console,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => settings };
    }
  });
  vm.runInContext(browser, context);
  return { context, requests, scripts, cookies };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('browser queues early clicks; one Pixel init; browser/server IDs match; no duplicate checkout', async () => {
  const h = browserHarness({ production: true, serverEnabled: true, pixelId: '1794863211794229' });
  h.context.window.edaMeta.track('InitiateCheckout', {}, 'checkout-event-123');
  h.context.window.edaMeta.track('InitiateCheckout', {}, 'another-event-456');
  await flush();
  vm.runInContext(browser, h.context);
  const pixel = h.context.window.fbq.queue.map(args => [...args]);
  assert.equal(pixel.filter(call => call[0] === 'init').length, 1);
  assert.equal(h.scripts.length, 1);
  const posts = h.requests.filter(r => r.options?.method === 'POST');
  assert.equal(posts.length, 3);
  for (const request of posts) {
    assert.equal(request.options.keepalive, true);
    const body = JSON.parse(request.options.body);
    const match = pixel.find(call => call[0] === 'trackSingle' && call[2] === body.event_name);
    assert.equal(match[4].eventID, body.event_id);
    assert.match(body.fbp, /^fb\.1\./);
    assert.match(body.fbc, /realClick123$/);
  }
  assert.equal(posts.filter(r => JSON.parse(r.options.body).event_name === 'InitiateCheckout').length, 1);
});

test('preview, saved refusal, DNT and GPC never initialize Pixel or send server events', async () => {
  for (const privacy of [{}, { denied: true }, { doNotTrack: '1' }, { globalPrivacyControl: true }]) {
    const h = browserHarness({ production: false, serverEnabled: false, pixelId: '1794863211794229' }, privacy);
    h.context.window.edaMeta.track('InitiateCheckout');
    await flush();
    assert.equal(h.scripts.length, 0);
    assert.equal(h.requests.filter(r => r.options?.method === 'POST').length, 0);
  }
});

function response() {
  return { headers: {}, code: 200, setHeader(k,v) { this.headers[k]=v; },
    status(code) { this.code=code; return this; }, json(body) { this.body=body; return this; } };
}
function request(overrides = {}) {
  return { method: 'POST', headers: { origin, 'content-type': 'application/json', 'user-agent': 'test', 'x-vercel-forwarded-for': '192.0.2.1' },
    body: { event_name: 'InitiateCheckout', event_id: webcrypto.randomUUID(), event_time: Math.floor(Date.now()/1000), consent: true,
      event_source_url: origin+'/', fbp: 'fb.1.1700000000000.1234' }, ...overrides };
}
test('server validates payload, enforces production/privacy, protects token and coalesces duplicate IDs', async () => {
  const savedFetch = global.fetch;
  const savedEnv = { ...process.env };
  const calls = [];
  process.env.VERCEL_ENV = 'production'; process.env.META_ACCESS_TOKEN = 'test-only-not-a-real-token';
  global.fetch = async (url, options) => { calls.push({url, options}); return {ok:true,json:async()=>({events_received:1})}; };
  try {
    let res = response(); await handler({ method: 'GET', headers: {} },res);
    assert.equal(res.body.serverEnabled,true);
    assert.equal(JSON.stringify(res.body).includes(process.env.META_ACCESS_TOKEN),false);
    const req = request();
    const responses = [response(),response()];
    await Promise.all(responses.map(r=>handler(req,r)));
    assert.equal(calls.length,1);
    const payload = JSON.parse(calls[0].options.body).data[0];
    assert.equal(payload.event_id,req.body.event_id);
    assert.equal(payload.custom_data.value,157.90);
    assert.equal(payload.user_data.client_ip_address,'192.0.2.1');
    assert.equal(payload.action_source,'website');
    assert.equal(calls[0].url.includes(process.env.META_ACCESS_TOKEN),false);
    for (const change of [
      {headers:{origin:'https://attacker.example'}},
      {body:{...req.body,event_id:webcrypto.randomUUID(),event_name:'Purchase'}},
      {body:{...req.body,event_id:webcrypto.randomUUID(),event_source_url:'https://attacker.example/'}},
      {body:{...req.body,event_id:webcrypto.randomUUID(),consent:false}}
    ]) { res=response();await handler(request(change),res); assert.ok(res.code>=400); }
    res=response();await handler(request({headers:{...req.headers,dnt:'1'}}),res); assert.equal(res.body.skipped,'privacy_preference');
    process.env.VERCEL_ENV='preview';res=response();await handler(request(),res);assert.equal(res.body.skipped,'preview');
    process.env.VERCEL_ENV='production';delete process.env.META_ACCESS_TOKEN;
    res=response();await handler(request(),res);assert.equal(res.code,503);
    assert.equal(calls.length,1);
  } finally { global.fetch=savedFetch;process.env=savedEnv; }
});
