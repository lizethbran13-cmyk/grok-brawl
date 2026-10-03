/* Grok Brawl - deterministic 60fps combat engine (no DOM) */
(function () {
  'use strict';
  var C = GB.Combat = {};
  var DT = 1 / 60, GRAV = 38, SPECIAL_COST = 33, SUPER_COST = 100, BUF = 8, ABUF = 13;
  // movement tuning (v1.1 movement patch): snappier jump arc, up to 3 jumps, more air control
  var MAX_JUMPS = 3, AIR_JUMP_MUL = [1, 0.86, 0.74], JUMP_RISE_G = 1.25, JUMP_FALL_G = 1.5, LAND_LAG = 1, AIR_JUMP_MIN = 5;
  C.MAX_JUMPS = MAX_JUMPS;
  C.DT = DT; C.SPECIAL_COST = SPECIAL_COST; C.SUPER_COST = SUPER_COST;
  var BTN = ['left', 'right', 'up', 'down', 'punch', 'kick', 'block', 'special', 'super', 'dash'];
  C.BTN = BTN;

  var NORMALS = {
    p1: { anim: 'p1', s: 4, a: 3, r: 8, dmg: 30, x0: 0.15, x1: 1.3, y0: 1.0, y1: 1.95, hs: 16, bs: 10, kb: 1.2 },
    p2: { anim: 'p2', s: 5, a: 3, r: 10, dmg: 34, x0: 0.15, x1: 1.35, y0: 1.0, y1: 1.95, hs: 17, bs: 11, kb: 1.4, step: 1.8 },
    p3: { anim: 'p3', s: 7, a: 4, r: 17, dmg: 52, x0: 0.15, x1: 1.35, y0: 0.9, y1: 2.4, hs: 20, bs: 13, launch: [3.5, 9.5], heavy: true },
    k1: { anim: 'k1', s: 6, a: 3, r: 11, dmg: 36, x0: 0.25, x1: 1.6, y0: 0.3, y1: 1.25, hs: 17, bs: 11, kb: 1.6 },
    k2: { anim: 'k2', s: 7, a: 4, r: 13, dmg: 42, x0: 0.25, x1: 1.65, y0: 0.9, y1: 1.95, hs: 18, bs: 12, kb: 2.0, step: 1.2 },
    k3: { anim: 'k3', s: 9, a: 4, r: 21, dmg: 64, x0: 0.25, x1: 1.75, y0: 0.8, y1: 2.5, hs: 22, bs: 14, launch: [6, 7], heavy: true, step: 2.4 },
    ap: { anim: 'ap', s: 4, a: 7, r: 6, dmg: 34, x0: 0.05, x1: 1.25, y0: 0.2, y1: 1.8, hs: 17, bs: 10, kb: 1.5, air: true },
    ak: { anim: 'ak', s: 5, a: 9, r: 8, dmg: 44, x0: 0.05, x1: 1.45, y0: -0.3, y1: 1.2, hs: 19, bs: 12, kb: 2.2, air: true }
  };
  C.NORMALS = NORMALS;
  function normalMove(key) {
    var n = NORMALS[key];
    return { name: key, kind: 'normal', anim: n.anim, total: n.s + n.a + n.r, chainAt: n.s + n.a, air: !!n.air, step: n.step || 0,
      hits: [{ from: n.s + 1, to: n.s + n.a, x0: n.x0, x1: n.x1, y0: n.y0, y1: n.y1, dmg: n.dmg, hs: n.hs, bs: n.bs, kb: n.kb || 0, launch: n.launch, heavy: n.heavy }] };
  }

  /* ---------- fighter ---------- */
  C.makeFighter = function (def, side, opts) {
    opts = opts || {};
    var s = def.stats, sc = def.scale || 1;
    var f = {
      def: def, id: def.id, side: side, sc: sc,
      walk: 3.05 + 0.48 * s.speed, dashV: 12 + 1.3 * s.speed, airV: 4.1 + 0.45 * s.speed, jumpV: (13.7 - 0.2 * s.weight) * 1.12,
      dmgMul: 0.82 + 0.08 * s.power, kbMul: 1.25 - 0.1 * s.weight,
      maxHp: Math.round((900 + 40 * s.weight) * (opts.hpMul || 1)),
      ctl: {}, pc: {}, buf: {}, bufN: { punch: 0, kick: 0 }, ai: null
    };
    BTN.forEach(function (b) { f.ctl[b] = false; f.pc[b] = false; f.buf[b] = 0; });
    f.buf.jump = 0;
    C.resetFighter(f, side);
    return f;
  };
  C.resetFighter = function (f, side) {
    f.x = side === 0 ? -2.6 : 2.6; f.y = 0; f.vx = 0; f.vy = 0; f.facing = side === 0 ? 1 : -1;
    if (f.ffa) { f.x = [-4.6, 4.6, 0][side] || 0; f.facing = side === 1 ? -1 : 1; }
    f.hp = f.maxHp; f.meter = f.meter || 0; f.guard = 100; f.state = 'idle'; f.st = 0; f.stun = 0; f.move = null; f.chain = 0;
    f.invuln = 0; f.combo = 0; f.dashCd = 0; f.airAtk = false; f.hidden = false; f.grav = 1; f.flash = 0; f.ko = false; f.frozen = 0;
    f.jumps = 0; f.jumpT = 99; f.jumpN = 0;
    f.lastHitBy = null; f.stats = f.stats || { hits: 0, blocks: 0, specials: 0, supers: 0, maxCombo: 0, dmg: 0 };
    for (var k in f.buf) f.buf[k] = 0; f.bufN.punch = f.bufN.kick = 0;
  };

  function dirOf(f) { return (f.ctl.right ? 1 : 0) - (f.ctl.left ? 1 : 0); }
  function grounded(f) { return f.y <= 0.0001 && f.vy <= 0; }
  function neutral(f) { return f.state === 'idle' || f.state === 'walk' || f.state === 'block' || (f.state === 'land' && f.st >= LAND_LAG); }
  C.isAttacking = function (f) { return f.state === 'atk' && f.move && f.move.def.kind !== 'super-lock'; };
  C.inRecovery = function (f) {
    if (f.state !== 'atk' || !f.move) return f.state === 'land' && f.st < LAND_LAG;
    return C.attackPhase(f) === 'recovery';
  };
  C.attackPhase = function (f) {
    if (f.state !== 'atk' || !f.move) return null;
    var m = f.move, d = m.def, first = 999, last = 0;
    (d.hits || []).forEach(function (h) { first = Math.min(first, h.from); last = Math.max(last, Math.min(h.to, 400)); });
    if (d.proj) { first = Math.min(first, d.proj); last = Math.max(last, d.proj); }
    if (m.t < first) return 'startup'; if (m.t <= last) return 'active'; return 'recovery';
  };

  function startMove(f, def, w) {
    f.state = 'atk'; f.st = 0; f.move = { def: def, t: 0, hitMask: {}, hitCount: 0, data: {}, landed: false, connected: false };
    if (!def.air) f.vx = def.step ? f.facing * def.step : 0;
    if (def.onStart) def.onStart(f, w, f.move);
    if (def.kind === 'normal') w.emit('whoosh', { f: f, heavy: def.name === 'p3' || def.name === 'k3' });
  }
  function startNormal(f, key, w) { f.chain = +key.charAt(1) || 1; startMove(f, normalMove(key), w); }

  /* ---------- specials ---------- */
  function projMove(kind, o) {
    return { name: 'special', kind: 'special', total: o.total || 36, anim: function (t) { return t < o.at - 2 ? 'windup' : 'throw'; }, proj: o.at,
      onFrame: function (f, w, m) {
        if (m.t === o.at) {
          w.projs = w.projs.filter(function (p) { return !(p.owner === f && p.kind === kind); });
          var p = { kind: kind, owner: f, x: f.x + f.facing * 0.95 * f.sc, y: o.ground ? 0 : f.y + 1.35 * f.sc, vx: f.facing * o.speed, r: o.r, h: o.h || 0, ground: !!o.ground,
            dmg: o.dmg, hs: o.hs, bs: o.bs, kb: o.kb || 2.5, chip: o.chip || 8, life: o.life || 120, color: o.color, launch: o.launch, freeze: o.freeze, t: 0 };
          w.projs.push(p); w.emit('proj', { f: f, p: p });
        }
      } };
  }
  var SPECIALS = {
    fireball: function () { return projMove('fire', { at: 11, speed: 10.5, r: 0.38, dmg: 70, hs: 20, bs: 14, chip: 8, color: '#ff7a1a' }); },
    voidorb: function () { return projMove('void', { at: 12, total: 38, speed: 8, r: 0.55, dmg: 88, hs: 22, bs: 15, chip: 10, color: '#b04aff', kb: 3.5 }); },
    icespike: function () { return projMove('ice', { at: 12, total: 38, speed: 8.5, r: 0.5, h: 1.05, ground: true, dmg: 60, hs: 42, bs: 14, chip: 6, color: '#9fe8ff', freeze: true }); },
    dashpunch: function () {
      return { name: 'special', kind: 'special', total: 42, anim: function (t) { return t < 9 ? 'windup' : 'dashpunch'; },
        hits: [{ from: 9, to: 22, x0: 0.05, x1: 1.35, y0: 0.6, y1: 2.0, dmg: 80, hs: 22, bs: 16, launch: [6, 7.5], chip: 8, heavy: true }],
        onFrame: function (f, w, m) { if (m.t === 9) w.emit('dash', { f: f, special: true }); if (m.t >= 9 && m.t <= 22 && !m.connected) f.vx = f.facing * 16; else if (m.t > 22 || m.connected) f.vx *= 0.75; },
        onConnect: function (f) { f.vx = f.facing * 1.5; } };
    },
    groundslam: function () {
      return { name: 'special', kind: 'special', total: 999, airborne: true, anim: function (t, f) { return t < 7 ? 'crouchLand' : (f.vy > 0 ? 'slamUp' : 'slamDown'); },
        hits: [{ from: 16, to: 300, x0: -0.4, x1: 1.0, y0: -0.3, y1: 1.2, dmg: 55, hs: 20, bs: 12, launch: [3, 8], chip: 5 }],
        onFrame: function (f, w, m, opp) {
          if (m.t === 7) { f.vy = 13; f.vx = Math.max(-7, Math.min(7, (opp.x - f.x) / 0.72)); f.y = 0.001; f.grav = 1; w.emit('jump', { f: f }); }
          if (m.t > 7 && f.vy < 0) f.grav = 1.9;
          if (m.landed && m.t >= m.landT + 22) end(f, w);
        },
        onLand: function (f, w, m, opp) {
          if (m.t < 8 || m.landed) return; m.landed = true; m.landT = m.t; f.vx = 0; f.grav = 1;
          w.emit('slam', { f: f, x: f.x, big: false });
          if (Math.abs(opp.x - f.x) < 2.9 * f.sc && opp.y < 0.25) resolveHit(f, opp, { dmg: 90, hs: 24, bs: 16, launch: [4, 9.5], chip: 9, heavy: true, x: opp.x, y: 0.6, src: f.x }, w);
          f.move.hitMask[0] = 9999;
        } };
    },
    teleport: function () {
      return { name: 'special', kind: 'special', total: 44, invuln: [1, 22], anim: function (t) { return t < 14 ? 'vanish' : 'tpkick'; },
        hits: [{ from: 20, to: 24, x0: 0.05, x1: 1.5, y0: 0.5, y1: 2.1, dmg: 72, hs: 22, bs: 12, launch: [5, 8], chip: 6, heavy: true }],
        onFrame: function (f, w, m, opp) {
          if (m.t === 5) { f.hidden = true; w.emit('teleport', { f: f, x: f.x, y: f.y + 1.2 }); }
          if (m.t === 13) {
            var side = Math.sign(opp.x - f.x) || f.facing, nx = opp.x + side * 1.2;
            if (Math.abs(nx) > w.half - 0.2) nx = opp.x - side * 1.2;
            f.x = Math.max(-w.half, Math.min(w.half, nx)); f.y = 0; f.vy = 0; f.vx = 0; f.facing = Math.sign(opp.x - f.x) || f.facing;
          }
          if (m.t === 14) { f.hidden = false; w.emit('teleport', { f: f, x: f.x, y: f.y + 1.2, arrive: true }); }
        } };
    },
    cyclone: function () {
      return { name: 'special', kind: 'special', total: 999, airborne: true, invuln: [1, 9], anim: function (t) { return t < 3 ? 'crouchLand' : 'cyclone'; }, spin: true,
        hits: [{ from: 4, to: 300, multi: 6, x0: -0.7, x1: 1.35, y0: 0.0, y1: 2.5, dmg: 26, hs: 18, bs: 8, kb: 0.6, juggle: 8, chip: 3, launchAfter: 3, launch: [4, 9] }],
        onFrame: function (f, w, m) {
          if (m.t === 3) { f.vy = 12.5; f.vx = f.facing * 3; f.y = 0.001; w.emit('spin', { f: f }); }
          if (m.landed && m.t >= m.landT + 14) end(f, w);
        },
        onLand: function (f, w, m) { if (m.t < 4 || m.landed) return; m.landed = true; m.landT = m.t; f.vx = 0; m.hitMask[0] = 9999; } };
    }
  };

  /* ---------- supers ---------- */
  var SUPERS = {
    beam: function () {
      return { name: 'super', kind: 'super', total: 76, invuln: [1, 22], anim: function (t) { return t < 16 ? 'charge' : 'beam'; },
        hits: [{ from: 18, to: 58, multi: 5, x0: 0.3, x1: 18, y0: 0.25, y1: 1.95, dmg: 26, hs: 14, bs: 10, chip: 6, kb: 0.3, launchAfter: 8, launch: [7, 9], noFreeze: true }],
        onFrame: function (f, w, m) { if (m.t === 16) w.beams.push({ owner: f, x: f.x + f.facing * 0.6 * f.sc, y: f.y + 1.15 * f.sc, dir: f.facing, t: 0, dur: 48, color: '#ff7a1a', color2: '#ffe14d' }); } };
    },
    glacier: function () {
      return { name: 'super', kind: 'super', total: 72, invuln: [1, 24], anim: function (t) { return t < 12 ? 'charge' : 'slamDown'; },
        onFrame: function (f, w, m, opp) {
          if (m.t >= 12 && m.t <= 44) {
            var fx = f.x + f.facing * (1 + (m.t - 12) * 0.42);
            if (m.t % 2 === 0) w.emit('spikes', { x: fx, h: 2.4 });
            if (!m.connected && Math.abs(opp.x - fx) < 0.95 && opp.y < 2.0) { m.connected = true; var gr = resolveHit(f, opp, { dmg: 230, hs: 30, bs: 24, chip: 40, launch: [4, 11], heavy: true, sup: true, x: opp.x, y: 1.2, freeze: true, src: f.x }, w); if (gr === 'hit') w.superCam(50); }
          }
        } };
    },
    quake: function () {
      return { name: 'super', kind: 'super', total: 999, invuln: [1, 40], airborne: true, anim: function (t, f) { return t < 11 ? 'charge' : (f.vy > 0 ? 'slamUp' : 'slamDown'); },
        onFrame: function (f, w, m) {
          if (m.t === 11) { f.vy = 15; f.y = 0.001; f.vx = 0; w.emit('jump', { f: f }); }
          if (m.t > 11 && f.vy < 0) f.grav = 1.7;
          if (m.landed && m.t >= m.landT + 26) end(f, w);
        },
        onLand: function (f, w, m, opp) {
          if (m.t < 12 || m.landed) return; m.landed = true; m.landT = m.t; f.grav = 1;
          w.emit('slam', { f: f, x: f.x, big: true });
          if (opp.y < 0.4) { resolveHit(f, opp, { dmg: 240, hs: 30, launch: [3, 13], unblockable: true, heavy: true, sup: true, x: opp.x, y: 0.4, src: f.x }, w); w.superCam(60); }
        } };
    },
    rush: function () {
      return { name: 'super', kind: 'super', total: 72, invuln: [1, 36], anim: function (t, f, m) {
          if (m.lockT == null) return t < 9 ? 'charge' : 'dashpunch';
          var k = m.t - m.lockT; if (k >= 46) return 'k3'; return ['p1', 'p2', 'k2', 'p2', 'k1', 'p3'][Math.floor(k / 7) % 6];
        },
        hits: [{ from: 9, to: 36, x0: -0.3, x1: 1.45, y0: -0.2, y1: 2.5, dmg: 0, unblockable: true, lock: true }],
        onFrame: function (f, w, m, opp) {
          if (m.lockT == null) {
            if (m.t === 9) w.emit('dash', { f: f, special: true });
            if (m.t >= 9 && m.t <= 36) { f.vx = f.facing * 24; if (f.id === 'nova') f.hidden = (m.t % 6) < 3; } else { f.vx *= 0.7; f.hidden = false; }
            return;
          }
          f.hidden = false; f.vx = 0; var k = m.t - m.lockT;
          if (opp.ko) { if (k >= 60) end(f, w); return; }
          opp.x = f.x + f.facing * 1.15 * Math.max(f.sc, opp.sc); opp.y = 0.15; opp.vx = 0; opp.vy = 0; opp.state = 'locked'; opp.st = 0;
          if (k > 0 && k < 44 && k % 7 === 0) resolveHit(f, opp, { dmg: 30, hs: 60, kb: 0, unblockable: true, sup: true, x: opp.x, y: 1.3 + Math.sin(k) * 0.3, lockHit: true, noFreeze: k % 14 !== 0, src: f.x }, w);
          if (k === 48) { opp.state = 'hit'; resolveHit(f, opp, { dmg: 70, launch: [8, 12], unblockable: true, sup: true, heavy: true, x: opp.x, y: 1.4, src: f.x }, w); }
          if (k >= 70) end(f, w);
        },
        onConnect: function (f, w, m, opp, h) { if (h.lock && m.lockT == null) { m.lockT = m.t; m.def.total = 999; m.def.invuln = [1, 999]; f.vx = 0; w.superCam(76); w.emit('lock', { f: f, opp: opp }); } } };
    }
  };
  C.specialName = function (def) { return def.special.name; };

  function end(f, w) { f.move = null; f.state = grounded(f) ? 'idle' : 'air'; f.st = 0; f.grav = 1; f.hidden = false; f.chain = 0; }

  function startSpecial(f, w) {
    f.meter -= SPECIAL_COST; f.stats.specials++; f.chain = 0;
    startMove(f, SPECIALS[f.def.special.type](), w); w.emit('special', { f: f });
  }
  function startSuper(f, w) {
    f.meter = 0; f.stats.supers++; f.chain = 0; f.vx = 0;
    startMove(f, SUPERS[f.def.super.type](), w); w.cinematic(f);
  }

  /* ---------- hit resolution ---------- */
  function resolveHit(att, def, h, w) {
    if (def.invuln > 0 || def.state === 'down' || def.state === 'getup' || def.state === 'ko' || def.hidden) return false;
    if (def.state === 'launched' && def.combo >= 7 && !h.sup) return false; // juggle cap
    var src = h.src != null ? h.src : att.x;
    var front = Math.abs(src - def.x) < 0.15 || Math.sign(src - def.x) === def.facing;
    if (h.projDir) front = Math.sign(h.projDir) === -def.facing;
    var blocking = (def.state === 'block' || def.state === 'bstun') && grounded(def) && front && !h.unblockable;
    var dir = h.projDir ? Math.sign(h.projDir) : (Math.sign(def.x - src) || att.facing);
    if (w.training && w.training.dummy === 'block' && def.side === 1 && grounded(def) && !h.unblockable && (def.state === 'idle' || def.state === 'walk' || def.state === 'block' || def.state === 'bstun')) blocking = true;
    if (blocking) {
      var chip = Math.round((h.chip || 0) * att.dmgMul);
      def.hp = Math.max(w.training ? 1 : (def.hp - chip > 0 ? 1 : 0), def.hp - chip);
      def.state = 'bstun'; def.st = 0; def.stun = h.bs || 10; def.vx = dir * (h.kb ? 2.4 + h.kb * 0.4 : 2.6) * 0.9;
      def.guard -= (h.dmg || 20) * 0.32; att.meter = Math.min(100, att.meter + (h.dmg || 20) * 0.06); def.meter = Math.min(100, def.meter + (h.dmg || 20) * 0.1);
      def.stats.blocks++;
      if (Math.abs(def.x) > w.half - 0.5 && !h.projDir) att.vx = -dir * 2.5;
      if (def.guard <= 0) { def.guard = 100; def.state = 'dizzy'; def.st = 0; def.stun = 50; w.emit('guardbreak', { f: def }); }
      w.freeze = Math.max(w.freeze, 4);
      w.emit('block', { att: att, def: def, x: def.x - dir * 0.3, y: h.y || def.y + 1.4 });
      return 'block';
    }
    var scale = Math.max(h.sup ? 0.6 : 0.35, 1 - 0.1 * def.combo);
    var dmg = Math.max(1, Math.round((h.dmg || 0) * att.dmgMul * scale));
    def.hp -= dmg; def.combo++; att.stats.hits++; att.stats.dmg += dmg; att.stats.maxCombo = Math.max(att.stats.maxCombo, def.combo);
    att.meter = Math.min(100, att.meter + dmg * (h.sup ? 0 : 0.12)); def.meter = Math.min(100, def.meter + dmg * 0.085);
    def.flash = 5; def.lastHitBy = att; def.move = null; def.hidden = false; def.grav = 1;
    if (h.freeze) def.frozen = 40;
    var airborne = !grounded(def) || def.state === 'launched';
    var launch = h.launch && (!h.launchAfter || (att.move && att.move.hitCount + 1 >= h.launchAfter));
    if (w.training && def.hp < 1) def.hp = 1;
    if (def.hp <= 0 && !w.training) {
      def.hp = 0; def.ko = true; def.state = 'launched'; def.st = 0; def.vx = dir * 6 * def.kbMul; def.vy = 9; def.y = Math.max(def.y, 0.01);
      w.emit('ko', { att: att, def: def });
    } else if (h.lockHit) {
      def.state = 'locked';
    } else if (launch) {
      def.state = 'launched'; def.st = 0; def.vx = dir * h.launch[0] * def.kbMul; def.vy = h.launch[1] * (airborne ? 0.8 : 1) * (0.85 + 0.15 * def.kbMul); def.y = Math.max(def.y, 0.01);
    } else if (airborne) {
      def.state = 'launched'; def.st = 0; def.vx = dir * (1.2 + (h.kb || 0)) * def.kbMul; def.vy = Math.max(def.vy * 0.3, h.juggle || 5.5); def.y = Math.max(def.y, 0.01);
    } else {
      def.state = 'hit'; def.st = 0; def.stun = Math.max(9, (h.hs || 16) - Math.max(0, def.combo - 3) * 1.5); def.vx = dir * (1.6 + (h.kb || 0) * 1.4) * def.kbMul;
    }
    if (Math.abs(def.x) > w.half - 0.5 && !h.projDir && !h.lockHit) att.vx = -dir * (1.5 + (h.kb || 0));
    if (!h.noFreeze) w.freeze = Math.max(w.freeze, Math.min(13, 4 + Math.round(dmg / 9)));
    w.emit('hit', { att: att, def: def, dmg: dmg, x: h.x != null ? h.x : def.x - dir * 0.3, y: h.y != null ? h.y : def.y + 1.4, heavy: !!h.heavy || dmg >= 60, sup: !!h.sup, combo: def.combo, dir: dir, launch: !!launch });
    return 'hit';
  }
  C.resolveHit = resolveHit;

  function hurt(f) {
    var w = 0.46 * f.sc;
    if (f.state === 'launched' || f.state === 'locked') return { x0: f.x - 0.55 * f.sc, x1: f.x + 0.55 * f.sc, y0: f.y, y1: f.y + 1.6 * f.sc };
    return { x0: f.x - w, x1: f.x + w, y0: f.y, y1: f.y + 2.2 * f.sc };
  }
  C.hurt = hurt;
  function checkMoveHits(f, opp, w, multi) {
    var m = f.move; if (!m || !m.def.hits) return;
    m.def.hits.forEach(function (h, i0) {
      if (m.t < h.from || m.t > h.to) return;
      if (multi && m.hitMask[i0] === 9999) return;
      var i = multi ? i0 + ':' + opp.side : i0, last = m.hitMask[i];
      if (last != null && (!h.multi || m.t - last < h.multi)) return;
      var sc = f.sc, x0 = f.x + f.facing * h.x0 * sc, x1 = f.x + f.facing * h.x1 * sc;
      var bx0 = Math.min(x0, x1), bx1 = Math.max(x0, x1), by0 = f.y + h.y0 * sc, by1 = f.y + h.y1 * sc, hb = hurt(opp);
      if (bx1 < hb.x0 || bx0 > hb.x1 || by1 < hb.y0 || by0 > hb.y1) return;
      var hh = {}; for (var k in h) hh[k] = h[k];
      hh.x = Math.max(hb.x0, Math.min(hb.x1, f.x + f.facing * h.x1 * sc * 0.85)); hh.y = Math.max(hb.y0 + 0.3, Math.min(hb.y1 - 0.2, (by0 + by1) / 2));
      if (h.lock) { if (opp.invuln > 0 || opp.state === 'down' || opp.state === 'getup' || opp.state === 'ko') return; m.hitMask[i] = m.t; m.connected = true; opp.tgt = f; if (m.def.onConnect) m.def.onConnect(f, w, m, opp, h); return; }
      var r = resolveHit(f, opp, hh, w);
      if (r) { m.hitMask[i] = m.t; m.hitCount++; m.connected = true; if (m.def.onConnect) m.def.onConnect(f, w, m, opp, h); }
    });
  }

  /* ---------- per-fighter state machine ---------- */
  function readInput(f, w) {
    var c = f.ctl, p = f.pc;
    if (w.inputLocked) { BTN.forEach(function (b) { c[b] = false; }); }
    var edge = function (b) { return c[b] && !p[b]; };
    if (edge('punch')) { if (f.buf.punch > 0) f.bufN.punch = ABUF + 4; else f.buf.punch = ABUF; } if (edge('kick')) { if (f.buf.kick > 0) f.bufN.kick = ABUF + 4; else f.buf.kick = ABUF; } if (edge('special')) f.buf.special = BUF;
    if (edge('super')) f.buf.super = BUF; if (edge('dash')) f.buf.dash = BUF; if (edge('up')) f.buf.jump = BUF;
    if (c.punch && c.kick && (edge('punch') || edge('kick'))) f.buf.pk = BUF;
    BTN.forEach(function (b) { p[b] = c[b]; });
  }
  function tickBuf(f) { for (var k in f.buf) if (f.buf[k] > 0) f.buf[k]--; if (f.bufN.punch > 0) f.bufN.punch--; if (f.bufN.kick > 0) f.bufN.kick--; }
  function consume(f, k) { f.buf[k] = 0; if (k === 'punch' || k === 'kick') { f.buf[k] = f.bufN[k]; f.bufN[k] = 0; } }

  function tryActions(f, opp, w, inAir) {
    var wantsSuper = f.buf.super > 0 || f.buf.pk > 0;
    if (!inAir && wantsSuper && f.meter >= SUPER_COST) { consume(f, 'super'); consume(f, 'pk'); consume(f, 'punch'); consume(f, 'kick'); startSuper(f, w); return true; }
    if (!inAir && f.buf.special > 0 && f.meter >= SPECIAL_COST) { consume(f, 'special'); startSpecial(f, w); return true; }
    if (inAir && (f.buf.punch > 0 || f.buf.kick > 0) && !f.airAtk && Math.abs(opp.x - f.x) > 0.05) f.facing = Math.sign(opp.x - f.x);
    if (f.buf.punch > 0) { consume(f, 'punch'); if (inAir) { if (!f.airAtk) { f.airAtk = true; startMove(f, normalMove('ap'), w); return true; } } else { startNormal(f, 'p1', w); return true; } }
    if (f.buf.kick > 0) { consume(f, 'kick'); if (inAir) { if (!f.airAtk) { f.airAtk = true; startMove(f, normalMove('ak'), w); return true; } } else { startNormal(f, 'k1', w); return true; } }
    return false;
  }

  function stepFighter(f, opp, w) {
    var c = f.ctl, dir = dirOf(f);
    f.st++;
    if (f.dashCd > 0) f.dashCd--;
    if (f.flash > 0) f.flash--;
    if (f.frozen > 0) f.frozen--;
    if (f.jumpT < 99) f.jumpT++;
    if (f.state !== 'block' && f.state !== 'bstun') f.guard = Math.min(100, f.guard + 0.35);
    var inv = 0;

    switch (f.state) {
      case 'idle': case 'walk': case 'block': case 'land':
        if (f.state === 'land' && f.st < LAND_LAG) { f.vx *= 0.75; break; }
        f.combo = 0; f.chain = 0;
        if (Math.abs(opp.x - f.x) > 0.05 && !w.noAutoFace) f.facing = Math.sign(opp.x - f.x);
        if (tryActions(f, opp, w, false)) break;
        if (f.buf.dash > 0 && f.dashCd <= 0) {
          consume(f, 'dash'); var dd = dir || f.facing; f.state = 'dash'; f.st = 0; f.dashDir = dd; f.dashCd = 26; w.emit('dash', { f: f }); break;
        }
        if (f.buf.jump > 0) {
          consume(f, 'jump'); f.state = 'air'; f.st = 0; f.vy = f.jumpV; f.y = 0.001; f.vx = dir * f.airV; f.airAtk = false; f.jumps = 1; f.jumpN = 1; f.jumpT = 99; w.emit('jump', { f: f }); break;
        }
        if (c.block || c.down) { f.state = 'block'; f.vx = 0; break; }
        if (dir) { f.state = 'walk'; f.vx = dir * f.walk * (dir === f.facing ? 1 : 0.78); }
        else { f.state = 'idle'; f.vx *= 0.5; }
        break;
      case 'dash':
        var fwd = f.dashDir === f.facing;
        if (f.st < 12) f.vx = f.dashDir * f.dashV * (fwd ? 1 : 0.85); else f.vx *= 0.7;
        inv = (f.st >= 2 && f.st <= 10) ? 1 : 0;
        if (f.st >= 9 && (f.buf.punch || f.buf.kick)) { if (tryActions(f, opp, w, false)) break; }
        if (f.st >= 16) { f.state = 'idle'; f.st = 0; }
        break;
      case 'air':
        // responsive air control; with no input the jump keeps most of its momentum
        f.vx += (dir * f.airV - f.vx) * (dir ? 0.13 : 0.02);
        // double / triple jump: each extra jump is a little weaker
        if (f.buf.jump > 0 && f.jumps < MAX_JUMPS && f.st >= AIR_JUMP_MIN) {
          consume(f, 'jump');
          f.vy = f.jumpV * AIR_JUMP_MUL[f.jumps]; f.jumps++; f.jumpN = f.jumps; f.jumpT = 0; f.st = 0; f.airAtk = false;
          if (dir) f.vx = dir * f.airV * 1.05;
          w.emit('airjump', { f: f, n: f.jumps });
          break;
        }
        if (f.buf.punch > 0 || f.buf.kick > 0) tryActions(f, opp, w, true);
        break;
      case 'atk':
        var m = f.move; m.t++;
        var d = m.def;
        if (d.invuln && m.t >= d.invuln[0] && m.t <= d.invuln[1]) inv = 1;
        if (d.onFrame) d.onFrame(f, w, m, opp);
        if (f.state !== 'atk') break;
        if (d.kind === 'normal' && !d.air && grounded(f)) f.vx *= 0.82;
        // super via punch+kick during the first frames of a jab/kick
        if (d.kind === 'normal' && f.chain === 1 && m.t <= 4 && f.buf.pk > 0 && f.meter >= SUPER_COST && grounded(f)) { consume(f, 'pk'); consume(f, 'punch'); consume(f, 'kick'); startSuper(f, w); break; }
        // chains and cancels
        if (d.kind === 'normal' && !d.air && m.t >= d.chainAt) {
          if (m.connected && f.buf.special > 0 && f.meter >= SPECIAL_COST) { consume(f, 'special'); startSpecial(f, w); break; }
          if ((f.buf.super > 0 || f.buf.pk > 0) && m.connected && f.meter >= SUPER_COST) { consume(f, 'super'); consume(f, 'pk'); startSuper(f, w); break; }
          if (f.chain < 3 && (f.buf.punch > 0 || f.buf.kick > 0)) {
            var key = (f.buf.punch > 0 ? 'p' : 'k') + (f.chain + 1); consume(f, 'punch'); consume(f, 'kick'); startNormal(f, key, w); break;
          }
        }
        if (m.t >= d.total) { end(f, w); }
        break;
      case 'hit':
        f.vx *= 0.86;
        if (f.st >= f.stun) { f.state = 'idle'; f.st = 0; }
        break;
      case 'bstun':
        f.vx *= 0.85;
        if (f.st >= f.stun) { f.state = (c.block || c.down) ? 'block' : 'idle'; f.st = 0; }
        break;
      case 'dizzy':
        f.vx *= 0.8;
        if (f.st >= f.stun) { f.state = 'idle'; f.st = 0; }
        break;
      case 'launched':
        break;
      case 'locked':
        if (!(opp.state === 'atk' && opp.move && opp.move.lockT != null)) { f.state = 'launched'; f.st = 0; f.vy = 4; f.y = Math.max(f.y, 0.05); f.vx = -opp.facing * -2; }
        break;
      case 'down':
        inv = 1; f.vx *= 0.8;
        if (f.st >= 34) { f.state = 'getup'; f.st = 0; }
        break;
      case 'getup':
        inv = 1;
        if (f.st >= 16) { f.state = 'idle'; f.st = 0; f.combo = 0; }
        break;
      case 'ko': f.vx *= 0.85; break;
      case 'win': f.vx = 0; break;
    }
    f.invuln = inv;
  }

  function physics(f, opp, w) {
    if (f.state === 'locked') return;
    var air = f.y > 0 || f.vy > 0;
    if (air) {
      var jg = f.state === 'air' || (f.state === 'atk' && f.move && f.move.def.air) ? (f.vy > 0 ? JUMP_RISE_G : JUMP_FALL_G) : 1;
      f.vy -= GRAV * f.grav * DT * (f.state === 'launched' ? 0.92 : 1) * jg;
      f.y += f.vy * DT; f.x += f.vx * DT;
      if (f.y <= 0) {
        f.y = 0; var impact = f.vy; f.vy = 0; f.jumps = 0;
        if (f.state === 'atk' && f.move && f.move.def.onLand) f.move.def.onLand(f, w, f.move, opp);
        else if (f.state === 'atk' && f.move && f.move.def.air) { f.move = null; f.state = 'land'; f.st = 0; }
        else if (f.state === 'atk' && f.move && !f.move.def.airborne) { /* grounded move landing */ }
        else if (f.state === 'air') { f.state = 'land'; f.st = 0; f.jumps = 0; w.emit('land', { f: f }); }
        else if (f.state === 'launched') { f.state = f.ko ? 'ko' : 'down'; f.st = 0; f.vx *= 0.4; w.emit('fall', { f: f, impact: impact }); }
        else if (f.state === 'hit' || f.state === 'dizzy') { /* stay */ }
      }
    } else {
      f.x += f.vx * DT;
      if (f.state === 'launched') { f.state = f.ko ? 'ko' : 'down'; f.st = 0; }
      f.jumps = 0;
    }
    var lim = w.half - 0.1;
    if (f.x < -lim) { f.x = -lim; if (f.vx < 0) f.vx = 0; }
    if (f.x > lim) { f.x = lim; if (f.vx > 0) f.vx = 0; }
  }

  function separate(a, b, w) {
    if (a.hidden || b.hidden || a.state === 'down' || b.state === 'down' || a.state === 'ko' || b.state === 'ko' || a.state === 'locked' || b.state === 'locked') return;
    if (Math.abs(a.y - b.y) > 1.5) return;
    // airborne fighters pass over each other instead of bumping (easy cross-ups)
    if ((a.y > 0.3 && airborneMove(a)) || (b.y > 0.3 && airborneMove(b))) return;
    var minSep = 0.52 * (a.sc + b.sc), dx = b.x - a.x, ad = Math.abs(dx);
    if (ad >= minSep) return;
    var s = dx === 0 ? (a.facing || 1) : Math.sign(dx), ov = minSep - ad, lim = w.half - 0.1;
    var aWall = (s > 0 && a.x <= -lim + 0.01) || (s < 0 && a.x >= lim - 0.01), bWall = (s > 0 && b.x >= lim - 0.01) || (s < 0 && b.x <= -lim + 0.01);
    var ka = 0.5, kb = 0.5; if (aWall) { ka = 0; kb = 1; } else if (bWall) { ka = 1; kb = 0; }
    a.x -= s * ov * ka; b.x += s * ov * kb;
    a.x = Math.max(-lim, Math.min(lim, a.x)); b.x = Math.max(-lim, Math.min(lim, b.x));
  }

  function airborneMove(f) { return f.state === 'air' || (f.state === 'atk' && f.move && f.move.def.air) || f.state === 'dash'; }

  function stepProjectiles(w) {
    var dead = [];
    w.projs.forEach(function (p) {
      p.t++; p.life--; p.x += p.vx * DT;
      if (p.life <= 0 || Math.abs(p.x) > w.half + 3) { dead.push(p); return; }
      var py0 = p.ground ? 0 : p.y - p.r, py1 = p.ground ? p.h : p.y + p.r;
      var targets = w.f.length === 2 ? [w.f[0] === p.owner ? w.f[1] : w.f[0]] : w.f.filter(function (o) { return o !== p.owner; });
      for (var ti = 0; ti < targets.length; ti++) {
        var opp = targets[ti], hb = hurt(opp);
        if (p.x + p.r > hb.x0 && p.x - p.r < hb.x1 && py1 > hb.y0 && py0 < hb.y1) {
          var r = resolveHit(p.owner, opp, { dmg: p.dmg, hs: p.hs, bs: p.bs, kb: p.kb, chip: p.chip, projDir: p.vx, x: p.x, y: p.ground ? 0.6 : p.y, freeze: p.freeze, heavy: p.dmg >= 80 }, w);
          if (r) { dead.push(p); w.emit('projHit', { p: p, blocked: r === 'block' }); break; }
        }
      }
    });
    // projectile clashes
    for (var i = 0; i < w.projs.length; i++) for (var j = i + 1; j < w.projs.length; j++) {
      var a = w.projs[i], b = w.projs[j];
      if (a.owner !== b.owner && Math.abs(a.x - b.x) < a.r + b.r && (a.ground || b.ground ? true : Math.abs(a.y - b.y) < a.r + b.r + 0.3)) {
        if (dead.indexOf(a) < 0) dead.push(a); if (dead.indexOf(b) < 0) dead.push(b); w.emit('clash', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 || 0.6 });
      }
    }
    if (dead.length) w.projs = w.projs.filter(function (p) { return dead.indexOf(p) < 0; });
  }

  /* ---------- world ---------- */
  C.makeWorld = function (f0, f1, opts) {
    opts = opts || {};
    var w = { f: [f0, f1], projs: [], beams: [], half: opts.half || 9.2, freeze: 0, frame: 0, inputLocked: true, training: opts.training || null,
      cine: null, superCamT: 0, listeners: [] };
    w.emit = function (type, data) { for (var i = 0; i < w.listeners.length; i++) w.listeners[i](type, data); };
    w.cinematic = function (f) { w.cine = { f: f, t: 0, dur: 52 }; w.emit('superStart', { f: f }); };
    w.superCam = function (n) { w.superCamT = Math.max(w.superCamT, n); w.emit('superHit', {}); };
    return w;
  };
  C.resetWorld = function (w) { w.projs = []; w.beams = []; w.freeze = 0; w.cine = null; w.superCamT = 0; };

  // free-for-all: each fighter fights the nearest opponent still standing (kept while attacking / grabbed)
  function target(f, w) {
    var fs = w.f; if (fs.length === 2) return fs[0] === f ? fs[1] : fs[0];
    if ((f.state === 'atk' || f.state === 'locked') && f.tgt && !f.tgt.ko && fs.indexOf(f.tgt) >= 0) return f.tgt;
    var best = null, bd = 1e9;
    for (var i = 0; i < fs.length; i++) { var o = fs[i]; if (o === f || o.ko) continue; var d = Math.abs(o.x - f.x) + Math.abs(o.y - f.y) * 0.5; if (d < bd - 1e-6) { bd = d; best = o; } }
    return best || (fs[0] === f ? fs[1] : fs[0]);
  }
  C.target = target;
  function stepN(w) {
    var fs = w.f, n = fs.length, i, j;
    for (i = 0; i < n; i++) readInput(fs[i], w);
    w.frame++;
    if (w.cine) { w.cine.t++; if (w.cine.t >= w.cine.dur) w.cine = null; return 'cine'; }
    if (w.freeze > 0) { w.freeze--; return 'freeze'; }
    if (w.superCamT > 0) w.superCamT--;
    for (i = 0; i < n; i++) tickBuf(fs[i]);
    var T = fs.map(function (f) { return target(f, w); });
    for (i = 0; i < n; i++) fs[i].tgt = T[i];
    for (i = 0; i < n; i++) stepFighter(fs[i], T[i], w);
    for (i = 0; i < n; i++) physics(fs[i], T[i], w);
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) separate(fs[i], fs[j], w);
    for (i = 0; i < n; i++) if (fs[i].state === 'atk') for (j = 0; j < n; j++) if (j !== i && fs[i].state === 'atk') checkMoveHits(fs[i], fs[j], w, true);
    stepProjectiles(w);
    w.beams = w.beams.filter(function (bm) { bm.t++; if (bm.owner.state !== 'atk') bm.t = Math.max(bm.t, bm.dur - 6); return bm.t < bm.dur; });
    for (i = 0; i < n; i++) { var f = fs[i], o = T[i]; if ((f.state === 'land' || f.state === 'bstun' && f.st === 1) && Math.abs(o.x - f.x) > 0.05) f.facing = Math.sign(o.x - f.x); }
    return 'run';
  }
  C.step = function (w) {
    if (w.f.length > 2) return stepN(w);
    var a = w.f[0], b = w.f[1];
    readInput(a, w); readInput(b, w);
    w.frame++;
    if (w.cine) { w.cine.t++; if (w.cine.t >= w.cine.dur) w.cine = null; return 'cine'; }
    if (w.freeze > 0) { w.freeze--; return 'freeze'; }
    if (w.superCamT > 0) w.superCamT--;
    tickBuf(a); tickBuf(b);
    // restore buffered presses that happened this very frame (tickBuf ran after readInput)
    stepFighter(a, b, w); stepFighter(b, a, w);
    physics(a, b, w); physics(b, a, w);
    separate(a, b, w);
    if (a.state === 'atk') checkMoveHits(a, b, w);
    if (b.state === 'atk') checkMoveHits(b, a, w);
    stepProjectiles(w);
    w.beams = w.beams.filter(function (bm) { bm.t++; if (bm.owner.state !== 'atk') bm.t = Math.max(bm.t, bm.dur - 6); return bm.t < bm.dur; });
    // auto face when landing etc.
    [a, b].forEach(function (f) { var o = f === a ? b : a; if ((f.state === 'land' || f.state === 'bstun' && f.st === 1) && Math.abs(o.x - f.x) > 0.05) f.facing = Math.sign(o.x - f.x); });
    return 'run';
  };

  /* ---------- poses for rendering ---------- */
  C.poseOf = function (f, time) {
    var P = GB.Models.POSES, s = f.state, m = f.move;
    switch (s) {
      case 'idle': return { p: P.idle(0, time), k: 0.25 };
      case 'walk': return { p: P.walk(0, time, (f.vx * f.facing) >= 0 ? 1 : -1), k: 0.3 };
      case 'block': case 'bstun': return { p: P.block(), k: 0.45 };
      case 'air': return { p: f.vy > 0 ? P.jump() : P.fall(), k: 0.25 };
      case 'land': return { p: P.crouchLand(), k: 0.5 };
      case 'dash': return { p: f.dashDir === f.facing ? P.dash() : P.backdash(), k: 0.4 };
      case 'hit': case 'locked': return { p: P.hit(), k: 0.6 };
      case 'dizzy': return { p: P.dizzy(0, time), k: 0.2 };
      case 'launched': return { p: P.launched(), k: 0.3 };
      case 'down': return { p: P.down(), k: 0.3 };
      case 'ko': return { p: P.ko(), k: 0.2 };
      case 'getup': return { p: P.getup(Math.min(1, f.st / 16)), k: 0.4 };
      case 'win': return { p: P[f.winPose || 'win1'](0, time), k: 0.15 };
      case 'intro': return { p: P.taunt(0, time), k: 0.15 };
      case 'atk':
        if (!m) return { p: P.idle(0, time), k: 0.3 };
        var d = m.def, name = typeof d.anim === 'function' ? d.anim(m.t, f, m) : d.anim;
        if (d.kind === 'normal') {
          var n = NORMALS[d.name], ph = m.t <= n.s ? 'start' : m.t <= n.s + n.a ? 'act' : 'rec';
          if (ph === 'start') return { p: P[name](), k: 0.35 };
          if (ph === 'act') return { p: P[name](), k: 0.85 };
          return { p: P[name](), k: 0.08 };
        }
        return { p: (P[name] || P.idle)(m.t / 30, time, f), k: 0.45 };
    }
    return { p: P.idle(0, time), k: 0.3 };
  };
})();
