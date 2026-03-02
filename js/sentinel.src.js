/* sentinel.src.js — SENTINEL v2 — READABLE SOURCE — do not serve this file directly */
/* The deployed file (sentinel.js) is the obfuscated build of this source.          */
;(function(W, D, N) {
  'use strict';

  // ── Sensitive string literals ──────────────────────────────────────────────
  var STORAGE_KEY = 'snl_data';
  var FAIL_TOKEN  = 'auth_fail';
  var URL_KEY_E   = 'email';
  var URL_KEY_P   = 'password';
  var HP_KEY      = 'website';

  // ── Config ─────────────────────────────────────────────────────────────────
  var CFG = {
    maxFail  : 5,
    window   : 72e3,               // 2-min rolling window for attempts
    lockouts : [36e4, 18e5, 72e5], // escalating: 6 min → 30 min → 2 hr
    rateMin  : 380,                // ms threshold for rapid-fire bot signal
    dtThresh : 160,                // px delta for DevTools probe
  };

  // ── Storage helpers ────────────────────────────────────────────────────────
  function rdState() {
    try { return JSON.parse(W.localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function wrState(d) {
    try { W.localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (_) {}
  }

  var s = rdState();
  if (!s._a)  s._a  = [];  // failed attempt timestamps
  if (!s._q)  s._q  = [];  // event queue
  if (!s._lx) s._lx = 0;   // lockout expiry (ms epoch)
  if (!s._lc) s._lc = 0;   // lockout escalation counter

  // ── Lockout helpers ────────────────────────────────────────────────────────
  function isLocked() { return s._lx > +new Date(); }
  function remain()   { return Math.max(0, s._lx - +new Date()); }
  function triggerLockout() {
    var dur = CFG.lockouts[Math.min(s._lc, CFG.lockouts.length - 1)];
    s._lc++;
    s._lx = +new Date() + dur;
    wrState(s);
    W.dispatchEvent(new CustomEvent('snl:lockout', {
      detail: { remain: dur, remaining: dur, ts: +new Date(), level: s._lc }
    }));
  }

  // ── Attempt tracker (sliding window) ──────────────────────────────────────
  function checkAttempts() {
    var now = +new Date();
    s._a = s._a.filter(function(t) { return now - t < CFG.window; });
    if (s._a.length >= CFG.maxFail) { triggerLockout(); return true; }
    return false;
  }

  // ── Event logger ───────────────────────────────────────────────────────────
  function logEvent(type, meta) {
    var e = { t: +new Date(), tp: type, ua: (N.userAgent || '').slice(0, 72), mx: meta || null };
    if (type === FAIL_TOKEN) { s._a.push(e.t); checkAttempts(); }
    s._q.push(e);
    if (s._q.length > 128) s._q = s._q.slice(-128);
    wrState(s);
  }

  // ── URL credential patrol ──────────────────────────────────────────────────
  (function() {
    var loc = W.location;
    if (!loc.search) return;
    var p = new URLSearchParams(loc.search), dirty = false;
    [URL_KEY_E, URL_KEY_P].forEach(function(k) {
      if (p.has(k)) { p.delete(k); dirty = true; }
    });
    if (dirty) {
      var clean = loc.pathname + (p.toString() ? ('?' + p.toString()) : '') + loc.hash;
      try { W.history.replaceState(null, '', clean); } catch (_) {}
      logEvent('url_patrol', { leaked: true });
    }
  })();

  // ── Form method enforcement (backstop) ────────────────────────────────────
  D.addEventListener('DOMContentLoaded', function() {
    D.querySelectorAll('form').forEach(function(f) {
      if ((f.getAttribute('method') || 'get').toLowerCase() === 'get' &&
          f.querySelector('input[type=password]')) {
        f.setAttribute('method', 'post');
        logEvent('form_hardened', { id: f.id || '?' });
      }
    });
  }, { once: true });

  // ── Honeypot injector ──────────────────────────────────────────────────────
  D.addEventListener('DOMContentLoaded', function() {
    var hid = HP_KEY + '_0';
    ['login-form', 'register-form'].forEach(function(id) {
      var fm = D.getElementById(id);
      if (!fm || D.getElementById(hid)) return;
      var hp = D.createElement('input');
      hp.type = 'text'; hp.name = HP_KEY; hp.id = hid;
      hp.setAttribute('autocomplete', 'off');
      hp.setAttribute('tabindex', '-1');
      hp.setAttribute('aria-hidden', 'true');
      hp.style.cssText = 'position:absolute;left:-9999px;opacity:0;height:0;width:0;pointer-events:none;';
      fm.appendChild(hp);
    });
  }, { once: true });

  // ── Passive DevTools probe ─────────────────────────────────────────────────
  (function() {
    var last = 0;
    function check() {
      var dw = W.outerWidth - W.innerWidth, dh = W.outerHeight - W.innerHeight;
      if ((dw > CFG.dtThresh || dh > CFG.dtThresh) && +new Date() - last > 5000) {
        last = +new Date();
        logEvent('dt', { dw: dw, dh: dh });
      }
    }
    W.addEventListener('resize', check, { passive: true });
  })();

  // ── Timing probe (bot rapid-fire detection) ────────────────────────────────
  var tLast = 0;
  function timingProbe() {
    var n = +new Date(), d = n - tLast; tLast = n;
    if (d > 0 && d < CFG.rateMin && tLast > 1e10) { logEvent('rp', { d: d }); }
  }

  // ── Behavioral entropy (mouse density before first submit) ────────────────
  var mve = 0;
  W.addEventListener('mousemove', function() { if (mve < 9999) mve++; }, { passive: true });

  // ── Honeypot read helper ───────────────────────────────────────────────────
  function honeypotFilled() {
    var el = D.getElementById(HP_KEY + '_0');
    return !!(el && el.value.length > 0);
  }

  // ── Clear on success ───────────────────────────────────────────────────────
  function clearState() { s._a = []; s._lx = 0; s._lc = 0; wrState(s); }

  // ── Flush pending events to RTDB ──────────────────────────────────────────
  function syncEvents(uid, db, rfn, ps) {
    if (!uid || !db || !s._q || !s._q.length) return;
    var cpy = s._q.slice(); s._q = []; wrState(s);
    try {
      var nd = rfn(db, 'sentinel_logs/' + uid);
      cpy.forEach(function(e) { ps(nd, e).catch(function() {}); });
    } catch (_) {}
  }

  // ── Auth lifecycle hooks ───────────────────────────────────────────────────
  W.addEventListener('snl:fail', function(e) { logEvent(FAIL_TOKEN, (e && e.detail) || null); });
  W.addEventListener('snl:ok',   function()  { clearState(); });

  // ── Sentinel warning popup ────────────────────────────────────────────────
  // Shows a prominent modal overlay regardless of what page is active.
  // duration 0 = user must click ACKNOWLEDGE to dismiss.
  function _showSentinelWarning(title, subtitle, body, color, duration) {
    color    = color    || '#f5a623';
    duration = (duration === undefined) ? 6000 : duration;

    // inject keyframe CSS once
    if (!D.getElementById('snl-kf')) {
      var sty = D.createElement('style');
      sty.id = 'snl-kf';
      sty.textContent = '@keyframes snl-pulse{0%,100%{opacity:1}50%{opacity:.25}}' +
                        '@keyframes snl-fadein{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}';
      D.head.appendChild(sty);
    }

    var prev = D.getElementById('snl-warning-overlay');
    if (prev) prev.remove();

    var overlay = D.createElement('div');
    overlay.id = 'snl-warning-overlay';
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:2147483646',
      'background:rgba(0,0,0,.82)',
      'display:flex','align-items:center','justify-content:center',
      'backdrop-filter:blur(10px)','-webkit-backdrop-filter:blur(10px)',
      "font-family:'Courier New',monospace",
      'opacity:0','transition:opacity .3s ease',
    ].join(';');

    var panel = D.createElement('div');
    panel.style.cssText = [
      'background:#04040f',
      'border:1px solid '+color,
      'border-radius:8px',
      'width:min(90vw,480px)',
      'overflow:hidden',
      'box-shadow:0 0 80px '+color+'40,0 0 160px '+color+'18',
      'animation:snl-fadein .35s ease forwards',
    ].join(';');

    // ── title bar
    var hdr = D.createElement('div');
    hdr.style.cssText = [
      'padding:13px 18px 11px',
      'border-bottom:1px solid '+color+'30',
      'background:'+color+'10',
      'display:flex','align-items:center','gap:10px',
    ].join(';');
    var dot = D.createElement('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:'+color+
                        ';box-shadow:0 0 8px '+color+';flex-shrink:0;animation:snl-pulse 1.2s infinite;';
    var hdrTxt = D.createElement('span');
    hdrTxt.textContent = '\u2593\u2593 SENTINEL v2 \u2593\u2593 \u2014 SECURITY ALERT';
    hdrTxt.style.cssText = 'color:'+color+';font-size:10px;letter-spacing:.18em;text-shadow:0 0 10px '+color+'80;';
    hdr.appendChild(dot); hdr.appendChild(hdrTxt);
    panel.appendChild(hdr);

    // ── body
    var bdy = D.createElement('div');
    bdy.style.cssText = 'padding:24px 22px 18px;';

    var ttEl = D.createElement('div');
    ttEl.textContent = title;
    ttEl.style.cssText = 'color:'+color+';font-size:15px;font-weight:bold;letter-spacing:.07em;'+
                         'text-shadow:0 0 14px '+color+'80;margin-bottom:7px;';

    var stEl = D.createElement('div');
    stEl.textContent = subtitle;
    stEl.style.cssText = 'color:rgba(255,255,255,.88);font-size:12px;letter-spacing:.03em;margin-bottom:14px;';

    var bdEl = D.createElement('div');
    bdEl.textContent = body;
    bdEl.style.cssText = [
      'color:rgba(255,255,255,.48)',
      'font-size:10px','letter-spacing:.025em','line-height:1.75',
      'border-left:2px solid '+color+'35',
      'padding-left:10px',
    ].join(';');

    bdy.appendChild(ttEl); bdy.appendChild(stEl); bdy.appendChild(bdEl);
    panel.appendChild(bdy);

    // ── actions
    var act = D.createElement('div');
    act.style.cssText = 'padding:0 22px 18px;display:flex;justify-content:flex-end;';

    var ack = D.createElement('button');
    ack.textContent = 'ACKNOWLEDGE';
    ack.style.cssText = [
      'background:'+color+'15',
      'border:1px solid '+color+'55',
      'color:'+color,
      "font-family:'Courier New',monospace",
      'font-size:10px','letter-spacing:.12em',
      'padding:9px 20px','border-radius:4px',
      'cursor:pointer','transition:background .15s',
    ].join(';');
    ack.onmouseover = function() { ack.style.background = color+'30'; };
    ack.onmouseout  = function() { ack.style.background = color+'15'; };
    ack.onclick = dismiss;

    act.appendChild(ack);
    panel.appendChild(act);
    overlay.appendChild(panel);
    D.body.appendChild(overlay);

    requestAnimationFrame(function() { overlay.style.opacity = '1'; });

    var _t = duration ? setTimeout(dismiss, duration) : null;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) dismiss(); });

    function dismiss() {
      if (_t) clearTimeout(_t);
      overlay.style.opacity = '0';
      setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 350);
    }
  }

  // ── Lockout warning (fires on real lockouts AND test presets) ─────────────
  W.addEventListener('snl:lockout', function(e) {
    var d    = (e && e.detail) || {};
    var ms   = d.remain || d.remaining || 36e4;
    var mins = Math.ceil(ms / 60000);
    var lvl  = d.level || 1;
    var clr  = lvl >= 3 ? '#ff4080' : lvl === 2 ? '#ff6b35' : '#f5a623';
    _showSentinelWarning(
      'ACCOUNT LOCKED \u2014 LEVEL ' + lvl,
      'Too many failed login attempts.',
      'Access has been temporarily blocked for ' + mins + ' minute' + (mins !== 1 ? 's' : '') + '. ' +
      'Further violations will escalate the lockout duration. Please wait for the timer to expire before trying again.',
      clr,
      0  // user must acknowledge
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST CONSOLE   Ctrl + Shift + S
  // ══════════════════════════════════════════════════════════════════════════
  var _tcOpen = false;

  var PRESETS = [
    {
      label: 'Lockout — Level 1  (6 min)',
      color: '#f5a623',
      fn: function() {
        W.dispatchEvent(new CustomEvent('snl:lockout', {
          detail: { remain: 36e4, remaining: 36e4, ts: +new Date(), level: 1 }
        }));
      }
    },
    {
      label: 'Lockout — Level 2  (30 min)',
      color: '#f5a623',
      fn: function() {
        W.dispatchEvent(new CustomEvent('snl:lockout', {
          detail: { remain: 18e5, remaining: 18e5, ts: +new Date(), level: 2 }
        }));
      }
    },
    {
      label: 'Lockout — Level 3  (2 hr)',
      color: '#ff4080',
      fn: function() {
        W.dispatchEvent(new CustomEvent('snl:lockout', {
          detail: { remain: 72e5, remaining: 72e5, ts: +new Date(), level: 3 }
        }));
      }
    },
    {
      label: 'Auth Fail  (wrong password)',
      color: '#00d4ff',
      fn: function() {
        W.dispatchEvent(new CustomEvent('snl:fail', {
          detail: { code: 'auth/wrong-password', test: true }
        }));
        _showSentinelWarning(
          'AUTH FAILURE LOGGED',
          'Invalid credentials were entered.',
          'This failed attempt has been recorded and timestamped. ' +
          (CFG.maxFail - 1) + ' more failures within the rolling window will trigger an automatic account lockout.',
          '#00d4ff', 6000
        );
      }
    },
    {
      label: 'Honeypot Triggered',
      color: '#a855f7',
      fn: function() {
        W.dispatchEvent(new CustomEvent('snl:fail', {
          detail: { code: 'honeypot', test: true }
        }));
        _showSentinelWarning(
          'HONEYPOT TRIGGERED',
          'Automated bot behavior detected.',
          'A hidden decoy input field was filled that no legitimate user would interact with. ' +
          'This is a strong indicator of an automated script or bot. The request has been flagged and logged.',
          '#a855f7', 6000
        );
      }
    },
    {
      label: 'Rate Probe  (rapid submit)',
      color: '#44dd88',
      fn: function() {
        logEvent('rp', { d: 80, test: true });
        _showSentinelWarning(
          'RATE ANOMALY FLAGGED',
          'Suspiciously rapid form submission detected.',
          'Submission timing of 80ms falls far outside normal human input ranges (threshold: ' +
          CFG.rateMin + 'ms). This pattern is consistent with automated tooling. ' +
          'The event has been recorded to the security log.',
          '#44dd88', 6000
        );
      }
    },
    {
      label: 'DevTools Detected',
      color: '#44dd88',
      fn: function() {
        logEvent('dt', { dw: 320, dh: 0, test: true });
        _showSentinelWarning(
          'DEVTOOLS DETECTED',
          'Browser developer tools appear to be open.',
          'An unusual viewport width delta of +320px was detected — consistent with the DevTools panel docked to the browser. ' +
          'This activity has been silently logged for review.',
          '#44dd88', 6000
        );
      }
    },
    {
      label: 'URL Patrol  (leaked creds)',
      color: '#a855f7',
      fn: function() {
        logEvent('url_patrol', { leaked: true, test: true });
        _showSentinelWarning(
          'CREDENTIAL LEAK INTERCEPTED',
          'Sensitive data was detected in the page URL.',
          'Email and/or password fields were present as URL query parameters — a critical security exposure. ' +
          'The credentials have been automatically scrubbed from the URL via history.replaceState() and this incident has been logged.',
          '#a855f7', 6000
        );
      }
    },
  ];

  function _showTestAlert(msg) {
    var prev = D.getElementById('snl-test-alert');
    if (prev) prev.remove();
    var box = D.createElement('div');
    box.id = 'snl-test-alert';
    box.style.cssText = [
      'position:fixed', 'top:20px', 'left:50%',
      'transform:translateX(-50%)',
      'background:#080812',
      'border:1px solid #f5a623',
      'color:#f5a623',
      "font:11px/1.4 'Courier New',monospace",
      'letter-spacing:.06em',
      'padding:11px 22px',
      'border-radius:5px',
      'z-index:1000001',
      'box-shadow:0 0 24px rgba(245,166,35,.3)',
      'text-shadow:0 0 8px #f5a623',
      'pointer-events:none',
      'white-space:pre-wrap',
      'max-width:min(90vw,480px)',
      'text-align:center',
      'opacity:0',
      'transition:opacity .25s ease',
    ].join(';');
    box.textContent = '\u25e0 SNL TEST \u25e0  ' + msg;
    D.body.appendChild(box);
    requestAnimationFrame(function() { box.style.opacity = '1'; });
    setTimeout(function() {
      box.style.opacity = '0';
      setTimeout(function() { if (box.parentNode) box.remove(); }, 350);
    }, 4000);
  }

  function _btnStyle(color) {
    return [
      'background:rgba(0,0,0,.4)',
      'border:1px solid ' + color + '55',
      'color:' + color,
      "font-family:'Courier New',monospace",
      'font-size:9.5px',
      'letter-spacing:.04em',
      'padding:9px 11px',
      'border-radius:4px',
      'cursor:pointer',
      'text-align:left',
      'line-height:1.4',
      'transition:background .15s,border-color .15s',
      'width:100%',
    ].join(';');
  }

  function openTestConsole() {
    if (_tcOpen) return;
    _tcOpen = true;

    var overlay = D.createElement('div');
    overlay.id = 'snl-test-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:1000000',
      'background:rgba(0,0,0,.72)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'backdrop-filter:blur(5px)', '-webkit-backdrop-filter:blur(5px)',
      "font-family:'Courier New',monospace",
    ].join(';');

    var panel = D.createElement('div');
    panel.style.cssText = [
      'background:#080812',
      'border:1px solid #00d4ff',
      'border-radius:8px',
      'width:min(95vw,500px)',
      'box-shadow:0 0 60px rgba(0,212,255,.18)',
      'overflow:hidden',
    ].join(';');

    // ── title bar ────────────────────────────────────────────────────────────
    var bar = D.createElement('div');
    bar.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:space-between',
      'padding:11px 16px',
      'border-bottom:1px solid rgba(0,212,255,.2)',
      'background:rgba(0,212,255,.07)',
    ].join(';');

    var dots = D.createElement('div');
    dots.innerHTML =
      '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#ff5f56;margin-right:5px"></span>' +
      '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#ffbd2e;margin-right:5px"></span>' +
      '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#27c93f;margin-right:10px"></span>';

    var title = D.createElement('span');
    title.textContent = '\u25e0 SENTINEL v2  \u2014\u2014  TEST_CONSOLE';
    title.style.cssText = 'color:#00d4ff;font-size:11px;letter-spacing:.14em;text-shadow:0 0 8px #00d4ff;flex:1;';

    var closeBtn = D.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background:none;border:none;color:#00d4ff;font-size:20px;cursor:pointer;line-height:1;padding:0 2px;opacity:.7;';
    closeBtn.onmouseover = function() { closeBtn.style.opacity = '1'; };
    closeBtn.onmouseout  = function() { closeBtn.style.opacity = '.7'; };
    closeBtn.onclick = closeConsole;

    bar.appendChild(dots);
    bar.appendChild(title);
    bar.appendChild(closeBtn);
    panel.appendChild(bar);

    // ── body ─────────────────────────────────────────────────────────────────
    var body = D.createElement('div');
    body.style.cssText = 'padding:18px;display:flex;flex-direction:column;gap:12px;max-height:70vh;overflow-y:auto;';

    // preset grid
    var pLabel = D.createElement('p');
    pLabel.textContent = '// PRESET SCENARIOS';
    pLabel.style.cssText = 'color:rgba(0,212,255,.5);font-size:10px;letter-spacing:.13em;margin:0;';
    body.appendChild(pLabel);

    var grid = D.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:7px;';

    PRESETS.forEach(function(p) {
      var btn = D.createElement('button');
      btn.textContent = p.label;
      btn.style.cssText = _btnStyle(p.color);
      btn.onmouseover = function() {
        btn.style.background = p.color + '22';
        btn.style.borderColor = p.color + 'aa';
      };
      btn.onmouseout = function() {
        btn.style.background = 'rgba(0,0,0,.4)';
        btn.style.borderColor = p.color + '55';
      };
      btn.onclick = function() {
        p.fn();
        btn.style.background = p.color + '44';
        setTimeout(closeConsole, 200);
      };
      grid.appendChild(btn);
    });
    body.appendChild(grid);

    // divider
    var div1 = D.createElement('div');
    div1.style.cssText = 'border-top:1px solid rgba(0,212,255,.13);';
    body.appendChild(div1);

    // custom message section
    var cLabel = D.createElement('p');
    cLabel.textContent = '// CUSTOM ALERT  —  type a message and fire it directly';
    cLabel.style.cssText = 'color:rgba(0,212,255,.5);font-size:10px;letter-spacing:.1em;margin:0;';
    body.appendChild(cLabel);

    var customRow = D.createElement('div');
    customRow.style.cssText = 'display:flex;gap:8px;';

    var inp = D.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'e.g. Suspicious login from 192.168.0.1…';
    inp.style.cssText = [
      'flex:1',
      'background:rgba(0,212,255,.05)',
      'border:1px solid rgba(0,212,255,.25)',
      'color:#a8d8ff',
      "font-family:'Courier New',monospace",
      'font-size:11px',
      'padding:9px 12px',
      'border-radius:4px',
      'outline:none',
      'min-width:0',
    ].join(';');
    inp.onfocus  = function() { inp.style.borderColor = 'rgba(0,212,255,.7)'; };
    inp.onblur   = function() { inp.style.borderColor = 'rgba(0,212,255,.25)'; };
    inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') fire(); });

    var fireBtn = D.createElement('button');
    fireBtn.textContent = 'FIRE';
    fireBtn.style.cssText = [
      'background:rgba(245,166,35,.1)',
      'border:1px solid rgba(245,166,35,.45)',
      'color:#f5a623',
      "font-family:'Courier New',monospace",
      'font-size:10px',
      'letter-spacing:.1em',
      'padding:9px 16px',
      'border-radius:4px',
      'cursor:pointer',
      'transition:background .15s',
      'white-space:nowrap',
      'flex-shrink:0',
    ].join(';');
    fireBtn.onmouseover = function() { fireBtn.style.background = 'rgba(245,166,35,.25)'; };
    fireBtn.onmouseout  = function() { fireBtn.style.background = 'rgba(245,166,35,.1)'; };
    fireBtn.onclick = fire;

    function fire() {
      var msg = inp.value.trim();
      if (!msg) { inp.style.borderColor = '#ff4080'; setTimeout(function() { inp.style.borderColor = 'rgba(0,212,255,.25)'; }, 800); return; }
      _showSentinelWarning('\u25e0 SENTINEL ALERT \u25e0', 'Custom test message fired from test console.', msg, '#f5a623', 6000);
      fireBtn.style.background = 'rgba(245,166,35,.45)';
      setTimeout(closeConsole, 200);
    }

    customRow.appendChild(inp);
    customRow.appendChild(fireBtn);
    body.appendChild(customRow);

    // hint
    var hint = D.createElement('p');
    hint.textContent = 'Ctrl+Shift+S to toggle  \u2022  Esc to close';
    hint.style.cssText = 'color:rgba(255,255,255,.2);font-size:9px;letter-spacing:.06em;margin:0;text-align:center;';
    body.appendChild(hint);

    panel.appendChild(body);
    overlay.appendChild(panel);
    D.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeConsole(); });
    D.addEventListener('keydown', escListener);
    inp.focus();
  }

  function escListener(e) { if (e.key === 'Escape') closeConsole(); }

  function closeConsole() {
    var el = D.getElementById('snl-test-overlay');
    if (el) el.remove();
    _tcOpen = false;
    D.removeEventListener('keydown', escListener);
  }

  D.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.key === 'S') {
      e.preventDefault();
      if (_tcOpen) closeConsole();
      else openTestConsole();
    }
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  Object.defineProperty(W, 'snl', {
    value: Object.freeze({
      locked  : isLocked,
      remain  : remain,
      record  : logEvent,
      timing  : timingProbe,
      sync    : syncEvents,
      clear   : clearState,
      entropy : function() { return mve; },
      honeypot: honeypotFilled,
    }),
    writable: false, configurable: false,
  });

})(window, document, navigator);
