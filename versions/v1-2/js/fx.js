/* Grok Brawl - pooled particles, hit sparks, rings, beams (few draw calls) */
(function () {
  'use strict';
  var T = THREE;
  var F = GB.FX = {};
  var scene, sysAdd, sysNorm, flashes = [], rings = [], spikes = [], ambient = null, projScale = { value: 600 };

  function makeSystem(n, blending) {
    var g = new T.BufferGeometry();
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('pcol', new T.BufferAttribute(col, 4)); g.setAttribute('size', new T.BufferAttribute(size, 1));
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e4);
    var m = new T.ShaderMaterial({
      uniforms: { projScale: projScale },
      vertexShader: 'attribute float size; attribute vec4 pcol; varying vec4 vC; uniform float projScale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * projScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; vC = pcol; }',
      fragmentShader: 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = smoothstep(0.5, 0.05, r); gl_FragColor = vec4(vC.rgb, vC.a * a); }',
      transparent: true, depthWrite: false, blending: blending
    });
    var pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5;
    var P = []; for (var i = 0; i < n; i++) P.push({ life: 0 });
    return { pts: pts, P: P, n: n, pos: pos, col: col, size: size, g: g, next: 0 };
  }
  function emit(sys, o) {
    var p = null;
    for (var k = 0; k < sys.n; k++) { var i = (sys.next + k) % sys.n; if (sys.P[i].life <= 0) { p = sys.P[i]; sys.next = (i + 1) % sys.n; break; } }
    if (!p) { p = sys.P[sys.next]; sys.next = (sys.next + 1) % sys.n; }
    p.x = o.x; p.y = o.y; p.z = o.z || 0; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.life = p.max = o.life || 0.5; p.s0 = o.size || 0.2; p.s1 = o.size1 != null ? o.size1 : 0; p.g = o.g || 0; p.drag = o.drag || 0;
    var c = new T.Color(o.color || '#ffffff'); p.r = c.r; p.gg = c.g; p.b = c.b; p.a = o.alpha != null ? o.alpha : 1; p.wob = o.wob || 0; p.t = 0;
    return p;
  }
  function stepSys(sys, dt) {
    for (var i = 0; i < sys.n; i++) {
      var p = sys.P[i];
      if (p.life > 0) {
        p.life -= dt; p.t += dt; var k = Math.max(0, p.life / p.max);
        p.vy -= p.g * dt; if (p.drag) { var d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; }
        p.x += p.vx * dt + (p.wob ? Math.sin(p.t * 3 + i) * p.wob * dt : 0); p.y += p.vy * dt; p.z += p.vz * dt;
        sys.pos[i * 3] = p.x; sys.pos[i * 3 + 1] = p.y; sys.pos[i * 3 + 2] = p.z;
        sys.col[i * 4] = p.r; sys.col[i * 4 + 1] = p.gg; sys.col[i * 4 + 2] = p.b; sys.col[i * 4 + 3] = p.a * Math.min(1, k * 2.5);
        sys.size[i] = p.s1 + (p.s0 - p.s1) * k;
        if (p.life <= 0) sys.size[i] = 0;
      } else sys.size[i] = 0;
    }
    sys.g.attributes.position.needsUpdate = true; sys.g.attributes.pcol.needsUpdate = true; sys.g.attributes.size.needsUpdate = true;
  }

  function starTex() {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    var r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.beginPath();
    for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2, rr = i % 2 ? 18 : 64; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); }
    g.closePath(); g.fill(); return new T.CanvasTexture(c);
  }

  F.init = function (sc) {
    scene = sc;
    sysAdd = makeSystem(700, T.AdditiveBlending); sysNorm = makeSystem(360, T.NormalBlending);
    scene.add(sysAdd.pts); scene.add(sysNorm.pts);
    var st = starTex();
    for (var i = 0; i < 8; i++) {
      var m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending }));
      m.visible = false; m.renderOrder = 10; scene.add(m); flashes.push({ m: m, life: 0 });
    }
    var rg = new T.RingGeometry(0.8, 1, 40);
    for (i = 0; i < 6; i++) {
      var r = new T.Mesh(rg, new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      r.visible = false; r.renderOrder = 6; scene.add(r); rings.push({ m: r, life: 0 });
    }
    var cg = new T.ConeGeometry(0.5, 1, 5);
    var im = new T.MeshLambertMaterial({ color: '#bff4ff', emissive: '#2a8ab0', transparent: true, opacity: 0.92 });
    for (i = 0; i < 24; i++) { var s = new T.Mesh(cg, im); s.visible = false; scene.add(s); spikes.push({ m: s, life: 0 }); }
  };
  F.setProjScale = function (v) { projScale.value = v; };
  F.clear = function () {
    [sysAdd, sysNorm].forEach(function (s) { s.P.forEach(function (p) { p.life = 0; }); });
    flashes.forEach(function (f) { f.life = 0; f.m.visible = false; }); rings.forEach(function (f) { f.life = 0; f.m.visible = false; }); spikes.forEach(function (f) { f.life = 0; f.m.visible = false; });
  };
  F.reattach = function (sc) { scene = sc; [sysAdd.pts, sysNorm.pts].forEach(function (p) { sc.add(p); }); flashes.forEach(function (f) { sc.add(f.m); }); rings.forEach(function (f) { sc.add(f.m); }); spikes.forEach(function (f) { sc.add(f.m); }); };

  /* ---------- effects ---------- */
  F.spark = function (x, y, color, power, dir) {
    power = power || 1;
    var n = Math.round(10 + 10 * power);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (4 + Math.random() * 8) * (0.7 + power * 0.4);
      emit(sysAdd, { x: x, y: y, z: 0.4, vx: Math.cos(a) * sp + (dir || 0) * 3, vy: Math.sin(a) * sp, vz: (Math.random() - 0.5) * 4, life: 0.18 + Math.random() * 0.22, size: 0.22 + Math.random() * 0.12 * power, size1: 0.02, drag: 5, color: i % 3 ? color : '#ffffff' });
    }
    F.flash(x, y, color, 1.1 + power * 0.7);
  };
  F.blockSpark = function (x, y) {
    for (var i = 0; i < 10; i++) { var a = Math.random() * Math.PI * 2; emit(sysAdd, { x: x, y: y, z: 0.4, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 0.2, size: 0.18, drag: 6, color: '#7fd8ff' }); }
    F.ring(x, y, 0.4, '#7fd8ff', 0.9, 0.18, false);
  };
  F.flash = function (x, y, color, size) {
    var f = flashes.find(function (q) { return q.life <= 0; }) || flashes[0];
    f.life = f.max = 0.14; f.size = size || 1.5; f.m.material.color.set(color || '#ffffff'); f.m.position.set(x, y, 0.6); f.m.visible = true; f.m.rotation.z = Math.random() * 3;
  };
  F.ring = function (x, y, z, color, size, life, ground) {
    var r = rings.find(function (q) { return q.life <= 0; }) || rings[0];
    r.life = r.max = life || 0.35; r.size = size || 2; r.m.material.color.set(color || '#ffffff'); r.m.position.set(x, y, z || 0); r.m.visible = true;
    r.ground = !!ground; r.m.rotation.set(ground ? -Math.PI / 2 : 0, 0, 0);
  };
  F.dust = function (x, n, color) {
    for (var i = 0; i < (n || 8); i++) emit(sysNorm, { x: x + (Math.random() - 0.5) * 0.6, y: 0.1, z: (Math.random() - 0.5) * 0.8, vx: (Math.random() - 0.5) * 4, vy: 0.8 + Math.random() * 1.5, life: 0.5, size: 0.35, size1: 0.6, drag: 3, color: color || '#cfc6b8', alpha: 0.55 });
  };
  F.trail = function (x, y, color, size, spread) {
    emit(sysAdd, { x: x + (Math.random() - 0.5) * (spread || 0.2), y: y + (Math.random() - 0.5) * (spread || 0.2), z: (Math.random() - 0.5) * 0.3, vx: (Math.random() - 0.5), vy: Math.random() * 1.2, life: 0.3, size: size || 0.4, size1: 0.05, color: color });
  };
  F.burst = function (x, y, color, n, speed, size, life, g) {
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6); emit(sysAdd, { x: x, y: y, z: (Math.random() - 0.5) * 0.6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: (Math.random() - 0.5) * s * 0.5, life: life || 0.5, size: size || 0.3, size1: 0.02, drag: 2, g: g || 0, color: color }); }
  };
  F.aura = function (x, y, h, color) {
    emit(sysAdd, { x: x + (Math.random() - 0.5) * 0.9, y: y + Math.random() * h, z: (Math.random() - 0.5) * 0.6, vy: 2 + Math.random() * 2, life: 0.4, size: 0.28, size1: 0.02, color: color });
  };
  F.spike = function (x, h, life) {
    var s = spikes.find(function (q) { return q.life <= 0; }); if (!s) return;
    s.life = s.max = life || 0.6; s.h = h || 1.6; s.m.position.set(x, 0, (Math.random() - 0.5) * 0.4); s.m.visible = true; s.m.rotation.z = (Math.random() - 0.5) * 0.4;
  };

  /* ---------- ambient arena particles ---------- */
  F.setAmbient = function (cfg) { ambient = cfg ? { cfg: cfg, acc: 0 } : null; };
  function ambientStep(dt, cx) {
    if (!ambient) return; var c = ambient.cfg; ambient.acc += dt;
    var rate = { rain: 0.012, confetti: 0.05, petals: 0.07, embers: 0.03, dust: 0.08 }[c.type] || 0.1;
    while (ambient.acc > rate) {
      ambient.acc -= rate;
      var x = cx + (Math.random() - 0.5) * 26, z = -4 + Math.random() * 6;
      if (c.type === 'rain') emit(sysNorm, { x: x, y: 9, z: z, vx: -1, vy: -18, life: 0.6, size: 0.06, size1: 0.06, color: c.color, alpha: 0.5 });
      else if (c.type === 'confetti') emit(sysNorm, { x: x, y: 9, z: z, vy: -1.6, wob: 2, life: 5, size: 0.14, size1: 0.14, color: ['#ffd84d', '#ff4fd8', '#3ff0ff', '#ffffff'][(Math.random() * 4) | 0], alpha: 0.9 });
      else if (c.type === 'petals') emit(sysNorm, { x: x, y: 8, z: z, vx: 0.6, vy: -1.0, wob: 2.5, life: 7, size: 0.16, size1: 0.14, color: Math.random() < 0.5 ? '#ffb7d5' : '#ff8fc0', alpha: 0.95 });
      else if (c.type === 'embers') emit(sysAdd, { x: x, y: -0.5, z: z - 2, vx: (Math.random() - 0.5), vy: 1.5 + Math.random() * 2, wob: 1.5, life: 3, size: 0.12, size1: 0.02, color: Math.random() < 0.5 ? '#ff8a1a' : '#ffd040' });
      else emit(sysAdd, { x: x, y: Math.random() * 6, z: z, vx: (Math.random() - 0.5) * 0.3, vy: 0.2, wob: 0.6, life: 4, size: 0.07, size1: 0.07, color: c.color, alpha: 0.5 });
    }
  }

  F.update = function (dt, cam, cx) {
    ambientStep(dt, cx || 0);
    stepSys(sysAdd, dt); stepSys(sysNorm, dt);
    flashes.forEach(function (f) {
      if (f.life <= 0) { f.m.visible = false; return; }
      f.life -= dt; var k = f.life / f.max; f.m.scale.setScalar(f.size * (1.4 - k * 0.6)); f.m.material.opacity = k; if (cam) f.m.quaternion.copy(cam.quaternion); f.m.rotateZ(dt * 3);
    });
    rings.forEach(function (r) {
      if (r.life <= 0) { r.m.visible = false; return; }
      r.life -= dt; var k = r.life / r.max; var s = r.size * (1.15 - k); r.m.scale.set(s, s, s); r.m.material.opacity = k;
      if (!r.ground && cam) r.m.quaternion.copy(cam.quaternion);
    });
    spikes.forEach(function (s) {
      if (s.life <= 0) { s.m.visible = false; return; }
      s.life -= dt; var k = s.life / s.max, up = Math.min(1, (1 - k) * 6), h = s.h * up * (k < 0.2 ? k / 0.2 : 1);
      s.m.scale.set(0.5 + h * 0.25, Math.max(0.01, h), 0.5 + h * 0.25); s.m.position.y = h / 2;
    });
  };
})();
