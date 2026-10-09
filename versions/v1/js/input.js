/* Grok Brawl - keyboard + touch controls -> virtual controllers */
(function () {
  'use strict';
  var I = GB.Input = {};
  var keys = {};
  var touch = { jump: false, left: false, right: false, up: false, down: false, punch: false, kick: false, block: false, special: false, super: false, dash: false };
  I.twoPlayer = false;
  I.touchState = touch;

  var MAP1 = { // single player: everything
    left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp', 'Space'], down: ['KeyS', 'ArrowDown'],
    punch: ['KeyJ'], kick: ['KeyK'], block: ['KeyL'], special: ['KeyI'], super: ['KeyO'], dash: ['ShiftLeft', 'ShiftRight']
  };
  var MAP2P_1 = { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], punch: ['KeyF'], kick: ['KeyG'], block: ['KeyH'], special: ['KeyR'], super: ['KeyT'], dash: ['ShiftLeft', 'KeyQ'] };
  var MAP2P_2 = { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], punch: ['KeyJ'], kick: ['KeyK'], block: ['KeyL'], special: ['KeyI'], super: ['KeyO'], dash: ['ShiftRight', 'KeyU'] };
  I.MAPS = { single: MAP1, p1: MAP2P_1, p2: MAP2P_2 };
  var GAME_CODES = {}; [MAP1, MAP2P_1, MAP2P_2].forEach(function (m) { for (var k in m) m[k].forEach(function (c) { GAME_CODES[c] = 1; }); });

  function fill(ctl, map, withTouch) {
    for (var b in map) { var on = false; for (var i = 0; i < map[b].length; i++) if (keys[map[b][i]]) { on = true; break; } ctl[b] = on || (withTouch ? !!touch[b] : false); }
    if (withTouch && touch.jump) ctl.up = true;
  }
  I.read = function (c1, c2) {
    if (I.twoPlayer) { fill(c1, MAP2P_1, true); if (c2) fill(c2, MAP2P_2, false); }
    else fill(c1, MAP1, true);
  };
  I.clear = function () { keys = {}; for (var k in touch) touch[k] = false; resetJoy(); document.querySelectorAll('#touch .tb.on').forEach(function (b) { b.classList.remove('on'); }); };
  I.isGameKey = function (code) { return !!GAME_CODES[code]; };
  I.onKey = null; // UI hook

  window.addEventListener('keydown', function (e) {
    if (I.onKey && I.onKey(e) === true) { e.preventDefault(); return; }
    if (GB.Game && GB.Game.active() && GAME_CODES[e.code]) e.preventDefault();
    keys[e.code] = true;
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { I.clear(); });

  /* ---------- touch controls ---------- */
  var joy = { id: null, cx: 0, cy: 0, x: 0, y: 0, lastTapDir: 0, lastTapT: 0 }, joyEl, knob, zone;
  function resetJoy() {
    joy.id = null; joy.x = joy.y = 0; touch.left = touch.right = touch.up = touch.down = false;
    if (joyEl) { joyEl.style.left = ''; joyEl.style.top = ''; joyEl.classList.remove('active'); }
    if (knob) knob.style.transform = '';
  }
  function updJoy(x, y) {
    var dx = x - joy.cx, dy = y - joy.cy, d = Math.hypot(dx, dy), R = 56;
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    var nx = dx / R, ny = -dy / R;
    var wasL = touch.left, wasR = touch.right;
    touch.left = nx < -0.38; touch.right = nx > 0.38; touch.up = ny > 0.6; touch.down = ny < -0.62;
    // double flick -> dash
    var dir = touch.right ? 1 : touch.left ? -1 : 0;
    if (dir && !(dir > 0 ? wasR : wasL)) {
      var now = performance.now();
      if (joy.lastTapDir === dir && now - joy.lastTapT < 260) { touch.dash = true; setTimeout(function () { touch.dash = !!(dashBtnHeld); }, 90); }
      joy.lastTapDir = dir; joy.lastTapT = now;
    }
  }
  var dashBtnHeld = false;
  I.initTouch = function () {
    zone = document.getElementById('joyZone'); joyEl = document.getElementById('joy'); knob = document.getElementById('joyKnob');
    zone.addEventListener('pointerdown', function (e) {
      e.preventDefault(); if (joy.id !== null) return;
      joy.id = e.pointerId; var r = zone.getBoundingClientRect(), R = 66;
      joy.cx = Math.max(r.left + R, Math.min(e.clientX, r.right - R)); joy.cy = Math.max(r.top + R, Math.min(e.clientY, r.bottom - R));
      joyEl.style.left = (joy.cx - r.left - R) + 'px'; joyEl.style.top = (joy.cy - r.top - R) + 'px'; joyEl.classList.add('active');
      try { zone.setPointerCapture(e.pointerId); } catch (er) {}
      updJoy(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', function (e) { if (e.pointerId === joy.id) { e.preventDefault(); updJoy(e.clientX, e.clientY); } });
    var up = function (e) { if (e.pointerId === joy.id) resetJoy(); };
    zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
    document.querySelectorAll('#touch .tb').forEach(function (b) {
      var name = b.getAttribute('data-b'), ids = {};
      var on = function (e) { e.preventDefault(); ids[e.pointerId] = 1; touch[name] = true; if (name === 'dash') dashBtnHeld = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (er) {} if (navigator.vibrate && GB.Input.haptics) try { navigator.vibrate(8); } catch (er2) {} };
      var off = function (e) { delete ids[e.pointerId]; if (Object.keys(ids).length) return; touch[name] = false; if (name === 'dash') dashBtnHeld = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  };
  I.haptics = true;
})();
