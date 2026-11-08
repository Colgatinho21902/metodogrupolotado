const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const handler = require('../api/meta.js');
const browser = fs.readFileSync(require('node:path').join(__dirname,'browser.js'),'utf8');
const origin = 'https://escoladeafiliados.vercel.app';
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness(options={}) {
 const posts=[],scripts=[],cookies=new Map(),timers=[],listeners={},assigned=[];
 const local=new Map(options.choice ? [['eda_meta_consent',options.choice]] : []);
 const session=new Map(options.saved ? [['eda_campaign',JSON.stringify(options.saved)]] : []);
 const storage = map => ({getItem:k=>{if(options.blockStorage)throw Error('blocked');return map.get(k)||null},setItem:(k,v)=>{if(options.blockStorage)throw Error('blocked');map.set(k,v)}});
 const document={head:{appendChild:s=>scripts.push(s)},createElement:()=>({}),querySelectorAll:()=>[],getElementById:()=>null,addEventListener:(n,f)=>listeners[n]=f};
 Object.defineProperty(document,'cookie',{get:()=>[...cookies].map(([k,v])=>k+'='+v).join('; '),set:v=>{const pair=v.split(';')[0], i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}});
 const context=vm.createContext({window:{addEventListener:(n,f)=>listeners[n]=f,setTimeout:(f,ms)=>timers.push({f,ms})},document,navigator:options.privacy||{},localStorage:storage(local),sessionStorage:storage(session),location:{origin,pathname:options.path||'/',search:options.search||'',assign:u=>assigned.push(u)},crypto:webcrypto,URL,URLSearchParams,Set,Date,Promise,console,fetch:async(url,config)=>{posts.push({url,config});return {ok:true,json:async()=>({pixelId:'1794863211794229',production:options.production!==false,serverEnabled:true})}}});
 vm.runInContext(browser,context);
 return {context,posts,scripts,cookies,timers,listeners,assigned,session};
}
test('one external Pixel, standard events once, same browser/server IDs, no Purchase or Lead',async()=>{
 const h=harness({choice:'accepted',search:'?fbclid=realClick123'});await flush();vm.runInContext(browser,h.context);await flush();
 const q=Array.from(h.context.window.fbq.queue,a=>[...a]);assert.equal(h.scripts.length,1);assert.equal(q.filter(a=>a[0]==='init').length,1);
 assert.deepEqual(q.filter(a=>a[0]==='track').map(a=>a[1]),['PageView','ViewContent']);
 const posts=h.posts.filter(p=>p.config?.method==='POST');assert.equal(posts.length,2);
 for(const p of posts){const b=JSON.parse(p.config.body);const e=q.find(a=>a[0]==='track'&&a[1]===b.event_name);assert.equal(e[3].eventID,b.event_id);assert.equal(p.config.keepalive,true);assert.match(b.event_id,/^[a-f0-9-]{36}$/)}
 const view=q.find(a=>a[1]==='ViewContent');assert.equal(view[2].value,157.90);assert.equal(view[2].currency,'BRL');
});
test('unknown consent, refusal, DNT, GPC, preview and legal pages do not send events',async()=>{
 for(const o of [{},{choice:'denied'},{choice:'accepted',privacy:{doNotTrack:'1'}},{choice:'accepted',privacy:{globalPrivacyControl:true}},{choice:'accepted',production:false},{choice:'accepted',path:'/privacidade.html'}]){
 const h=harness(o);h.context.window.edaMeta.track('InitiateCheckout');await flush();assert.equal(h.scripts.length,0);assert.equal(h.posts.filter(p=>p.config?.method==='POST').length,0);
 }
});
test('checkout URL preserves afid and all received campaign parameters, persists session and adds no fabricated values',()=>{
 const base='https://pay.kiwify.com.br/povy39E?afid=Z4HTVvAl';assert.equal(harness().context.window.edaCheckout.url(),base);
 const query='?utm_source=instagram&utm_medium=cpc&utm_campaign=Teste%20A&utm_content=video&utm_term=grupo&fbclid=Click_1&afid=attacker';
 const h=harness({search:query});const url=new URL(h.context.window.edaCheckout.url());assert.equal(url.searchParams.get('afid'),'Z4HTVvAl');assert.equal([...url.searchParams].length,7);assert.equal(url.searchParams.get('utm_term'),'grupo');
 const saved=JSON.parse(h.session.get('eda_campaign'));const h2=harness({saved});assert.equal(h2.context.window.edaCheckout.url(),url.toString());
 assert.doesNotThrow(()=>harness({blockStorage:true,search:query}).context.window.edaCheckout.url());
});
test('all CTA handoffs have 250ms bound, double click guard, later return allowed, attribution works without consent',async()=>{
 const h=harness({choice:'accepted'});await flush();const click=()=>{let prevented=false;const e={currentTarget:{href:'',id:'cta-checkout'},button:0,preventDefault:()=>prevented=true};h.context.window.edaCheckout.click(e);return {e,prevented}};
 assert.equal(click().prevented,true);assert.equal(click().prevented,true);await flush();assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,250);h.timers[0].f();assert.equal(h.assigned[0],'https://pay.kiwify.com.br/povy39E?afid=Z4HTVvAl');
 h.listeners.pageshow();click();await flush();const posts=h.posts.filter(p=>p.config?.method==='POST').map(p=>JSON.parse(p.config.body)).filter(p=>p.event_name==='InitiateCheckout');assert.equal(posts.length,2);assert.notEqual(posts[0].event_id,posts[1].event_id);
 const no=harness();no.context.window.edaCheckout.click({currentTarget:{id:'cta-checkout'},preventDefault(){},button:0});assert.equal(no.timers[0].ms,250);await flush();assert.equal(no.posts.length,0);
});
test('revoking consent stops browser and CAPI; reaccepting does not repeat page events or load the base again',async()=>{
 const h=harness({choice:'accepted'});await flush();h.context.window.edaPrivacy.setChoice('denied');h.context.window.edaMeta.track('InitiateCheckout');await flush();assert.equal(h.posts.filter(p=>p.config?.method==='POST').length,2);
 h.context.window.edaPrivacy.setChoice('accepted');await flush();assert.equal(h.scripts.length,1);assert.equal(h.posts.filter(p=>p.config?.method==='POST').length,2);
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
