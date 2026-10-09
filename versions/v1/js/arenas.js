/* Grok Brawl - 5 low-poly arenas (shared materials, instancing, cheap animation) */
(function () {
  'use strict';
  var T = THREE;
  var A = GB.Arenas = {};
  var matCache = {}, geoCache = {};
  function lam(c) { return matCache['l' + c] || (matCache['l' + c] = new T.MeshLambertMaterial({ color: c })); }
  function basic(c) { return matCache['b' + c] || (matCache['b' + c] = new T.MeshBasicMaterial({ color: c })); }
  function add(c) { return matCache['a' + c] || (matCache['a' + c] = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); }
  function geo(k, f) { return geoCache[k] || (geoCache[k] = f()); }
  function box() { return geo('box', function () { return new T.BoxGeometry(1, 1, 1); }); }
  function cyl(n) { return geo('cyl' + n, function () { return new T.CylinderGeometry(0.5, 0.5, 1, n || 8); }); }
  function cone(n) { return geo('cone' + n, function () { return new T.ConeGeometry(0.5, 1, n || 8); }); }
  function ball(d) { return geo('ball' + d, function () { return new T.IcosahedronGeometry(0.5, d || 1); }); }
  function plane() { return geo('plane', function () { return new T.PlaneGeometry(1, 1); }); }
  function M(g, m, x, y, z, sx, sy, sz, parent) { var o = new T.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx || 1, sy || 1, sz || 1); parent.add(o); return o; }
  function cv(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
  function gradTex(stops) { return cv(4, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); stops.forEach(function (s, i) { gr.addColorStop(i / (stops.length - 1), s); }); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); }
  function skyTex(stops, stars, extra) {
    return cv(512, 512, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); stops.forEach(function (s, i) { gr.addColorStop(i / (stops.length - 1), s); }); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (var i = 0; i < (stars || 0); i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.7) + ')'; var s = Math.random() < 0.1 ? 2 : 1; g.fillRect(Math.random() * w, Math.random() * h * 0.6, s, s); }
      if (extra) extra(g, w, h);
    });
  }
  function textTex(txt, w, h, col, bg, font) {
    return cv(w, h, function (g) {
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
      g.font = font || ('900 ' + Math.round(h * 0.6) + 'px Impact, "Arial Black", sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = h * 0.15; g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + h * 0.04); g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = 0.6; g.fillText(txt, w / 2, h / 2 + h * 0.04);
    });
  }
  function sign(txt, w, h, col, bg, parent, x, y, z) {
    var m = new T.Mesh(plane(), new T.MeshBasicMaterial({ map: textTex(txt, 512, Math.round(512 * h / w), col, bg), transparent: !bg })); m.position.set(x, y, z); m.scale.set(w, h, 1); parent.add(m); return m;
  }
  function floor(tex, parent, w, d, rep) { tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(rep[0], rep[1]); var m = new T.Mesh(plane(), new T.MeshLambertMaterial({ map: tex })); m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); parent.add(m); return m; }
  function instanced(g, m, list, parent, colors) {
    var im = new T.InstancedMesh(g, m, list.length), o = new T.Object3D(), c = new T.Color();
    list.forEach(function (it, i) { o.position.set(it[0], it[1], it[2]); o.scale.set(it[3], it[4], it[5]); o.rotation.set(0, it[6] || 0, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (colors) { c.set(colors[i % colors.length]); im.setColorAt(i, c); } });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; parent.add(im); return im;
  }
  function windowsTex(lit) {
    var t = cv(128, 256, function (g, w, h) { g.fillStyle = '#0d0820'; g.fillRect(0, 0, w, h); for (var y = 3; y < h; y += 8) for (var x = 3; x < w; x += 8) { if (Math.random() < 0.5) { g.fillStyle = lit[(Math.random() * lit.length) | 0]; g.fillRect(x, y, 4, 5); } } });
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1, 2); return t;
  }
  function edgeStrip(parent, col, z) { M(box(), basic(col), 0, 0.03, z, 40, 0.06, 0.08, parent); }
  function lights(scene, hemiSky, hemiGround, hi, dirCol, di, dx, dy, dz) {
    var g = new T.Group(); var h = new T.HemisphereLight(hemiSky, hemiGround, hi); g.add(h);
    var d = new T.DirectionalLight(dirCol, di); d.position.set(dx, dy, dz); g.add(d); var a = new T.AmbientLight('#ffffff', 0.18); g.add(a); return g;
  }

  /* ---------- NEON ROOFTOP ---------- */
  function rooftop(root) {
    var o = { sky: skyTex(['#05021a', '#1b0b4a', '#4a1a8a', '#ff3fd0'], 160), fog: ['#2a0f5a', 30, 90], ambient: { type: 'rain', color: '#9ad8ff' } };
    root.add(lights(root, '#b9a6ff', '#3a1060', 0.9, '#ff9ae8', 0.75, -5, 10, 8));
    var ft = cv(256, 256, function (g, w, h) { g.fillStyle = '#2a2638'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a3550'; g.lineWidth = 4; g.strokeRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.03)'; for (var i = 0; i < 300; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3); });
    floor(ft, root, 40, 16, [10, 4]);
    // helipad
    var hp = new T.Mesh(plane(), new T.MeshBasicMaterial({ map: cv(256, 256, function (g, w, h) { g.strokeStyle = '#ffe14d'; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.stroke(); g.fillStyle = '#ffe14d'; g.font = '900 150px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 128, 136); }), transparent: true, depthWrite: false, opacity: 0.7 }));
    hp.rotation.x = -Math.PI / 2; hp.position.set(0, 0.02, 0.3); hp.scale.set(4.2, 4.2, 1); root.add(hp);
    edgeStrip(root, '#ff3fd0', 3.6); edgeStrip(root, '#3ff0ff', -3.2);
    // parapet + neon on it
    M(box(), lam('#1d1a2c'), 0, 0.45, -3.6, 40, 0.9, 0.5, root); M(box(), basic('#3ff0ff'), 0, 0.92, -3.34, 40, 0.06, 0.06, root);
    // AC units & water tower
    [[-10.5, -2.4], [10.8, -2.2], [-12.5, 1.5]].forEach(function (p) { M(box(), lam('#5a5670'), p[0], 0.6, p[1], 1.6, 1.2, 1.2, root); M(cyl(10), lam('#2a2638'), p[0], 1.25, p[1], 0.9, 0.1, 0.9, root); });
    M(cyl(10), lam('#7a4b2a'), 12.5, 4.2, -6, 2.6, 2.6, 2.6, root); M(cone(10), lam('#5a3420'), 12.5, 6.1, -6, 3, 1.2, 3, root);
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { M(box(), lam('#3a3550'), 12.5 + sx, 1.5, -6 + sz, 0.15, 3, 0.15, root); }); });
    // skyline (instanced)
    var list = [], cols = ['#ff4fd8', '#3ff0ff', '#ffe14d', '#a259ff', '#ffffff'];
    for (var i = 0; i < 70; i++) { var w = 2 + Math.random() * 4, h = 6 + Math.random() * 22, z = -14 - Math.random() * 40; list.push([-60 + i * 1.75 + Math.random(), h / 2 - 6, z, w, h, w]); }
    var wm = new T.MeshBasicMaterial({ map: windowsTex(['#ffe7a3', '#9ff7ff', '#ff9ae8']), color: '#cfc6ff' });
    instanced(box(), wm, list, root);
    var tower = M(box(), wm, -6, 12, -22, 4, 36, 4, root);
    M(cone(4), basic('#ff3fd0'), -6, 31, -22, 1.6, 4, 1.6, root);
    var gs = sign('GROK', 10, 3, '#ff3fd0', null, root, 6, 11, -18.5);
    var gs2 = sign('BRAWL', 8, 2.4, '#3ff0ff', null, root, 6, 8.4, -18.5);
    var moon = M(ball(2), basic('#fff3c4'), -18, 16, -50, 5, 5, 5, root);
    var beacon = M(ball(1), basic('#ff2244'), -6, 33.3, -22, 0.6, 0.6, 0.6, root);
    o.update = function (t) { var on = Math.sin(t * 3) > -0.6; gs.material.opacity = on ? 1 : 0.4; gs.material.transparent = true; gs2.material.opacity = Math.sin(t * 2.3 + 1) > -0.8 ? 1 : 0.3; gs2.material.transparent = true; beacon.visible = Math.sin(t * 4) > 0; };
    return o;
  }

  /* ---------- VEGAS STRIP ---------- */
  function vegas(root) {
    var o = { sky: skyTex(['#1a0638', '#5a1a6a', '#ff5f6d', '#ffc371'], 60), fog: ['#6a2a5a', 35, 100], ambient: { type: 'confetti', color: '#ffd84d' } };
    root.add(lights(root, '#ffd9b0', '#5a1a4a', 0.95, '#fff0d0', 0.7, 4, 10, 8));
    var ft = cv(256, 256, function (g, w, h) { g.fillStyle = '#7a0f22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a0182e'; g.lineWidth = 3; for (var i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32 + 32); g.stroke(); g.beginPath(); g.moveTo(w, i * 32); g.lineTo(0, i * 32 + 32); g.stroke(); } g.fillStyle = 'rgba(255,215,0,0.25)'; for (var j = 0; j < 40; j++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 3, 0, 7); g.fill(); } });
    floor(ft, root, 40, 16, [8, 3]);
    M(box(), lam('#e0b030'), 0, 0.04, 3.4, 40, 0.08, 0.3, root); M(box(), lam('#e0b030'), 0, 0.04, -3.0, 40, 0.08, 0.3, root);
    // bulbs along stage edges
    var bl = []; for (var i = 0; i < 46; i++) { bl.push([-20 + i * 0.9, 0.14, 3.4, 0.16, 0.16, 0.16]); }
    for (i = 0; i < 46; i++) { bl.push([-20 + i * 0.9, 0.14, -3.0, 0.16, 0.16, 0.16]); }
    var bulbs = instanced(ball(0), new T.MeshBasicMaterial({ color: '#ffffff' }), bl, root, ['#ffe14d', '#ffffff']);
    // casino towers
    var tl = [], tc = ['#ffd9a0', '#ffb0d0', '#a0e0ff', '#fff'];
    for (i = 0; i < 26; i++) { var w = 3 + Math.random() * 4, h = 10 + Math.random() * 26; tl.push([-55 + i * 4.3, h / 2 - 2, -24 - Math.random() * 26, w, h, w * 0.7]); }
    instanced(box(), new T.MeshBasicMaterial({ map: windowsTex(['#ffe7a3', '#ffd0f0', '#ffffff']), color: '#ffe0c0' }), tl, root);
    // pyramid with beam
    var pyr = M(cone(4), lam('#141420'), -16, 6, -30, 18, 14, 18, root); pyr.rotation.y = Math.PI / 4;
    var beam = M(cyl(8), add('#fffbe0'), -16, 40, -30, 0.8, 60, 0.8, root);
    // eiffel-ish tower
    M(cone(4), lam('#5a3a2a'), 14, 7, -26, 5, 14, 5, root); M(cone(4), lam('#5a3a2a'), 14, 16, -26, 1.8, 10, 1.8, root); M(box(), basic('#ffe14d'), 14, 10, -26, 3.6, 0.3, 3.6, root);
    // big sign with bulbs
    var sgn = new T.Group(); sgn.position.set(-3, 8.5, -14); root.add(sgn);
    M(box(), lam('#2a0a3a'), 0, 0, 0, 11, 4, 0.5, sgn); var st = sign('GROK VEGAS', 10, 2.4, '#ffe14d', null, sgn, 0, 0.3, 0.3);
    sign('BRAWL TONIGHT', 8, 0.9, '#ff4fd8', null, sgn, 0, -1.3, 0.3);
    M(box(), lam('#3a2a4a'), 0, -6, -0.2, 0.6, 9, 0.6, sgn);
    var sb = []; for (i = 0; i < 22; i++) { sb.push([-5.2 + i * 0.495, 1.85, 0.3, 0.14, 0.14, 0.14]); sb.push([-5.2 + i * 0.495, -1.85, 0.3, 0.14, 0.14, 0.14]); }
    var sbulbs = instanced(ball(0), new T.MeshBasicMaterial({ color: '#ffffff' }), sb, sgn, ['#ffe14d']);
    // palms
    function palm(x, z) { M(cyl(6), lam('#8a5a2a'), x, 2.5, z, 0.35, 5, 0.35, root); for (var k = 0; k < 5; k++) { var l = M(box(), lam('#2fae4a'), x + Math.cos(k * 1.26) * 1, 5.1, z + Math.sin(k * 1.26) * 1, 2.4, 0.1, 0.6, root); l.rotation.y = -k * 1.26; l.rotation.z = -0.3; } }
    palm(-11, -5); palm(11.5, -5.5); palm(-17, -7);
    // slot machines
    var slotTex = cv(128, 192, function (g, w, h) { g.fillStyle = '#c01030'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe14d'; g.fillRect(8, 8, w - 16, 30); g.fillStyle = '#fff'; g.fillRect(12, 60, w - 24, 50); g.fillStyle = '#c01030'; g.font = '900 40px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('777', w / 2, 102); g.fillStyle = '#c01030'; g.font = '900 22px Impact'; g.fillText('GROK', w / 2, 32); });
    [[-8.5, -2.4], [-7.2, -2.4], [8, -2.4], [9.3, -2.4]].forEach(function (p) { var s = M(box(), new T.MeshLambertMaterial({ map: slotTex }), p[0], 1.0, p[1], 1.1, 2, 0.9, root); });
    var t0 = 0;
    o.update = function (t) {
      beam.material.opacity = 0.25 + Math.sin(t * 2) * 0.08;
      var ph = Math.floor(t * 6) % 2; if (ph !== t0) { t0 = ph; var c = new T.Color(); for (var i = 0; i < bl.length; i++) { c.set((i + ph) % 2 ? '#ffe14d' : '#ff4fd8'); bulbs.setColorAt(i, c); } bulbs.instanceColor.needsUpdate = true; for (i = 0; i < sb.length; i++) { c.set((i >> 1) % 2 === ph ? '#ffffff' : '#ffb020'); sbulbs.setColorAt(i, c); } sbulbs.instanceColor.needsUpdate = true; }
      st.material.opacity = 0.75 + Math.sin(t * 8) * 0.25; st.material.transparent = true;
    };
    return o;
  }

  /* ---------- TOKYO DOJO ---------- */
  function dojo(root) {
    var o = { sky: skyTex(['#ffe9f2', '#ffc7dc', '#f2a0bf', '#e98ab0']), fog: ['#f7c8da', 30, 90], ambient: { type: 'petals', color: '#ffb7d5' } };
    root.add(lights(root, '#fff2e6', '#8a5a3a', 1.0, '#fff4e0', 0.7, -3, 10, 8));
    var ft = cv(256, 256, function (g, w, h) { for (var i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#b07a45' : '#a46d3a'; g.fillRect(0, i * 32, w, 32); g.fillStyle = 'rgba(60,30,10,0.35)'; g.fillRect(0, i * 32, w, 2); g.fillRect((i * 97) % w, i * 32, 2, 32); } });
    floor(ft, root, 40, 16, [6, 3]);
    // tatami fighting area
    var tt = cv(256, 128, function (g, w, h) { g.fillStyle = '#c9c27a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a5a2a'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 1; for (var y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    var tm = new T.Mesh(plane(), new T.MeshLambertMaterial({ map: tt })); tm.rotation.x = -Math.PI / 2; tm.position.set(0, 0.015, 0.2); tm.scale.set(19, 5.6, 1); root.add(tm);
    // back wall with shoji + opening
    var shoji = cv(256, 256, function (g, w, h) { g.fillStyle = '#fbf3e4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6a3f1f'; g.lineWidth = 6; for (var x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (var y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    shoji.wrapS = shoji.wrapT = T.RepeatWrapping; shoji.repeat.set(2, 2);
    var sm = new T.MeshLambertMaterial({ map: shoji });
    [-12, 12].forEach(function (x) { M(box(), sm, x, 3.2, -4.6, 12, 6.4, 0.2, root); });
    M(box(), lam('#5a3418'), 0, 6.6, -4.5, 40, 0.6, 0.6, root); M(box(), lam('#5a3418'), 0, 0.2, -4.5, 40, 0.4, 0.5, root);
    [-6, 6, -16, 16].forEach(function (x) { M(box(), lam('#7a1f14'), x, 3.3, -4.4, 0.6, 6.6, 0.6, root); });
    // outside view: fuji, blossoms, pagoda
    M(cone(9), lam('#6a7aa8'), 2, 7, -60, 50, 22, 30, root); M(cone(9), basic('#ffffff'), 2, 15.8, -59.5, 15, 5, 9, root);
    var bl = [], bc = ['#ffb7d5', '#ff9cc6', '#ffd1e6'];
    for (var i = 0; i < 14; i++) { var x = -26 + i * 4 + Math.random() * 2, z = -10 - Math.random() * 10, s = 2.5 + Math.random() * 2; bl.push([x, 4 + Math.random(), z, s, s * 0.8, s]); M(cyl(5), lam('#4a2a1a'), x, 1.6, z, 0.35, 3.4, 0.35, root); }
    instanced(ball(1), new T.MeshLambertMaterial({ color: '#ffffff' }), bl, root, bc);
    for (i = 0; i < 4; i++) { M(box(), lam('#b0302a'), -14, 2 + i * 2.6, -26, 4 - i * 0.6, 1.6, 4 - i * 0.6, root); M(cone(4), lam('#3a2a2a'), -14, 3.1 + i * 2.6, -26, 6.4 - i * 0.9, 1, 6.4 - i * 0.9, root).rotation.y = Math.PI / 4; }
    // lanterns
    var lans = [];
    [-9, -3, 3, 9].forEach(function (x) { var g = new T.Group(); g.position.set(x, 6.3, -3.4); root.add(g); M(cyl(8), lam('#e8332a'), 0, -1.0, 0, 0.7, 0.9, 0.7, g); M(cyl(8), basic('#2a1a10'), 0, -0.5, 0, 0.5, 0.1, 0.5, g); M(cyl(8), basic('#2a1a10'), 0, -1.5, 0, 0.5, 0.1, 0.5, g); M(box(), basic('#2a1a10'), 0, -0.25, 0, 0.03, 0.5, 0.03, g); lans.push(g); });
    // banners
    var ban = cv(128, 384, function (g, w, h) { g.fillStyle = '#f5ede0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1a1010'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.arc(64, 120, 40, 0.3, 5.8); g.stroke(); g.fillStyle = '#c0201a'; g.beginPath(); g.arc(64, 270, 30, 0, 7); g.fill(); g.fillStyle = '#1a1010'; g.font = '900 28px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('GROK', 64, 350); });
    [-6, 6].forEach(function (x) { var b = new T.Mesh(plane(), new T.MeshLambertMaterial({ map: ban, side: T.DoubleSide })); b.position.set(x, 4, -4.05); b.scale.set(1.1, 3.3, 1); root.add(b); });
    o.update = function (t) { lans.forEach(function (g, i) { g.rotation.z = Math.sin(t * 1.3 + i) * 0.06; }); };
    return o;
  }

  /* ---------- VOLCANO ---------- */
  function volcano(root) {
    var o = { sky: skyTex(['#0a0202', '#2a0606', '#7a1408', '#ff5a00'], 20), fog: ['#4a0c04', 25, 80], ambient: { type: 'embers', color: '#ff8a1a' } };
    root.add(lights(root, '#ffb08a', '#ff4a00', 0.95, '#ffd0a0', 0.6, 3, 10, 6));
    var ft = cv(256, 256, function (g, w, h) { g.fillStyle = '#2a2224'; g.fillRect(0, 0, w, h); for (var i = 0; i < 40; i++) { g.fillStyle = i % 3 ? '#35292a' : '#1f1a1c'; var x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y + 10); g.lineTo(x + 20, y + 34); g.lineTo(x - 8, y + 24); g.fill(); } g.strokeStyle = '#ff5a00'; g.lineWidth = 2; g.shadowColor = '#ff8a00'; g.shadowBlur = 6; for (i = 0; i < 6; i++) { g.beginPath(); var sx = Math.random() * w, sy = Math.random() * h; g.moveTo(sx, sy); for (var k = 0; k < 4; k++) { sx += Math.random() * 40 - 20; sy += Math.random() * 40 - 10; g.lineTo(sx, sy); } g.stroke(); } });
    var fl = floor(ft, root, 26, 8.4, [6, 2]); fl.position.z = 0.1;
    M(box(), lam('#1a1416'), 0, -0.6, 0.1, 26, 1.2, 8.4, root);
    var lavaTex = cv(256, 256, function (g, w, h) { g.fillStyle = '#ff4a00'; g.fillRect(0, 0, w, h); for (var i = 0; i < 70; i++) { g.fillStyle = ['#ffb000', '#ff7a00', '#c01800', '#ffe060'][i % 4]; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 6 + Math.random() * 22, 0, 7); g.fill(); } });
    lavaTex.wrapS = lavaTex.wrapT = T.RepeatWrapping; lavaTex.repeat.set(8, 4);
    var lava = new T.Mesh(plane(), new T.MeshBasicMaterial({ map: lavaTex })); lava.rotation.x = -Math.PI / 2; lava.position.y = -0.9; lava.scale.set(140, 80, 1); root.add(lava);
    // volcano
    M(cone(9), lam('#2a1a18'), 0, 9, -50, 46, 22, 34, root); M(cyl(9), basic('#ff6a00'), 0, 19.6, -50, 9, 0.6, 7, root);
    var glow = M(ball(1), add('#ff7a00'), 0, 21, -50, 16, 8, 12, root);
    [[-3, -46], [5, -45]].forEach(function (p, i) { var s = M(box(), basic('#ff8a00'), p[0], 12, p[1], 1, 18, 0.3, root); s.rotation.z = i ? -0.5 : 0.45; });
    // spires
    var sp = []; for (var i = 0; i < 18; i++) { var x = -30 + i * 3.5 + Math.random() * 2, h = 4 + Math.random() * 9; sp.push([x, h / 2 - 1, -9 - Math.random() * 14, 1.5 + Math.random() * 2, h, 1.5 + Math.random() * 2]); }
    instanced(cone(5), lam('#1f1618'), sp, root);
    [[-11, 1.6, -3], [11.5, 1.4, -3.2], [-12.8, 1, 2.5], [12.6, 0.8, 2.2]].forEach(function (p) { M(geo('dod', function () { return new T.DodecahedronGeometry(0.5, 0); }), lam('#2c2426'), p[0], p[1] - 0.6, p[2], 2.4, p[1] * 1.8, 2.2, root); });
    o.update = function (t) { lavaTex.offset.set(t * 0.02, t * 0.01); glow.material.opacity = 0.3 + Math.sin(t * 3) * 0.1; };
    return o;
  }

  /* ---------- AREA 51 HANGAR ---------- */
  function hangar(root) {
    var o = { sky: skyTex(['#02040a', '#08121a', '#13241c', '#1c3a2a'], 200), fog: ['#0c1a14', 30, 90], ambient: { type: 'dust', color: '#9dffb0' } };
    root.add(lights(root, '#d0ffe0', '#1a2a20', 0.85, '#e8fff0', 0.75, -4, 12, 7));
    var ft = cv(256, 256, function (g, w, h) { g.fillStyle = '#4a5250'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2e3432'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, h); g.moveTo(0, 128); g.lineTo(w, 128); g.stroke(); g.fillStyle = '#6a7270'; [[12, 12], [244, 12], [12, 244], [244, 244], [116, 116], [140, 140]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 4, 0, 7); g.fill(); }); });
    floor(ft, root, 40, 16, [10, 4]);
    var hz = cv(256, 32, function (g, w, h) { for (var x = -32; x < w + 32; x += 32) { g.fillStyle = '#ffd400'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 32, h); g.lineTo(x + 16, h); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.moveTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 48, h); g.lineTo(x + 32, h); g.fill(); } });
    hz.wrapS = T.RepeatWrapping; hz.repeat.set(10, 1);
    [3.5, -3.1].forEach(function (z) { var s = new T.Mesh(plane(), new T.MeshLambertMaterial({ map: hz })); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.02, z); s.scale.set(40, 0.5, 1); root.add(s); });
    // walls w/ open door
    var wallTex = cv(128, 128, function (g, w, h) { g.fillStyle = '#3c4a44'; g.fillRect(0, 0, w, h); for (var x = 0; x < w; x += 16) { g.fillStyle = '#4a5a52'; g.fillRect(x, 0, 8, h); } });
    wallTex.wrapS = wallTex.wrapT = T.RepeatWrapping; wallTex.repeat.set(6, 3);
    var wm = new T.MeshLambertMaterial({ map: wallTex });
    M(box(), wm, -17, 6, -9, 14, 12, 0.4, root); M(box(), wm, 17, 6, -9, 14, 12, 0.4, root); M(box(), wm, 0, 11, -9, 20, 2, 0.4, root);
    [-20, 20].forEach(function (x) { var w = M(box(), wm, x, 6, -1, 0.4, 12, 16, root); });
    for (var i = -3; i <= 3; i++) M(box(), lam('#2a3430'), i * 5, 11.6, -1, 0.3, 0.5, 18, root);
    M(box(), lam('#2a3430'), 0, 11.9, -1, 40, 0.3, 0.3, root);
    // desert outside
    M(box(), lam('#3a2e22'), 0, -0.1, -40, 120, 0.2, 60, root);
    var mt = []; for (i = 0; i < 9; i++) mt.push([-50 + i * 12, 3, -70, 16, 6 + Math.random() * 8, 10]); instanced(cone(4), lam('#24201c'), mt, root);
    M(ball(2), basic('#e8fff0'), 14, 14, -70, 5, 5, 5, root);
    // UFO
    var ufo = new T.Group(); ufo.position.set(0, 7.2, -14); root.add(ufo);
    M(ball(2), lam('#b8c4c8'), 0, 0, 0, 7, 1.3, 7, ufo); M(ball(2), new T.MeshLambertMaterial({ color: '#7dff9e', emissive: '#2a8a4a' }), 0, 0.6, 0, 2.6, 1.6, 2.6, ufo);
    var ul = []; for (i = 0; i < 12; i++) ul.push([Math.cos(i / 12 * Math.PI * 2) * 3.2, -0.05, Math.sin(i / 12 * Math.PI * 2) * 3.2, 0.35, 0.35, 0.35]);
    var ulights = instanced(ball(0), new T.MeshBasicMaterial({ color: '#ffffff' }), ul, ufo, ['#7dff9e', '#ffe14d', '#ff4fd8']);
    var tbeam = M(cone(12), add('#7dff9e'), 0, -3.8, 0, 4.5, 7, 4.5, ufo);
    // Grok Sky airliner (voxel)
    var pl = new T.Group(); pl.position.set(-12, 0, -6.5); pl.rotation.y = 0.5; root.add(pl);
    M(box(), lam('#f4f6f8'), 0, 1.6, 0, 7, 1.4, 1.4, pl); M(box(), lam('#f4f6f8'), 3.8, 1.75, 0, 1.2, 1.0, 1.2, pl); M(box(), basic('#1a2a3a'), 4.2, 2.0, 0, 0.5, 0.35, 1.25, pl);
    M(box(), lam('#e11d48'), 0, 1.2, 0, 7, 0.25, 1.42, pl); M(box(), lam('#d8dce0'), 0.3, 1.3, 0, 2, 0.15, 7, pl); M(box(), lam('#e11d48'), -3.2, 2.8, 0, 1.2, 1.6, 0.2, pl);
    M(box(), lam('#d8dce0'), -3.3, 1.9, 0, 0.9, 0.12, 2.6, pl); M(cyl(8), lam('#9aa4ac'), 0.5, 0.95, 1.6, 0.5, 1, 0.5, pl).rotation.z = Math.PI / 2; M(cyl(8), lam('#9aa4ac'), 0.5, 0.95, -1.6, 0.5, 1, 0.5, pl).rotation.z = Math.PI / 2;
    var wl = []; for (i = 0; i < 9; i++) wl.push([-2.5 + i * 0.6, 1.85, 0.71, 0.25, 0.25, 0.02]); instanced(box(), basic('#38bdf8'), wl, pl);
    [[-1, 0.4], [2, 0.4]].forEach(function (p) { M(box(), basic('#222'), p[0], 0.4, 0, 0.4, 0.8, 0.4, pl); });
    // crates + sign + alien tube
    var crate = cv(64, 64, function (g, w, h) { g.fillStyle = '#7a5a2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a3418'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.stroke(); });
    var cm = new T.MeshLambertMaterial({ map: crate });
    [[10.5, 0.6, -3.2, 1.2], [11.8, 0.6, -3.0, 1.2], [11.1, 1.8, -3.1, 1.2], [-10.8, 0.7, 2.6, 1.4]].forEach(function (c) { M(box(), cm, c[0], c[1], c[2], c[3], c[3], c[3], root); });
    sign('AREA 51', 6, 1.6, '#7dff9e', '#0a1410', root, 13, 6, -8.75);
    sign('RESTRICTED', 4, 0.8, '#ffd400', '#1a1a10', root, -13, 4.5, -8.75);
    M(cyl(10), add('#7dff9e'), 7.5, 1.6, -6, 1.6, 3.2, 1.6, root); M(cyl(10), lam('#3a4440'), 7.5, 0.1, -6, 1.8, 0.2, 1.8, root); M(cyl(10), lam('#3a4440'), 7.5, 3.2, -6, 1.8, 0.2, 1.8, root);
    var alien = new T.Group(); alien.position.set(7.5, 1.0, -6); root.add(alien); M(ball(1), lam('#7dff9e'), 0, 1.1, 0, 0.7, 0.85, 0.7, alien); M(box(), lam('#5ad07a'), 0, 0.4, 0, 0.35, 0.8, 0.25, alien); M(ball(0), basic('#000'), 0.14, 1.15, 0.3, 0.18, 0.24, 0.1, alien); M(ball(0), basic('#000'), -0.14, 1.15, 0.3, 0.18, 0.24, 0.1, alien);
    // searchlights
    var sls = []; [-8, 8].forEach(function (x) { var s = M(cone(10), add('#e8ffe0'), x, 6, -16, 3, 18, 3, root); sls.push(s); });
    var tc = new T.Color(), lastQ = -1;
    o.update = function (t) {
      ufo.position.y = 7.2 + Math.sin(t * 1.2) * 0.35; ufo.rotation.y = t * 0.6; tbeam.material.opacity = 0.18 + Math.sin(t * 5) * 0.06;
      alien.position.y = 1.0 + Math.sin(t * 1.7) * 0.15; alien.rotation.y = Math.sin(t * 0.5) * 0.6;
      sls.forEach(function (s, i) { s.rotation.z = Math.sin(t * 0.5 + i * 2) * 0.5 + (i ? -0.15 : 0.15); s.position.y = 6 + 9 * (1 - Math.cos(s.rotation.z)) * 0; });
      var q = Math.floor(t * 8) % 3; if (q !== lastQ) { lastQ = q; for (var i = 0; i < 12; i++) { tc.set(['#7dff9e', '#ffe14d', '#ff4fd8'][(i + q) % 3]); ulights.setColorAt(i, tc); } ulights.instanceColor.needsUpdate = true; }
    };
    return o;
  }

  var BUILDERS = { rooftop: rooftop, vegas: vegas, dojo: dojo, volcano: volcano, hangar: hangar };
  A.HALF = 9.2; // stage half width (walls)
  A.build = function (id) {
    var root = new T.Group(); root.name = 'arena-' + id;
    var o = BUILDERS[id](root); o.group = root; o.id = id; o.update = o.update || function () {};
    return o;
  };
})();
