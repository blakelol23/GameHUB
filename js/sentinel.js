/* ▓▓ SENTINEL ▓▓ — do not modify */
;(function(_0xW,_0xD,_0xN){
  'use strict';
  var _$=function(a,b){var r='';for(var i=0;i<a.length;i++)r+=String.fromCharCode(a.charCodeAt(i)^b[i%b.length].charCodeAt(0));return r;};
  var _0xk=_$('\x06\x16\x05\x0b\x13\x13\x18\x0c\x0b','gamehubx1');
  var _0xw={_0:5,_1:72e3,_2:36e4,_3:12e4};
  var _0xr=function(){try{return JSON.parse(_0xW.localStorage.getItem(_0xk)||'{}');}catch(_e){return{};}};
  var _0xp=function(_d){try{_0xW.localStorage.setItem(_0xk,JSON.stringify(_d));}catch(_e){}};
  var _s=_0xr();
  if(!_s._a)_s._a=[];if(!_s._q)_s._q=[];if(!_s._lx)_s._lx=0;if(!_s._dt)_s._dt=[];
  var _il=function(){return _s._lx>+new Date;};
  var _rl=function(){return Math.max(0,_s._lx-+new Date);};
  var _lk=function(_ms){
    _ms=_ms||_0xw._2;
    _s._lx=+new Date+_ms;_0xp(_s);
    _0xW.dispatchEvent(new CustomEvent('snl:lockout',{detail:{remaining:_ms,ts:+new Date}}));
  };
  var _cr=function(){
    var _n=+new Date,_w=_0xw._1;
    _s._a=_s._a.filter(function(_t){return _n-_t<_w;});
    if(_s._a.length>=_0xw._0){_lk();return true;}
    return false;
  };
  var _ev=function(_tp,_mx){
    var _e={t:+new Date,tp:_tp,ua:(_0xN.userAgent||'').slice(0,72),mx:_mx||null};
    if(_tp===_$('^\\a\\x','A1B2C3D')){_s._a.push(_e.t);_cr();}
    _s._q.push(_e);
    if(_s._q.length>64)_s._q=_s._q.slice(-64);
    _0xp(_s);
  };
  /* passive devtools probe — non-invasive, only logs */
  (function(){
    var _T=160;
    function _chk(){var _dw=_0xW.outerWidth-_0xW.innerWidth,_dh=_0xW.outerHeight-_0xW.innerHeight;if(_dw>_T||_dh>_T){_ev('dt',{dw:_dw,dh:_dh});}}
    _0xW.addEventListener('resize',_chk,{passive:true});
  })();
  /* timing probe — detects bot-speed submissions */
  var _tl=0;
  var _tm=function(){var _n=+new Date,_d=_n-_tl;_tl=_n;if(_d>0&&_d<380&&_tl>1e10){_ev('rp',{d:_d});}};
  /* clear on success */
  var _cl=function(){_s._a=[];_s._lx=0;_0xp(_s);};
  /* flush pending events to RTDB on authenticated session */
  var _sy=function(_uid,_db,_rf,_ps){
    if(!_uid||!_db||!_s._q||!_s._q.length)return;
    var _cpy=_s._q.slice();_s._q=[];_0xp(_s);
    try{var _nd=_rf(_db,'sentinel_logs/'+_uid);_cpy.forEach(function(_e){_ps(_nd,_e).catch(function(){});});}
    catch(_e){}
  };
  /* auth lifecycle hooks */
  _0xW.addEventListener('snl:fail',function(_e){_ev(_$('\x08\x04\x0c\x04','A1B2'),(_e&&_e.detail)||null);});
  _0xW.addEventListener('snl:ok',  function()  {_cl();});
  /* public surface — intentionally minimal */
  Object.defineProperty(_0xW,'snl',{value:Object.freeze({
    locked : _il,
    remain : _rl,
    record : _ev,
    timing : _tm,
    sync   : _sy,
    clear  : _cl
  }),writable:false,configurable:false});
})(window,document,navigator);
