/* Grok Brawl - ELITE BRAWLER PACK (MEGA DLC, Suggestion Booth #18).
   Paid content is gated by localStorage 'grokDLC.brawl.elite_brawler_pack_expansion' (set by the Grok Arcade DLC Shop):
   - 6 new fighters (JETT, KNOX, MAYA open with the pack; SHADE, SOL, CHOMP are ELITE CHALLENGERS you unlock by beating them in ARCADE)
   - 4 new skins for every fighter (ELITE, SHADOW, GOLDEN, NEON)
   - 3 new arenas (Sky Docks with shifting wind, Crystal Caverns, Jungle Ruins)
   - BRAWLER TALE story mode (js/tale.js): full 3D exploration scenes, fights stay 2.5D
   Online: the host's pack is shared with everyone in the room for that session. */
(function () {
  'use strict';
  var T = THREE, C = GB.Combat, Mdl = GB.Models, AR = GB.Arenas, H = AR.H;
  var KEY = 'grokDLC.brawl.elite_brawler_pack_expansion', SHORT = 'brawl.elite_brawler_pack_expansion';
  var E = GB.Elite = { KEY: KEY, SHOP: 'https://lizethbran13-cmyk.github.io/grok-arcade/', NAME: 'ELITE BRAWLER PACK', shared: false };

  /* ---------- ownership ---------- */
  function ownedLocal() {
    try {
      if (localStorage.getItem(KEY)) return true;
      var l = JSON.parse(localStorage.getItem('grokDLC.owned') || '[]');
      if (Array.isArray(l)) return l.indexOf(KEY) >= 0 || l.indexOf(SHORT) >= 0;
      return !!(l && (l[KEY] || l[SHORT]));
    } catch (e) { return false; }
  }
  E.ownedLocal = ownedLocal;
  E.owned = function () { return ownedLocal() || !!E.shared; };
  var sv = GB.save.elite;
  if (!sv || typeof sv !== 'object') sv = GB.save.elite = {};
  sv.unlocked = sv.unlocked || {}; sv.tale = sv.tale || { ch: 0, done: {} }; sv.tale.done = sv.tale.done || {}; sv.skin = sv.skin || {};
  E.save = sv;
  E.usable = function (id) {
    var f = GB.fighter(id); if (!f.dlc) return GB.isUnlocked(id);
    if (!E.owned()) return false;
    return !f.arcadeLock || !!sv.unlocked[id];
  };
  E.unlock = function (id) { var n = !sv.unlocked[id]; sv.unlocked[id] = true; GB.persist(); return n; };
  E.nextChallenger = function () { var l = GB.FIGHTERS.filter(function (f) { return f.arcadeLock && !sv.unlocked[f.id]; }); return l[0] || null; };
  var listeners = [];
  E.onChange = function (fn) { listeners.push(fn); };
  var last = null;
  E.check = function () { var o = E.owned(); if (o !== last) { var was = last; last = o; if (was !== null) listeners.forEach(function (fn) { try { fn(o); } catch (e) {} }); } return o; };
  window.addEventListener('storage', function (e) { if (!e.key || e.key === KEY || e.key === 'grokDLC.owned') E.check(); });
  window.addEventListener('focus', function () { E.check(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) E.check(); });
  setInterval(function () { E.check(); }, 2000);
  E.setShared = function (b) { b = !!b; if (E.shared !== b) { E.shared = b; E.check(); } };

  /* ---------- fighters ---------- */
  var NEW = [
    { id: 'jett', name: 'JETT', title: 'Sky Pilot', color: '#ff8c1a', color2: '#3fa9ff', rim: '#ffd08a', stats: { speed: 4, power: 3, weight: 2 }, scale: 0.98,
      special: { type: 'dashpunch', name: 'Afterburner Dash', desc: 'Jet-boosts forward with a flying punch.' },
      super: { type: 'beam', name: 'JET STREAM', desc: 'Blasts a roaring jet-engine beam across the arena. Jump or dash to dodge it.' }, beam: ['#3fe0ff', '#ffffff'],
      bio: 'Daredevil pilot of the Sky Docks. Zips in fast and never stops talking about planes.' },
    { id: 'knox', name: 'KNOX', title: 'Robo Guardian', color: '#8a94a8', color2: '#ffcc00', rim: '#9fd6ff', stats: { speed: 1, power: 4, weight: 5 }, scale: 1.12,
      special: { type: 'rocketfist', name: 'Rocket Fist', desc: 'Fires a heavy rocket-powered fist across the arena.' },
      super: { type: 'orbital', name: 'ORBITAL DROP', desc: 'Calls three glowing space rocks down on the foe. Watch the red circles and dash away!' },
      bio: 'A gentle giant robot who guards the Crystal Caverns. Slow, heavy and very polite.' },
    { id: 'maya', name: 'MAYA', title: 'Jungle Ranger', color: '#2fbf4a', color2: '#ffd23f', rim: '#a8ff8a', stats: { speed: 4, power: 3, weight: 3 }, scale: 0.97,
      special: { type: 'vinewave', name: 'Vine Wave', desc: 'Sends a wave of springy vines along the floor. Jump it!' },
      super: { type: 'rush', name: 'WILD STAMPEDE', desc: 'Charges in with a stampede of jungle combos.' },
      bio: 'Ranger of the Jungle Ruins. Knows every vine, every temple and every shortcut.' },
    { id: 'shade', name: 'SHADE', title: 'Shadow Thief', color: '#5b44b0', color2: '#3ff0c0', rim: '#a99aff', stats: { speed: 5, power: 2, weight: 2 }, scale: 0.96, arcadeLock: true, flicker: true,
      special: { type: 'teleport', name: 'Shadow Step', desc: 'Melts into the shadows and pops out behind the foe.' },
      super: { type: 'rush', name: 'PHANTOM RUSH', desc: 'Flickers through the foe with a flurry of shadow strikes.' },
      bio: 'A sneaky (but secretly kind) thief who only "borrows" trophies. ELITE CHALLENGER: beat Shade in Arcade to unlock.' },
    { id: 'sol', name: 'SOL', title: 'Sun Monk', color: '#ffb300', color2: '#ff4f8a', rim: '#fff07a', stats: { speed: 3, power: 4, weight: 3 }, scale: 1.0, arcadeLock: true,
      special: { type: 'sunorb', name: 'Sun Orb', desc: 'Throws a fast little sun across the arena.' },
      super: { type: 'beam', name: 'SOLAR FLARE', desc: 'Focuses sunlight into a blazing golden beam.' }, beam: ['#ffd400', '#ff4f8a'],
      bio: 'A calm monk who trains at sunrise. ELITE CHALLENGER: beat Sol in Arcade to unlock.' },
    { id: 'chomp', name: 'CHOMP', title: 'Dino Kid', color: '#58d14f', color2: '#ff8a3d', rim: '#c4ff7a', stats: { speed: 2, power: 5, weight: 4 }, scale: 1.04, arcadeLock: true,
      special: { type: 'cyclone', name: 'Tail Spin', desc: 'A rising spin with a big dino tail. Great anti-air.' },
      super: { type: 'quake', name: 'DINO STOMP', desc: 'A giant ROAR and stomp that launches anyone on the ground.' },
      bio: 'A kid in a dino suit who really, REALLY loves dinosaurs. ELITE CHALLENGER: beat Chomp in Arcade to unlock.' }
  ];
  NEW.forEach(function (f) { f.dlc = true; f.hidden = true; f.elite = true; GB.FIGHTERS.push(f); });
  E.FIGHTERS = NEW.map(function (f) { return f.id; });

  /* ---------- new moves ---------- */
  C.SPECIALS.rocketfist = function () { return C.projMove('fist', { at: 13, total: 40, speed: 8.5, r: 0.5, dmg: 86, hs: 22, bs: 16, chip: 9, kb: 3.5, color: '#ffcc00', color2: '#ff7a1a', core: '#c8d2e8' }); };
  C.SPECIALS.vinewave = function () { return C.projMove('vine', { at: 11, total: 38, speed: 9, r: 0.48, h: 0.95, ground: true, dmg: 62, hs: 24, bs: 14, chip: 6, color: '#5aff5a', color2: '#ffd23f', core: '#2a8a2a', launch: [3.5, 7] }); };
  C.SPECIALS.sunorb = function () { return C.projMove('sun', { at: 10, total: 34, speed: 12, r: 0.36, dmg: 66, hs: 20, bs: 14, chip: 8, color: '#ffd400', color2: '#ff4f8a', core: '#fffbe0' }); };
  GB.AI_PROJ = GB.AI_PROJ || {}; GB.AI_PROJ.rocketfist = GB.AI_PROJ.vinewave = GB.AI_PROJ.sunorb = 1;
  C.SUPERS.orbital = function () {
    return { name: 'super', kind: 'super', total: 80, invuln: [1, 30], anim: function (t) { return t < 12 ? 'charge' : 'summon'; },
      onFrame: function (f, w, m, opp) {
        if ([14, 30, 46].indexOf(m.t) < 0 || !opp || opp.ko) return;
        var k = (m.t - 14) / 16, lim = w.half - 0.6, last = k === 2;
        w.hz.push({ kind: 'meteor', owner: f, x: Math.max(-lim, Math.min(lim, opp.x)), t: 0, warn: 34, r: 1.0, y1: 3.2, dmg: last ? 92 : 58, hs: 22, bs: 14, chip: 6, kb: 0.3, launch: last ? [3, 10] : [2, 7], sup: true, last: last });
        w.emit('meteorWarn', { x: opp.x });
      } };
  };

  /* ---------- looks (merged low-poly parts, same toon + rim + outline pipeline) ---------- */
  var PI = Math.PI;
  Mdl.EXT = {
    jett: { skin: '#e9b48a', pants: '#3a3550', glove: '#7a4420', boot: '#4a2a14', chestW: 0.78, hs: 0.56, sw: 0.49,
      parts: function (add, both, c) {
        var hs = c.hs, fz = hs * 0.47;
        add('head', 'box', [hs + 0.06, 0.2, hs + 0.06], [0, 0.56, -0.02], '#7a4420');
        add('head', 'box', [0.1, 0.26, 0.24], [hs / 2 + 0.03, 0.36, -0.04], '#7a4420'); add('head', 'box', [0.1, 0.26, 0.24], [-hs / 2 - 0.03, 0.36, -0.04], '#7a4420');
        add('head', 'box', [hs + 0.08, 0.06, hs + 0.08], [0, 0.5, -0.01], '#2a1a14');
        [0.13, -0.13].forEach(function (x) { add('head', 'cyl', [0.17, 0.07, 0.17], [x, 0.53, fz + 0.06], '#2a1a14', [PI / 2, 0, 0]); add('head', 'cyl', [0.12, 0.08, 0.12], [x, 0.53, fz + 0.075], '#3fe0ff', [PI / 2, 0, 0]); });
        add('chest', 'box', [0.64, 0.16, 0.54], [0, 0.66, 0], '#e8332a');
        add('chest', 'box', [0.16, 0.56, 0.06], [0.16, 0.52, -0.3], '#e8332a', [0.55, 0, 0.25]); add('chest', 'box', [0.14, 0.4, 0.05], [0.26, 0.3, -0.44], '#ff6a4a', [0.9, 0, 0.35]);
        add('chest', 'box', [c.chestW + 0.02, 0.1, 0.5], [0, 0.18, 0], '#7a4420'); add('chest', 'box', [0.14, 0.12, 0.05], [0, 0.18, 0.26], '#ffd23f');
        add('chest', 'box', [0.06, 0.5, 0.05], [0.12, 0.42, 0.25], '#ffd23f');
        add('chest', 'box', [0.5, 0.52, 0.22], [0, 0.42, -0.36], '#9aa2b8');
        [0.17, -0.17].forEach(function (x) { add('chest', 'cyl', [0.2, 0.6, 0.2], [x, 0.38, -0.5], '#c8c8d8'); add('chest', 'cone', [0.2, 0.22, 0.2], [x, 0.76, -0.5], '#ff4a2e'); add('chest', 'cone', [0.16, 0.34, 0.16], [x, -0.06, -0.5], '#ffb020', [PI, 0, 0]); });
        both('ua', 'box', [0.3, 0.12, 0.3], [0, -0.32, 0], '#7a4420');
      } },
    knox: { skin: '#b8c4d8', pants: '#4a5468', glove: '#ffcc00', boot: '#3a4050', chestW: 1.0, hs: 0.52, sw: 0.62, eye: '#3ff0ff',
      parts: function (add, both, c) {
        var hs = c.hs;
        add('head', 'box', [hs + 0.1, hs * 0.86, hs + 0.08], [0, 0.34, -0.02], '#8a94a8');
        add('head', 'box', [hs * 0.86, 0.15, 0.05], [0, 0.34, (hs + 0.08) / 2 - 0.01], '#0a1a2a'); add('head', 'box', [hs * 0.74, 0.07, 0.05], [0, 0.34, (hs + 0.08) / 2 + 0.01], '#3ff0ff');
        add('head', 'box', [hs * 0.3, 0.05, 0.04], [0, 0.17, (hs + 0.08) / 2 + 0.005], '#3a4050');
        add('head', 'box', [hs + 0.14, 0.1, 0.22], [0, 0.64, -0.02], '#ffcc00');
        add('head', 'cyl', [0.05, 0.3, 0.05], [0.2, 0.84, -0.06], '#c8c8d8'); add('head', 'ball', [0.12, 0.12, 0.12], [0.2, 1.0, -0.06], '#ff4a2e');
        [hs / 2 + 0.07, -hs / 2 - 0.07].forEach(function (x) { add('head', 'cyl', [0.18, 0.08, 0.18], [x, 0.34, 0], '#ffcc00', [0, 0, PI / 2]); });
        add('chest', 'box', [0.36, 0.3, 0.06], [0, 0.42, 0.26], '#2a3040'); add('chest', 'ball', [0.22, 0.22, 0.1], [0, 0.42, 0.29], '#3ff0ff');
        add('chest', 'box', [c.chestW + 0.04, 0.12, 0.52], [0, 0.66, 0], '#ffcc00');
        add('chest', 'box', [0.6, 0.6, 0.18], [0, 0.4, -0.32], '#6a7488'); add('chest', 'cyl', [0.12, 0.3, 0.12], [0.18, 0.75, -0.34], '#c8c8d8'); add('chest', 'cyl', [0.12, 0.3, 0.12], [-0.18, 0.75, -0.34], '#c8c8d8');
        both('ua', 'box', [0.46, 0.22, 0.46], [0, 0.12, 0], '#ffcc00');
        both('fa', 'box', [0.38, 0.38, 0.4], [0, -0.34, 0.02], '#8a94a8');
        both('th', 'box', [0.36, 0.14, 0.36], [0, -0.42, 0], '#ffcc00');
      } },
    maya: { skin: '#c98a5a', pants: '#6b4a2a', glove: '#ffd23f', boot: '#5a3a1a', chestW: 0.76, hs: 0.55, sw: 0.48, armSkin: true,
      parts: function (add, both, c) {
        var hs = c.hs;
        add('head', 'cyl', [hs * 1.9, 0.05, hs * 1.9], [0, 0.6, -0.02], '#c9a35a'); add('head', 'cyl', [hs * 1.08, 0.2, hs * 1.08], [0, 0.7, -0.02], '#c9a35a'); add('head', 'cyl', [hs * 1.1, 0.06, hs * 1.1], [0, 0.63, -0.02], '#2fbf4a');
        add('head', 'box', [hs + 0.04, 0.16, 0.2], [0, 0.48, -0.22], '#3a2214');
        add('head', 'cone', [0.16, 0.42, 0.16], [0, 0.3, -0.42], '#3a2214', [-2.4, 0, 0]); add('head', 'cone', [0.12, 0.3, 0.06], [0.08, 0.12, -0.56], '#2fbf4a', [-2.6, 0, 0.4]);
        add('chest', 'box', [c.chestW + 0.04, 0.5, 0.5], [0, 0.36, 0], '#2fbf4a'); add('chest', 'box', [0.1, 0.62, 0.52], [0.0, 0.36, 0.0], '#ffd23f', [0, 0, 0.7]);
        add('chest', 'box', [0.24, 0.2, 0.16], [-0.3, 0.12, 0.2], '#8a5a2a');
        [0.32, -0.32].forEach(function (x) { add('chest', 'cone', [0.3, 0.34, 0.12], [x, 0.7, 0], '#4fdc5a', [0, 0, x > 0 ? -1.2 : 1.2]); });
        both('fa', 'box', [0.26, 0.1, 0.28], [0, -0.22, 0], '#2fbf4a');
        both('sh', 'box', [0.31, 0.18, 0.33], [0, -0.3, 0], '#8a5a2a');
      } },
    shade: { skin: '#e9c6a8', pants: '#231a44', glove: '#3ff0c0', boot: '#151022', chestW: 0.72, hs: 0.55, sw: 0.46, eye: '#0a3a30',
      parts: function (add, both, c) {
        var hs = c.hs, fz = hs * 0.47;
        add('head', 'box', [hs + 0.1, 0.26, hs + 0.12], [0, 0.56, -0.04], '#2a2050'); add('head', 'box', [hs + 0.1, hs + 0.04, 0.2], [0, 0.32, -0.26], '#2a2050');
        add('head', 'box', [0.08, hs * 0.9, hs * 0.9], [hs / 2 + 0.05, 0.32, -0.04], '#2a2050'); add('head', 'box', [0.08, hs * 0.9, hs * 0.9], [-hs / 2 - 0.05, 0.32, -0.04], '#2a2050');
        add('head', 'cone4', [0.14, 0.24, 0.12], [0.16, 0.74, -0.06], '#2a2050'); add('head', 'cone4', [0.14, 0.24, 0.12], [-0.16, 0.74, -0.06], '#2a2050');
        add('head', 'box', [hs + 0.02, 0.12, 0.04], [0, 0.33, fz], '#151022');
        add('head', 'box', [hs * 0.9, 0.14, 0.05], [0, 0.17, fz + 0.01], '#3ff0c0');
        add('chest', 'box', [0.72, 0.9, 0.06], [0, 0.18, -0.3], '#3a2a78', [0.18, 0, 0]); add('chest', 'box', [0.6, 0.06, 0.07], [0, -0.26, -0.38], '#3ff0c0', [0.18, 0, 0]);
        add('chest', 'box', [c.chestW + 0.02, 0.08, 0.5], [0, 0.16, 0], '#3ff0c0');
        add('chest', 'box', [0.1, 0.1, 0.06], [0.2, 0.5, 0.26], '#ffd23f');
        both('fa', 'box', [0.24, 0.08, 0.26], [0, -0.24, 0], '#3ff0c0');
      } },
    sol: { skin: '#c98a5a', pants: '#ff4f8a', glove: '#ffe9a8', boot: '#8a5a2a', chestW: 0.8, hs: 0.55, sw: 0.5, armSkin: true,
      parts: function (add, both, c) {
        var hs = c.hs;
        add('head', 'box', [0.12, 0.08, 0.04], [0, 0.5, hs * 0.47 + 0.02], '#ff4f8a');
        add('head', 'cyl', [0.86, 0.04, 0.86], [0, 0.34, -0.42], '#ffe14d', [PI / 2, 0, 0]);
        for (var i = 0; i < 10; i++) { var a = i / 10 * PI * 2; add('head', 'cone4', [0.12, 0.24, 0.05], [Math.cos(a) * 0.54, 0.34 + Math.sin(a) * 0.54, -0.44], i % 2 ? '#ff9a1f' : '#ffd400', [0, 0, a - PI / 2]); }
        add('chest', 'box', [c.chestW + 0.04, 0.56, 0.5], [0, 0.38, 0], '#ffb300'); add('chest', 'box', [0.14, 0.7, 0.52], [0.1, 0.36, 0], '#ff4f8a', [0, 0, -0.6]);
        for (var k = 0; k < 7; k++) { var b = (k - 3) * 0.12; add('chest', 'ball', [0.1, 0.1, 0.1], [b, 0.66 - Math.abs(b) * 0.4, 0.26], k % 2 ? '#7a3a1a' : '#ffe14d'); }
        add('hips', 'box', [0.72, 0.16, 0.46], [0, 0.1, 0], '#ff4f8a');
        both('th', 'box', [0.36, 0.5, 0.38], [0, -0.26, 0], '#ff4f8a');
        both('fa', 'box', [0.26, 0.14, 0.28], [0, -0.2, 0], '#ffe9a8');
      } },
    chomp: { skin: '#f0b98a', pants: '#3fae3a', glove: '#58d14f', boot: '#3fae3a', chestW: 0.86, hs: 0.54, sw: 0.53,
      parts: function (add, both, c) {
        var hs = c.hs;
        add('head', 'box', [hs + 0.16, hs + 0.12, hs + 0.06], [0, 0.37, -0.09], '#58d14f');
        add('head', 'box', [hs + 0.12, 0.13, 0.32], [0, 0.66, 0.16], '#58d14f');
        for (var i = 0; i < 5; i++) add('head', 'cone4', [0.07, 0.1, 0.07], [(i - 2) * 0.12, 0.56, 0.3], '#ffffff', [PI, 0, 0]);
        [0.14, -0.14].forEach(function (x) { add('head', 'ball', [0.13, 0.13, 0.13], [x, 0.76, 0.2], '#ffffff'); add('head', 'ball', [0.07, 0.07, 0.07], [x, 0.77, 0.26], '#111018'); });
        [0.78, 0.6, 0.4].forEach(function (y, i) { add('head', 'cone4', [0.14 - i * 0.02, 0.22, 0.14], [0, y, -0.42 + i * 0.02], '#ff8a3d', [-0.9, 0, 0]); });
        add('chest', 'box', [0.5, 0.56, 0.06], [0, 0.32, 0.25], '#ffe9a8');
        [0.62, 0.38, 0.14].forEach(function (y) { add('chest', 'cone4', [0.14, 0.22, 0.14], [0, y, -0.3], '#ff8a3d', [-1.2, 0, 0]); });
        add('hips', 'box', [0.34, 0.3, 0.42], [0, -0.02, -0.4], '#58d14f', [0.4, 0, 0]); add('hips', 'box', [0.24, 0.22, 0.4], [0, -0.16, -0.74], '#58d14f', [0.6, 0, 0]);
        add('hips', 'cone4', [0.16, 0.36, 0.16], [0, -0.28, -1.02], '#58d14f', [-2.0, 0, 0]); add('hips', 'cone4', [0.12, 0.16, 0.12], [0, 0.16, -0.48], '#ff8a3d', [-0.8, 0, 0]);
        both('fa', 'cone4', [0.07, 0.12, 0.07], [0.08, -0.56, 0.12], '#ffffff', [PI, 0, 0]);
        both('sh', 'box', [0.36, 0.18, 0.5], [0, -0.45, 0.08], '#58d14f'); both('sh', 'cone4', [0.07, 0.12, 0.07], [0.1, -0.46, 0.36], '#ffffff', [PI / 2, 0, 0]);
      } }
  };

  /* ---------- skins (recolour every fighter, keeps skin tones, eyes and metal greys) ---------- */
  E.SKINS = [
    { id: '', name: 'CLASSIC' },
    { id: 'elite', name: 'ELITE', rim: '#ffffff' },
    { id: 'shadow', name: 'SHADOW', rim: '#b26bff' },
    { id: 'gold', name: 'GOLDEN', rim: '#fff07a' },
    { id: 'neon', name: 'NEON', rim: '#7dfcff' }
  ];
  var _hc = new T.Color(), _hsl = {}, rcCache = {};
  Mdl.reskin = function (hex, skin, def) {
    var key = skin + hex; if (rcCache[key]) return rcCache[key];
    _hc.set(hex); _hc.getHSL(_hsl); var h = _hsl.h, s = _hsl.s, l = _hsl.l;
    var keep = s < 0.16 || l < 0.1 || l > 0.93 || (h > 0.025 && h < 0.115 && s > 0.2 && s < 0.82 && l > 0.42 && l < 0.86);
    if (!keep) {
      if (skin === 'elite') { h = (h + 0.5) % 1; s = Math.min(1, s * 1.05); }
      else if (skin === 'shadow') { h = (h * 0.5 + 0.38) % 1; s = s * 0.75; l = 0.07 + l * 0.38; }
      else if (skin === 'gold') { h = 0.1 + (l > 0.5 ? 0.025 : -0.015); s = 0.92; l = Math.max(0.28, Math.min(0.7, l * 0.85 + 0.12)); }
      else if (skin === 'neon') { h = (h + 0.33) % 1; s = 1; l = Math.max(0.45, Math.min(0.62, l)); }
    } else if (skin === 'shadow' && s < 0.16 && l > 0.25 && l <= 0.93) { l = l * 0.55; }
    _hc.setHSL(h, s, l); return (rcCache[key] = '#' + _hc.getHexString());
  };
  var skCache = {};
  E.skinned = function (def, skin) {
    if (!skin || !E.owned()) return def;
    var sk = E.SKINS.find(function (s) { return s.id === skin; }); if (!sk || !sk.id) return def;
    var k = def.id + '|' + skin; if (skCache[k]) return skCache[k];
    var o = Object.create(def); o._skin = skin; o.skinName = sk.name;
    o.color = Mdl.reskin(def.color, skin, def); o.color2 = Mdl.reskin(def.color2, skin, def); o.rim = sk.rim || def.rim;
    if (def.beam) o.beam = [Mdl.reskin(def.beam[0], skin, def), def.beam[1]];
    return (skCache[k] = o);
  };
  E.skinName = function (id) { var s = E.SKINS.find(function (x) { return x.id === (id || ''); }); return s ? s.name : 'CLASSIC'; };
  E.nextSkin = function (id, dir) { var i = E.SKINS.findIndex(function (x) { return x.id === (id || ''); }); i = (i + (dir || 1) + E.SKINS.length) % E.SKINS.length; return E.SKINS[i].id; };

  /* ---------- arenas ---------- */
  var NEW_AR = [
    { id: 'skydocks', name: 'Sky Docks', sub: 'Airship deck \u00b7 the wind keeps shifting!', css: 'linear-gradient(180deg,#3a7bd5 0%,#8fc4ff 50%,#ffb37a 100%)', music: 0, dlc: true, rules: { belt: 0.95 } },
    { id: 'crystal', name: 'Crystal Caverns', sub: 'Glowing gems deep underground', css: 'linear-gradient(180deg,#05030f 0%,#2a1050 55%,#3ff0ff 100%)', music: 4, dlc: true },
    { id: 'jungle', name: 'Jungle Ruins', sub: 'Ancient temple \u00b7 roaring waterfall', css: 'linear-gradient(180deg,#7fd6ff 0%,#5fcf7a 55%,#8a6a3a 100%)', music: 2, dlc: true }
  ];
  NEW_AR.forEach(function (a) { GB.ARENAS.push(a); });
  E.ARENAS = NEW_AR.map(function (a) { return a.id; });
  E.arenaOk = function (id) { var a = GB.arena(id); return !a.dlc || E.owned(); };

  var lam = H.lam, basic = H.basic, addM = H.add, box = H.box, cyl = H.cyl, cone = H.cone, ball = H.ball, plane = H.plane, M = H.M, cv = H.cv;
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function glowSprite(color, size, parent, x, y, z) {
    var t = glowSprite.t || (glowSprite.t = cv(64, 64, function (g) { var r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }));
    var s = new T.Sprite(new T.SpriteMaterial({ map: t, color: color, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); s.position.set(x, y, z); s.scale.set(size, size, 1); parent.add(s); return s;
  }
  E.glowSprite = glowSprite;

  AR.EXT.skydocks = function (root) {
    var o = { sky: H.skyTex(['#2f6fd0', '#6fb0ff', '#bfe0ff', '#ffd1a1', '#ffab6e'], 0), fog: ['#cfe2ff', 34, 120], ambient: { type: 'dust', color: '#ffffff' }, beltMsg: 'WIND SHIFTING!' };
    root.add(H.lights(root, '#e8f2ff', '#8a6a4a', 1.0, '#fff1d6', 0.8, -6, 12, 8));
    var ft = cv(256, 256, function (g, w, h) { for (var i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#a8723e' : '#b98245'; g.fillRect(0, i * 32, w, 32); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, i * 32 + 30, w, 2); for (var k = 0; k < 3; k++) { var x = ((i * 97 + k * 83) % 256); g.fillRect(x, i * 32, 2, 30); g.fillStyle = '#5a3a1a'; g.fillRect(x + 6, i * 32 + 8, 3, 3); g.fillRect(x + 6, i * 32 + 21, 3, 3); g.fillStyle = 'rgba(0,0,0,0.25)'; } } });
    H.floor(ft, root, 26, 9, [7, 2.5]).position.z = 0.2;
    M(box(), lam('#7a4a22'), 0, -0.45, 0.2, 26.2, 0.9, 9.2, root);
    M(box(), lam('#5a3416'), 0, -1.2, 0.2, 24, 0.8, 8, root);
    var hullTex = cv(256, 64, function (g, w, h) { g.fillStyle = '#c0392b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4d03f'; g.fillRect(0, 6, w, 6); g.fillStyle = '#922b21'; for (var x = 12; x < w; x += 40) { g.beginPath(); g.arc(x, 38, 8, 0, 7); g.fill(); g.fillStyle = '#bfe7ff'; g.beginPath(); g.arc(x, 38, 5, 0, 7); g.fill(); g.fillStyle = '#922b21'; } });
    hullTex.wrapS = T.RepeatWrapping; hullTex.repeat.set(4, 1);
    var hull = new T.Mesh(box(), new T.MeshLambertMaterial({ map: hullTex })); hull.position.set(0, -2.4, 0.2); hull.scale.set(25, 1.6, 8.6); root.add(hull);
    var rail = lam('#e8d2a8');
    for (var x = -12; x <= 12; x += 2) M(box(), lam('#7a4a22'), x, 0.6, -4.1, 0.16, 1.2, 0.16, root);
    M(box(), rail, 0, 1.2, -4.1, 24.4, 0.12, 0.18, root); M(box(), rail, 0, 0.7, -4.1, 24.4, 0.06, 0.1, root);
    var mast = M(cyl(10), lam('#8a5a2a'), -6.5, 6, -5.5, 0.45, 12, 0.45, root);
    var sailTex = cv(128, 128, function (g, w, h) { g.fillStyle = '#fff8ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff8c1a'; g.beginPath(); g.arc(64, 64, 30, 0, 7); g.fill(); g.fillStyle = '#fff8ea'; g.font = '900 34px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('E', 64, 66); g.strokeStyle = '#e0c9a0'; g.lineWidth = 3; for (var y = 16; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    var sail = new T.Mesh(plane(), new T.MeshLambertMaterial({ map: sailTex, side: T.DoubleSide })); sail.position.set(-6.5, 7, -5.2); sail.scale.set(6, 6, 1); root.add(sail);
    M(box(), lam('#8a5a2a'), -6.5, 10.2, -5.4, 7, 0.25, 0.25, root); M(box(), lam('#8a5a2a'), -6.5, 3.9, -5.4, 6.4, 0.22, 0.22, root);
    var flag = new T.Group(); flag.position.set(-6.5, 12.2, -5.5); root.add(flag);
    var fm = M(box(), lam('#3fa9ff'), 1.0, 0, 0, 2.0, 1.0, 0.05, flag);
    // ship wheel + crates + barrels
    var wheel = new T.Group(); wheel.position.set(8.8, 2.2, -3.5); root.add(wheel);
    M(cyl(12), lam('#8a5a2a'), 0, 0, 0, 1.6, 0.14, 1.6, wheel).rotation.x = PI / 2; M(cyl(12), lam('#f4d03f'), 0, 0, 0.05, 0.4, 0.2, 0.4, wheel).rotation.x = PI / 2;
    for (var sp = 0; sp < 8; sp++) { var s = M(box(), lam('#a8723e'), 0, 0, 0.02, 0.1, 2.2, 0.1, wheel); s.rotation.z = sp / 8 * PI; }
    M(box(), lam('#7a4a22'), 8.8, 0.8, -3.6, 0.3, 1.6, 0.3, root);
    var crate = cv(64, 64, function (g, w, h) { g.fillStyle = '#b98245'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6a4220'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(3, 3); g.lineTo(w - 3, h - 3); g.stroke(); });
    var cm = new T.MeshLambertMaterial({ map: crate });
    [[-11, 0.6, -3.2, 1.2], [-9.8, 0.6, -3.3, 1.2], [-10.4, 1.8, -3.25, 1.1], [11.2, 0.5, 2.8, 1.0]].forEach(function (c) { M(box(), cm, c[0], c[1], c[2], c[3], c[3], c[3], root); });
    [[10.6, -3.2], [11.6, -2.9]].forEach(function (p) { M(cyl(12), lam('#8a5a2a'), p[0], 0.6, p[1], 0.9, 1.2, 0.9, root); M(cyl(12), lam('#3a3a3a'), p[0], 0.9, p[1], 0.95, 0.08, 0.95, root); });
    // propellers at the stern
    var props = [];
    [-13.4, 13.4].forEach(function (x) { var p = new T.Group(); p.position.set(x, -1.6, 0.2); root.add(p); M(ball(1), lam('#c8c8d8'), 0, 0, 0, 0.8, 0.8, 0.8, p); for (var b = 0; b < 3; b++) { var bl = M(box(), lam('#e8e8f0'), 0, 0, 0, 0.12, 2.4, 0.3, p); bl.rotation.x = b / 3 * PI * 2; } p.rotation.z = PI / 2; props.push(p); });
    // the huge balloon above the deck (back)
    var env = M(ball(2), lam('#ff8c1a'), 0, 14, -9, 26, 7, 7, root);
    M(ball(2), lam('#3fa9ff'), 0, 14, -8.8, 26.4, 1.4, 7.2, root);
    for (var r = -10; r <= 10; r += 5) M(box(), lam('#5a3a1a'), r, 7, -6.5, 0.06, 7.5, 0.06, root).rotation.x = -0.25;
    // far sky: clouds sea, floating islands, other airships, hot air balloons
    var R = rnd(77), cl = [];
    for (var i = 0; i < 60; i++) { var cx = (R() - 0.5) * 140, cz = -18 - R() * 70, sc = 3 + R() * 7; cl.push([cx, -7 - R() * 4, cz, sc * 1.6, sc * 0.7, sc]); }
    for (i = 0; i < 26; i++) { cx = (R() - 0.5) * 60; cl.push([cx, -6 - R() * 2, 8 + R() * 12, 4 + R() * 4, 2 + R() * 2, 4 + R() * 4]); }
    H.instanced(ball(1), lam('#ffffff'), cl, root, ['#ffffff', '#f2f6ff', '#ffe8d8']);
    var isl = [];
    [[-34, 2, -55, 9], [30, 6, -62, 7], [52, -1, -40, 5]].forEach(function (p) {
      var g = new T.Group(); g.position.set(p[0], p[1], p[2]); root.add(g); isl.push(g);
      M(cone(7), lam('#8a6a4a'), 0, -p[3] * 0.5, 0, p[3] * 1.4, p[3], p[3] * 1.4, g).rotation.x = PI;
      M(cyl(9), lam('#5fcf5a'), 0, 0.15, 0, p[3] * 1.4, 0.4, p[3] * 1.4, g);
      for (var t = 0; t < 4; t++) { var tx = (t - 1.5) * p[3] * 0.3; M(cyl(6), lam('#7a4a22'), tx, 1, 0, 0.3, 2, 0.3, g); M(cone(7), lam('#2fae4a'), tx, 2.6, 0, 1.6, 2.6, 1.6, g); }
    });
    var ships = [];
    [[-26, 9, -40, 1], [24, 13, -48, -1]].forEach(function (p) {
      var g = new T.Group(); g.position.set(p[0], p[1], p[2]); root.add(g); ships.push({ g: g, x0: p[0], d: p[3] });
      M(ball(2), lam(p[3] > 0 ? '#ff4fd8' : '#3ff0ff'), 0, 0, 0, 8, 2.6, 2.6, g); M(box(), lam('#7a4a22'), 0, -2, 0, 3, 0.8, 1.2, g); M(cone(4), lam('#ffffff'), -4.6 * p[3], 0, 0, 1, 1.8, 0.2, g).rotation.z = PI / 2 * p[3];
    });
    var bals = [];
    [[-18, 6, -24, '#ff4a2e'], [17, 4, -20, '#ffd23f'], [36, 10, -34, '#2fbf4a'], [-40, 12, -36, '#a259ff']].forEach(function (p, k) {
      var g = new T.Group(); g.position.set(p[0], p[1], p[2]); root.add(g); bals.push(g);
      M(ball(2), lam(p[3]), 0, 2.2, 0, 3, 3.4, 3, g); M(cone(8), lam(p[3]), 0, 0.2, 0, 1.6, 1.4, 1.6, g).rotation.x = PI; M(box(), lam('#8a5a2a'), 0, -1.2, 0, 0.8, 0.6, 0.8, g);
      M(ball(2), lam('#ffffff'), 0, 2.2, 0, 3.05, 0.5, 3.05, g);
    });
    var sun = glowSprite('#ffd08a', 40, root, 30, 6, -90);
    // wind streaks (show the wind direction)
    var streaks = [];
    for (i = 0; i < 18; i++) { var st = M(box(), addM('#ffffff'), 0, 0.6 + R() * 4.5, -3 + R() * 5.5, 1.6 + R() * 2, 0.05, 0.05, root); st.userData.k = R(); streaks.push(st); }
    o.update = function (t, w) {
      var dir = w ? (w.beltDir || 1) : 1, on = !!(w && w.belt), warn = !!(w && w.beltWarn);
      props.forEach(function (p, i) { p.rotation.x = t * (i ? -9 : 9); });
      flag.rotation.y = dir > 0 ? 0 : PI; fm.rotation.y = Math.sin(t * 6) * 0.15; fm.scale.y = 1 + Math.sin(t * 5) * 0.05;
      sail.rotation.y = (on ? dir * 0.18 : 0) + Math.sin(t * 0.8) * 0.04;
      wheel.rotation.z = Math.sin(t * 0.6) * 0.6;
      ships.forEach(function (s, i) { s.g.position.x = s.x0 + Math.sin(t * 0.05 + i) * 8; s.g.position.y += Math.sin(t * 0.9 + i) * 0.004; });
      bals.forEach(function (b, i) { b.position.y += Math.sin(t * 0.7 + i * 1.7) * 0.006; });
      isl.forEach(function (g, i) { g.position.y += Math.sin(t * 0.4 + i) * 0.003; });
      env.scale.y = 7 + Math.sin(t * 1.2) * 0.08;
      streaks.forEach(function (s) { var k = (s.userData.k + t * (on ? 0.55 : 0.12)) % 1; s.position.x = dir * (-14 + k * 28); s.material.opacity = (on ? (warn ? 0.18 : 0.42) : 0.12) * Math.sin(k * PI); });
      sun.material.opacity = 0.8 + Math.sin(t * 0.5) * 0.1;
    };
    return o;
  };

  AR.EXT.crystal = function (root) {
    var o = { sky: H.skyTex(['#030208', '#0a0620', '#170c38', '#24104a'], 0), fog: ['#120830', 20, 72], ambient: { type: 'dust', color: '#c9a3ff' } };
    root.add(H.lights(root, '#9a8aff', '#1a0a30', 0.75, '#bff4ff', 0.6, 4, 10, 8));
    var pl = new T.PointLight('#3ff0ff', 1.2, 22); pl.position.set(-6, 3, 1); root.add(pl); var pl2 = new T.PointLight('#ff4fd8', 1.0, 22); pl2.position.set(6, 3, 1); root.add(pl2);
    var ft = cv(256, 256, function (g, w, h) { g.fillStyle = '#2a2440'; g.fillRect(0, 0, w, h); var R = rnd(5); for (var i = 0; i < 60; i++) { g.fillStyle = i % 3 ? '#342c50' : '#221c36'; g.beginPath(); g.arc(R() * w, R() * h, 6 + R() * 22, 0, 7); g.fill(); } g.strokeStyle = '#3ff0ff'; g.lineWidth = 2; g.globalAlpha = 0.6; for (i = 0; i < 6; i++) { g.beginPath(); var x = R() * w, y = R() * h; g.moveTo(x, y); for (var k = 0; k < 4; k++) { x += (R() - 0.5) * 60; y += (R() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); } });
    H.floor(ft, root, 40, 16, [8, 3]);
    var R = rnd(31), rocks = [];
    for (var i = 0; i < 26; i++) { var x = (R() - 0.5) * 50, z = -5 - R() * 14, s = 2 + R() * 4; rocks.push([x, s * 0.35, z, s * 1.4, s, s]); }
    for (i = 0; i < 10; i++) { x = (R() < 0.5 ? -1 : 1) * (11 + R() * 6); rocks.push([x, 1, 2 + R() * 4, 2 + R() * 2, 1.5 + R() * 2, 2]); }
    var rockG = new T.DodecahedronGeometry(0.5, 0);
    H.instanced(rockG, lam('#3a3258'), rocks, root, ['#3a3258', '#2e2848', '#463c66']);
    M(box(), lam('#1d1834'), 0, 6, -16, 80, 16, 1, root);
    var stal = [];
    for (i = 0; i < 40; i++) stal.push([(R() - 0.5) * 50, 10.5, -2 - R() * 14, 0.8 + R() * 1.4, 2 + R() * 4, 0.8 + R() * 1.4]);
    var sg = new T.ConeGeometry(0.5, 1, 6); sg.rotateX(PI);
    H.instanced(sg, lam('#2e2848'), stal, root, ['#2e2848', '#3a3258']);
    M(box(), lam('#14102a'), 0, 13, -4, 80, 2, 30, root);
    var COLS = ['#3ff0ff', '#ff4fd8', '#9d6bff', '#7dff9e', '#ffe14d'], crystals = [], glows = [];
    function cluster(x, y, z, s, col, n) {
      var g = new T.Group(); g.position.set(x, y, z); root.add(g);
      var mat = new T.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, flatShading: true });
      for (var k = 0; k < n; k++) { var c = new T.Mesh(new T.OctahedronGeometry(0.5, 0), mat); var h = s * (0.8 + R() * 1.2); c.scale.set(s * 0.35, h, s * 0.35); c.position.set((R() - 0.5) * s * 0.9, h * 0.45, (R() - 0.5) * s * 0.5); c.rotation.set((R() - 0.5) * 0.7, R() * PI, (R() - 0.5) * 0.7); g.add(c); }
      crystals.push({ g: g, mat: mat }); glows.push(glowSprite(col, s * 3.2, root, x, y + s * 0.7, z + 0.3));
      return g;
    }
    [[-11, 0, -3.8, 1.8], [-7.5, 0, -4.6, 1.2], [-3, 0, -5.4, 2.4], [2.5, 0, -5, 1.4], [7, 0, -4.2, 2.0], [11.5, 0, -3.5, 1.5], [-15, 0, -1, 2.2], [15, 0, -0.5, 2.4], [-18, 0, -8, 3], [18, 0, -9, 3.2], [0, 0, -12, 3.6], [-9, 0, -11, 2.6], [10, 0, -12, 2.8]].forEach(function (p, i) { cluster(p[0], p[1], p[2], p[3], COLS[i % COLS.length], 4 + (i % 3)); });
    // hanging crystals from the ceiling
    [[-5, 9, -6], [4, 9.5, -7], [12, 9, -6]].forEach(function (p, i) { var g = cluster(p[0], p[1], p[2], 1.4, COLS[(i + 2) % 5], 3); g.rotation.z = PI; });
    // glowing pool + mine cart rails
    var pool = new T.Mesh(new T.CircleGeometry(1, 28), new T.MeshBasicMaterial({ color: '#3ff0ff', transparent: true, opacity: 0.55 })); pool.rotation.x = -PI / 2; pool.position.set(-4, 0.03, -8); pool.scale.set(5, 2.2, 1); root.add(pool);
    glowSprite('#3ff0ff', 8, root, -4, 0.8, -8);
    [-0.5, 0.5].forEach(function (dz) { M(box(), lam('#8a8aa0'), 0, 0.05, -2.6 + dz, 40, 0.08, 0.1, root); });
    for (x = -19; x <= 19; x += 1.2) M(box(), lam('#5a3a24'), x, 0.02, -2.6, 0.3, 0.05, 1.4, root);
    var cart = new T.Group(); cart.position.set(8, 0.15, -2.6); root.add(cart);
    M(box(), lam('#7a5a3a'), 0, 0.55, 0, 1.6, 0.8, 1.0, cart); M(box(), lam('#4a3a2a'), 0, 0.98, 0, 1.7, 0.08, 1.1, cart);
    [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(function (q) { M(cyl(10), lam('#2a2a2a'), q[0], 0.15, q[1], 0.36, 0.1, 0.36, cart).rotation.x = PI / 2; });
    for (i = 0; i < 4; i++) { var gem = M(new T.OctahedronGeometry(0.5, 0), new T.MeshLambertMaterial({ color: COLS[i], emissive: COLS[i], emissiveIntensity: 0.6 }), -0.4 + i * 0.27, 1.15, (i % 2) * 0.2 - 0.1, 0.3, 0.4, 0.3, cart); }
    // lanterns on posts
    var lans = [];
    [-9.5, 9.5].forEach(function (x) { M(box(), lam('#5a3a24'), x, 1.6, -3.4, 0.18, 3.2, 0.18, root); M(box(), lam('#5a3a24'), x + 0.4, 3.1, -3.4, 0.9, 0.12, 0.12, root); var l = M(box(), basic('#ffd27a'), x + 0.8, 2.75, -3.4, 0.3, 0.4, 0.3, root); lans.push(glowSprite('#ffb04a', 2.6, root, x + 0.8, 2.75, -3.3)); });
    o.update = function (t) {
      crystals.forEach(function (c, i) { c.mat.emissiveIntensity = 0.45 + Math.sin(t * 1.6 + i * 1.3) * 0.25; });
      glows.forEach(function (g, i) { g.material.opacity = 0.35 + Math.sin(t * 1.6 + i * 1.3) * 0.2; });
      pool.material.opacity = 0.45 + Math.sin(t * 2) * 0.1; pl.intensity = 1.1 + Math.sin(t * 1.3) * 0.25; pl2.intensity = 0.9 + Math.sin(t * 1.7 + 1) * 0.25;
      lans.forEach(function (l, i) { l.material.opacity = 0.75 + Math.sin(t * 9 + i * 3) * 0.12; });
      cart.position.x = 8 + Math.sin(t * 0.25) * 1.2;
    };
    return o;
  };

  AR.EXT.jungle = function (root) {
    var o = { sky: H.skyTex(['#5ec4ff', '#9fe2ff', '#d8f6e0', '#fff1c0'], 0), fog: ['#c8ecd0', 30, 100], ambient: { type: 'dust', color: '#e8ff9a' } };
    root.add(H.lights(root, '#fff8e0', '#3a6a3a', 1.0, '#fff1c8', 0.85, -6, 14, 8));
    var ft = cv(256, 256, function (g, w, h) { g.fillStyle = '#9a9478'; g.fillRect(0, 0, w, h); for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#a8a284' : '#8e8870'; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); } g.fillStyle = 'rgba(60,140,50,0.55)'; var R = rnd(9); for (var i = 0; i < 70; i++) { g.beginPath(); g.arc(R() * w, R() * h, 3 + R() * 9, 0, 7); g.fill(); } });
    H.floor(ft, root, 40, 16, [9, 3.5]);
    var stone = lam('#a8a07c'), stoneD = lam('#8a8264'), moss = lam('#4f9a3a');
    // step pyramid temple
    for (var s = 0; s < 6; s++) { var w = 22 - s * 3.2; M(box(), s % 2 ? stoneD : stone, 0, 0.9 + s * 1.8, -16 - s * 0.6, w, 1.8, 10 - s * 1.2, root); M(box(), moss, 0, 1.82 + s * 1.8, -11.2 - s * 1.2, w * 0.9, 0.12, 0.4, root); }
    M(box(), stone, 0, 6, -11.5, 3.2, 12, 1, root);
    for (s = 0; s < 12; s++) M(box(), stoneD, 0, 0.25 + s * 0.5, -10.6 - s * 0.45, 3, 0.18, 0.5, root);
    M(box(), stoneD, 0, 12.6, -19.5, 4.4, 3.2, 3.4, root); M(box(), basic('#1a1410'), 0, 12.2, -17.75, 1.8, 2.2, 0.1, root);
    var idolGlow = glowSprite('#7dff9e', 4, root, 0, 12.2, -17.5);
    // stone heads
    function head(x, z, sc) {
      var g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(sc); root.add(g);
      M(box(), stone, 0, 1.4, 0, 1.6, 2.8, 1.3, g); M(box(), stoneD, 0, 2.95, 0, 1.8, 0.3, 1.5, g); M(box(), stoneD, 0, 1.55, 0.7, 0.3, 0.9, 0.3, g);
      M(box(), basic('#2a3a20'), 0.4, 2.1, 0.66, 0.36, 0.18, 0.05, g); M(box(), basic('#2a3a20'), -0.4, 2.1, 0.66, 0.36, 0.18, 0.05, g); M(box(), stoneD, 0, 0.8, 0.66, 0.8, 0.14, 0.05, g);
      M(box(), moss, 0.5, 2.8, 0.2, 0.7, 0.2, 1.2, g); return g;
    }
    head(-10.5, -3.6, 1.0); head(10.8, -3.4, 0.9);
    // waterfall
    var wt = cv(64, 256, function (g, w, h) { g.fillStyle = '#7fd6ff'; g.fillRect(0, 0, w, h); for (var i = 0; i < 60; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.75)' : 'rgba(180,235,255,0.8)'; g.fillRect((i * 37) % w, (i * 53) % h, 3 + (i % 4), 30 + (i % 5) * 10); } });
    wt.wrapS = wt.wrapT = T.RepeatWrapping; wt.repeat.set(2, 1.5);
    var fall = new T.Mesh(plane(), new T.MeshBasicMaterial({ map: wt, transparent: true, opacity: 0.92 })); fall.position.set(-19, 8, -12); fall.scale.set(6, 17, 1); root.add(fall);
    M(box(), stoneD, -19, 17, -12.6, 9, 3, 3, root); M(box(), stone, -24, 8, -13, 4, 18, 4, root); M(box(), stone, -14.4, 6, -13, 3, 12, 3, root);
    var pond = new T.Mesh(new T.CircleGeometry(1, 30), new T.MeshLambertMaterial({ color: '#3fb8e0', emissive: '#0a4a6a' })); pond.rotation.x = -PI / 2; pond.position.set(-18, 0.04, -9); pond.scale.set(6, 3, 1); root.add(pond);
    var foam = []; for (var f = 0; f < 6; f++) foam.push(M(ball(1), lam('#ffffff'), -19 + (f - 2.5) * 1, 0.3, -10.5, 1.0, 0.6, 1.0, root));
    // palms + jungle wall
    function palm(x, z, h) { var g = new T.Group(); g.position.set(x, 0, z); root.add(g); for (var k = 0; k < 5; k++) M(cyl(7), lam(k % 2 ? '#8a5a2a' : '#7a4a22'), Math.sin(k * 0.5) * 0.3, k * h / 5 + h / 10, 0, 0.5 - k * 0.04, h / 5 + 0.05, 0.5 - k * 0.04, g); for (k = 0; k < 7; k++) { var l = M(box(), lam(k % 2 ? '#2fae4a' : '#3fcf5a'), 0, h, 0, 0.6, 0.08, 3.2, g); l.rotation.y = k / 7 * PI * 2; l.rotation.x = 0.35; l.position.x += Math.sin(k / 7 * PI * 2) * 1.4; l.position.z += Math.cos(k / 7 * PI * 2) * 1.4; } M(ball(1), lam('#7a4a22'), 0.25, h - 0.3, 0.2, 0.35, 0.35, 0.35, g); return g; }
    var palms = [palm(-13, -2, 7), palm(13.5, -2.5, 8), palm(-8, -8, 9), palm(9, -9, 8.5), palm(17, 1.5, 6), palm(-16.5, 2, 6.5)];
    var R = rnd(13), bush = [];
    for (var i = 0; i < 44; i++) { var bx = (R() - 0.5) * 60, bz = -5 - R() * 16; if (Math.abs(bx) < 9 && bz > -12) bx += bx < 0 ? -9 : 9; var bs = 1.2 + R() * 2.2; bush.push([bx, bs * 0.4, bz, bs * 1.4, bs, bs * 1.2]); }
    H.instanced(ball(1), lam('#3faa48'), bush, root, ['#2f9a3a', '#3fbf4a', '#4fcf5a', '#2a8a36']);
    var trees = []; for (i = 0; i < 24; i++) { var tx = (R() - 0.5) * 90, tz = -28 - R() * 30; trees.push([tx, 6 + R() * 4, tz, 7 + R() * 5, 9 + R() * 6, 7 + R() * 5]); }
    H.instanced(new T.ConeGeometry(0.5, 1, 7), lam('#2f8a3a'), trees, root, ['#2f8a3a', '#3a9a44', '#267a32']);
    // hanging vines + flowers
    var vines = [];
    for (i = 0; i < 9; i++) { var vx = -12 + i * 3 + R(); var v = new T.Group(); v.position.set(vx, 10, -4 - R() * 2); root.add(v); M(box(), lam('#3a8a2a'), 0, -2, 0, 0.1, 4 + R() * 2, 0.1, v); M(ball(1), lam(i % 2 ? '#ff4f8a' : '#ffd23f'), 0, -4.4, 0, 0.3, 0.3, 0.3, v); vines.push(v); }
    M(box(), lam('#3a8a2a'), 0, 10, -5, 30, 0.3, 0.3, root);
    // torches
    var flames = [];
    [-6.5, 6.5].forEach(function (x) { M(cyl(6), lam('#5a3a1a'), x, 1.2, -3.8, 0.2, 2.4, 0.2, root); M(cyl(8), stoneD, x, 2.5, -3.8, 0.5, 0.3, 0.5, root); var fl = M(cone(6), basic('#ffb020'), x, 2.95, -3.8, 0.4, 0.8, 0.4, root); flames.push(fl); flames.push(glowSprite('#ff9a3d', 2.4, root, x, 2.9, -3.7)); });
    // parrots circling
    var birds = [];
    for (i = 0; i < 3; i++) { var bg = new T.Group(); root.add(bg); M(box(), lam(['#ff4a2e', '#3fa9ff', '#ffd23f'][i]), 0, 0, 0, 0.5, 0.3, 0.3, bg); var wl = M(box(), lam('#2fbf4a'), 0, 0.1, 0.3, 0.3, 0.05, 0.6, bg), wr = M(box(), lam('#2fbf4a'), 0, 0.1, -0.3, 0.3, 0.05, 0.6, bg); birds.push({ g: bg, wl: wl, wr: wr, k: i }); }
    o.update = function (t) {
      wt.offset.y = -t * 0.9; foam.forEach(function (fm, i) { var s = 0.8 + Math.sin(t * 6 + i) * 0.25; fm.scale.set(s, s * 0.6, s); });
      palms.forEach(function (p, i) { p.rotation.z = Math.sin(t * 0.9 + i) * 0.03; });
      vines.forEach(function (v, i) { v.rotation.z = Math.sin(t * 1.1 + i * 0.7) * 0.06; });
      flames.forEach(function (fl, i) { if (fl.isSprite) fl.material.opacity = 0.7 + Math.sin(t * 13 + i) * 0.2; else fl.scale.y = 0.8 + Math.sin(t * 15 + i) * 0.15; });
      idolGlow.material.opacity = 0.5 + Math.sin(t * 2) * 0.3;
      birds.forEach(function (b) { var a = t * 0.4 + b.k * 2.1, r = 14 + b.k * 3; b.g.position.set(Math.cos(a) * r, 9 + b.k * 1.5 + Math.sin(t * 2 + b.k) * 0.5, -14 + Math.sin(a) * 6); b.g.rotation.y = -a - PI / 2; b.wl.rotation.x = Math.sin(t * 14 + b.k) * 0.6; b.wr.rotation.x = -Math.sin(t * 14 + b.k) * 0.6; });
    };
    return o;
  };

  E.check();
})();
