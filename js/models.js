/* Grok Brawl - chunky low-poly fighter rigs (merged per bone, toon + rim light + outline) */
(function () {
  'use strict';
  var T = THREE;
  var M = GB.Models = {};
  var gradTex = null, outlineMat = null, shadowTex = null, geoBase = {};

  function grad() {
    if (!gradTex) {
      var d = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
      gradTex = new T.DataTexture(d, 3, 1, T.RGBAFormat);
      gradTex.minFilter = gradTex.magFilter = T.NearestFilter; gradTex.generateMipmaps = false; gradTex.needsUpdate = true;
    }
    return gradTex;
  }
  M.outlineMaterial = function () {
    if (!outlineMat) {
      outlineMat = new T.ShaderMaterial({
        uniforms: { thick: { value: 0.032 }, col: { value: new T.Color('#0a0614') } },
        vertexShader: 'attribute vec3 onormal; uniform float thick; void main(){ vec4 mv = modelViewMatrix * vec4(position + onormal * thick, 1.0); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.0); }',
        side: T.BackSide
      });
    }
    return outlineMat;
  };
  M.shadowTexture = function () {
    if (!shadowTex) {
      var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
      var r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(0,0,0,0.65)'); r.addColorStop(0.6, 'rgba(0,0,0,0.35)'); r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64); shadowTex = new T.CanvasTexture(c);
    }
    return shadowTex;
  };
  // fighter material: toon with rim light and hit flash (one per rig so rim color/flash are per fighter)
  M.fighterMaterial = function (rimHex) {
    var u = { rimColor: { value: new T.Color(rimHex) }, flash: { value: 0 }, rimAmt: { value: 0.85 } };
    var m = new T.MeshToonMaterial({ vertexColors: true, gradientMap: grad() });
    m.flatShading = true;
    m.userData.u = u;
    m.onBeforeCompile = function (sh) {
      sh.uniforms.rimColor = u.rimColor; sh.uniforms.flash = u.flash; sh.uniforms.rimAmt = u.rimAmt;
      sh.fragmentShader = 'uniform vec3 rimColor; uniform float flash; uniform float rimAmt;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
        'vec3 gbV = normalize(vViewPosition); float gbR = 1.0 - clamp(dot(normal, gbV), 0.0, 1.0);\n' +
        'gl_FragColor.rgb += rimColor * pow(gbR, 2.6) * rimAmt;\n' +
        'gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), flash);\n#include <dithering_fragment>');
    };
    m.customProgramCacheKey = function () { return 'gbRimToon'; };
    return m;
  };

  /* ---------- geometry merging ---------- */
  function base(kind) {
    if (geoBase[kind]) return geoBase[kind];
    var g;
    if (kind === 'box') g = new T.BoxGeometry(1, 1, 1);
    else if (kind === 'ball') g = new T.IcosahedronGeometry(0.5, 1);
    else if (kind === 'gem') g = new T.OctahedronGeometry(0.5, 0);
    else if (kind === 'rock') g = new T.DodecahedronGeometry(0.5, 0);
    else if (kind === 'cone') g = new T.ConeGeometry(0.5, 1, 5);
    else if (kind === 'cone4') g = new T.ConeGeometry(0.5, 1, 4);
    else if (kind === 'cyl') g = new T.CylinderGeometry(0.5, 0.5, 1, 7);
    else if (kind === 'wedge') g = new T.CylinderGeometry(0.5, 0.5, 1, 3);
    if (g.index) g = g.toNonIndexed();
    // smooth "outline" normals: average normals of coincident vertices
    var p = g.attributes.position, n = g.attributes.normal, map = {}, on = new Float32Array(p.count * 3), i, k;
    for (i = 0; i < p.count; i++) {
      k = Math.round(p.getX(i) * 1000) + ',' + Math.round(p.getY(i) * 1000) + ',' + Math.round(p.getZ(i) * 1000);
      var a = map[k] || (map[k] = [0, 0, 0]); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
    }
    for (i = 0; i < p.count; i++) {
      k = Math.round(p.getX(i) * 1000) + ',' + Math.round(p.getY(i) * 1000) + ',' + Math.round(p.getZ(i) * 1000);
      var v = map[k], l = Math.hypot(v[0], v[1], v[2]) || 1; on[i * 3] = v[0] / l; on[i * 3 + 1] = v[1] / l; on[i * 3 + 2] = v[2] / l;
    }
    g.setAttribute('onormal', new T.BufferAttribute(on, 3));
    return (geoBase[kind] = g);
  }
  var _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3(), _n3 = new T.Matrix3(), _c = new T.Color();
  function merge(parts) {
    var total = 0; parts.forEach(function (pt) { total += base(pt.k).attributes.position.count; });
    var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), onr = new Float32Array(total * 3), o = 0;
    parts.forEach(function (pt) {
      var g = base(pt.k), P = g.attributes.position, N = g.attributes.normal, O = g.attributes.onormal;
      _e.set(pt.r ? pt.r[0] : 0, pt.r ? pt.r[1] : 0, pt.r ? pt.r[2] : 0); _q.setFromEuler(_e);
      _m.compose(_v.set(pt.p[0], pt.p[1], pt.p[2]), _q, _s.set(pt.s[0], pt.s[1], pt.s[2]));
      _n3.getNormalMatrix(_m); _c.set(pt.c);
      var a = new T.Vector3(), b = new T.Vector3();
      for (var i = 0; i < P.count; i++, o++) {
        a.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(_m); pos[o * 3] = a.x; pos[o * 3 + 1] = a.y; pos[o * 3 + 2] = a.z;
        b.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(_n3).normalize(); nor[o * 3] = b.x; nor[o * 3 + 1] = b.y; nor[o * 3 + 2] = b.z;
        b.set(O.getX(i), O.getY(i), O.getZ(i)).applyMatrix3(_n3).normalize(); onr[o * 3] = b.x; onr[o * 3 + 1] = b.y; onr[o * 3 + 2] = b.z;
        col[o * 3] = _c.r; col[o * 3 + 1] = _c.g; col[o * 3 + 2] = _c.b;
      }
    });
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setAttribute('onormal', new T.BufferAttribute(onr, 3));
    geo.computeBoundingSphere();
    return geo;
  }

  /* ---------- per-fighter looks ---------- */
  // Each style fills part lists per bone: chest, hips, head, uaL, faL, uaR, faR, thL, shL, thR, shR
  function look(def) {
    var S = {}; ['chest', 'hips', 'head', 'uaL', 'faL', 'uaR', 'faR', 'thL', 'shL', 'thR', 'shR'].forEach(function (k) { S[k] = []; });
    function add(bone, k, s, p, c, r) { S[bone].push({ k: k, s: s, p: p, c: c, r: r }); }
    function both(bone, k, s, p, c, r) { add(bone + 'L', k, s, [p[0], p[1], p[2]], c, r); add(bone + 'R', k, s, [-p[0], p[1], p[2]], c, r ? [r[0], -r[1], -r[2]] : null); }
    var C = {}; // palette
    var id = def.id;
    var skin = { blaze: '#f0b98a', volt: '#c98a5a', boulder: '#8f9a86', nova: '#e9c6a8', frost: '#cfe9ff', sakura: '#ffd9c2', prime: '#2a2a3a', riptide: '#d9a06e', glitch: '#c8c8d8' }[id];
    var top = def.color, acc = def.color2;
    var pants = { blaze: '#2a1a1a', volt: '#1d2440', boulder: '#5b4a3a', nova: '#2b1747', frost: '#2b5d8a', sakura: '#ff5fb0', prime: '#15151f', riptide: '#0f4a52', glitch: '#1b1b2a' }[id];
    var glove = { blaze: '#ffb020', volt: '#22e5ff', boulder: '#a8a29e', nova: '#ff6be6', frost: '#e8fbff', sakura: '#ffffff', prime: '#ffc531', riptide: '#ff7f50', glitch: '#9dff00' }[id];
    var boot = { blaze: '#ffffff', volt: '#ffd400', boulder: '#6b625a', nova: '#1a0f2e', frost: '#e8fbff', sakura: '#ffffff', prime: '#ffc531', riptide: '#ff7f50', glitch: '#ff2bd6' }[id];
    if (id === 'glitch') top = '#2a2a3c';
    var chestW = id === 'boulder' ? 0.98 : id === 'riptide' ? 1.04 : id === 'volt' ? 0.7 : id === 'glitch' ? 0.66 : 0.8;
    // torso
    add('chest', 'box', [chestW, 0.6, 0.48], [0, 0.38, 0], id === 'sakura' ? '#ffffff' : top);
    add('chest', 'box', [chestW * 0.8, 0.26, 0.4], [0, 0.06, 0], id === 'sakura' ? '#ffffff' : top);
    add('hips', 'box', [0.64, 0.3, 0.4], [0, 0, 0], pants);
    add('hips', 'box', [0.68, 0.1, 0.44], [0, 0.13, 0], id === 'prime' ? '#ffc531' : id === 'volt' ? '#111' : '#151018');
    // head base
    var hs = id === 'boulder' ? 0.5 : id === 'riptide' ? 0.52 : 0.56;
    if (id !== 'glitch') add('head', 'box', [hs, hs, hs * 0.94], [0, 0.3, 0], skin);
    // eyes / face
    var eyeC = id === 'prime' ? '#ffd84d' : id === 'nova' ? '#ff9bf0' : '#111018';
    if (id === 'glitch') {
      // CRT monitor head with a pixel face
      add('head', 'box', [0.84, 0.64, 0.6], [0, 0.32, -0.02], '#3a3a4e');
      add('head', 'box', [0.7, 0.5, 0.04], [0, 0.33, 0.29], '#9dff00');
      add('head', 'box', [0.11, 0.13, 0.03], [0.15, 0.39, 0.31], '#0c1a00'); add('head', 'box', [0.11, 0.13, 0.03], [-0.15, 0.39, 0.31], '#0c1a00');
      add('head', 'box', [0.3, 0.06, 0.03], [0, 0.22, 0.31], '#0c1a00'); add('head', 'box', [0.06, 0.06, 0.03], [0.18, 0.26, 0.31], '#0c1a00'); add('head', 'box', [0.06, 0.06, 0.03], [-0.18, 0.26, 0.31], '#0c1a00');
      add('head', 'box', [0.56, 0.4, 0.3], [0, 0.32, -0.42], '#2a2a3a'); // CRT back
      add('head', 'cyl', [0.04, 0.42, 0.04], [0.22, 0.82, -0.05], '#c8c8d8', [0, 0, -0.35]); add('head', 'ball', [0.13, 0.13, 0.13], [0.3, 1.02, -0.05], '#ff2bd6');
      add('head', 'cyl', [0.04, 0.34, 0.04], [-0.2, 0.78, -0.05], '#c8c8d8', [0, 0, 0.45]); add('head', 'ball', [0.11, 0.11, 0.11], [-0.28, 0.93, -0.05], '#9dff00');
    } else if (id === 'prime' || id === 'nova') {
      add('head', 'box', [0.13, 0.06, 0.04], [0.12, 0.33, hs * 0.47 + 0.01], eyeC); add('head', 'box', [0.13, 0.06, 0.04], [-0.12, 0.33, hs * 0.47 + 0.01], eyeC);
    } else {
      add('head', 'box', [0.1, 0.13, 0.04], [0.12, 0.32, hs * 0.47 + 0.01], '#ffffff'); add('head', 'box', [0.1, 0.13, 0.04], [-0.12, 0.32, hs * 0.47 + 0.01], '#ffffff');
      add('head', 'box', [0.06, 0.09, 0.04], [0.13, 0.31, hs * 0.47 + 0.025], eyeC); add('head', 'box', [0.06, 0.09, 0.04], [-0.11, 0.31, hs * 0.47 + 0.025], eyeC);
      add('head', 'box', [0.15, 0.04, 0.04], [0.12, 0.42, hs * 0.47 + 0.02], '#2a1a14', [0, 0, -0.25]); add('head', 'box', [0.15, 0.04, 0.04], [-0.12, 0.42, hs * 0.47 + 0.02], '#2a1a14', [0, 0, 0.25]);
      add('head', 'box', [0.14, 0.035, 0.04], [0, 0.16, hs * 0.47 + 0.01], '#7a2a2a');
    }
    // arms & legs base
    var armC = (id === 'blaze' || id === 'sakura' || id === 'riptide') ? skin : top;
    both('ua', 'box', [0.24, 0.4, 0.26], [0, -0.18, 0], armC);
    both('ua', 'ball', [0.34, 0.32, 0.34], [0, 0, 0], id === 'sakura' ? '#ffffff' : id === 'riptide' ? skin : top);
    both('fa', 'box', [0.22, 0.3, 0.24], [0, -0.14, 0], armC);
    both('fa', 'box', [0.3, 0.28, 0.32], [0, -0.38, 0.02], glove);
    both('th', 'box', [0.3, 0.5, 0.32], [0, -0.25, 0], pants);
    both('sh', 'box', [0.27, 0.42, 0.29], [0, -0.21, 0], pants);
    both('sh', 'box', [0.31, 0.15, 0.44], [0, -0.45, 0.06], boot);

    if (id === 'blaze') {
      // flame hair + headband
      [[0, 0.68, -0.02, 0.22, 0.34], [0.17, 0.62, -0.04, 0.17, 0.26], [-0.17, 0.62, -0.04, 0.17, 0.26], [0.08, 0.64, -0.2, 0.18, 0.3], [-0.08, 0.64, -0.2, 0.18, 0.3]].forEach(function (h, i) {
        add('head', 'cone', [h[3], h[4], h[3]], [h[0], h[1], h[2]], i % 2 ? '#ffb020' : '#ff4a2e', [-0.3, 0, h[0] * -1.5]);
      });
      add('head', 'box', [hs + 0.04, 0.18, hs + 0.02], [0, 0.56, -0.02], '#ff7a1a');
      add('head', 'box', [hs + 0.04, 0.08, hs + 0.02], [0, 0.48, 0], '#ff2a2a');
      add('head', 'box', [0.06, 0.3, 0.05], [0.08, 0.36, -0.3], '#ff2a2a', [0.5, 0, 0.2]); add('head', 'box', [0.06, 0.3, 0.05], [-0.06, 0.34, -0.31], '#ff2a2a', [0.6, 0, -0.1]);
      add('chest', 'box', [0.82, 0.12, 0.5], [0, -0.04, 0], '#111'); // belt
      add('chest', 'box', [0.36, 0.06, 0.05], [0, 0.52, 0.25], '#ffb020', [0, 0, 0.6]);
      add('chest', 'gem', [0.2, 0.26, 0.08], [0, 0.32, 0.25], '#ffd400');
    } else if (id === 'volt') {
      add('head', 'box', [hs + 0.06, 0.12, 0.1], [0, 0.34, hs * 0.47 + 0.04], '#22e5ff'); // visor
      [[0, 0.7, 0], [0.18, 0.62, 0.05], [-0.18, 0.62, 0.05], [0, 0.62, -0.22], [0.16, 0.56, -0.2], [-0.16, 0.56, -0.2]].forEach(function (h, i) {
        add('head', 'cone4', [0.18, 0.36, 0.18], h, i % 2 ? '#e8fbff' : '#7ff6ff', [-0.6 - (h[2] < 0 ? 0.6 : 0), 0, -h[0] * 2.5]);
      });
      add('chest', 'wedge', [0.25, 0.06, 0.5], [0.05, 0.38, 0.25], '#111', [Math.PI / 2, 0, 0.6]);
      add('chest', 'box', [0.1, 0.5, 0.05], [0.04, 0.4, 0.25], '#111', [0, 0, 0.55]);
      both('ua', 'box', [0.26, 0.08, 0.28], [0, -0.3, 0], '#111');
      both('sh', 'cone4', [0.14, 0.22, 0.1], [0.16, -0.25, 0], '#22e5ff', [0, 0, -1.2]);
    } else if (id === 'boulder') {
      both('ua', 'rock', [0.62, 0.5, 0.58], [0.06, 0.06, 0], '#a8a29e');
      add('chest', 'rock', [0.5, 0.4, 0.3], [0.2, 0.42, 0.18], '#8b847d'); add('chest', 'rock', [0.4, 0.34, 0.3], [-0.24, 0.3, 0.2], '#a8a29e');
      add('chest', 'box', [0.5, 0.22, 0.06], [0, 0.6, 0.25], '#2f8f3a');
      add('head', 'rock', [0.44, 0.22, 0.42], [0, 0.6, -0.02], '#4fbf5a'); // moss cap
      add('head', 'box', [hs + 0.04, 0.08, 0.08], [0, 0.48, hs * 0.47], '#5b524a'); // brow
      both('fa', 'rock', [0.46, 0.42, 0.46], [0, -0.4, 0.02], '#a8a29e');
      add('chest', 'box', [1.02, 0.14, 0.52], [0, -0.04, 0], '#3a2e24');
    } else if (id === 'nova') {
      add('head', 'box', [hs + 0.04, 0.26, hs + 0.02], [0, 0.17, 0.0], '#2b1747'); // mask lower
      add('head', 'box', [hs + 0.05, 0.16, hs + 0.03], [0, 0.52, 0], '#2b1747'); // hood top
      add('head', 'cone', [0.42, 0.34, 0.4], [0, 0.7, -0.04], '#a259ff');
      add('head', 'box', [0.44, 0.06, 0.04], [0, 0.42, hs * 0.47 + 0.02], '#ff6be6');
      add('chest', 'box', [0.84, 0.16, 0.52], [0, 0.66, 0], '#ff6be6'); // scarf
      add('chest', 'box', [0.16, 0.14, 0.7], [0.22, 0.6, -0.5], '#ff6be6', [0.5, 0.2, 0]);
      add('chest', 'box', [0.14, 0.12, 0.6], [0.12, 0.42, -0.85], '#ff6be6', [0.9, 0.2, 0]);
      add('chest', 'gem', [0.22, 0.22, 0.06], [0, 0.34, 0.25], '#ffe14d', [0, 0, 0.785]);
      add('chest', 'box', [0.06, 0.62, 0.05], [0.2, 0.36, 0.25], '#ff6be6', [0, 0, 0.4]);
    } else if (id === 'frost') {
      add('head', 'box', [hs + 0.08, 0.36, hs + 0.06], [0, 0.48, 0], '#e8fbff'); // helmet
      add('head', 'box', [hs + 0.08, 0.08, 0.06], [0, 0.32, hs * 0.47 + 0.04], '#2b5d8a');
      add('head', 'cone4', [0.14, 0.4, 0.14], [0.26, 0.74, 0], '#3fd8ff', [0, 0, -0.5]); add('head', 'cone4', [0.14, 0.4, 0.14], [-0.26, 0.74, 0], '#3fd8ff', [0, 0, 0.5]);
      both('ua', 'gem', [0.38, 0.5, 0.38], [0.1, 0.12, 0], '#bff4ff', [0, 0, -0.3]);
      add('chest', 'gem', [0.3, 0.36, 0.1], [0, 0.36, 0.26], '#3fd8ff');
      add('chest', 'box', [0.82, 0.1, 0.5], [0, 0.0, 0], '#2b5d8a');
      both('sh', 'box', [0.33, 0.24, 0.33], [0, -0.32, 0], '#e8fbff');
      add('hips', 'box', [0.72, 0.36, 0.1], [0, -0.14, 0.2], '#3fd8ff');
    } else if (id === 'sakura') {
      add('head', 'box', [hs + 0.06, 0.2, hs + 0.04], [0, 0.56, -0.02], '#3a1a2a'); // hair
      add('head', 'box', [hs + 0.06, 0.4, 0.14], [0, 0.36, -hs * 0.47], '#3a1a2a');
      add('head', 'ball', [0.26, 0.26, 0.26], [0.26, 0.7, -0.05], '#3a1a2a'); add('head', 'ball', [0.26, 0.26, 0.26], [-0.26, 0.7, -0.05], '#3a1a2a');
      add('head', 'box', [0.2, 0.08, 0.1], [0.26, 0.82, -0.05], '#ff5fb0'); add('head', 'box', [0.2, 0.08, 0.1], [-0.26, 0.82, -0.05], '#ff5fb0');
      add('chest', 'box', [0.84, 0.12, 0.52], [0, -0.02, 0], '#ff5fb0'); // sash
      add('chest', 'box', [0.12, 0.3, 0.06], [0.28, -0.14, 0.24], '#ff5fb0', [0, 0, 0.3]);
      add('chest', 'box', [0.4, 0.06, 0.05], [0, 0.48, 0.25], '#ff5fb0', [0, 0, -0.6]);
      add('chest', 'ball', [0.16, 0.16, 0.06], [-0.18, 0.4, 0.25], '#ff8fd0');
    } else if (id === 'riptide') {
      // luchador mask, shark dorsal fin, coral championship belt, thick forearms
      add('head', 'box', [hs + 0.04, hs * 0.72, hs * 0.94 + 0.04], [0, 0.38, 0], '#14b8a6');
      add('head', 'box', [0.16, 0.05, 0.04], [0.12, 0.42, hs * 0.47 + 0.035], '#ff7f50', [0, 0, -0.3]); add('head', 'box', [0.16, 0.05, 0.04], [-0.12, 0.42, hs * 0.47 + 0.035], '#ff7f50', [0, 0, 0.3]);
      add('head', 'cone4', [0.12, 0.62, 0.62], [0, 0.82, -0.08], '#ff7f50', [-0.4, 0, 0]); // head fin
      add('chest', 'cone4', [0.14, 1.1, 0.9], [0, 0.95, -0.42], '#0e8f86', [-0.55, 0, 0]); // big back fin
      add('chest', 'box', [1.08, 0.18, 0.54], [0, -0.03, 0], '#ff7f50'); // belt
      add('chest', 'box', [0.34, 0.24, 0.06], [0, -0.03, 0.27], '#ffd166');
      add('chest', 'box', [0.16, 0.66, 0.05], [0.28, 0.38, 0.25], '#0e8f86'); add('chest', 'box', [0.16, 0.66, 0.05], [-0.28, 0.38, 0.25], '#0e8f86'); // singlet straps
      add('chest', 'box', [0.5, 0.24, 0.05], [0, 0.12, 0.25], '#0e8f86');
      both('fa', 'box', [0.3, 0.12, 0.32], [0, -0.2, 0], '#14b8a6'); // wrist wraps
      both('sh', 'box', [0.33, 0.1, 0.33], [0, -0.05, 0], '#14b8a6');
    } else if (id === 'glitch') {
      // hoodie with neon pixel trim, glitchy shoulder blocks
      add('chest', 'box', [0.7, 0.12, 0.5], [0, 0.68, 0], '#9dff00');
      add('chest', 'box', [0.12, 0.12, 0.06], [0.12, 0.42, 0.25], '#ff2bd6'); add('chest', 'box', [0.12, 0.12, 0.06], [-0.04, 0.3, 0.25], '#9dff00'); add('chest', 'box', [0.12, 0.12, 0.06], [0.2, 0.18, 0.25], '#00e1ff');
      add('chest', 'box', [0.7, 0.1, 0.5], [0, -0.03, 0], '#9dff00');
      both('ua', 'box', [0.2, 0.2, 0.2], [0.14, 0.18, 0.08], '#ff2bd6', [0.4, 0.3, 0]); both('ua', 'box', [0.14, 0.14, 0.14], [0.2, 0.02, -0.12], '#9dff00', [0, 0.6, 0.3]);
      both('sh', 'box', [0.3, 0.08, 0.32], [0, -0.3, 0], '#9dff00');
    } else if (id === 'prime') {
      [[0, 0.72, 0.1], [0.18, 0.66, 0.1], [-0.18, 0.66, 0.1], [0.09, 0.7, 0.12], [-0.09, 0.7, 0.12]].forEach(function (h, i) { add('head', 'cone4', [0.1, i ? 0.22 : 0.32, 0.1], h, '#ffc531'); });
      add('head', 'box', [hs + 0.06, 0.12, hs + 0.04], [0, 0.6, 0], '#ffc531');
      add('head', 'box', [hs + 0.04, 0.1, 0.05], [0, 0.18, hs * 0.47 + 0.02], '#ffc531');
      both('ua', 'box', [0.5, 0.2, 0.46], [0.06, 0.12, 0], '#ffc531', [0, 0, -0.25]);
      both('ua', 'cone4', [0.14, 0.3, 0.14], [0.16, 0.32, 0], '#ffc531', [0, 0, -0.4]);
      add('chest', 'gem', [0.32, 0.36, 0.12], [0, 0.36, 0.26], '#ffd84d');
      add('chest', 'box', [0.86, 0.1, 0.52], [0, 0.0, 0], '#ffc531');
      add('chest', 'box', [0.9, 1.2, 0.06], [0, 0.0, -0.3], '#7a1020', [0.12, 0, 0]); // cape
      add('chest', 'box', [0.9, 0.06, 0.08], [0, 0.6, -0.27], '#ffc531');
      both('sh', 'box', [0.33, 0.1, 0.33], [0, -0.05, 0], '#ffc531');
    }
    return S;
  }

  /* ---------- rig ---------- */
  M.build = function (def, opts) {
    opts = opts || {};
    var S = look(def), mat = M.fighterMaterial(def.rim), om = M.outlineMaterial();
    var root = new T.Group(), body = new T.Group(); root.add(body);
    var sc = def.scale || 1; body.scale.setScalar(sc);
    var J = {};
    function grp(name, parent, x, y, z) { var g = new T.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; }
    function seg(list, parent) {
      if (!list.length) return;
      var geo = merge(list), m = new T.Mesh(geo, mat); parent.add(m);
      if (!opts.noOutline) { var o = new T.Mesh(geo, om); parent.add(o); }
    }
    var pivot = grp('pivot', body, 0, 1.02, 0);
    seg(S.hips, pivot);
    var torso = grp('torso', pivot, 0, 0.1, 0); seg(S.chest, torso);
    var head = grp('head', torso, 0, 0.72, 0); seg(S.head, head);
    var sw = def.id === 'boulder' ? 0.6 : def.id === 'riptide' ? 0.62 : def.id === 'volt' || def.id === 'glitch' ? 0.43 : 0.5;
    var sL = grp('sL', torso, sw, 0.58, 0); seg(S.uaL, sL); var eL = grp('eL', sL, 0, -0.38, 0); seg(S.faL, eL);
    var sR = grp('sR', torso, -sw, 0.58, 0); seg(S.uaR, sR); var eR = grp('eR', sR, 0, -0.38, 0); seg(S.faR, eR);
    var hL = grp('hL', pivot, 0.19, -0.04, 0); seg(S.thL, hL); var kL = grp('kL', hL, 0, -0.5, 0); seg(S.shL, kL);
    var hR = grp('hR', pivot, -0.19, -0.04, 0); seg(S.thR, hR); var kR = grp('kR', hR, 0, -0.5, 0); seg(S.shR, kR);
    // blob shadow (kept in root so it stays on the ground)
    var shadow = null;
    if (!opts.noShadow) {
      shadow = new T.Mesh(new T.PlaneGeometry(1.5 * sc, 1.1 * sc), new T.MeshBasicMaterial({ map: M.shadowTexture(), transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 2; root.add(shadow);
    }
    var rig = { def: def, root: root, body: body, J: J, mat: mat, shadow: shadow, cur: {}, height: 2.4 * sc };
    rig.setFlash = function (v) { mat.userData.u.flash.value = v; };
    rig.setRim = function (v) { mat.userData.u.rimAmt.value = v; };
    return rig;
  };

  /* ---------- poses ---------- */
  var KEYS = ['py', 'prx', 'prz', 'tx', 'ty', 'tz', 'hx', 'hy', 'sLx', 'sLz', 'eL', 'sRx', 'sRz', 'eR', 'hLx', 'hLz', 'kL', 'hRx', 'hRz', 'kR'];
  M.KEYS = KEYS;
  M.applyPose = function (rig, pose, k) {
    var c = rig.cur, J = rig.J;
    for (var i = 0; i < KEYS.length; i++) { var key = KEYS[i], t = pose[key] || 0, v = c[key] || 0; c[key] = v + (t - v) * k; }
    J.pivot.position.y = 1.02 + c.py; J.pivot.rotation.x = c.prx; J.pivot.rotation.z = c.prz;
    J.torso.rotation.set(c.tx, c.ty, c.tz); J.head.rotation.set(c.hx, c.hy, 0);
    J.sL.rotation.set(c.sLx, 0, c.sLz); J.eL.rotation.x = c.eL; J.sR.rotation.set(c.sRx, 0, c.sRz); J.eR.rotation.x = c.eR;
    J.hL.rotation.set(c.hLx, 0, c.hLz); J.kL.rotation.x = c.kL; J.hR.rotation.set(c.hRx, 0, c.hRz); J.kR.rotation.x = c.kR;
  };
  function P(o) { return o; }
  var GUARD = P({ py: -0.08, tx: 0.12, ty: -0.35, hy: 0.3, sLx: -1.25, sLz: 0.25, eL: -1.7, sRx: -0.8, sRz: -0.3, eR: -1.9, hLx: -0.45, hLz: 0.12, kL: 0.55, hRx: 0.35, hRz: -0.1, kR: 0.4 });
  function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  M.GUARD = GUARD;
  // name -> function(t 0..1, time, f) returns pose
  M.POSES = {
    idle: function (t, tm) { var b = Math.sin(tm * 5) * 0.03; return mix(GUARD, { py: -0.08 + b, kL: 0.55 - b * 2, kR: 0.4 - b * 2, sLx: -1.25 + b, sRx: -0.8 + b }); },
    walk: function (t, tm, dir) { var s = Math.sin(tm * 11) * 0.45; return mix(GUARD, { py: -0.06 + Math.abs(Math.cos(tm * 11)) * 0.04, hLx: -0.3 + s * dir, kL: 0.35 + Math.max(0, s) * 0.6, hRx: 0.2 - s * dir, kR: 0.35 + Math.max(0, -s) * 0.6 }); },
    jump: function () { return mix(GUARD, { py: 0, tx: 0.05, hLx: -1.1, kL: 1.5, hRx: -0.3, kR: 1.1, sLx: -1.5, sRx: -1.0 }); },
    fall: function () { return mix(GUARD, { py: 0, hLx: -0.6, kL: 0.8, hRx: 0.1, kR: 0.5, sLx: -1.0, sLz: 0.6, sRx: -0.6, sRz: -0.6 }); },
    crouchLand: function () { return mix(GUARD, { py: -0.25, kL: 1.1, kR: 1.0, hLx: -0.8, hRx: -0.1 }); },
    block: function () { return mix(GUARD, { py: -0.14, tx: 0.28, ty: -0.1, sLx: -1.45, sLz: -0.35, eL: -1.95, sRx: -1.45, sRz: 0.35, eR: -1.95, hx: 0.25, kL: 0.8, kR: 0.65 }); },
    hit: function (t) { return mix(GUARD, { tx: -0.45, ty: -0.2, hx: -0.5, sLx: -0.3, sLz: 0.6, eL: -0.6, sRx: -0.2, sRz: -0.7, eR: -0.5, py: -0.12 }); },
    launched: function () { return { prx: -0.7, tx: -0.4, hx: -0.4, sLx: -2.4, sLz: 0.6, sRx: -2.4, sRz: -0.6, hLx: -0.9, kL: 0.6, hRx: -0.2, kR: 0.3 }; },
    down: function () { return { py: -0.72, prx: -1.5, sLz: 1.2, sRz: -1.2, hLx: 0.1, hRx: -0.1, kL: 0.3, hx: -0.2 }; },
    getup: function (t) { return mix(GUARD, { py: -0.5 + t * 0.42, prx: -0.8 * (1 - t), kL: 1.2 * (1 - t) + 0.5, kR: 1.0, hLx: -1.0 }); },
    dash: function () { return mix(GUARD, { py: -0.18, tx: 0.55, ty: 0, sLx: 0.7, sRx: 0.7, eL: -0.3, eR: -0.3, hLx: -0.9, kL: 0.9, hRx: 0.6, kR: 0.6 }); },
    backdash: function () { return mix(GUARD, { py: -0.05, tx: -0.25, hLx: 0.4, kL: 0.6, hRx: -0.6, kR: 0.9 }); },
    p1: function (t) { return mix(GUARD, { ty: 0.1, sLx: -1.6, sLz: -0.05, eL: -0.05, tx: 0.1 }); },
    p2: function (t) { return mix(GUARD, { ty: 0.55, sRx: -1.62, sRz: 0.1, eR: -0.05, hRx: 0.5, kR: 0.2 }); },
    p3: function (t) { return mix(GUARD, { py: 0.05, tx: -0.25, ty: 0.4, sRx: -2.7, sRz: 0.15, eR: -0.35, hLx: -0.2, kL: 0.2, hRx: 0.2, kR: 0.1 }); },
    k1: function (t) { return mix(GUARD, { tx: -0.2, hRx: -1.25, hRz: 0, kR: 0.15, hLx: 0.05, kL: 0.25 }); },
    k2: function (t) { return mix(GUARD, { tx: -0.3, ty: 0.9, tz: 0.25, hLx: -1.7, hLz: 0.4, kL: 0.05, hRx: 0.1, kR: 0.3, prz: 0.25 }); },
    k3: function (t) { return mix(GUARD, { py: 0.05, tx: -0.5, ty: -0.2, hRx: -2.5, kR: 0.0, hLx: 0.2, kL: 0.1, sLx: -0.4, sRx: -0.4, sLz: 0.8, sRz: -0.8 }); },
    ap: function () { return mix(GUARD, { py: 0, ty: 0.5, sRx: -1.4, eR: 0, hLx: -1.0, kL: 1.4, hRx: -0.4, kR: 1.0 }); },
    ak: function () { return mix(GUARD, { py: 0, tx: -0.35, hRx: -1.5, kR: 0.05, hLx: -0.4, kL: 1.4, sLz: 0.7, sRz: -0.7 }); },
    windup: function () { return mix(GUARD, { py: -0.15, tx: -0.15, ty: -0.7, sRx: 0.6, eR: -1.2, sLx: -1.2 }); },
    throw: function () { return mix(GUARD, { ty: 0.25, tx: 0.15, sLx: -1.55, sRx: -1.55, sLz: -0.25, sRz: 0.25, eL: 0, eR: 0, hRx: 0.6, kR: 0.2 }); },
    dashpunch: function () { return mix(GUARD, { py: -0.2, tx: 0.6, ty: 0.5, sRx: -1.55, eR: 0, sLx: 0.6, eL: -0.6, hLx: -1.0, kL: 0.8, hRx: 0.8, kR: 0.5 }); },
    slamUp: function () { return mix(GUARD, { py: 0, tx: -0.3, sLx: -3.0, sRx: -3.0, eL: -0.3, eR: -0.3, hLx: -1.2, kL: 1.4, hRx: -1.0, kR: 1.4 }); },
    slamDown: function () { return mix(GUARD, { py: -0.3, tx: 0.7, sLx: -0.9, sRx: -0.9, sLz: 0.2, sRz: -0.2, eL: 0, eR: 0, kL: 1.2, kR: 1.2, hLx: -1.2, hRx: -0.4 }); },
    vanish: function () { return mix(GUARD, { py: -0.3, tx: 0.3, sLx: 0.4, sRx: 0.4 }); },
    tpkick: function () { return mix(GUARD, { tx: -0.4, ty: 0.6, hRx: -2.0, kR: 0, hLx: 0.3, kL: 0.2 }); },
    cyclone: function (t, tm) { return mix(GUARD, { py: 0, tx: -0.2, hRx: -1.6, hRz: -0.3, kR: 0, hLx: -0.5, kL: 1.3, sLz: 1.4, sRz: -1.4, sLx: 0, sRx: 0 }); },
    charge: function (t, tm) { var s = Math.sin(tm * 30) * 0.04; return mix(GUARD, { py: -0.2 + s, tx: -0.25, hx: -0.4, sLx: -0.3, sLz: 1.3, sRx: -0.3, sRz: -1.3, eL: -0.4, eR: -0.4, kL: 0.8, kR: 0.8 }); },
    beam: function () { return mix(GUARD, { py: -0.2, tx: 0.1, ty: 0.15, sLx: -1.57, sRx: -1.57, sLz: -0.12, sRz: 0.12, eL: 0, eR: 0, hLx: -0.7, kL: 0.8, hRx: 0.7, kR: 0.4 }); },
    win1: function (t, tm) { return mix(GUARD, { py: 0, tx: -0.1, ty: 0.2, hx: -0.2, sRx: -3.0 + Math.sin(tm * 8) * 0.15, sRz: 0.2, eR: -0.2, sLx: -0.2, sLz: 0.3, eL: -2.0, hLx: -0.1, kL: 0.1, hRx: 0.1, kR: 0.1 }); },
    win2: function (t, tm) { return mix(GUARD, { py: Math.abs(Math.sin(tm * 6)) * 0.1, tx: -0.15, ty: 0, hx: -0.15, sLx: -1.3, sLz: -0.6, eL: -1.9, sRx: -1.3, sRz: 0.6, eR: -1.9, hLx: -0.15, hLz: 0.2, kL: 0.1, hRx: 0.15, hRz: -0.2, kR: 0.1 }); },
    win3: function (t, tm) { return mix(GUARD, { py: 0, ty: 0.3, sLx: -2.9, sLz: 0.5, sRx: -2.9, sRz: -0.5, eL: -0.3, eR: -0.3, hx: -0.3, hLx: -0.1, kL: 0.1, hRx: 0.1, kR: 0.1 }); },
    ko: function () { return { py: -0.72, prx: -1.5, sLz: 1.4, sRz: -1.4, hLx: 0.15, hRx: -0.15, hx: -0.3 }; },
    dizzy: function (t, tm) { return mix(GUARD, { py: -0.2, tx: 0.3, prz: Math.sin(tm * 4) * 0.15, hx: 0.4, sLx: -0.2, sRx: -0.2, sLz: 0.3, sRz: -0.3, eL: -0.3, eR: -0.3 }); },
    grab: function () { return mix(GUARD, { py: -0.22, tx: 0.45, ty: 0, sLx: -1.55, sLz: 0.55, eL: -0.35, sRx: -1.55, sRz: -0.55, eR: -0.35, hLx: -0.9, kL: 0.9, hRx: 0.5, kR: 0.5 }); },
    spinthrow: function () { return mix(GUARD, { py: -0.1, tx: 0.1, ty: 0, sLx: -1.5, sLz: 1.2, eL: -0.2, sRx: -1.5, sRz: -1.2, eR: -0.2, hLx: -0.4, hLz: 0.3, kL: 0.5, hRx: 0.3, hRz: -0.3, kR: 0.4 }); },
    summon: function (t, tm) { var s = Math.sin(tm * 14) * 0.08; return mix(GUARD, { py: -0.05, tx: -0.2, ty: 0, hx: -0.35, sLx: -2.8 + s, sLz: 0.65, eL: -0.25, sRx: -2.8 - s, sRz: -0.65, eR: -0.25, hLx: -0.25, hLz: 0.25, kL: 0.3, hRx: 0.25, hRz: -0.25, kR: 0.3 }); },
    taunt: function (t, tm) { return mix(GUARD, { py: 0, ty: 0.2, sRx: -1.5, sRz: 1.2, eR: -1.4, hy: 0.4 }); }
  };
})();
