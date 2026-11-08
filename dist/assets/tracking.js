(function () {
  'use strict';
  if (window.edaMeta) return;
  var PIXEL = '1794863211794229', BASE = 'https://pay.kiwify.com.br/povy39E?afid=Z4HTVvAl';
  var settings, initializing, initialized = false, sent = new Set(), once = new Set();
  var choice; try { choice = localStorage.getItem('eda_meta_consent'); } catch (_) {}
  var campaign = {}, keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
  try { campaign = JSON.parse(sessionStorage.getItem('eda_campaign') || '{}') || {}; } catch (_) {}
  if (typeof campaign !== 'object' || Array.isArray(campaign)) campaign = {};
  var query = new URLSearchParams(location.search), changed = false;
  keys.forEach(function (key) { if (query.has(key)) { campaign[key] = query.get(key); changed = true; } });
  if (changed) try { sessionStorage.setItem('eda_campaign', JSON.stringify(campaign)); } catch (_) {}
  function permitted() { return choice !== 'denied' && navigator.doNotTrack !== '1' && navigator.globalPrivacyControl !== true; }
  function cookie(name) { var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function saveCookie(name, value) { document.cookie = name + '=' + encodeURIComponent(value) + '; Max-Age=7776000; Path=/; Secure; SameSite=Lax'; }
  function checkoutUrl() {
    var url = new URL(BASE), found = false;
    keys.forEach(function (key) { if (typeof campaign[key] === 'string' && campaign[key]) { url.searchParams.set(key, campaign[key]); found = true; } });
    return found ? url.toString() : BASE;
  }
  function send(name, eventId) {
    if (!permitted() || !settings || !settings.production || sent.has(eventId)) return;
    sent.add(eventId);
    var params = name === 'PageView' ? {} : { content_name: 'Escola de Afiliados Elite', value: 157.90, currency: 'BRL' };
    try { window.fbq('track', name, params, { eventID: eventId }); } catch (_) {}
    if (!settings.serverEnabled) return;
    try {
      fetch('/api/meta', { method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          event_name: name, event_id: eventId, event_time: Math.floor(Date.now()/1000),
          event_source_url: location.origin + location.pathname, fbp: cookie('_fbp'), fbc: cookie('_fbc'), measurement_allowed: true
        }) }).then(function (r) { if (!r.ok) console.warn('Medição pelo servidor indisponível:', r.status); }).catch(function () {});
    } catch (_) {}
  }
  function initialize() {
    if (!permitted() || location.pathname !== '/') return Promise.resolve(false);
    if (initialized) { if (choice === 'accepted' && window.fbq) window.fbq('consent', 'grant'); return Promise.resolve(true); }
    if (initializing) return initializing;
    initializing = fetch('/api/meta', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('configuration unavailable'); return r.json();
    }).then(function (config) {
      if (!permitted() || !config.production || config.pixelId !== PIXEL) return false;
      settings = config;
      if (!window.fbq) {
        var fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
        window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
        var script = document.createElement('script'); script.async = true;
        script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
      }
      window.fbq('set', 'autoConfig', false, PIXEL);
      if (choice === 'accepted') window.fbq('consent', 'grant');
      window.fbq('init', PIXEL);
      initialized = true;
      if (!cookie('_fbp')) saveCookie('_fbp', 'fb.1.' + Date.now() + '.' + Math.floor(Math.random()*1e12));
      var clickId = campaign.fbclid;
      if (typeof clickId === 'string' && /^[A-Za-z0-9_-]{1,500}$/.test(clickId)) saveCookie('_fbc', 'fb.1.' + Date.now() + '.' + clickId);
      ['PageView','ViewContent'].forEach(function (name) {
        if (!once.has(name)) { once.add(name); send(name, crypto.randomUUID()); }
      });
      return true;
    }).catch(function () { return false; }).finally(function () { initializing = null; });
    return initializing;
  }
  function track(name) {
    if (!['PageView','ViewContent','InitiateCheckout'].includes(name) || !permitted()) return;
    if (name !== 'InitiateCheckout') return;
    var eventId = crypto.randomUUID();
    initialize().then(function (ready) { if (ready) send(name, eventId); });
    return eventId;
  }
  var clickLocked = false, lastClick = 0;
  function refresh() {
    document.querySelectorAll('a[id^="cta-"]').forEach(function (anchor) { anchor.href = checkoutUrl(); });
  }
  function click(event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[id^="cta-"]') : event.currentTarget;
    if (!anchor || !anchor.id || !anchor.id.startsWith('cta-')) return;
    anchor.href = checkoutUrl();
    var now = Date.now();
    if (clickLocked || now-lastClick < 1000) { event.preventDefault(); return; }
    lastClick = now;
    try { track('InitiateCheckout'); } catch (_) {}
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
    event.preventDefault(); clickLocked = true;
    var destination = anchor.href;
    // Bounded handoff: the server uses keepalive; checkout never waits on Meta's response.
    window.setTimeout(function () { clickLocked = false; location.assign(destination); }, 250);
  }
  function setChoice(value) {
    choice = value;
    try { localStorage.setItem('eda_meta_consent', value); } catch (_) {}
    if (value === 'accepted') initialize();
    else {
      if (window.fbq) window.fbq('consent', 'revoke');
      ['_fbp','_fbc'].forEach(function (name) { document.cookie = name+'=; Max-Age=0; Path=/; Secure; SameSite=Lax'; });
    }
    var dialog = document.getElementById('eda-cookie-dialog'); if (dialog) dialog.close();
  }
  function mount() {
    if (document.getElementById('eda-cookie-dialog')) return;
    var dialog = document.createElement('dialog'); dialog.id = 'eda-cookie-dialog';
    dialog.setAttribute('aria-labelledby','eda-cookie-title');
    dialog.innerHTML = '<h2 id="eda-cookie-title">Sua privacidade</h2><p>A medição pelo Pixel da Meta e pelo servidor inicia automaticamente para medir visitas, interesse e cliques de compra e melhorar anúncios. Você pode desativá-la aqui. A compra funciona com a medição desativada.</p><p><a href="/privacidade.html">Política de Privacidade</a></p><div class="eda-cookie-actions"><button type="button" data-choice="denied">Desativar medição</button><button type="button" data-choice="accepted">Ativar medição</button></div>';
    dialog.querySelectorAll('[data-choice]').forEach(function (button) { button.addEventListener('click', function () { setChoice(button.dataset.choice); }); });
    // Closing preferences without choosing preserves the current setting.
    document.body.appendChild(dialog);
  }
  function open() { mount(); document.getElementById('eda-cookie-dialog').showModal(); }
  window.edaMeta = { track: track };
  window.edaCheckout = { click: click, url: checkoutUrl, refresh: refresh };
  window.edaPrivacy = { mount: mount, open: open, setChoice: setChoice };
  // Delegation makes checkout available before the React bundle has hydrated.
  document.addEventListener('click', click);
  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('pageshow', function () { clickLocked = false; lastClick = 0; });
  initialize();
}());
