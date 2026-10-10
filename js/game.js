/* Grok Brawl - renderer, match flow, camera, effects, HUD */
(function () {
  'use strict';
  var T = THREE, C = GB.Combat, Mdl = GB.Models, FX = GB.FX;
  var G = GB.Game = {};
  var renderer, scene, camera, canvas, isTouch = false;
  var view = 'fight', showroom = null, arena = null, arenaId = null;
  var rigs = [null, null], plates = [null, null], F = [null, null], ais = [null, null], world = null, match = null;
  var time = 0, acc = 0, slowT = 0, shake = 0, manual = false, paused = false, fast = false, lastT = 0, preview = null;
  var cam = { x: 0, y: 2.4, z: 11, lx: 0, ly: 1.3 };
  var projVis = [], beamVis = [], hzVis = [], hudCache = {};
  var $ = function (id) { return document.getElementById(id); };
  G.onMatchEnd = null; G.onRoundStart = null;

  /* ---------- setup ---------- */
  G.init = function (cv, touch) {
    canvas = cv; isTouch = !!touch;
    var dpr = window.devicePixelRatio || 1;
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !isTouch || dpr < 2, powerPreference: 'high-performance', alpha: false });
    renderer.setPixelRatio(Math.min(dpr, 2));
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(34, 1, 0.1, 200);
    FX.init(scene);
    initVis();
    buildShowroom();
    window.addEventListener('resize', resize); resize();
    requestAnimationFrame(function (t) { lastT = t; loop(t); });
  };
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (showroom) { showroom.cam.aspect = w / h; showroom.cam.updateProjectionMatrix(); }
    FX.setProjScale(renderer.getDrawingBufferSize(new T.Vector2()).y * 0.5 / Math.tan(camera.fov * Math.PI / 360));
  }
  G.renderer = function () { return renderer; };
  G.setView = function (v) { view = v; if (v === 'story') { match = null; world = null; preview = null; } };
  G.view = function () { return view; };

  /* ---------- visuals for projectiles and beams ---------- */
  function haloTex() { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); }
  function initVis() {
    var ht = haloTex(), cg = new T.IcosahedronGeometry(0.5, 1);
    var cubeG = new T.BoxGeometry(1, 1, 1);
    for (var i = 0; i < 6; i++) {
      var grp = new T.Group(); grp.visible = false;
      var core = new T.Mesh(cg, new T.MeshBasicMaterial({ color: '#fff' })); grp.add(core);
      var cube = new T.Mesh(cubeG, new T.MeshLambertMaterial({ color: '#9dff00', emissive: '#2a5a00' })); cube.visible = false; grp.add(cube);
      var halo = new T.Sprite(new T.SpriteMaterial({ map: ht, color: '#ff7a1a', transparent: true, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(2, 2, 1); grp.add(halo);
      scene.add(grp); projVis.push({ g: grp, core: core, cube: cube, halo: halo, p: null });
    }
    var ringG = new T.RingGeometry(0.72, 1, 36), discG = new T.CircleGeometry(1, 36), colG = new T.CylinderGeometry(1, 1, 1, 18, 1, true), rockG = new T.DodecahedronGeometry(0.5, 0);
    for (i = 0; i < 8; i++) {
      var hg = new T.Group(); hg.visible = false;
      var ring = new T.Mesh(ringG, new T.MeshBasicMaterial({ color: '#ff4a2e', transparent: true, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; hg.add(ring);
      var disc = new T.Mesh(discG, new T.MeshBasicMaterial({ color: '#ff4a2e', transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.04; hg.add(disc);
      var col = new T.Mesh(colG, new T.MeshBasicMaterial({ color: '#ff4a2e', transparent: true, opacity: 0.12, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })); col.position.y = 4; col.scale.set(1, 8, 1); hg.add(col);
      var rock = new T.Mesh(rockG, new T.MeshLambertMaterial({ color: '#7a4a2a', emissive: '#ff4a00', emissiveIntensity: 0.6 })); rock.visible = false; scene.add(rock);
      var pix = new T.Mesh(cubeG, new T.MeshLambertMaterial({ color: '#9dff00', emissive: '#3a7a00' })); pix.visible = false; scene.add(pix);
      scene.add(hg); hzVis.push({ g: hg, ring: ring, disc: disc, col: col, rock: rock, pix: pix });
    }
    var bg = new T.CylinderGeometry(0.5, 0.5, 1, 14, 1, true); bg.rotateZ(Math.PI / 2);
    for (i = 0; i < 2; i++) {
      var b = new T.Group(); b.visible = false;
      var outer = new T.Mesh(bg, new T.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      var inner = new T.Mesh(bg, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
      b.add(outer); b.add(inner); scene.add(b); beamVis.push({ g: b, outer: outer, inner: inner });
    }
  }
  function updateVis(dt) {
    var projs = world ? world.projs : [];
    projVis.forEach(function (v) { if (v.p && projs.indexOf(v.p) < 0) { v.p = null; v.g.visible = false; } });
    projs.forEach(function (p) {
      var v = projVis.find(function (q) { return q.p === p; });
      if (!v) { v = projVis.find(function (q) { return !q.p; }); if (!v) return; v.p = p; v.g.visible = true;
        var col = p.kind === 'void' ? '#b04aff' : p.kind === 'ice' ? '#9fe8ff' : p.kind === 'mine' ? '#ff2bd6' : p.kind === 'fire' ? '#ff7a1a' : (p.color || '#ff7a1a');
        v.core.material.color.set(p.kind === 'void' ? '#2a0a4a' : p.kind === 'ice' ? '#e8fbff' : p.core || '#fff2a0'); v.halo.material.color.set(col);
        var s = p.r * 2; v.core.scale.setScalar(s); v.halo.scale.set(s * 3, s * 3, 1);
        v.core.visible = p.kind !== 'mine'; v.cube.visible = p.kind === 'mine'; v.cube.scale.setScalar(0.5); v.cube.rotation.set(0, 0, 0);
      }
      if (p.kind === 'mine') {
        var k = Math.min(1, p.t / p.toss), armed = p.t >= p.arm, my = p.t < p.toss ? 0.3 + Math.sin(k * Math.PI) * 1.5 : 0.3;
        v.g.position.set(p.x, my, 0.1);
        if (p.t < p.toss) { v.cube.rotation.x += dt * 10; v.cube.rotation.z += dt * 7; } else { v.cube.rotation.set(0, Math.sin(time * 2) * 0.3, 0); }
        var blink = armed ? (Math.sin(time * (p.life < 90 ? 26 : 12)) > 0) : false;
        v.cube.material.color.set(blink ? '#ff2bd6' : '#9dff00'); v.halo.material.opacity = armed ? (blink ? 1 : 0.35) : 0.25; v.halo.scale.set(1.5, 1.5, 1);
        return;
      }
      var y = p.ground ? 0.45 : p.y;
      v.g.position.set(p.x, y, 0.1); v.core.rotation.x += dt * 8; v.core.rotation.y += dt * 6;
      if (!fast) {
        if (p.kind === 'fire') { FX.trail(p.x - Math.sign(p.vx) * 0.2, y, Math.random() < 0.5 ? '#ff7a1a' : '#ffe14d', 0.55, 0.3); }
        else if (p.kind === 'void') { FX.trail(p.x, y, Math.random() < 0.5 ? '#b04aff' : '#ff6be6', 0.7, 0.5); }
        else if (p.kind === 'ice') { if (p.t % 3 === 0 && !p._sp) { FX.spike(p.x, 1.1, 0.35); } FX.trail(p.x, 0.3, '#bff4ff', 0.35, 0.6); }
        else { FX.trail(p.x - Math.sign(p.vx) * 0.2, y, Math.random() < 0.5 ? p.color : (p.color2 || '#ffffff'), p.ground ? 0.45 : 0.55, 0.35); if (p.ground && p.t % 4 === 0) FX.burst(p.x, 0.3, p.color2 || p.color, 3, 2, 0.2, 0.3); }
      }
    });
    var hz = world && world.hz ? world.hz : [];
    hzVis.forEach(function (v, i) {
      var h = hz[i]; if (!h) { v.g.visible = false; v.rock.visible = false; v.pix.visible = false; return; }
      var met = h.kind === 'meteor', col = met ? '#ff4a2e' : '#9dff00', left = h.warn - h.t, striking = left <= 0;
      v.g.visible = true; v.g.position.set(h.x, 0, 0);
      v.ring.material.color.set(col); v.disc.material.color.set(col); v.col.material.color.set(col);
      v.ring.scale.setScalar(h.r * (striking ? 1 - left * 0.09 : 1)); v.ring.material.opacity = striking ? Math.max(0, 1 + left / 14) : 0.55 + 0.45 * Math.sin(time * (left < 30 ? 30 : 14));
      v.disc.scale.setScalar(h.r * Math.min(1, h.t / h.warn)); v.disc.visible = !striking; v.disc.material.opacity = 0.38;
      v.col.visible = met && !striking; v.col.scale.set(h.r * 0.9, 8, h.r * 0.9); v.col.material.opacity = 0.14 + 0.1 * Math.sin(time * 12);
      var FALL = met ? 24 : 12, falling = left <= FALL && !striking, body = met ? v.rock : v.pix;
      v.rock.visible = met && falling; v.pix.visible = !met && falling;
      if (falling) {
        var fy = 0.5 + left / FALL * (met ? 14 : 7);
        if (met) { body.position.set(h.x - left * 0.18, fy, 0); body.scale.setScalar(1.3); body.rotation.x += dt * 6; body.rotation.y += dt * 4; if (!fast) { FX.trail(body.position.x, fy + 0.4, Math.random() < 0.5 ? '#ff7a1a' : '#ffe14d', 0.8, 0.5); } }
        else { body.position.set(h.x, fy, 0); body.scale.setScalar(1.3); body.rotation.set(0, time * 3, 0); body.material.color.set(h.last ? '#ff2bd6' : '#9dff00'); }
      }
    });
    if (world && !fast) world.f.forEach(function (f) {
      var mv = f.move; if (f.state !== 'atk' || !mv || !mv.def.vortex || mv.t < mv.def.vortex[0] || mv.t >= mv.def.vortex[1]) return;
      for (var q = 0; q < 3; q++) { var a = time * 9 + q * 2.1, rr = 1.2 + ((time * 3 + q) % 1) * 4.5; FX.trail(f.x + Math.cos(a) * rr, 0.25 + Math.random() * 0.6, q % 2 ? '#7ff5e6' : '#ffffff', 0.5, 0.3); }
    });
    var beams = world ? world.beams : [];
    beamVis.forEach(function (v, i) {
      var bm = beams[i]; if (!bm) { v.g.visible = false; return; }
      v.g.visible = true; var len = Math.min(18, (bm.t + 1) * 2.4), fade = Math.min(1, (bm.dur - bm.t) / 6), th = (0.9 + Math.sin(time * 40) * 0.08) * fade;
      v.g.position.set(bm.x + bm.dir * len / 2, bm.y, 0.1); v.outer.scale.set(len, 1.25 * th, 1.25 * th); v.inner.scale.set(len, 0.5 * th, 0.5 * th);
      v.outer.material.color.set(bm.color);
      if (!fast && Math.random() < 0.7) FX.trail(bm.x + bm.dir * Math.random() * len, bm.y + (Math.random() - 0.5) * 0.8, Math.random() < 0.5 ? bm.color : bm.color2, 0.6, 0.4);
    });
  }

  /* ---------- rigs ---------- */
  function disposeRig(r) { if (!r) return; r.root.parent && r.root.parent.remove(r.root); r.root.traverse(function (o) { if (o.isMesh && o.geometry && o.material !== Mdl.outlineMaterial()) { o.geometry.dispose(); } }); r.mat.dispose(); }
  function plate(def, tag, color) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 64; var g = c.getContext('2d');
    g.font = '900 34px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var txt = def.name, tw = g.measureText(txt).width + 70;
    g.fillStyle = 'rgba(8,4,24,0.75)'; var x0 = 128 - tw / 2; g.beginPath(); g.moveTo(x0 + 10, 6); g.lineTo(x0 + tw, 6); g.lineTo(x0 + tw - 10, 58); g.lineTo(x0, 58); g.closePath(); g.fill();
    g.fillStyle = color; g.fillRect(x0 + 8, 52, tw - 16, 5);
    g.fillStyle = color; g.font = '900 20px Impact, "Arial Black", sans-serif'; g.fillText(tag, x0 + 24, 31);
    g.fillStyle = '#fff'; g.font = '900 32px Impact, "Arial Black", sans-serif'; g.fillText(txt, 128 + 16, 32);
    var t = new T.CanvasTexture(c); var s = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true })); s.scale.set(1.45, 0.36, 1); s.renderOrder = 20; s.material.opacity = 0.9; return s;
  }
  function setRigs(defs, tags) {
    for (var i = 0; i < Math.max(defs.length, rigs.length); i++) {
      disposeRig(rigs[i]); if (plates[i]) { scene.remove(plates[i]); plates[i].material.map.dispose(); plates[i].material.dispose(); plates[i] = null; }
      if (i >= defs.length) { rigs[i] = null; continue; }
      rigs[i] = Mdl.build(defs[i]); rigs[i].root.userData.fighterId = defs[i].id; scene.add(rigs[i].root);
      if (tags) { plates[i] = plate(defs[i], tags[i], ['#ff6a4a', '#3ff0ff', '#7dff6a'][i]); plates[i].userData.fighterId = defs[i].id; plates[i].userData.label = tags[i] + ' ' + defs[i].name; scene.add(plates[i]); }
    }
    rigs.length = defs.length; plates.length = defs.length;
  }
  function faceAngle(f) { return f.facing > 0 ? Math.PI / 2 - 0.42 : -(Math.PI / 2 - 0.42); }
  function syncRig(i, applyPose) {
    var f = F[i], r = rigs[i]; if (!f || !r) return;
    r.root.position.set(f.x, f.y, 0);
    var want = f.state === 'win' ? 0 : faceAngle(f), cur = r.root.rotation.y; r.root.rotation.y = cur + (want - cur) * 0.35;
    r.root.visible = !f.hidden;
    var spin = f.state === 'atk' && f.move && ((f.move.def.spin && f.move.t > 3 && !f.move.landed) || (f.move.def.spinLock && f.move.lockT != null && f.move.t - f.move.lockT < 22));
    r.body.rotation.y = spin ? r.body.rotation.y + 0.55 : 0;
    // double jump = front flip around the hips, triple jump = a full twirl
    var fl = f.state === 'air' && f.jumpN >= 2 && f.jumpT < 22 ? f.jumpT / 22 : -1;
    if (fl >= 0) {
      var e = 1 - Math.pow(1 - fl, 2.2), cy = 1.05 * f.sc;
      if (f.jumpN === 2) { var th = e * Math.PI * 2; r.body.rotation.x = th; r.body.position.set(0, cy * (1 - Math.cos(th)), -cy * Math.sin(th)); }
      else { r.body.rotation.x = 0; r.body.position.set(0, 0, 0); r.body.rotation.y = e * Math.PI * 2; }
    } else if (r.body.rotation.x !== 0 || r.body.position.y !== 0 || r.body.position.z !== 0) { r.body.rotation.x = 0; r.body.position.set(0, 0, 0); }
    r.setFlash(f.flash > 0 ? 0.42 : f.frozen > 0 ? 0.35 : 0);
    if (r.shadow) { r.shadow.position.y = -f.y + 0.03; var s = Math.max(0.4, 1 - f.y * 0.18); r.shadow.scale.set(s, s, 1); }
    if (applyPose) { var ps = C.poseOf(f, time); Mdl.applyPose(r, ps.p, ps.k); }
    if (plates[i]) { var o = F[1 - i], close = o && Math.abs(o.x - f.x) < 1.9 && i === 1 ? 0.38 : 0; if (F.length > 2) { close = 0; for (var q = 0; q < i; q++) if (Math.abs(F[q].x - f.x) < 1.9) close += 0.38; } plates[i].position.set(f.x, f.y + r.height + 0.3 + close, 0); plates[i].visible = !f.hidden && f.state !== 'down' && f.state !== 'ko' && !(world && world.cine); }
  }

  /* ---------- arena ---------- */
  G.loadArena = function (id) {
    if (arena && arenaId === id) return arena;
    if (arena) { scene.remove(arena.group); arena.group.traverse(function (o) { if (o.isMesh && o.material && o.material.map && o.material.map.isCanvasTexture) { /* keep cached */ } }); }
    arena = GB.Arenas.build(id); arenaId = id; scene.add(arena.group);
    scene.background = arena.sky;
    scene.fog = new T.Fog(arena.fog[0], arena.fog[1], arena.fog[2]);
    FX.setAmbient(arena.ambient);
    return arena;
  };

  /* ---------- match ---------- */
  G.start = function (cfg) {
    // cfg: {mode:'arcade'|'versus'|'training'|'2p'|'demo', p1, p2, arena, diff, boss, ladderIdx}
    preview = null; view = 'fight'; paused = false; slowT = 0; acc = 0;
    FX.clear(); G.loadArena(cfg.arena);
    var d0 = GB.skinned(GB.fighter(cfg.p1), cfg.s1), d1 = GB.skinned(GB.fighter(cfg.p2), cfg.s2), d2 = cfg.p3 ? GB.skinned(GB.fighter(cfg.p3), cfg.s3) : null;
    F.length = 2;
    F[0] = C.makeFighter(d0, 0); F[1] = C.makeFighter(d1, 1, { hpMul: cfg.boss ? 1.15 : 1 });
    F[0].meter = 0; F[1].meter = 0;
    if (d2) { F[2] = C.makeFighter(d2, 2); F[2].meter = 0; F.forEach(function (f) { f.ffa = true; }); }
    var training = cfg.mode === 'training' ? { dummy: 'stand', meter: true } : null;
    world = C.makeWorld(F[0], F[1], { half: GB.Arenas.HALF, training: training, rules: GB.arena(cfg.arena).rules || null });
    if (d2) world.f = F.slice();
    world.listeners.push(onEvent);
    var tags = cfg.mode === 'demo' ? null : cfg.names ? cfg.names.slice(0, F.length) : ['P1', cfg.mode === '2p' ? 'P2' : cfg.mode === 'training' ? 'DUMMY' : 'CPU'];
    setRigs(d2 ? [d0, d1, d2] : [d0, d1], tags);
    document.body.classList.toggle('ffa', !!d2);
    ais = [null, null];
    if (cfg.mode === 'demo') { ais[0] = GB.AI.create(F[0], GB.diffParams('normal'), 7 + (Math.random() * 1e6 | 0)); ais[1] = GB.AI.create(F[1], GB.diffParams('normal'), 99 + (Math.random() * 1e6 | 0)); }
    else if (cfg.mode !== '2p' && cfg.mode !== 'training' && cfg.mode !== 'online') ais[1] = GB.AI.create(F[1], GB.diffParams(cfg.diff || 'normal', cfg.boss ? 0.6 : 0), cfg.seed || (1 + (Math.random() * 1e6 | 0)));
    GB.Input.twoPlayer = cfg.mode === '2p';
    match = { cfg: cfg, mode: cfg.mode, online: cfg.mode === 'online', round: 1, wins: d2 ? [0, 0, 0] : [0, 0], ffa: !!d2, koOrder: [], phase: 'intro', t: 0, timer: 60, timerF: 0, training: training, ended: false, bot: null, comboDmg: 0, lastCombo: 0, result: null, roundsLog: [] };
    hudCache = {};
    for (var i = 0; i < F.length; i++) { syncRig(i, true); }
    cam.x = 0; cam.y = 3; cam.z = 8;
    G.hudInit();
    beginRound();
    return match;
  };
  function beginRound() {
    var m = match; m.phase = 'intro'; m.t = 0; m.timer = m.cfg.time || 60; m.timerF = 0;
    C.resetFighter(F[0], 0); C.resetFighter(F[1], 1); if (F[2]) C.resetFighter(F[2], 2); C.resetWorld(world); world.inputLocked = true;
    F[0].state = F[1].state = 'intro'; if (F[2]) F[2].state = 'intro'; m.koOrder = [];
    if (m.training) { m.phase = 'fight'; F[0].state = F[1].state = 'idle'; world.inputLocked = false; F[0].meter = 100; }
    if (G.onRoundStart) G.onRoundStart(m);
  }
  G.restart = function () { if (match) { var c = match.cfg; G.start(c); } };
  G.quit = function () { match = null; world = null; GB.Input.twoPlayer = false; banner(''); };
  G.active = function () { return !!match && match.mode !== 'demo' && !paused; };
  G.match = function () { return match; };
  G.world = function () { return world; };
  G.fighters = function () { return F; };
  G.pause = function (b) { paused = !!b; GB.Input.clear(); if (!b) lastT = performance.now(); };
  G.isPaused = function () { return paused; };
  G.setTrainingDummy = function (mode) {
    if (!match || !match.training) return; match.training.dummy = mode; world.training.dummy = mode;
    ais[1] = mode === 'cpu' ? GB.AI.create(F[1], GB.diffParams(match.cfg.diff || 'normal'), 5) : null;
  };
  G.setTrainingMeter = function (b) { if (match && match.training) match.training.meter = b; };
  G.resetPositions = function () { if (!match) return; var m0 = F[0].meter; C.resetFighter(F[0], 0); C.resetFighter(F[1], 1); F[0].meter = m0; C.resetWorld(world); };

  function fixedStep() {
    var m = match; if (!m) return;
    // online lockstep: both players' inputs for this frame must have arrived, otherwise wait
    if (m.online && !GB.Online.feed(F, m, world)) return false;
    m.t++;
    if (m.mode !== 'demo' && !m.online) {
      if (m.bot) m.bot(world, F[0], F[1]); else GB.Input.read(F[0].ctl, m.mode === '2p' ? F[1].ctl : null);
      if (m.bot2) m.bot2(world, F[1], F[0]);
    }
    if (ais[0]) GB.AI.think(ais[0], world);
    if (ais[1] && !m.bot2) GB.AI.think(ais[1], world);
    else if (!m.bot2 && m.training && m.training.dummy !== 'cpu') GB.AI.dummy(F[1], m.training.dummy, world);
    var res;
    switch (m.phase) {
      case 'intro':
        world.inputLocked = true; C.step(world);
        if (m.t === 24) { var final = m.ffa ? m.wins.filter(function (x) { return x === 1; }).length >= 2 : m.wins[0] === 1 && m.wins[1] === 1; banner(final ? 'FINAL ROUND' : 'ROUND ' + m.round, '#ff4fd8', 1100); sfx('bell'); }
        if (m.t === 92) { banner('FIGHT!', '#ff4a2e', 650); sfx('fight'); }
        if (m.t >= 100) { m.phase = 'fight'; m.t = 0; world.inputLocked = false; F[0].state = F[1].state = 'idle'; if (F[2]) F[2].state = 'idle'; }
        break;
      case 'fight':
        res = C.step(world);
        if (m.training) { trainingTick(); break; }
        if (res === 'run') { m.timerF++; if (m.timerF % 60 === 0) { m.timer--; if (m.timer <= 0) { m.timer = 0; m.phase = 'timeup'; m.t = 0; world.inputLocked = true; banner('TIME!', '#ffe14d', 1200); sfx('bell'); } } }
        if (m.ffa ? F.filter(function (f) { return !f.ko; }).length <= 1 : F[0].ko || F[1].ko) { m.phase = 'ko'; m.t = 0; world.inputLocked = true; }
        break;
      case 'ko':
        world.inputLocked = true; C.step(world);
        if (m.ffa) {
          var alive = F.filter(function (f) { return !f.ko; }), wn = alive.length === 1 ? F.indexOf(alive[0]) : -1, last = F[m.koOrder[m.koOrder.length - 1]] || F[0];
          if (m.t === 8) { banner(wn < 0 ? 'DOUBLE K.O.' : 'K.O.!', '#ff2a2a', 1500); if (wn >= 0 && F[wn].hp >= F[wn].maxHp) subBanner('PERFECT!', 1500); }
          if (m.t >= 130 && (last.state === 'ko' || m.t >= 240)) roundOver(wn);
          break;
        }
        if (m.t === 8) { var dbl = F[0].ko && F[1].ko, w0 = F[0].ko ? 1 : 0; banner(dbl ? 'DOUBLE K.O.' : 'K.O.!', '#ff2a2a', 1500); if (!dbl && F[w0].hp >= F[w0].maxHp) subBanner('PERFECT!', 1500); }
        var loser = F[0].ko ? F[0] : F[1];
        if ((m.t >= 130 && (loser.state === 'ko' || m.t >= 240))) roundOver(F[0].ko && F[1].ko ? -1 : F[0].ko ? 1 : 0);
        break;
      case 'timeup':
        C.step(world);
        if (m.t >= 90 && m.ffa) { var bi = -1, bv = -1, tie = false; F.forEach(function (f, i) { if (f.ko) return; var r = f.hp / f.maxHp; if (r > bv + 0.001) { bv = r; bi = i; tie = false; } else if (Math.abs(r - bv) <= 0.001) tie = true; }); roundOver(tie ? -1 : bi); break; }
        if (m.t >= 90) { var r0 = F[0].hp / F[0].maxHp, r1 = F[1].hp / F[1].maxHp; roundOver(Math.abs(r0 - r1) < 0.001 ? -1 : r0 > r1 ? 0 : 1); }
        break;
      case 'roundEnd':
        C.step(world); setWinPose();
        if (m.t >= 110) {
          if (m.ffa ? Math.max.apply(null, m.wins) >= 2 : m.wins[0] >= 2 || m.wins[1] >= 2) { m.phase = 'matchEnd'; m.t = 0; m.winner = m.ffa ? m.wins.indexOf(Math.max.apply(null, m.wins)) : m.wins[0] >= 2 ? 0 : 1; }
          else { m.round++; beginRound(); }
        }
        break;
      case 'matchEnd':
        C.step(world); setWinPose();
        if (m.t === 50 && !m.ended) {
          m.ended = true;
          m.result = { winner: m.winner, wins: m.wins.slice(), rounds: m.round, stats: F.map(function (f) { return f.stats; }), hp: F.map(function (f) { return f.hp; }), frames: world.frame };
          if (m.mode === 'demo') { setTimeout(function () { if (match === m && G.onDemoEnd) G.onDemoEnd(); }, 1500); }
          else { sfx(m.winner === (m.online ? m.cfg.mySide : 0) || m.mode === '2p' || (m.online && m.cfg.mySide > 2) ? 'win' : 'lose'); if (G.onMatchEnd) G.onMatchEnd(m.result, m); }
        }
        break;
    }
    if (!fast) { for (var si = 0; si < F.length; si++) syncRig(si, true); }
  }
  function setWinPose() {
    var wi = match.phase === 'matchEnd' ? match.winner : match.lastWinner; if (wi == null || wi < 0) return;
    var f = F[wi]; if (f.state !== 'win' && f.y <= 0 && (f.state === 'idle' || f.state === 'walk' || f.state === 'land' || f.state === 'block' || f.state === 'hit' || f.state === 'bstun')) { f.state = 'win'; f.st = 0; f.winPose = ['win1', 'win2', 'win3'][(GB.FIGHTERS.indexOf(f.def) + (match.phase === 'matchEnd' ? 1 : 0)) % 3]; f.facing = 1; }
  }
  function roundOver(w) {
    var m = match;
    if (m.ffa) { if (w >= 0) m.wins[w]++; }
    else if (w >= 0) m.wins[w]++; else { m.wins[0]++; m.wins[1]++; if (m.wins[0] >= 2 && m.wins[1] >= 2) { m.wins = [1, 1]; } }
    m.lastWinner = w; m.roundsLog.push({ w: w, ko: F.some(function (f) { return f.ko; }), time: m.timer <= 0 }); m.phase = 'roundEnd'; m.t = 0;
    if (w < 0) banner('DRAW', '#ffffff', 1200);
  }
  function trainingTick() {
    var m = match, d = F[1], p = F[0];
    if (m.training.meter) p.meter = 100;
    [p, d].forEach(function (f) {
      var neutral = f.state === 'idle' || f.state === 'walk' || f.state === 'block';
      f._calm = neutral ? (f._calm || 0) + 1 : 0;
      if (f._calm > 50) f.hp = f.maxHp;
    });
    if (d.combo === 0 && m.lastCombo > 0) { m.lastCombo = 0; }
  }

  /* ---------- events -> effects ---------- */
  function sfx(n, a) { if (match && match.mode === 'demo') return; GB.Audio.play(n, a); }
  function onEvent(type, d) {
    if (type === 'ko' && match && match.ffa) match.koOrder.push(F.indexOf(d.def));
    if (fast) { if (type === 'ko') slowT = 0; return; }
    var col;
    switch (type) {
      case 'hit':
        col = d.att.def.color;
        FX.spark(d.x, d.y, d.sup ? '#ffe14d' : col, d.heavy ? 1.6 : d.sup ? 1.3 : 0.9, d.dir);
        if (d.heavy || d.launch) FX.ring(d.x, d.y, 0.5, '#ffffff', 2.2, 0.25);
        shake = Math.max(shake, d.heavy ? 0.32 : d.sup ? 0.22 : 0.12);
        sfx(d.heavy ? 'heavy' : 'hit', d.dmg / 30);
        if (d.combo >= 2 && d.att.side >= 0) showCombo(d.att.side, d.combo);
        if (match && match.training && d.def.side === 1) { if (d.combo === 1) match.comboDmg = 0; match.comboDmg += d.dmg; match.lastCombo = d.combo; $('tInfo').textContent = d.combo + ' HIT' + (d.combo > 1 ? 'S' : '') + '  ' + match.comboDmg + ' DMG'; }
        break;
      case 'block': FX.blockSpark(d.x, d.y); sfx('block'); shake = Math.max(shake, 0.05); break;
      case 'whoosh': sfx('whoosh'); break;
      case 'jump': sfx('jump'); FX.dust(d.f.x, 5); break;
      case 'airjump':
        sfx('jump', 0.8 + d.n * 0.15);
        FX.ring(d.f.x, d.f.y + 0.1, 0, d.n >= 3 ? '#ffe14d' : '#ffffff', 1.6, 0.28, true);
        FX.burst(d.f.x, d.f.y + 0.15, d.n >= 3 ? '#ffe14d' : '#e8e4ff', 12, 3.5, 0.32, 0.35);
        break;
      case 'land': FX.dust(d.f.x, 4); sfx('land'); break;
      case 'fall': FX.dust(d.f.x, 10); sfx('land'); shake = Math.max(shake, 0.12); break;
      case 'dash': sfx('dash'); FX.dust(d.f.x, 6); break;
      case 'proj': sfx(d.p.kind === 'void' ? 'void' : d.p.kind === 'ice' ? 'ice' : d.p.kind === 'mine' ? 'pixel' : 'fire'); FX.burst(d.p.x, d.p.ground ? 0.5 : d.p.y, d.p.color, 10, 4, 0.3, 0.3); break;
      case 'projHit': FX.burst(d.p.x, d.p.ground ? 0.6 : d.p.y, d.p.color, 22, 7, 0.4, 0.45); if (d.p.kind === 'ice') { FX.spike(d.p.x, 2.0, 0.6); }
        if (d.p.kind === 'mine') { FX.burst(d.p.x, 0.5, '#ff2bd6', 20, 8, 0.35, 0.5); FX.ring(d.p.x, 0.06, 0, '#9dff00', 3.2, 0.35, true); sfx('pixel'); shake = Math.max(shake, 0.25); } break;
      case 'mineFizzle': FX.burst(d.p.x, 0.4, '#9dff00', 10, 3, 0.25, 0.4); break;
      case 'grab': sfx('heavy'); FX.ring(d.opp.x, 1.2, 0.4, '#7ff5e6', 2.2, 0.3); FX.burst(d.opp.x, 1.2, '#7ff5e6', 14, 5, 0.3, 0.4); break;
      case 'vortex': sfx('splash'); FX.ring(d.x, 0.06, 0, '#14b8a6', 9, 0.7, true); break;
      case 'geyser': sfx('splash'); sfx('slam'); shake = Math.max(shake, 0.7); FX.ring(d.x, 0.06, 0, '#7ff5e6', 6, 0.5, true);
        for (var gq = 0; gq < 3; gq++) FX.burst(d.x + (gq - 1) * 0.9, 0.5 + gq * 1.2, gq % 2 ? '#ffffff' : '#7ff5e6', 26, 9, 0.45, 0.7, 10); break;
      case 'pixelCall': sfx('pixel'); break;
      case 'meteorWarn': sfx('warn'); break;
      case 'hzStrike':
        if (d.h.kind === 'meteor') { sfx('slam'); FX.burst(d.h.x, 0.5, '#ff7a1a', 28, 9, 0.45, 0.6, 12); FX.ring(d.h.x, 0.06, 0, '#ffb04a', 5, 0.45, true); FX.dust(d.h.x - 0.5, 10, '#9aa0b8'); FX.dust(d.h.x + 0.5, 10, '#9aa0b8'); shake = Math.max(shake, 0.5); }
        else { sfx(d.hit ? 'heavy' : 'block'); FX.burst(d.h.x, 0.6, d.h.last ? '#ff2bd6' : '#9dff00', 16, 7, 0.35, 0.4); FX.ring(d.h.x, 0.06, 0, '#9dff00', 2.4, 0.3, true); shake = Math.max(shake, d.h.last ? 0.4 : 0.15); }
        break;
      case 'beltWarn': subBanner((arena && arena.beltMsg) || 'BELT SWITCHING!', 1500); sfx('warn'); break;
      case 'beltSwitch': sfx('warn'); break;
      case 'clash': FX.spark(d.x, d.y, '#ffffff', 1.5); sfx('heavy'); shake = Math.max(shake, 0.2); break;
      case 'special': sfx('zap'); FX.burst(d.f.x, d.f.y + 1.3, d.f.def.color, 14, 4, 0.3, 0.4); break;
      case 'teleport': sfx('teleport'); FX.burst(d.x, d.y, '#c77dff', 26, 6, 0.35, 0.45); FX.ring(d.x, d.y, 0.3, '#ff6be6', 2, 0.3); break;
      case 'spin': sfx('spin'); break;
      case 'spikes': FX.spike(d.x, d.h, 0.7); if (Math.random() < 0.3) sfx('ice'); FX.burst(d.x, 0.4, '#bff4ff', 4, 4, 0.25, 0.4); break;
      case 'slam': sfx('slam'); FX.ring(d.x, 0.06, 0, d.big ? '#ffe14d' : d.f.def.color, d.big ? 14 : 5.5, d.big ? 0.6 : 0.4, true); FX.dust(d.x - 1, 10); FX.dust(d.x + 1, 10); shake = Math.max(shake, d.big ? 0.9 : 0.45);
        if (d.big) for (var k = -8; k <= 8; k += 2) FX.dust(k, 4, '#a8a29e'); break;
      case 'guardbreak': subBanner('GUARD BREAK!', 900); sfx('heavy'); break;
      case 'superStart':
        sfx('superStart'); col = d.f.def.color; banner(d.f.def.super.name, col, 1000, true);
        $('superFx').classList.add('on'); FX.burst(d.f.x, d.f.y + 1.3, col, 40, 8, 0.45, 0.7); FX.ring(d.f.x, d.f.y + 1.3, 0.5, col, 4, 0.5);
        break;
      case 'superHit': break;
      case 'lock': sfx('zap'); break;
      case 'ko': if (match && match.ffa) { var left = F.filter(function (f) { return !f.ko; }).length; if (left >= 2) { subBanner(((match.cfg.names && match.cfg.names[F.indexOf(d.def)]) || d.def.name) + ' IS OUT!', 1400); } }
        slowT = 1.5; sfx('ko'); shake = 0.6; FX.flash(d.def.x, d.def.y + 1.2, '#ffffff', 6); break;
    }
  }
  var comboTimers = [0, 0, 0];
  function showCombo(side, n) {
    var el = $('combo' + side); el.innerHTML = n + '<small>HITS!</small>'; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(comboTimers[side]); comboTimers[side] = setTimeout(function () { el.classList.remove('on'); }, 1100);
  }
  var bannerT = 0;
  function banner(txt, color, ms, isSuper) {
    var el = $('banner'); clearTimeout(bannerT);
    if (!txt || (match && match.mode === 'demo')) { el.className = ''; el.textContent = ''; return; }
    el.textContent = txt; el.style.setProperty('--bc', color || '#ff4fd8'); el.className = ''; void el.offsetWidth; el.className = 'on' + (isSuper ? ' super' : '');
    bannerT = setTimeout(function () { el.className = 'out' + (isSuper ? ' super' : ''); }, ms || 1000);
  }
  var subT = 0;
  function subBanner(txt, ms) { if (match && match.mode === 'demo') return; var el = $('subBanner'); el.textContent = txt; el.classList.add('on'); clearTimeout(subT); subT = setTimeout(function () { el.classList.remove('on'); }, ms || 1000); }
  G.banner = banner;

  /* ---------- camera ---------- */
  function updateCamera(dt) {
    var tx, ty, tz, lx, ly, k = 1 - Math.pow(0.0015, dt);
    var tanV = Math.tan(camera.fov * Math.PI / 360), tanH = tanV * camera.aspect;
    if (preview) {
      var a = Math.sin(time * 0.25) * 0.35; tx = Math.sin(a) * 10; tz = Math.cos(a) * 10; ty = 2.6; lx = 0; ly = 1.4; k = 1 - Math.pow(0.05, dt);
    } else if (world && match) {
      var a0 = F[0], a1 = F[1], mid = (a0.x + a1.x) / 2, sep = Math.abs(a0.x - a1.x), maxY = Math.max(a0.y, a1.y);
      if (F.length > 2) { var mnx = 1e9, mxx = -1e9; maxY = 0; F.forEach(function (f) { mnx = Math.min(mnx, f.x); mxx = Math.max(mxx, f.x); maxY = Math.max(maxY, f.y); }); mid = (mnx + mxx) / 2; sep = mxx - mnx; }
      var width = Math.max(8.2, sep + 5.0), height = 5.1 + maxY * 0.95;
      var D = Math.max(width / 2 / tanH, height / 2 / tanV); D = Math.min(D, 17);
      tx = mid; ly = 1.3 + maxY * 0.55; ty = ly + 0.55 + D * 0.06; tz = D; lx = mid;
      if (match.phase === 'intro' && match.t < 90) { var p = match.t / 90, e = 1 - Math.pow(1 - p, 3); tx = mid + (1 - e) * -5; tz = D + (1 - e) * -4; ty = ty + (1 - e) * 1.5; k = 1 - Math.pow(0.02, dt); }
      if (world.cine) { var f = world.cine.f; tx = f.x + f.facing * 2.4; ty = f.y + 1.9; tz = 3.6; lx = f.x; ly = f.y + 1.55; k = 1 - Math.pow(0.0005, dt); }
      else if (world.superCamT > 0) { var o = Math.sin(time * 0.9) * 0.5; tx = mid + Math.sin(o) * 5.2; tz = Math.cos(o) * 5.2; ty = 1.9; lx = mid; ly = 1.3; k = 1 - Math.pow(0.01, dt); }
      else if (match.phase === 'ko' && match.t < 120) { var lo = match.ffa ? (F[match.koOrder[match.koOrder.length - 1]] || F[0]) : F[0].ko ? F[0] : F[1]; tx = lo.x * 0.7 + mid * 0.3; tz = 6.2; ty = 1.9; lx = lo.x; ly = 0.9 + lo.y * 0.5; k = 1 - Math.pow(0.02, dt); }
      else if (match.phase === 'matchEnd' || (match.phase === 'roundEnd' && match.lastWinner >= 0 && match.t > 20)) {
        var wi = match.phase === 'matchEnd' ? match.winner : match.lastWinner, wf = F[wi], ang = Math.sin(time * 0.4) * 0.5;
        tx = wf.x + Math.sin(ang) * 5.4; tz = Math.cos(ang) * 5.4; ty = 1.9; lx = wf.x; ly = 1.4; k = 1 - Math.pow(0.03, dt);
        if (match.phase === 'matchEnd' && isTouch === false) { lx = wf.x; }
      }
    } else { tx = Math.sin(time * 0.2) * 3; ty = 3; tz = 12; lx = 0; ly = 1.5; }
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k; cam.lx += (lx - cam.lx) * k; cam.ly += (ly - cam.ly) * k;
    var sx = 0, sy = 0; if (shake > 0.001) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; shake *= Math.pow(0.004, dt); }
    camera.position.set(cam.x + sx, cam.y + sy, cam.z);
    camera.lookAt(cam.lx + sx * 0.5, cam.ly + sy * 0.5, 0);
  }

  /* ---------- HUD ---------- */
  function setW(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.style.width = v; } }
  function setC(el, cls, key, on) { if (hudCache[key] !== on) { hudCache[key] = on; el.classList.toggle(cls, on); } }
  G.hudInit = function (portraits) {
    if (!match) return; portraits = portraits || G._portraits;
    F.forEach(function (f, i) {
      var bar = document.querySelector('.hbar.p' + (i + 1));
      bar.style.setProperty('--fc', f.def.color);
      bar.querySelector('.nm').textContent = f.def.name;
      bar.querySelector('.tag').textContent = match.mode === 'demo' ? '' : match.online || match.mode === 'online' ? ((match.cfg.names && match.cfg.names[i]) || 'P' + (i + 1)) : i === 0 ? 'P1' : i === 2 ? 'P3' : match.mode === '2p' ? 'P2' : match.mode === 'training' ? 'DUMMY' : 'CPU';
      var img = bar.querySelector('.por'); if (portraits && portraits[f.id]) img.src = portraits[f.id]; img.setAttribute('data-id', f.id); bar.setAttribute('data-id', f.id);
    });
    $('trainBar').classList.toggle('hidden', !match.training);
    hudCache = {};
  };
  function updateHud() {
    if (!match || match.mode === 'demo') return;
    for (var i = 0; i < F.length; i++) {
      var f = F[i], bar = i === 0 ? hudEls.b1 : i === 1 ? hudEls.b2 : hudEls.b3, pct = Math.max(0, f.hp / f.maxHp * 100).toFixed(1) + '%';
      setW(bar.fill, 'hp' + i, pct); setW(bar.trail, 'tr' + i, pct); setC(bar.hp, 'low', 'low' + i, f.hp / f.maxHp < 0.25);
      setW(bar.mfill, 'm' + i, Math.floor(f.meter) + '%');
      var sp = f.meter >= C.SPECIAL_COST, full = f.meter >= C.SUPER_COST;
      setC(bar.meter, 'sp', 'sp' + i, sp && !full); setC(bar.meter, 'full', 'full' + i, full);
      var txt = full ? 'SUPER READY! (O)' : ''; if (hudCache['mt' + i] !== txt) { hudCache['mt' + i] = txt; bar.mtxt.textContent = isTouch ? (full ? 'SUPER READY!' : '') : txt; }
      for (var j = 0; j < 2; j++) setC(bar.pips[j], 'won', 'pip' + i + j, match.wins[i] > j);
    }
    var tt = match.training ? '\u221E' : String(match.timer); if (hudCache.timer !== tt) { hudCache.timer = tt; hudEls.timer.textContent = tt; hudEls.timer.classList.toggle('low', !match.training && match.timer <= 10); }
    if (isTouch) {
      setC(hudEls.spBtn, 'ready', 'spb', F[0].meter >= C.SPECIAL_COST);
      setC(hudEls.suBtn, 'ready', 'sub', F[0].meter >= C.SUPER_COST);
    }
    var sfxOn = !!(world && (world.cine || world.superCamT > 0));
    if (hudCache.sfx !== sfxOn) { hudCache.sfx = sfxOn; $('superFx').classList.toggle('on', sfxOn); }
  }
  var hudEls = null;
  function grabHud() {
    function b(sel) { var r = document.querySelector(sel); return { hp: r.querySelector('.hp'), fill: r.querySelector('.fill'), trail: r.querySelector('.trail'), meter: r.querySelector('.meter'), mfill: r.querySelector('.mfill'), mtxt: r.querySelector('.mtxt'), pips: r.querySelectorAll('.pips i') }; }
    hudEls = { b1: b('.hbar.p1'), b2: b('.hbar.p2'), b3: b('.hbar.p3'), timer: $('timer'), spBtn: document.querySelector('.tb.special'), suBtn: document.querySelector('.tb.super') };
  }

  /* ---------- showroom (character select) ---------- */
  function buildShowroom() {
    var s = new T.Scene();
    var c = document.createElement('canvas'); c.width = 4; c.height = 256; var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#05021a'); gr.addColorStop(0.55, '#2a0f5a'); gr.addColorStop(1, '#ff3fd0'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    s.background = new T.CanvasTexture(c);
    s.add(new T.HemisphereLight('#d8ccff', '#3a1060', 1.0)); var dl = new T.DirectionalLight('#ffffff', 0.8); dl.position.set(2, 6, 8); s.add(dl); s.add(new T.AmbientLight('#ffffff', 0.2));
    var floor = new T.Mesh(new T.CircleGeometry(14, 40), new T.MeshLambertMaterial({ color: '#1a0f3a' })); floor.rotation.x = -Math.PI / 2; s.add(floor);
    var grid = new T.GridHelper(28, 28, '#ff4fd8', '#3a2a7a'); grid.position.y = 0.01; s.add(grid);
    var pads = [], rings = [];
    [-1.55, 1.55].forEach(function (x, i) {
      var p = new T.Mesh(new T.CylinderGeometry(1.1, 1.25, 0.3, 24), new T.MeshLambertMaterial({ color: '#2a1a5a' })); p.position.set(x, 0.15, 0); s.add(p); pads.push(p);
      var r = new T.Mesh(new T.TorusGeometry(1.15, 0.05, 6, 40), new T.MeshBasicMaterial({ color: i ? '#3ff0ff' : '#ff4a2e' })); r.rotation.x = Math.PI / 2; r.position.set(x, 0.31, 0); s.add(r); rings.push(r);
    });
    var cm = new T.PerspectiveCamera(34, 1, 0.1, 100);
    showroom = { scene: s, cam: cm, slots: [null, null], ids: [null, null], cache: {}, pads: pads, rings: rings, cheer: [0, 0] };
  }
  G.showroom = function (ids, cheerSide, skins) {
    skins = skins || G._srSkins || [];
    view = 'showroom';
    for (var i = 0; i < 2; i++) {
      var id = ids[i];
      var sid = id ? id + '|' + (skins[i] || '') : id;
      if (showroom.ids[i] !== sid) {
        if (showroom.slots[i]) showroom.scene.remove(showroom.slots[i].root);
        showroom.slots[i] = null; showroom.ids[i] = sid;
        if (id) {
          var key = i + ':' + sid, r = showroom.cache[key];
          if (!r) { r = showroom.cache[key] = Mdl.build(GB.skinned(GB.fighter(id), skins[i])); }
          r.root.position.set(i ? 1.55 : -1.55, 0.3, 0); r.root.rotation.y = i ? -0.5 : 0.5; showroom.scene.add(r.root); showroom.slots[i] = r; showroom.cheer[i] = 0;
        }
      }
      showroom.pads[i].visible = showroom.rings[i].visible = true;
    }
    if (cheerSide != null) showroom.cheer[cheerSide] = 1.2;
  };
  function updateShowroom(dt) {
    var s = showroom;
    for (var i = 0; i < 2; i++) {
      var r = s.slots[i]; if (!r) continue;
      s.cheer[i] = Math.max(0, s.cheer[i] - dt);
      var P = GB.Models.POSES, pose = s.cheer[i] > 0 ? P[['win1', 'win3', 'win2'][i]](0, time) : P.idle(0, time + i);
      Mdl.applyPose(r, pose, s.cheer[i] > 0 ? 0.2 : 0.12);
      r.root.rotation.y = (i ? -0.55 : 0.55) + Math.sin(time * 0.6 + i) * 0.25;
      if (r.shadow) r.shadow.position.y = 0.01;
    }
    s.rings.forEach(function (rg, k) { rg.scale.setScalar(1 + Math.sin(time * 3 + k) * 0.03); });
    var tanV = Math.tan(s.cam.fov * Math.PI / 360), tanH = tanV * s.cam.aspect;
    var D = Math.max(6.6 / 2 / tanH, 3.6 / 2 / tanV);
    s.cam.position.set(0, 1.9 + D * 0.05, D); s.cam.lookAt(0, 1.45 - (s.cam.aspect > 1.9 ? 0.15 : 0), 0);
  }

  /* ---------- arena preview (arena select) ---------- */
  G.previewArena = function (id, p1, p2) {
    view = 'fight'; match = null; world = null; preview = { id: id };
    G.loadArena(id); FX.clear();
    if (!rigs[0] || rigs[0].def.id !== p1 || !rigs[1] || rigs[1].def.id !== p2) setRigs([GB.fighter(p1), GB.fighter(p2)], null);
    for (var i = 0; i < 2; i++) { if (plates[i]) plates[i].visible = false; rigs[i].root.position.set(i ? 2.2 : -2.2, 0, 0); rigs[i].root.rotation.y = i ? -1.1 : 1.1; rigs[i].root.visible = true; rigs[i].setFlash(0); rigs[i].body.rotation.y = 0; if (rigs[i].shadow) { rigs[i].shadow.position.y = 0.03; rigs[i].shadow.scale.set(1, 1, 1); } }
  };

  /* ---------- portraits ---------- */
  G.portraits = function () {
    var out = {}, size = 128, rt = new T.WebGLRenderTarget(size, size);
    var ps = new T.Scene(); ps.add(new T.HemisphereLight('#ffffff', '#554477', 1.0)); var dl = new T.DirectionalLight('#ffffff', 0.7); dl.position.set(2, 3, 5); ps.add(dl);
    var pc = new T.PerspectiveCamera(30, 1, 0.1, 50), buf = new Uint8Array(size * size * 4);
    var prevClear = renderer.getClearColor(new T.Color()), prevA = renderer.getClearAlpha();
    GB.FIGHTERS.forEach(function (def) {
      var r = Mdl.build(def, { noShadow: true }); ps.add(r.root); Mdl.applyPose(r, GB.Models.POSES.idle(0, 0), 1); r.root.rotation.y = 0.45;
      var hy = 2.05 * (def.scale || 1); pc.position.set(0.55, hy + 0.15, 2.6); pc.lookAt(0, hy - 0.05, 0);
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(ps, pc); renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf); renderer.setRenderTarget(null);
      var c = document.createElement('canvas'); c.width = c.height = size; var g = c.getContext('2d');
      var gr = g.createLinearGradient(0, 0, 0, size); gr.addColorStop(0, def.color); gr.addColorStop(1, '#0b0620'); g.fillStyle = gr; g.fillRect(0, 0, size, size);
      var tmp = document.createElement('canvas'); tmp.width = tmp.height = size; var tg = tmp.getContext('2d'), id = tg.createImageData(size, size);
      for (var y = 0; y < size; y++) { var src = (size - 1 - y) * size * 4, dst = y * size * 4; for (var x = 0; x < size * 4; x++) id.data[dst + x] = buf[src + x]; }
      tg.putImageData(id, 0, 0); g.drawImage(tmp, 0, 0);
      out[def.id] = c.toDataURL('image/png');
      ps.remove(r.root); disposeRig(r);
    });
    renderer.setClearColor(prevClear, prevA); rt.dispose();
    G._portraits = out; return out;
  };

  /* ---------- main loop ---------- */
  function loop(t) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000)); lastT = t;
    if (!hudEls) grabHud();
    time += dt;
    if (view === 'showroom') { updateShowroom(dt); renderer.render(showroom.scene, showroom.cam); return; }
    if (view === 'story' && G.storyFrame) { G.storyFrame(dt, renderer, time); return; }
    if (paused) { renderer.render(scene, camera); return; }
    var ts = slowT > 0 ? 0.3 : 1; if (slowT > 0) slowT -= dt;
    if (match && !manual) {
      acc += dt * ts; var n = 0;
      while (acc >= C.DT && n < 4) { if (fixedStep() === false) { acc = Math.min(acc, C.DT); break; } acc -= C.DT; n++; }
      if (n >= 4) acc = 0;
    }
    if (preview) {
      for (var i = 0; i < 2; i++) if (rigs[i]) Mdl.applyPose(rigs[i], GB.Models.POSES.idle(0, time + i * 0.7), 0.2);
    }
    if (world && !fast) {
      for (var j = 0; j < F.length; j++) {
        var f = F[j];
        if (f && f.state === 'atk' && f.move && (f.move.def.kind === 'super' || (world.cine && world.cine.f === f))) for (var a = 0; a < 2; a++) FX.aura(f.x, f.y, 2.3 * f.sc, a ? '#ffffff' : f.def.color);
        if (f && f.meter >= C.SUPER_COST && Math.random() < 0.25 && match && match.mode !== 'demo') FX.aura(f.x, f.y, 2.2 * f.sc, f.def.color);
      }
    }
    updateCamera(dt);
    updateVis(dt);
    FX.update(dt * ts, camera, cam.x);
    if (arena) arena.update(time, world);
    updateHud();
    renderer.render(scene, camera);
  }

  /* ---------- test/debug API ---------- */
  G.debug = {
    state: function () {
      var info = renderer.info.render;
      return { view: view, mode: match && match.mode, phase: match && match.phase, round: match && match.round, wins: match && match.wins.slice(), timer: match && match.timer, arena: arenaId, frame: world && world.frame,
        cine: !!(world && world.cine), superCam: world ? world.superCamT : 0, projs: world ? world.projs.length : 0, beams: world ? world.beams.length : 0, calls: info.calls, tris: info.triangles,
        f: F.map(function (f) { return f && { id: f.id, hp: f.hp, maxHp: f.maxHp, meter: Math.round(f.meter), state: f.state, x: +f.x.toFixed(2), y: +f.y.toFixed(2), combo: f.combo, move: f.move ? f.move.def.name : null, moveT: f.move ? f.move.t : 0, stats: f.stats, ko: f.ko }; }),
        result: match && match.result };
    },
    setManual: function (b) { manual = !!b; },
    setFast: function (b) { fast = !!b; },
    step: function (n, until) { for (var i = 0; i < (n || 1); i++) { fixedStep(); if (until && match && until(match, world)) break; } if (fast) { for (var si = 0; si < F.length; si++) syncRig(si, true); } return G.debug.state(); },
    setBot: function (fn, fn2) { if (match) { match.bot = fn; match.bot2 = fn2 || null; } },
    meter: function (side, v) { if (F[side]) F[side].meter = v; },
    hp: function (side, v) { if (F[side]) F[side].hp = v; },
    pos: function (side, x) { if (F[side]) { F[side].x = x; F[side].y = 0; F[side].vy = 0; } },
    fighters: function () { return F; }, world: function () { return world; }, camera: function () { return camera; },
    skipIntro: function () { if (match && match.phase === 'intro') { match.phase = 'fight'; match.t = 0; world.inputLocked = false; F.forEach(function (f) { f.state = 'idle'; }); } },
    identity: function () { return F.map(function (_, i) { var bar = document.querySelector('.hbar.p' + (i + 1)); return { fighter: F[i] && F[i].id, rig: rigs[i] && rigs[i].root.userData.fighterId, plate: plates[i] ? plates[i].userData.fighterId : null, plateLabel: plates[i] ? plates[i].userData.label : null, hudName: bar.querySelector('.nm').textContent, hudId: bar.getAttribute('data-id'), defName: F[i] && F[i].def.name }; }); },
    renderOnce: function () { updateCamera(0.016); updateVis(0.016); FX.update(0.016, camera, cam.x); renderer.render(scene, camera); }
  };
})();
