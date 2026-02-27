/* ▓▓ SENTINEL v2 ▓▓ — do not modify */
;(function(_0xW,_0xD,_0xN){
  'use strict';
  // ── Obfuscation primitive ─────────────────────────────────────────────────
  var _$=function(a,b){var r='';for(var i=0;i<a.length;i++)r+=String.fromCharCode(a.charCodeAt(i)^b[i%b.length].charCodeAt(0));return r;};
  // Storage key  : 'snl_data'   ⊕ 'ghx2v9wk'
  var _0xk=_$('\x14\x06\x14\x6d\x12\x58\x03\x0a','ghx2v9wk');
  // Fail token   : 'auth_fail'  ⊕ 'XgK7mN3b'
  var _0xf=_$('\x39\x12\x3f\x5f\x32\x28\x52\x0b\x34','XgK7mN3b');
  // URL keys     : 'email'      ⊕ 'A1B2C'  |  'password' ⊕ 'A1B2C3D4'
  var _0xe=_$('\x24\x5c\x23\x5b\x2f','A1B2C');
  var _0xpk=_$('\x31\x50\x31\x41\x34\x5c\x36\x50','A1B2C3D4');
  // Honeypot key : 'website'    ⊕ 'gamehub'
  var _0xh=_$('\x10\x04\x0f\x16\x01\x01\x07','gamehub');

  // ── Config ────────────────────────────────────────────────────────────────
  var _C={
    maxFail :5,              // failed attempts before lockout
    window  :72e3,           // rolling window for attempt timestamps (2 min)
    lockouts:[36e4,18e5,72e5],// escalating durations: 6 min → 30 min → 2 hr
    rateMin :380,            // min ms between rapid submits (bot signal)
    dtThresh:160,            // px delta threshold for devtools probe
  };

  // ── Storage helpers ───────────────────────────────────────────────────────
  var _rd=function(){try{return JSON.parse(_0xW.localStorage.getItem(_0xk)||'{}');}catch(_e){return{};}};
  var _wr=function(_d){try{_0xW.localStorage.setItem(_0xk,JSON.stringify(_d));}catch(_e){}};
  var _s=_rd();
  if(!_s._a)_s._a=[];   // failed attempt timestamps
  if(!_s._q)_s._q=[];   // event queue
  if(!_s._lx)_s._lx=0;  // lockout expiry (ms epoch)
  if(!_s._lc)_s._lc=0;  // lockout escalation counter

  // ── Lockout helpers ───────────────────────────────────────────────────────
  var _il=function(){return _s._lx>+new Date();};
  var _rl=function(){return Math.max(0,_s._lx-+new Date());};
  var _lk=function(){
    var _dur=_C.lockouts[Math.min(_s._lc,_C.lockouts.length-1)];
    _s._lc=_s._lc+1;      // escalate for next time
    _s._lx=+new Date()+_dur;
    _wr(_s);
    _0xW.dispatchEvent(new CustomEvent('snl:lockout',{detail:{remaining:_dur,ts:+new Date(),level:_s._lc}}));
  };

  // ── Attempt tracker (sliding window) ─────────────────────────────────────
  var _cr=function(){
    var _n=+new Date();
    _s._a=_s._a.filter(function(_t){return _n-_t<_C.window;});
    if(_s._a.length>=_C.maxFail){_lk();return true;}
    return false;
  };

  // ── Event logger ─────────────────────────────────────────────────────────
  var _ev=function(_tp,_mx){
    var _e={t:+new Date(),tp:_tp,ua:(_0xN.userAgent||'').slice(0,72),mx:_mx||null};
    if(_tp===_0xf){_s._a.push(_e.t);_cr();}
    _s._q.push(_e);
    if(_s._q.length>128)_s._q=_s._q.slice(-128);
    _wr(_s);
  };

  // ── URL credential patrol ─────────────────────────────────────────────────
  // If a prior JS failure caused credentials to leak into the URL via GET
  // form submission, silently strip them before the user or any script sees them.
  (function(){
    var _loc=_0xW.location;
    if(!_loc.search)return;
    var _p=new URLSearchParams(_loc.search),_dirty=false;
    [_0xe,_0xpk].forEach(function(k){if(_p.has(k)){_p.delete(k);_dirty=true;}});
    if(_dirty){
      var _clean=_loc.pathname+(_p.toString()?('?'+_p.toString()):'')+_loc.hash;
      try{_0xW.history.replaceState(null,'',_clean);}catch(_){}
      _ev('url_patrol',{leaked:true});
    }
  })();

  // ── Form method enforcement (backstop) ───────────────────────────────────
  // Upgrades any GET form that owns a password field to POST so credentials
  // can never reach the URL even if the JS module chain fails to attach.
  _0xD.addEventListener('DOMContentLoaded',function(){
    _0xD.querySelectorAll('form').forEach(function(_f){
      if((_f.getAttribute('method')||'get').toLowerCase()==='get'&&
         _f.querySelector('input[type=password]')){
        _f.setAttribute('method','post');
        _ev('form_hardened',{id:_f.id||'?'});
      }
    });
  },{once:true});

  // ── Honeypot injector ─────────────────────────────────────────────────────
  // Appends a visually hidden field to each auth form. Real users never touch
  // it; any autofill bot that fills it is silently flagged.
  _0xD.addEventListener('DOMContentLoaded',function(){
    var _hid=_0xh+'_0';
    ['login-form','register-form'].forEach(function(_id){
      var _fm=_0xD.getElementById(_id);
      if(!_fm||_0xD.getElementById(_hid))return;
      var _hp=_0xD.createElement('input');
      _hp.type='text';_hp.name=_0xh;_hp.id=_hid;
      _hp.setAttribute('autocomplete','off');
      _hp.setAttribute('tabindex','-1');
      _hp.setAttribute('aria-hidden','true');
      _hp.style.cssText='position:absolute;left:-9999px;opacity:0;height:0;width:0;pointer-events:none;';
      _fm.appendChild(_hp);
    });
  },{once:true});

  // ── Passive devtools probe ────────────────────────────────────────────────
  (function(){
    var _last=0;
    function _chk(){
      var _dw=_0xW.outerWidth-_0xW.innerWidth,_dh=_0xW.outerHeight-_0xW.innerHeight;
      if((_dw>_C.dtThresh||_dh>_C.dtThresh)&&+new Date()-_last>5000){
        _last=+new Date();_ev('dt',{dw:_dw,dh:_dh});
      }
    }
    _0xW.addEventListener('resize',_chk,{passive:true});
  })();

  // ── Timing probe (bot-speed rapid-fire detection) ─────────────────────────
  var _tl=0;
  var _tm=function(){
    var _n=+new Date(),_d=_n-_tl;_tl=_n;
    if(_d>0&&_d<_C.rateMin&&_tl>1e10){_ev('rp',{d:_d});}
  };

  // ── Behavioral entropy (mouse-movement density before first submit) ────────
  var _mve=0;
  _0xW.addEventListener('mousemove',function(){if(_mve<9999)_mve++;},{passive:true});

  // ── Honeypot read helper ──────────────────────────────────────────────────
  var _hpFilled=function(){
    var _el=_0xD.getElementById(_0xh+'_0');
    return !!(_el&&_el.value.length>0);
  };

  // ── Clear on success ──────────────────────────────────────────────────────
  var _cl=function(){_s._a=[];_s._lx=0;_s._lc=0;_wr(_s);};

  // ── Flush pending events to RTDB ─────────────────────────────────────────
  var _sy=function(_uid,_db,_rf,_ps){
    if(!_uid||!_db||!_s._q||!_s._q.length)return;
    var _cpy=_s._q.slice();_s._q=[];_wr(_s);
    try{var _nd=_rf(_db,'sentinel_logs/'+_uid);_cpy.forEach(function(_e){_ps(_nd,_e).catch(function(){});});}catch(_e){}
  };

  // ── Auth lifecycle hooks ──────────────────────────────────────────────────
  _0xW.addEventListener('snl:fail',function(_e){_ev(_0xf,(_e&&_e.detail)||null);});
  _0xW.addEventListener('snl:ok',  function()  {_cl();});

  // ── Public API (intentionally minimal) ───────────────────────────────────
  Object.defineProperty(_0xW,'snl',{value:Object.freeze({
    locked  :_il,
    remain  :_rl,
    record  :_ev,
    timing  :_tm,
    sync    :_sy,
    clear   :_cl,
    entropy :function(){return _mve;},
    honeypot:_hpFilled,
  }),writable:false,configurable:false});
})(window,document,navigator);
