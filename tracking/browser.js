(function () {
  'use strict';
  if (window.edaMeta) return;
  var config, queue = [], sent = new Set(), checkoutSent = false;
  function permitted() {
    try { return navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1' && localStorage.getItem('eda_meta_consent') !== 'denied'; }
    catch (_) { return false; }
  }
  function cookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }
  function saveCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) + '; Max-Age=7776000; Path=/; Secure; SameSite=Lax';
  }
  function id() { return crypto.randomUUID(); }
  function send(name, params, eventId) {
    if (!permitted()) return;
    if (!config) { if (queue.length < 20) queue.push([name, params, eventId]); return; }
    if (!config.production || sent.has(eventId)) return;
    sent.add(eventId);
    window.fbq('trackSingle', config.pixelId, name, params, { eventID: eventId });
    if (!config.serverEnabled) return;
    var payload = {
      event_name: name, event_id: eventId, event_time: Math.floor(Date.now() / 1000),
      event_source_url: location.origin + location.pathname,
      fbp: cookie('_fbp'), fbc: cookie('_fbc'), consent: true
    };
    fetch('/api/meta', { method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) console.warn('Medição pelo servidor indisponível:', response.status);
    }).catch(function () { /* Measurement must never block checkout navigation. */ });
  }
  function track(name, params, eventId) {
    if (!['PageView', 'ViewContent', 'InitiateCheckout'].includes(name) || !permitted()) return;
    if (name === 'InitiateCheckout') {
      if (checkoutSent) return;
      checkoutSent = true;
    }
    send(name, name === 'PageView' ? {} : {
      content_name: 'Escola de Afiliados Elite', content_type: 'product', currency: 'BRL', value: 157.90
    }, eventId || id());
  }
  window.edaMeta = { track: track };
  if (!permitted()) return;
  // Preview and local sessions must not emit advertising events.
  fetch('/api/meta', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('configuration unavailable');
    return r.json();
  }).then(function (settings) {
    if (!settings.production || settings.pixelId !== '1794863211794229' || !permitted()) { queue = []; return; }
    config = settings;
    if (!cookie('_fbp')) saveCookie('_fbp', 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 1e12));
    var clickId = new URLSearchParams(location.search).get('fbclid');
    if (clickId && /^[A-Za-z0-9_-]{1,500}$/.test(clickId)) saveCookie('_fbc', 'fb.1.' + Date.now() + '.' + clickId);
    if (!window.fbq) {
      var fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
      window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      var script = document.createElement('script'); script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    }
    window.fbq('init', config.pixelId);
    // Only explicit events; the original CTA forwards into this single tracker.
    window.fbq('set', 'autoConfig', false, config.pixelId);
    track('PageView'); track('ViewContent');
    var pending = queue; queue = [];
    pending.forEach(function (event) { send.apply(null, event); });
  }).catch(function () { queue = []; });
}());
