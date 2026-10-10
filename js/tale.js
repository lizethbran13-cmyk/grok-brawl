/* Grok Brawl - BRAWLER TALE (Elite Brawler Pack story mode).
   Story / exploration scenes are full 3D (free third-person movement, jumping, NPCs, collectibles, landmarks);
   every fight is a normal 2.5D Grok Brawl match (mode 'story'). Progress: GB.save.elite.tale. */
(function () {
  'use strict';
  var T = THREE, G = GB.Game, Mdl = GB.Models, E = GB.Elite, A = GB.Audio, I = GB.Input, H = GB.Arenas.H;
  if (!E) return;
  var Tale = GB.Tale = {};
  var $ = function (id) { return document.getElementById(id); };
  var PI = Math.PI;
  var isTouch = document.body.classList.contains('touch');

  /* ---------- the story ---------- */
  var CH = [
    { id: 'docks', name: 'The Sky Docks', rival: 'jett', arena: 'skydocks', music: 0,
      intro: [['', 'A golden invitation floats down from the sky...'], ['', '"THE ELITE TOURNAMENT IS BACK! Win an Elite Crest from each of the 6 champions to earn the legendary ELITE BELT."'], ['volt', 'Whoa, you got one too?! The first champion is JETT. He hangs out at the landing pad on the far end of the docks.'], ['volt', 'Grab the 3 crest shards floating around the docks first. Jett won\u2019t fight anyone without them!']],
      npcs: [['volt', -5, 6, ['Jett once flew a plane through a rainbow. Upside down. Allegedly.', 'Look up! Some shards are on top of the crates. JUMP to reach them!']], ['blaze', 9, -6, ['These airships run on hot air. Kinda like my fire breath!', 'If you get lost, follow the yellow arrow at the top of the screen.']]],
      pre: [['jett', 'Ha! A new challenger! You collected all the shards? Nice flying, rookie.'], ['jett', 'But nobody beats the fastest pilot in the sky. Buckle up!']],
      post: [['jett', 'WHOA. You\u2019re faster than a jet stream! Here, the SKY CREST is yours.'], ['jett', 'Next champion is MAYA in the Jungle Ruins. Watch out for her vines!']] },
    { id: 'jungle', name: 'The Jungle Ruins', rival: 'maya', arena: 'jungle', music: 2,
      intro: [['', 'Deep in the jungle, an ancient temple hums with power...'], ['sakura', 'Welcome to the jungle! MAYA is waiting at the top of the temple steps.'], ['sakura', 'Find the 3 crest shards hidden in the ruins first. One is behind the waterfall pool!']],
      npcs: [['sakura', 6, 8, ['The petals here smell like mangoes. Mmmm.', 'Maya knows every shortcut in this jungle. Every. Single. One.']], ['boulder', -10, 2, ['I tried to climb the temple. I am a rock. Rocks do not climb.', 'Those stone heads are watching you. Just kidding. Maybe.']]],
      pre: [['maya', 'You found all my shards? Not bad... the jungle must like you!'], ['maya', 'Let\u2019s see if you can dodge a Vine Wave!']],
      post: [['maya', 'Wow, you\u2019re wild! The JUNGLE CREST is yours, ranger.'], ['maya', 'KNOX guards the Crystal Caverns. He\u2019s big, but super polite. Say please!']] },
    { id: 'crystal', name: 'The Crystal Caverns', rival: 'knox', arena: 'crystal', music: 4,
      intro: [['', 'Glowing crystals light up the deep, dark caves...'], ['frost', 'Brr! It\u2019s cold down here. Even for me. KNOX stands guard at the giant crystal.'], ['frost', 'The 3 shards are scattered around the caverns. Follow the glow!']],
      npcs: [['frost', 4, 7, ['These crystals are like ice, but sparklier. I\u2019m a little jealous.', 'Knox is a robot, but he gives the best hugs.']], ['glitch', -8, -4, ['Beep boop. My TV face can pick up 400 channels down here. All of them are rocks.', 'Shhh. Listen. The crystals are humming a tune!']]],
      pre: [['knox', 'GREETINGS, CHALLENGER. YOU HAVE COLLECTED ALL THREE SHARDS. VERY GOOD.'], ['knox', 'PLEASE PREPARE FOR... A FRIENDLY ROBOT BATTLE. THANK YOU.']],
      post: [['knox', 'DEFEAT CONFIRMED. YOU ARE VERY STRONG. HERE IS THE CRYSTAL CREST. PLEASE ENJOY.'], ['knox', 'ALERT: SOMEONE HAS BEEN STEALING TROPHIES IN NEON CITY. SUSPECT NAME: SHADE.']] },
    { id: 'city', name: 'Neon City Nights', rival: 'shade', arena: 'rooftop', music: 1,
      intro: [['', 'Neon City never sleeps. And tonight, a shadow is on the move...'], ['nova', 'Psst! SHADE \u201Cborrowed\u201D the Neon Crest! Shade hides on the big rooftop plaza.'], ['nova', 'Shade dropped 3 shards while running away. Find them, then corner that sneaky thief!']],
      npcs: [['nova', -6, 7, ['I\u2019m a ninja too, but I always give things back.', 'Shade isn\u2019t mean. Just... really, really sneaky.']], ['riptide', 10, 4, ['The fountain here has NO sharks in it. Very disappointing.', 'Try jumping on the vending machines. Shards love high places.']]],
      pre: [['shade', 'Heh. You found my shards. Fine, fine. I was going to give the crest back. Probably.'], ['shade', 'Catch me if you can!']],
      post: [['shade', 'Okay, okay, you got me! Here\u2019s the NEON CREST. I only wanted to see it sparkle.'], ['shade', 'Want a tip? CHOMP stomps around Dino Valley. That kid is POWERFUL.']] },
    { id: 'dino', name: 'Dino Valley', rival: 'chomp', arena: 'volcano', music: 3,
      intro: [['', 'Smoke rises from the volcano. The ground shakes. STOMP. STOMP. STOMP.'], ['blaze', 'This valley is HOT. My kind of place! CHOMP is by the giant dino nest.'], ['blaze', 'Grab the 3 shards around the valley. Stay away from the lava streams!']],
      npcs: [['blaze', 8, 8, ['Lava is like a bath for me. Don\u2019t try that at home.', 'Chomp roared so loud once that a volcano got scared.']], ['volt', -10, 6, ['These bones are from a REAL dinosaur! Or a really big chicken.', 'Chomp\u2019s Dino Stomp shakes the whole arena. JUMP right before it lands!']]],
      pre: [['chomp', 'RAWR!!! I\u2019m CHOMP, the scariest dinosaur EVER! ...It\u2019s a costume. But still! RAWR!'], ['chomp', 'If you want the DINO CREST, you gotta beat my DINO STOMP!']],
      post: [['chomp', 'Aww, you won! You\u2019re like a T-Rex! Here\u2019s the DINO CREST!'], ['chomp', 'The last champion is SOL at the Sun Temple. He\u2019s really calm. Like, super calm.']] },
    { id: 'temple', name: 'The Sun Temple', rival: 'sol', arena: 'dojo', music: 2, finale: true,
      intro: [['', 'High above the clouds, the Sun Temple shines at sunset...'], ['sakura', 'This is it! The final champion, SOL, meditates at the sun altar.'], ['sakura', 'Find the last 3 shards around the temple. We\u2019re all cheering for you!']],
      npcs: [['sakura', 6, 6, ['I came all this way just to cheer. GO GO GO!', 'Everyone you beat is here watching. No pressure!']], ['jett', -7, 5, ['Flew everyone here myself. You\u2019re welcome.', 'Sol\u2019s Solar Flare is like my Jet Stream, but sunnier.']], ['knox', 10, -4, ['I AM CHEERING. YAY. THAT WAS ME CHEERING.', 'THE SUN IS VERY BRIGHT. PLEASE WEAR SUNSCREEN.']]],
      pre: [['sol', 'Breathe in... breathe out. You have come far, young brawler.'], ['sol', 'Show me your inner sunshine.']],
      post: [['sol', 'Your light is bright. The SUN CREST is yours.'], ['', 'Suddenly the temple goes dark... A giant golden figure appears!'], ['prime', 'SIX CRESTS? IMPRESSIVE. BUT THE ELITE BELT BELONGS TO GROK PRIME. FACE ME!']],
      boss: { id: 'prime', arena: 'hangar', skin: 'gold' },
      end: [['prime', 'IMPOSSIBLE... YOU ARE A TRUE ELITE BRAWLER.'], ['', 'You earned the ELITE BELT! \u2B50 Everyone cheers! The end... for now.']] }
  ];
  Tale.CHAPTERS = CH;
  var sv = E.save.tale;

  /* ---------- 3D scene ---------- */
  var S = null; // current scene state
  var lam = H.lam, basic = H.basic, box = H.box, cyl = H.cyl, cone = H.cone, ball = H.ball, M = H.M, cv = H.cv;
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function glow(c, sz, p, x, y, z) { return E.glowSprite(c, sz, p, x, y, z); }
  var THEMES = {
    docks: { sky: ['#2f6fd0', '#6fb0ff', '#cfe6ff', '#ffd1a1'], fog: ['#cfe2ff', 40, 120], hemi: ['#e8f2ff', '#6a8aa8', 1.0], sun: ['#fff1d6', 0.8], ground: '#3a8ad8', R: 30 },
    jungle: { sky: ['#5ec4ff', '#9fe2ff', '#d8f6e0', '#fff1c0'], fog: ['#c8ecd0', 30, 95], hemi: ['#fff8e0', '#3a6a3a', 0.9], sun: ['#fff1c8', 0.75], ground: '#4f963e', R: 30 },
    crystal: { sky: ['#030208', '#0a0620', '#170c38', '#24104a'], fog: ['#120830', 18, 70], hemi: ['#9a8aff', '#1a0a30', 0.8], sun: ['#bff4ff', 0.55], ground: '#2e2848', R: 28 },
    city: { sky: ['#05021a', '#1b0b4a', '#4a1a8a', '#ff3fd0'], fog: ['#2a0f5a', 30, 95], hemi: ['#b9a6ff', '#3a1060', 0.9], sun: ['#ff9ae8', 0.7], ground: '#2a2638', R: 30 },
    dino: { sky: ['#1a0505', '#4a120a', '#a8381a', '#ffb04a'], fog: ['#5a2a1a', 30, 95], hemi: ['#ffd0a0', '#4a2010', 0.95], sun: ['#ffc080', 0.8], ground: '#5a4a3a', R: 30 },
    temple: { sky: ['#3a1a6a', '#ff6a8a', '#ffb36a', '#ffe9a8'], fog: ['#ffc8a0', 35, 110], hemi: ['#ffe8d0', '#7a4a3a', 0.8], sun: ['#ffd090', 0.7], ground: '#c99a62', R: 30 }
  };
  function texGround(theme) {
    return cv(256, 256, function (g, w, h) {
      var R = rnd(theme.length * 7 + 3), base = THEMES[theme].ground;
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 220; i++) { g.fillStyle = 'rgba(' + (i % 2 ? '255,255,255,0.06' : '0,0,0,0.08') + ')'; g.beginPath(); g.arc(R() * w, R() * h, 2 + R() * 10, 0, 7); g.fill(); }
      if (theme === 'city') { g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 3; for (var x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } }
      if (theme === 'temple') { g.strokeStyle = 'rgba(120,80,40,0.25)'; g.lineWidth = 2; for (x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } }
    });
  }
  function solid(x, z, r) { S.solids.push({ x: x, z: z, r: r }); }
  function pad(x, z, r, h, col, round) { var m = round ? M(cyl(16), lam(col), x, h / 2, z, r * 2, h, r * 2, S.root) : M(box(), lam(col), x, h / 2, z, r * 1.8, h, r * 1.8, S.root); S.pads.push({ x: x, z: z, r: r * (round ? 1 : 0.92), h: h, sq: !round }); return m; }
  function tree(x, z, h, c1, c2, kind) {
    var g = new T.Group(); g.position.set(x, 0, z); S.root.add(g);
    if (kind === 'palm') {
      for (var k = 0; k < 5; k++) M(cyl(7), lam(k % 2 ? '#8a5a2a' : '#7a4a22'), Math.sin(k * 0.5) * 0.3, k * h / 5 + h / 10, 0, 0.5 - k * 0.04, h / 5 + 0.05, 0.5 - k * 0.04, g);
      for (k = 0; k < 7; k++) { var l = M(box(), lam(k % 2 ? c1 : c2), Math.sin(k / 7 * PI * 2) * 1.3, h, Math.cos(k / 7 * PI * 2) * 1.3, 0.6, 0.08, 3, g); l.rotation.y = k / 7 * PI * 2; l.rotation.x = 0.35; }
    } else if (kind === 'fern') {
      M(ball(1), lam(c1), 0, 0.45 * h, 0, 1.6 * h, 1.1 * h, 1.5 * h, g); M(ball(1), lam(c2), 0.55 * h, 0.35 * h, 0.2 * h, 1.1 * h, 0.8 * h, 1.1 * h, g); M(ball(1), lam(c2), -0.5 * h, 0.32 * h, -0.15 * h, 1.0 * h, 0.75 * h, 1.0 * h, g);
      if (h > 1.2) M(ball(1), lam('#ff4f8a'), 0.2 * h, 0.95 * h, 0.4 * h, 0.22, 0.22, 0.22, g);
    } else {
      M(cyl(7), lam('#7a4a22'), 0, h * 0.25, 0, 0.5, h * 0.5, 0.5, g); M(cone(8), lam(c1), 0, h * 0.62, 0, h * 0.55, h * 0.6, h * 0.55, g); M(cone(8), lam(c2), 0, h * 0.9, 0, h * 0.4, h * 0.45, h * 0.4, g);
    }
    solid(x, z, kind === 'fern' ? 0 : 0.6); return g;
  }
  function crystal(x, z, s, col) {
    var g = new T.Group(); g.position.set(x, 0, z); S.root.add(g); var R = rnd(Math.round(x * 100 + z * 7) + 99);
    var fresh = !S.cmat[col], mat = S.cmat[col] || (S.cmat[col] = new T.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, flatShading: true }));
    var og = S.octG || (S.octG = new T.OctahedronGeometry(0.5, 0));
    for (var k = 0; k < 5; k++) { var c = new T.Mesh(og, mat); var hh = s * (0.8 + R() * 1.2); c.scale.set(s * 0.35, hh, s * 0.35); c.position.set((R() - 0.5) * s * 0.9, hh * 0.45, (R() - 0.5) * s * 0.9); c.rotation.set((R() - 0.5) * 0.6, R() * PI, (R() - 0.5) * 0.6); g.add(c); }
    var gs = glow(col, s * 3, S.root, x, s * 0.8, z); S.pulse.push(fresh ? { m: mat, s: gs } : { s: gs, k: S.pulse.length }); solid(x, z, s * 0.55); return g;
  }
  function building(x, z, w, d, h, col, lit) {
    var wt = cv(64, 128, function (g, W, Hh) { g.fillStyle = '#0d0820'; g.fillRect(0, 0, W, Hh); var R = rnd(Math.round(x * 13 + z)); for (var y = 4; y < Hh; y += 10) for (var xx = 4; xx < W; xx += 10) if (R() < 0.55) { g.fillStyle = lit[(R() * lit.length) | 0]; g.fillRect(xx, y, 5, 6); } });
    wt.wrapS = wt.wrapT = T.RepeatWrapping; wt.repeat.set(Math.max(1, w / 4), Math.max(1, h / 6));
    var m = new T.Mesh(box(), [lam(col), lam(col), lam(col), lam(col), new T.MeshLambertMaterial({ map: wt, emissive: '#ffffff', emissiveMap: wt, emissiveIntensity: 0.6 }), new T.MeshLambertMaterial({ map: wt, emissive: '#ffffff', emissiveMap: wt, emissiveIntensity: 0.6 })]);
    m.position.set(x, h / 2, z); m.scale.set(w, h, d); S.root.add(m);
    M(box(), lam('#1a1430'), x, h + 0.3, z, w + 0.3, 0.6, d + 0.3, S.root);
    solid(x, z, Math.max(w, d) * 0.62); return m;
  }
  function label(txt, col) { var c = document.createElement('canvas'); c.width = 256; c.height = 64; var g = c.getContext('2d'); g.font = '900 30px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; var tw = g.measureText(txt).width + 28; g.fillStyle = 'rgba(8,4,24,0.75)'; g.fillRect(128 - tw / 2, 8, tw, 48); g.fillStyle = col; g.fillRect(128 - tw / 2, 50, tw, 5); g.fillStyle = '#fff'; g.fillText(txt, 128, 32); var s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false })); s.scale.set(2.2, 0.55, 1); return s; }

  function buildWorld(ch) {
    var th = THEMES[ch.id], root = new T.Group(), sc = new T.Scene();
    S = { cmat: {}, ch: ch, scene: sc, root: root, solids: [], pads: [], sway: [], pulse: [], spin: [], shards: [], npcs: [], upd: [], R: th.R, t: 0 };
    sc.add(root);
    sc.background = H.skyTex(th.sky, ch.id === 'city' || ch.id === 'crystal' ? 160 : 0); sc.fog = new T.Fog(th.fog[0], th.fog[1], th.fog[2]);
    root.add(H.lights(root, th.hemi[0], th.hemi[1], th.hemi[2], th.sun[0], th.sun[1], -8, 16, 10));
    var gt = texGround(ch.id); gt.wrapS = gt.wrapT = T.RepeatWrapping; gt.repeat.set(12, 12);
    var gnd = new T.Mesh(new T.CircleGeometry(th.R + 30, 48), new T.MeshLambertMaterial({ map: gt })); gnd.rotation.x = -PI / 2; root.add(gnd);
    var R = rnd(ch.id.charCodeAt(0) * 31 + 7), i, a, x, z;
    function ring(n, r0, r1, fn) { for (var k = 0; k < n; k++) { var aa = R() * PI * 2, rr = r0 + R() * (r1 - r0); fn(Math.cos(aa) * rr, Math.sin(aa) * rr, k); } }
    if (ch.id === 'docks') {
      var sea = new T.Mesh(new T.CircleGeometry(160, 40), new T.MeshLambertMaterial({ color: '#4aa8ff', emissive: '#0a3a7a', transparent: true, opacity: 0.95 })); sea.rotation.x = -PI / 2; sea.position.y = -0.6; root.add(sea); gnd.visible = false;
      var plank = cv(128, 128, function (g, w, h) { for (var q = 0; q < 4; q++) { g.fillStyle = q % 2 ? '#8e5f34' : '#a06c3c'; g.fillRect(0, q * 32, w, 32); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, q * 32 + 30, w, 2); } });
      plank.wrapS = plank.wrapT = T.RepeatWrapping; plank.repeat.set(10, 10);
      var deck = new T.Mesh(new T.CircleGeometry(th.R + 1, 40), new T.MeshLambertMaterial({ map: plank })); deck.rotation.x = -PI / 2; deck.position.y = 0.01; root.add(deck);
      M(cyl(40), lam('#7a4a22'), 0, -0.35, 0, (th.R + 1) * 2, 0.7, (th.R + 1) * 2, root);
      for (i = 0; i < 28; i++) { a = i / 28 * PI * 2; M(cyl(6), lam('#7a4a22'), Math.cos(a) * (th.R + 0.6), 0.6, Math.sin(a) * (th.R + 0.6), 0.25, 1.2, 0.25, root); }
      var cl = []; for (i = 0; i < 70; i++) { a = R() * PI * 2; var rr = 50 + R() * 70; cl.push([Math.cos(a) * rr, -2 + R() * 6, Math.sin(a) * rr, 6 + R() * 8, 3 + R() * 3, 6 + R() * 8]); }
      H.instanced(ball(1), lam('#ffffff'), cl, root, ['#ffffff', '#f2f6ff', '#ffe8d8']);
      [[-12, -8, 1.2, 1.4], [-10.6, -8.2, 1.0, 1.2], [8, 10, 1.2, 1.4], [14, -12, 1.4, 2.6], [-16, 12, 1.2, 1.2]].forEach(function (p) { pad(p[0], p[1], p[2], p[3], '#b98245'); });
      // landing pad
      M(cyl(32), lam('#3a3a4a'), 0, 0.1, -20, 12, 0.2, 12, root); M(cyl(32), basic('#ffe14d'), 0, 0.21, -20, 9, 0.02, 9, root); M(cyl(32), lam('#3a3a4a'), 0, 0.22, -20, 8.2, 0.03, 8.2, root);
      var bigH = H.textTex('E', 128, 128, '#ffe14d'); var hp = new T.Mesh(H.plane(), new T.MeshBasicMaterial({ map: bigH, transparent: true })); hp.rotation.x = -PI / 2; hp.position.set(0, 0.25, -20); hp.scale.set(5, 5, 1); root.add(hp);
      // plane on the pad
      var pl = new T.Group(); pl.position.set(4.5, 0, -22); pl.rotation.y = 0.6; root.add(pl);
      M(cyl(10), lam('#ff8c1a'), 0, 1.2, 0, 1.2, 5, 1.2, pl).rotation.x = PI / 2; M(cone(10), lam('#3fa9ff'), 0, 1.2, 2.9, 1.1, 1, 1.1, pl).rotation.x = PI / 2;
      M(box(), lam('#ffd23f'), 0, 1.3, 0.4, 7, 0.15, 1.2, pl); M(box(), lam('#ffd23f'), 0, 1.6, -2.2, 2.6, 0.12, 0.7, pl); M(box(), lam('#ff8c1a'), 0, 2.2, -2.2, 0.12, 1.2, 0.8, pl);
      var prop = M(box(), lam('#2a2a2a'), 0, 1.2, 3.45, 2.4, 0.18, 0.06, pl); prop.userData.dyn = 1; S.spin.push({ o: prop, ax: 'z', sp: 14 }); solid(4.5, -22, 2.4);
      // airship
      var as = new T.Group(); as.userData.dyn = 1; as.position.set(-20, 14, -30); root.add(as); M(ball(2), lam('#ff4fd8'), 0, 0, 0, 14, 5, 5, as); M(box(), lam('#7a4a22'), 0, -3.6, 0, 4, 1.2, 2, as);
      S.upd.push(function (t) { as.position.x = -20 + Math.sin(t * 0.08) * 14; sea.material.emissiveIntensity = 0.8 + Math.sin(t) * 0.1; });
      // hot air balloons
      [[18, 8, 12, '#ff4a2e'], [-26, 10, 6, '#ffd23f'], [12, 12, -36, '#2fbf4a']].forEach(function (p, k) { var g = new T.Group(); g.userData.dyn = 1; g.position.set(p[0], p[1], p[2]); root.add(g); M(ball(2), lam(p[3]), 0, 2, 0, 3.4, 3.8, 3.4, g); M(box(), lam('#8a5a2a'), 0, -0.8, 0, 0.9, 0.7, 0.9, g); S.upd.push(function (t) { g.position.y = p[1] + Math.sin(t * 0.6 + k) * 0.6; }); });
      // crates and barrels
      ring(14, 6, 26, function (x, z, k) { if (Math.abs(x) < 7 && z < -13) return; if (k % 2) { M(box(), lam('#b98245'), x, 0.5, z, 1, 1, 1, root); solid(x, z, 0.75); } else { M(cyl(10), lam('#8a5a2a'), x, 0.55, z, 0.9, 1.1, 0.9, root); solid(x, z, 0.55); } });
      // lighthouse
      var lh = new T.Group(); lh.position.set(24, 0, 10); root.add(lh); M(cyl(12), lam('#ffffff'), 0, 4, 0, 2.6, 8, 2.6, lh); M(cyl(12), lam('#e8332a'), 0, 2.5, 0, 2.7, 1, 2.7, lh); M(cyl(12), lam('#e8332a'), 0, 5.5, 0, 2.7, 1, 2.7, lh); M(cone(12), lam('#e8332a'), 0, 9.2, 0, 3, 1.6, 3, lh); var lhg = glow('#fff1a0', 5, lh, 0, 8.3, 0); solid(24, 10, 1.6);
      S.upd.push(function (t) { lhg.material.opacity = 0.6 + Math.sin(t * 3) * 0.3; });
      S.rivalAt = [0, -19]; S.shardAt = [[-12, -8, 1.4], [14, -12, 2.6], [-18, 6, 0]];
    } else if (ch.id === 'jungle') {
      ring(40, 12, 34, function (x, z, k) { tree(x, z, 6 + R() * 4, '#2fae4a', '#3fcf5a', k % 3 ? 'palm' : 'tree'); });
      ring(40, 5, 30, function (x, z) { tree(x, z, 1, '#3faa48', '#4fcf5a', 'fern'); });
      for (var s = 0; s < 5; s++) { var w = 16 - s * 2.8; M(box(), lam(s % 2 ? '#8a8264' : '#a8a07c'), 0, 0.7 + s * 1.4, -22, w, 1.4, w, root); }
      for (s = 0; s < 6; s++) pad(0, -13.6 - s * 0.9, 1.6, 0.6 + s * 0.6, '#9a9478');
      S.pads.push({ x: 0, z: -22, r: 7.5, h: 1.4, sq: true }); S.pads.push({ x: 0, z: -22, r: 6.2, h: 2.8, sq: true }); S.pads.push({ x: 0, z: -22, r: 4.8, h: 4.2, sq: true }); S.pads.push({ x: 0, z: -22, r: 3.4, h: 5.6, sq: true }); S.pads.push({ x: 0, z: -22, r: 2.0, h: 7.0, sq: true });
      var idol = glow('#7dff9e', 4, root, 0, 8.4, -22); M(box(), lam('#ffd23f'), 0, 7.6, -22, 0.8, 1.2, 0.8, root);
      // waterfall + pool
      var wt = cv(64, 256, function (g, w, h) { g.fillStyle = '#7fd6ff'; g.fillRect(0, 0, w, h); for (var q = 0; q < 60; q++) { g.fillStyle = q % 2 ? 'rgba(255,255,255,0.75)' : 'rgba(180,235,255,0.8)'; g.fillRect((q * 37) % w, (q * 53) % h, 3 + (q % 4), 30 + (q % 5) * 10); } });
      wt.wrapS = wt.wrapT = T.RepeatWrapping; var fall = new T.Mesh(H.plane(), new T.MeshBasicMaterial({ map: wt })); fall.position.set(18, 5, -14); fall.rotation.y = -0.7; fall.scale.set(5, 10, 1); root.add(fall);
      M(box(), lam('#8a8264'), 19.8, 5, -16, 4, 11, 4, root); solid(19.8, -16, 2.6);
      var pool = new T.Mesh(new T.CircleGeometry(4, 24), new T.MeshLambertMaterial({ color: '#3fb8e0', emissive: '#0a4a6a' })); pool.rotation.x = -PI / 2; pool.position.set(15, 0.04, -10); root.add(pool);
      S.upd.push(function (t) { wt.offset.y = -t * 0.9; idol.material.opacity = 0.5 + Math.sin(t * 2) * 0.3; });
      [[-9, -6], [9, -6], [-14, 6], [12, 10]].forEach(function (p) { M(box(), lam('#a8a07c'), p[0], 1.5, p[1], 1.2, 3, 1.2, root); M(box(), lam('#4f9a3a'), p[0], 3.1, p[1], 1.4, 0.2, 1.4, root); solid(p[0], p[1], 0.9); });
      pad(-16, -4, 1.2, 1.8, '#a8a07c');
      S.rivalAt = [0, -22, 7.0]; S.shardAt = [[15, -10, 0], [-16, -4, 1.8], [-6, 16, 0]];
    } else if (ch.id === 'crystal') {
      var COLS = ['#3ff0ff', '#ff4fd8', '#9d6bff', '#7dff9e', '#ffe14d'];
      ring(30, 9, 30, function (x, z, k) { crystal(x, z, 1 + R() * 2.2, COLS[k % 5]); });
      var rocks = []; for (i = 0; i < 40; i++) { a = i / 40 * PI * 2; rocks.push([Math.cos(a) * (th.R + 3), 4, Math.sin(a) * (th.R + 3), 8, 10 + R() * 8, 8]); }
      H.instanced(new T.DodecahedronGeometry(0.5, 0), lam('#3a3258'), rocks, root, ['#3a3258', '#2e2848', '#463c66']);
      var st = []; for (i = 0; i < 70; i++) { a = R() * PI * 2; var r2 = R() * th.R; st.push([Math.cos(a) * r2, 16, Math.sin(a) * r2, 1 + R() * 1.4, 3 + R() * 5, 1 + R() * 1.4]); }
      var sg = new T.ConeGeometry(0.5, 1, 6); sg.rotateX(PI); H.instanced(sg, lam('#2e2848'), st, root);
      var big = crystal(0, -18, 4.5, '#3ff0ff'); big.userData.dyn = 1;
      S.upd.push(function (t) { big.rotation.y = t * 0.2; });
      [[-6, 8, 1.2, 1.6], [7, -6, 1.0, 1.2], [8.6, -7.6, 1.0, 2.4], [-14, -10, 1.4, 1.4]].forEach(function (p) { pad(p[0], p[1], p[2], p[3], '#463c66', true); });
      for (i = 0; i < 5; i++) { var pg = new T.Mesh(new T.CircleGeometry(2 + R() * 2, 20), new T.MeshBasicMaterial({ color: COLS[i], transparent: true, opacity: 0.5 })); pg.rotation.x = -PI / 2; a = R() * PI * 2; pg.position.set(Math.cos(a) * (6 + R() * 16), 0.03, Math.sin(a) * (6 + R() * 16)); root.add(pg); }
      var pl1 = new T.PointLight('#3ff0ff', 1.4, 30); pl1.position.set(0, 6, -16); root.add(pl1);
      S.rivalAt = [0, -13]; S.shardAt = [[8.6, -7.6, 2.4], [-14, -10, 1.4], [16, 12, 0]];
    } else if (ch.id === 'city') {
      var lit = ['#ffe14d', '#3ff0ff', '#ff4fd8', '#ffffff'];
      [[-22, -14, 8, 8, 18, '#2a2050'], [-24, 4, 7, 9, 12, '#3a2a68'], [-18, 20, 9, 7, 22, '#20183e'], [22, -16, 9, 8, 24, '#2a2050'], [24, 2, 8, 8, 14, '#3a2a68'], [18, 20, 8, 9, 18, '#20183e'], [-6, 26, 8, 6, 16, '#2a2050'], [8, 27, 8, 6, 20, '#3a2a68']].forEach(function (b) { building(b[0], b[1], b[2], b[3], b[4], b[5], lit); });
      ['GROK', 'BRAWL', 'NEON', 'ELITE'].forEach(function (t2, k) { var sgn = H.sign(t2, 5, 1.4, ['#ff4fd8', '#3ff0ff', '#ffe14d', '#7dff9e'][k], null, root, [-18, 18, -22, 22][k], 8 + k * 2, [-9.9, -11.4, 5, 7][k]); sgn.rotation.y = [0.0, 0, PI / 2, -PI / 2][k]; S.pulse.push({ sgn: sgn }); });
      // plaza + fountain
      M(cyl(24), lam('#3a3550'), 0, 0.05, 0, 14, 0.1, 14, root); var ft = M(cyl(16), lam('#5a5670'), 0, 0.5, 4, 3.4, 1, 3.4, root); solid(0, 4, 1.8); var water = M(cyl(16), basic('#3ff0ff'), 0, 1.02, 4, 2.8, 0.05, 2.8, root);
      var spray = M(cone(10), H.add('#9ae8ff'), 0, 2.2, 4, 0.8, 2.4, 0.8, root); spray.userData.dyn = 1;
      S.upd.push(function (t) { spray.scale.y = 2.2 + Math.sin(t * 6) * 0.3; });
      // vending machines + lamps
      [[-8, -6], [-6.8, -6], [8, 8]].forEach(function (p, k) { M(box(), lam(['#e8332a', '#2a8ae8', '#ffd23f'][k]), p[0], 1, p[1], 1.1, 2, 0.9, root); M(box(), basic('#bff4ff'), p[0], 1.3, p[1] + 0.46, 0.8, 0.9, 0.02, root); S.pads.push({ x: p[0], z: p[1], r: 0.6, h: 2, sq: true }); });
      for (i = 0; i < 10; i++) { a = i / 10 * PI * 2; x = Math.cos(a) * 12; z = Math.sin(a) * 12; M(cyl(6), lam('#2a263a'), x, 2, z, 0.18, 4, 0.18, root); M(box(), basic('#ffe9a8'), x, 4.1, z, 0.5, 0.25, 0.5, root); glow('#ffd27a', 2.4, root, x, 4, z); solid(x, z, 0.3); }
      // rooftop plaza (Shade's hideout): stairs up to a platform
      for (s = 0; s < 6; s++) pad(-3 + s * 0, -10 - s * 1.0, 1.4, 0.5 + s * 0.5, '#5a5670');
      S.pads.push({ x: 0, z: -19, r: 4.5, h: 3.4, sq: true }); M(box(), lam('#3a3550'), 0, 1.7, -19, 8.4, 3.4, 8.4, root); M(box(), basic('#ff4fd8'), 0, 3.42, -19, 8.6, 0.06, 8.6, root);
      S.rivalAt = [0, -19, 3.4]; S.shardAt = [[-6.8, -6, 2], [8, 8, 2], [-14, 12, 0]];
    } else if (ch.id === 'dino') {
      var vol = new T.Group(); vol.position.set(0, 0, -40); root.add(vol); M(cone(12), lam('#4a3a32'), 0, 9, 0, 40, 18, 40, vol); M(cyl(12), basic('#ff7a1a'), 0, 18.1, 0, 7, 0.4, 7, vol); var vg = glow('#ff7a1a', 26, vol, 0, 19, 0);
      S.upd.push(function (t) { vg.material.opacity = 0.5 + Math.sin(t * 2) * 0.2; });
      ring(26, 10, 30, function (x, z, k) { tree(x, z, k % 2 ? 2 : 1.4, '#3f8a2a', '#5aaa3a', 'fern'); });
      ring(16, 12, 30, function (x, z) { tree(x, z, 7 + R() * 3, '#2f7a2a', '#3f9a34', 'palm'); });
      // lava streams
      var lavaT = cv(128, 128, function (g, w, h) { g.fillStyle = '#ff4a00'; g.fillRect(0, 0, w, h); for (var q = 0; q < 40; q++) { g.fillStyle = ['#ffb000', '#ff7a00', '#ffe14d'][q % 3]; g.beginPath(); g.arc((q * 41) % w, (q * 67) % h, 4 + q % 9, 0, 7); g.fill(); } }); lavaT.wrapS = lavaT.wrapT = T.RepeatWrapping;
      [[16, 0, 0.5], [-17, 6, -0.4]].forEach(function (p) { var lv = new T.Mesh(H.plane(), new T.MeshBasicMaterial({ map: lavaT })); lv.rotation.x = -PI / 2; lv.rotation.z = p[2]; lv.position.set(p[0], 0.04, p[1]); lv.scale.set(3, 30, 1); root.add(lv); });
      S.upd.push(function (t) { lavaT.offset.y = t * 0.15; });
      // dino skeleton (bones)
      var sk = new T.Group(); sk.position.set(-10, 0, -8); sk.rotation.y = 0.5; root.add(sk);
      for (i = 0; i < 9; i++) { var rib = M(H.geo('torus', function () { return new T.TorusGeometry(1, 0.12, 6, 14, PI); }), lam('#f2ead8'), i * 0.9 - 3.6, 0.1, 0, 1.6 - Math.abs(i - 4) * 0.15, 1.8 - Math.abs(i - 4) * 0.18, 1, sk); rib.rotation.y = PI / 2; }
      M(box(), lam('#f2ead8'), 0, 1.8, 0, 9, 0.3, 0.3, sk); M(box(), lam('#f2ead8'), 5.4, 2.2, 0, 1.8, 1.0, 1.0, sk); solid(-10, -8, 3.2);
      // nest
      var nest = M(cyl(18), lam('#8a6a3a'), 0, 0.5, -16, 9, 1, 9, root); S.pads.push({ x: 0, z: -16, r: 4.4, h: 1, sq: false });
      [[-1, -16.6, '#ffe9a8'], [1, -15.4, '#c4ff7a'], [0.6, -17.2, '#ffb36a']].forEach(function (e2) { M(ball(1), lam(e2[2]), e2[0], 1.6, e2[1], 1, 1.3, 1, root); });
      [[-6, 10, 1.2, 1.6], [6, -4, 1.4, 1.2], [7.6, -5.6, 1.2, 2.4]].forEach(function (p) { pad(p[0], p[1], p[2], p[3], '#6a5a4a', true); });
      S.rivalAt = [0, -12]; S.shardAt = [[7.6, -5.6, 2.4], [-6, 10, 1.6], [20, 14, 0]];
    } else if (ch.id === 'temple') {
      var sunD = M(cyl(32), basic('#ffd27a'), 0, 18, -70, 30, 0.2, 30, root); sunD.rotation.x = PI / 2; glow('#ffb36a', 70, root, 0, 18, -68);
      for (s = 0; s < 4; s++) { M(box(), lam(s % 2 ? '#d8b070' : '#e8c890'), 0, 0.6 + s * 1.2, -20, 18 - s * 3.6, 1.2, 12 - s * 2.4, root); S.pads.push({ x: 0, z: -20, r: 8.6 - s * 1.8, h: 1.2 + s * 1.2, sq: true }); }
      for (s = 0; s < 5; s++) pad(0, -12.6 - s * 0.9, 1.8, 0.45 + s * 0.85, '#e0c080');
      M(box(), lam('#ffd23f'), 0, 5.5, -20, 2.4, 0.4, 2.4, root); var altar = glow('#ffe14d', 6, root, 0, 6.4, -20);
      for (i = 0; i < 12; i++) { a = i / 12 * PI * 2; x = Math.cos(a) * 18; z = Math.sin(a) * 18 + 2; if (z < -10 || (z > 8 && Math.abs(x) < 10)) continue; M(cyl(10), lam('#f2dca8'), x, 3, z, 1.2, 6, 1.2, root); M(box(), lam('#d8b070'), x, 6.2, z, 1.8, 0.4, 1.8, root); solid(x, z, 0.8); }
      ring(12, 14, 30, function (x, z) { tree(x, z, 6 + R() * 3, '#4fae4a', '#6fcf5a', 'palm'); });
      // lanterns floating up
      var lans = []; for (i = 0; i < 16; i++) { var ln = M(box(), basic(i % 2 ? '#ff9a3d' : '#ffd23f'), (R() - 0.5) * 50, 2 + R() * 14, -10 - R() * 30, 0.5, 0.7, 0.5, root); ln.userData.dyn = 1; lans.push(ln); }
      S.upd.push(function (t) { lans.forEach(function (l, k) { l.position.y = 2 + ((t * 0.5 + k * 1.3) % 16); }); altar.material.opacity = 0.6 + Math.sin(t * 2) * 0.3; });
      [[-8, 8, 1.2, 1.4], [10, 6, 1.0, 1.0], [11.2, 7.8, 1.0, 2.0]].forEach(function (p) { pad(p[0], p[1], p[2], p[3], '#e0c080'); });
      S.rivalAt = [0, -20, 4.8]; S.shardAt = [[11.2, 7.8, 2.0], [-8, 8, 1.4], [-18, -6, 0]];
    }
    bake(root);
    // crest shards (3D spinning stars)
    var starG = (function () { var sh = new T.Shape(); for (var k = 0; k < 10; k++) { var rr = k % 2 ? 0.22 : 0.5, aa = k / 10 * PI * 2 + PI / 2; if (k) sh.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); else sh.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } var g = new T.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 1 }); g.center(); return g; })();
    var starM = new T.MeshLambertMaterial({ color: '#ffd23f', emissive: '#ff9a1f', emissiveIntensity: 0.6 });
    S.shardAt.forEach(function (p, k) {
      var g = new T.Group(); g.position.set(p[0], (p[2] || 0) + 1.2, p[1]); sc.add(g);
      var st2 = new T.Mesh(starG, starM); st2.scale.setScalar(1.3); g.add(st2); var gl = glow('#ffe14d', 2.4, g, 0, 0, 0);
      S.shards.push({ g: g, star: st2, gl: gl, x: p[0], z: p[1], y: (p[2] || 0), got: false, k: k });
    });
    // NPCs + rival (real fighter rigs, same toon models as the fights)
    function npc(id, x, z, y, lines, rival) {
      var def = GB.fighter(id), r = Mdl.build(def); r.root.position.set(x, y || 0, z); sc.add(r.root);
      var tag = label(rival ? def.name + ' \u2B50' : def.name, def.color); tag.position.set(x, (y || 0) + r.height + 0.45, z); sc.add(tag);
      var mk = null;
      if (rival) { mk = new T.Group(); M(box(), basic('#ffe14d'), 0, 0.35, 0, 0.18, 0.55, 0.18, mk); M(ball(1), basic('#ffe14d'), 0, -0.12, 0, 0.2, 0.2, 0.2, mk); mk.position.set(x, (y || 0) + r.height + 1.1, z); sc.add(mk); }
      var n = { id: id, rig: r, x: x, z: z, y: y || 0, lines: lines, li: 0, rival: !!rival, tag: tag, mk: mk, face: Math.atan2(-x, -z) };
      S.npcs.push(n); if (!rival) solid(x, z, 0.7); return n;
    }
    ch.npcs.forEach(function (n) { npc(n[0], n[1], n[2], 0, n[3]); });
    S.rival = npc(ch.rival, S.rivalAt[0], S.rivalAt[1], S.rivalAt[2] || 0, null, true);
    // player
    S.pl = { x: 0, z: 14, y: 0, vy: 0, yaw: PI, rig: Mdl.build(GB.skinned(GB.fighter(Tale.hero), Tale.skin)), moving: 0, ground: 0 };
    sc.add(S.pl.rig.root);
    S.cam = new T.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400); S.camYaw = 0; S.camP = new T.Vector3(0, 6, 22);
    // player marker ring
    S.ring = new T.Mesh(new T.RingGeometry(0.7, 0.85, 28), new T.MeshBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false })); S.ring.rotation.x = -PI / 2; sc.add(S.ring);
    return S;
  }
  // static scenery: every plain mesh sharing a geometry + material becomes one InstancedMesh (few draw calls on phones)
  function bake(root) {
    root.updateMatrixWorld(true);
    var buckets = {}, kill = [];
    (function walk(o, dyn) {
      dyn = dyn || !!o.userData.dyn;
      o.children.forEach(function (c) { walk(c, dyn); });
      if (dyn || !o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.map && o.material.map.isCanvasTexture && o.material.transparent) return;
      var k = o.geometry.uuid + '|' + o.material.uuid; (buckets[k] || (buckets[k] = { g: o.geometry, m: o.material, l: [] })).l.push(o.matrixWorld.clone()); kill.push(o);
    })(root, false);
    kill.forEach(function (o) { o.parent.remove(o); });
    var n = 0;
    for (var k in buckets) { var b = buckets[k]; if (b.l.length === 1) { var single = new T.Mesh(b.g, b.m); single.matrixAutoUpdate = false; single.matrix.copy(b.l[0]); root.add(single); continue; } var im = new T.InstancedMesh(b.g, b.m, b.l.length); b.l.forEach(function (mtx, i) { im.setMatrixAt(i, mtx); }); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; root.add(im); n++; }
    return n;
  }
  function disposeWorld() {
    if (!S) return;
    S.scene.traverse(function (o) { if (o.isMesh || o.isSprite) { if (o.geometry && !o.isSprite) o.geometry.dispose(); var ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(function (m) { if (m && m !== Mdl.outlineMaterial() && !m.__keep) { if (m.map && m.map.isCanvasTexture && o.isSprite) m.map.dispose(); } }); } });
    S = null;
  }

  /* ---------- physics + input ---------- */
  var tk = { up: false, down: false, left: false, right: false }, tj = { id: null, cx: 0, cy: 0, x: 0, y: 0 }, drag = { id: null, x: 0 }, jumpQ = false, talkQ = false;
  function groundAt(x, z, y) {
    var g = 0;
    S.pads.forEach(function (p) { var inside = p.sq ? Math.abs(x - p.x) < p.r && Math.abs(z - p.z) < p.r : Math.hypot(x - p.x, z - p.z) < p.r; if (inside && y >= p.h - 0.45) g = Math.max(g, p.h); });
    return g;
  }
  function blocked(x, z, y) {
    for (var i = 0; i < S.pads.length; i++) { var p = S.pads[i], inside = p.sq ? Math.abs(x - p.x) < p.r + 0.3 && Math.abs(z - p.z) < p.r + 0.3 : Math.hypot(x - p.x, z - p.z) < p.r + 0.3; if (inside && y < p.h - 0.45) return true; }
    return false;
  }
  function step(dt) {
    var P = S.pl, k = I.keys ? I.keys() : {}, jv = tj.id !== null ? tj : (isTouch ? I.joyVec : { x: 0, y: 0 });
    var mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + (jv.x || 0), my = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + (jv.y || 0);
    if (Tale._bot) { mx = Tale._bot.x || 0; my = Tale._bot.y || 0; }
    var mag = Math.min(1, Math.hypot(mx, my));
    if (k.KeyQ) S.camYaw += dt * 2.2; if (k.KeyE) S.camYaw -= dt * 2.2;
    var def = GB.fighter(Tale.hero), spd = 6.2 + def.stats.speed * 0.45;
    if (mag > 0.12 && !Tale.dlg) {
      // screen-relative: up = away from the camera, right = screen right
      var fx = -Math.sin(S.camYaw), fz = -Math.cos(S.camYaw), rx = -fz, rz = fx;
      var dx = (fx * my + rx * mx), dz = (fz * my + rz * mx), dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      var nx = P.x + dx * spd * mag * dt, nz = P.z + dz * spd * mag * dt;
      var ok = function (x, z) { if (Math.hypot(x, z) > S.R - 0.5) return false; if (blocked(x, z, P.y)) return false; for (var i = 0; i < S.solids.length; i++) { var s = S.solids[i]; if (s.r && Math.hypot(x - s.x, z - s.z) < s.r + 0.45) return false; } return true; };
      if (ok(nx, nz)) { P.x = nx; P.z = nz; } else if (ok(nx, P.z)) P.x = nx; else if (ok(P.x, nz)) P.z = nz;
      var want = Math.atan2(dx, dz), d = want - P.yaw; while (d > PI) d -= PI * 2; while (d < -PI) d += PI * 2; P.yaw += d * Math.min(1, dt * 12);
      P.moving = mag;
      if (!drag.id && !k.KeyQ && !k.KeyE) { var behind = Math.atan2(-dx, -dz) + PI, dd = (P.yaw + PI) - S.camYaw; while (dd > PI) dd -= PI * 2; while (dd < -PI) dd += PI * 2; if (Math.abs(my) > 0.3 || Math.abs(dd) > 0.2) S.camYaw += dd * Math.min(1, dt * 0.9) * (my < -0.3 ? 0 : 1); }
    } else P.moving = 0;
    var jump = jumpQ || k.Space || (k.KeyK && !Tale.dlg); jumpQ = false;
    var gy = groundAt(P.x, P.z, P.y);
    if (jump && P.y <= gy + 0.01 && !Tale.dlg) { P.vy = 9.2; A.play('jump'); }
    P.vy -= 24 * dt; P.y += P.vy * dt; if (P.y <= gy) { if (P.vy < -6) A.play('land'); P.y = gy; P.vy = 0; }
    P.ground = gy;
    // shards
    S.shards.forEach(function (s) { if (s.got) return; if (Math.hypot(P.x - s.x, P.z - s.z) < 1.2 && Math.abs(P.y + 1 - (s.y + 1.2)) < 1.6) { s.got = true; s.g.visible = false; A.play('unlock'); S.got = (S.got || 0) + 1; toast('\u2B50 Crest shard ' + S.got + ' / 3' + (S.got >= 3 ? ' \u00b7 Now find ' + GB.fighter(S.ch.rival).name + '!' : '')); burst(s.x, s.y + 1.2, s.z); } });
    // talk
    var near = nearest();
    $('tTalk').classList.toggle('hot', !!near); $('tTalk').textContent = near ? (near.rival ? (S.got >= 3 ? 'FIGHT!' : 'TALK') : 'TALK') : 'TALK';
    if ((talkQ || k.Enter || k.KeyJ) && !Tale.dlg && near) { if (!Tale._talkLatch) talk(near); Tale._talkLatch = true; } else if (!(k.Enter || k.KeyJ)) Tale._talkLatch = false;
    talkQ = false;
  }
  function nearest() { var P = S.pl, best = null, bd = 3.2; S.npcs.forEach(function (n) { var d = Math.hypot(P.x - n.x, P.z - n.z); if (d < bd && Math.abs(P.y - n.y) < 2.2) { bd = d; best = n; } }); return best; }
  var bursts = [];
  function burst(x, y, z) { for (var i = 0; i < 14; i++) { var m = M(box(), basic(i % 2 ? '#ffe14d' : '#ffffff'), x, y, z, 0.16, 0.16, 0.16, S.scene); bursts.push({ m: m, vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 5, vz: (Math.random() - 0.5) * 6, t: 0.8 }); } }

  /* ---------- frame (called by the game loop while view === 'story') ---------- */
  G.storyFrame = function (dt, renderer, time) {
    if (!S) { renderer.render(new T.Scene(), new T.PerspectiveCamera()); return; }
    S.t += dt;
    if (!Tale.paused) step(dt);
    var P = S.pl, Pz = GB.Models.POSES;
    P.rig.root.position.set(P.x, P.y, P.z); P.rig.root.rotation.y = P.yaw;
    var air = P.y > P.ground + 0.05;
    Mdl.applyPose(P.rig, air ? (P.vy > 0 ? Pz.jump() : Pz.fall()) : P.moving ? Pz.walk(0, time * (0.8 + P.moving * 0.5), 1) : Pz.idle(0, time), 0.25);
    if (P.rig.shadow) { P.rig.shadow.position.y = -(P.y - P.ground) + 0.03; }
    S.ring.position.set(P.x, P.ground + 0.04, P.z); S.ring.material.opacity = 0.35 + Math.sin(time * 4) * 0.15;
    S.npcs.forEach(function (n, i) {
      var d = Math.hypot(P.x - n.x, P.z - n.z), want = d < 7 ? Math.atan2(P.x - n.x, P.z - n.z) : n.face, cur = n.rig.root.rotation.y, dd = want - cur; while (dd > PI) dd -= PI * 2; while (dd < -PI) dd += PI * 2; n.rig.root.rotation.y = cur + dd * Math.min(1, dt * 5);
      var talking = Tale.dlg && Tale.dlg.who === n.id;
      Mdl.applyPose(n.rig, talking ? Pz.taunt(0, time) : n.rival ? Pz.idle(0, time + i) : (d < 4 ? Pz.win2(0, time + i) : Pz.idle(0, time + i * 1.7)), 0.15);
      if (n.mk) { n.mk.visible = S.got >= 3 || true; n.mk.rotation.y = time * 2.5; n.mk.position.y = n.y + n.rig.height + 1.1 + Math.sin(time * 3) * 0.12; n.mk.children.forEach(function (c) { c.material.color.set(S.got >= 3 ? '#ffe14d' : '#9aa0b8'); }); }
    });
    S.shards.forEach(function (s) { if (s.got) return; s.star.rotation.y = time * 2.4 + s.k; s.g.position.y = s.y + 1.2 + Math.sin(time * 2.5 + s.k) * 0.18; s.gl.material.opacity = 0.6 + Math.sin(time * 4 + s.k) * 0.25; });
    S.sway.forEach(function (g, i) { g.rotation.z = Math.sin(time * 0.9 + i) * 0.02; });
    S.pulse.forEach(function (p, i) { if (p.m) p.m.emissiveIntensity = 0.45 + Math.sin(time * 1.6 + i * 1.3) * 0.25; if (p.s) { p.s.material.opacity = 0.35 + Math.sin(time * 1.6 + i * 1.3) * 0.2; } if (p.sgn) p.sgn.material.opacity = Math.sin(time * 3 + i) > -0.7 ? 1 : 0.5, p.sgn.material.transparent = true; });
    S.spin.forEach(function (s) { s.o.rotation[s.ax] = time * s.sp; });
    S.upd.forEach(function (fn) { fn(time); });
    for (var b = bursts.length - 1; b >= 0; b--) { var q = bursts[b]; q.t -= dt; q.vy -= 12 * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt; q.m.rotation.x += dt * 8; if (q.t <= 0) { q.m.parent && q.m.parent.remove(q.m); bursts.splice(b, 1); } }
    // camera: third person, pulled toward the talker during dialogue
    var dist = Tale.dlg ? 6 : 8.2, hgt = Tale.dlg ? 2.6 : 4.2, focus = new T.Vector3(P.x, P.y + 1.5, P.z);
    if (Tale.dlg && Tale.dlg.npc) { var n2 = Tale.dlg.npc; focus.set((P.x + n2.x) / 2, (P.y + n2.y) / 2 + 1.6, (P.z + n2.z) / 2); }
    var want = new T.Vector3(focus.x + Math.sin(S.camYaw) * dist, focus.y + hgt, focus.z + Math.cos(S.camYaw) * dist);
    var wr = Math.hypot(want.x, want.z), lim = S.R + 6; if (wr > lim) { want.x *= lim / wr; want.z *= lim / wr; }
    S.camP.lerp(want, Math.min(1, dt * 4)); S.cam.position.copy(S.camP); S.cam.lookAt(focus);
    var w = window.innerWidth, h = window.innerHeight; if (S.cam.aspect !== w / h) { S.cam.aspect = w / h; S.cam.updateProjectionMatrix(); }
    S.cam.fov = h > w ? 70 : 55; S.cam.updateProjectionMatrix();
    hud(time);
    renderer.render(S.scene, S.cam);
  };
  function objective() {
    if (!S) return null;
    if ((S.got || 0) < 3) { var best = null, bd = 1e9; S.shards.forEach(function (s) { if (s.got) return; var d = Math.hypot(S.pl.x - s.x, S.pl.z - s.z); if (d < bd) { bd = d; best = s; } }); return best ? { x: best.x, z: best.z, txt: 'Find the crest shards (' + (S.got || 0) + '/3)' } : null; }
    return { x: S.rival.x, z: S.rival.z, txt: 'Challenge ' + GB.fighter(S.ch.rival).name + '!' };
  }
  function hud(time) {
    var o = objective(); if (!o) return;
    $('tObj').textContent = o.txt;
    var a = Math.atan2(o.x - S.pl.x, o.z - S.pl.z), rel = a - (S.camYaw + PI); // 0 = straight ahead on screen
    $('tArrow').style.transform = 'rotate(' + (-rel * 180 / PI) + 'deg)';
    $('tDist').textContent = Math.round(Math.hypot(o.x - S.pl.x, o.z - S.pl.z)) + 'm';
  }

  /* ---------- dialogue ---------- */
  function talk(n) {
    if (n.rival) {
      if ((S.got || 0) < 3) { say([[n.id, 'Come back when you have all 3 crest shards! You have ' + (S.got || 0) + '.']], null, n); return; }
      say(S.ch.pre, function () { fight(S.ch.rival, S.ch.arena, ''); }, n); return;
    }
    say([[n.id, n.lines[n.li % n.lines.length]]], null, n); n.li++;
  }
  function say(lines, done, npc) {
    Tale.dlg = { lines: lines, i: 0, done: done, npc: npc || null, who: lines[0][0] }; renderDlg(); A.play('select');
  }
  function renderDlg() {
    var d = Tale.dlg, el = $('tDlg'); if (!d) { el.classList.add('hidden'); return; }
    var ln = d.lines[d.i], id = ln[0], def = id ? GB.fighter(id) : null, por = GB.UI.portraits ? GB.UI.portraits() : {};
    d.who = id; if (id && S) d.npc = S.npcs.find(function (n) { return n.id === id; }) || d.npc;
    el.classList.remove('hidden'); el.style.setProperty('--fc', def ? def.color : '#ffe14d');
    el.innerHTML = (def ? '<img class="dp" src="' + (por[id] || '') + '" alt="">' : '<div class="dp nar">\u2B50</div>') + '<div class="dt"><b>' + (def ? def.name : 'BRAWLER TALE') + '</b><span>' + ln[1] + '</span></div><div class="dn">' + (d.i + 1 < d.lines.length ? 'TAP \u25B6' : 'OK \u2714') + '</div>';
  }
  function nextDlg() { var d = Tale.dlg; if (!d) return; A.play('select'); d.i++; if (d.i >= d.lines.length) { Tale.dlg = null; renderDlg(); if (d.done) d.done(); return; } renderDlg(); }
  Tale.next = nextDlg;
  var toastT = 0;
  function toast(msg) { var el = $('tToast'); if (!el) { el = document.createElement('div'); el.id = 'tToast'; document.body.appendChild(el); } el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 3200); }
  Tale.toast = toast;

  /* ---------- flow ---------- */
  function buildUI() {
    var el = $('tale');
    el.innerHTML = '<div id="tTop"><button id="tPause" aria-label="Pause">II</button><div id="tCh"></div><div id="tObjBox"><div id="tArrow"><i></i></div><div><div id="tObj"></div><small id="tDist"></small></div></div><div id="tCrest"></div></div>' +
      '<div id="tJoyZone"><div id="tJoy"><div id="tKnob"></div></div><span>MOVE</span></div>' +
      '<div id="tBtns"><button id="tJump">JUMP</button><button id="tTalk">TALK</button></div>' +
      '<div id="tHint"></div><div id="tDlg" class="hidden"></div>' +
      '<div id="tMap" class="hidden"></div><div id="tMenu" class="hidden"><div class="tmbox"><div class="ptitle">PAUSED</div><button class="big" id="tmRes">RESUME</button><button class="big alt" id="tmMap">CHAPTER MAP</button><button class="big alt danger" id="tmQuit">QUIT TO MENU</button></div></div>';
    $('tHint').textContent = isTouch ? 'Joystick: move \u00b7 drag the screen: turn camera' : 'WASD / arrows: move \u00b7 Space: jump \u00b7 J / Enter: talk \u00b7 Q/E or drag: camera \u00b7 Esc: pause';
    var z = $('tJoyZone'), joy = $('tJoy'), kn = $('tKnob');
    z.addEventListener('pointerdown', function (e) { e.preventDefault(); if (tj.id !== null) return; tj.id = e.pointerId; tj.cx = e.clientX; tj.cy = e.clientY; var r = z.getBoundingClientRect(); joy.style.left = (e.clientX - r.left - 60) + 'px'; joy.style.top = (e.clientY - r.top - 60) + 'px'; joy.classList.add('on'); try { z.setPointerCapture(e.pointerId); } catch (er) {} });
    z.addEventListener('pointermove', function (e) { if (e.pointerId !== tj.id) return; var dx = e.clientX - tj.cx, dy = e.clientY - tj.cy, d = Math.hypot(dx, dy), R = 50; if (d > R) { dx *= R / d; dy *= R / d; } tj.x = dx / R; tj.y = -dy / R; kn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; });
    var up = function (e) { if (e.pointerId !== tj.id) return; tj.id = null; tj.x = tj.y = 0; kn.style.transform = ''; joy.classList.remove('on'); };
    z.addEventListener('pointerup', up); z.addEventListener('pointercancel', up);
    el.addEventListener('pointerdown', function (e) { if (e.target !== el) return; if (Tale.dlg) { nextDlg(); return; } drag.id = e.pointerId; drag.x = e.clientX; });
    el.addEventListener('pointermove', function (e) { if (e.pointerId !== drag.id || !S) return; S.camYaw -= (e.clientX - drag.x) * 0.008; drag.x = e.clientX; });
    var dup = function (e) { if (e.pointerId === drag.id) drag.id = null; }; el.addEventListener('pointerup', dup); el.addEventListener('pointercancel', dup);
    $('tJump').addEventListener('pointerdown', function (e) { e.preventDefault(); jumpQ = true; });
    $('tTalk').addEventListener('pointerdown', function (e) { e.preventDefault(); if (Tale.dlg) nextDlg(); else talkQ = true; });
    $('tDlg').addEventListener('pointerdown', function (e) { e.preventDefault(); nextDlg(); });
    $('tPause').addEventListener('click', function () { pauseTale(true); });
    $('tmRes').addEventListener('click', function () { pauseTale(false); });
    $('tmMap').addEventListener('click', function () { pauseTale(false); openMap(); });
    $('tmQuit').addEventListener('click', function () { quit(); });
    window.addEventListener('keydown', function (e) {
      if (GB.UI.screen() !== 'tale') return;
      if (e.code === 'Escape' || e.code === 'KeyP') { if (!$('tMap').classList.contains('hidden')) return; pauseTale(!Tale.paused); e.preventDefault(); return; }
      if (Tale.dlg && (e.code === 'Enter' || e.code === 'KeyJ' || e.code === 'Space')) { if (!e.repeat) nextDlg(); Tale._talkLatch = true; e.preventDefault(); }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
    });
  }
  function pauseTale(b) { Tale.paused = !!b; $('tMenu').classList.toggle('hidden', !b); I.clear(); }
  function showTale() { GB.UI.show('tale'); $('tale').classList.remove('hidden'); document.body.classList.add('taleOn'); }
  function hideTale() { $('tale').classList.add('hidden'); document.body.classList.remove('taleOn'); }
  function quit() { pauseTale(false); hideTale(); $('tMap').classList.add('hidden'); disposeWorld(); G.setView('fight'); GB.UI.toMenu(); }
  Tale.quit = quit;
  function crestsHtml() { var h = ''; for (var i = 0; i < 6; i++) h += '<i class="' + (sv.done[CH[i].id] ? 'on' : '') + '" style="--c:' + GB.fighter(CH[i].rival).color + '"></i>'; return h; }
  function openMap() {
    showTale(); disposeWorld(); G.setView('story');
    var m = $('tMap'), por = GB.UI.portraits ? GB.UI.portraits() : {};
    var h = '<div class="tmTop"><button class="back" id="tmBack">\u25C0 MENU</button><div class="tmT">\u2B50 BRAWLER TALE</div><div class="tmCr">' + crestsHtml() + '</div></div><div class="tmRow">';
    CH.forEach(function (c, i) {
      var open = i <= sv.ch, done = !!sv.done[c.id], rv = GB.fighter(c.rival);
      h += '<button class="tmC' + (open ? '' : ' lk') + (done ? ' dn' : '') + '" data-i="' + i + '" style="--fc:' + rv.color + '">' + (open ? '<img src="' + (por[c.rival] || '') + '" alt="">' : '<div class="q">?</div>') +
        '<b>CH ' + (i + 1) + '</b><span>' + (open ? c.name : '???') + '</span><small>' + (done ? '\u2714 CREST WON' : open ? 'VS ' + rv.name : 'LOCKED') + '</small></button>';
    });
    h += '</div><div class="tmF">Playing as <b>' + GB.fighter(Tale.hero).name + '</b>' + (Tale.skin ? ' (' + E.skinName(Tale.skin) + ' skin)' : '') + (sv.belt ? ' \u00b7 \uD83C\uDFC6 ELITE BELT CHAMPION!' : '') + '</div>';
    m.innerHTML = h; m.classList.remove('hidden');
    $('tmBack').addEventListener('click', function () { A.play('back'); m.classList.add('hidden'); quit(); });
    m.querySelectorAll('.tmC').forEach(function (b) { b.addEventListener('click', function () { var i = +b.getAttribute('data-i'); if (i > sv.ch) { A.play('back'); return; } A.play('confirm'); m.classList.add('hidden'); play(i); }); });
    A.music(5);
  }
  Tale.openMap = openMap;
  Tale.begin = function (hero, skin) {
    if (!E.owned()) return;
    if (!$('tTop')) buildUI();
    Tale.hero = hero; Tale.skin = skin || ''; G.quit(); openMap();
  };
  function play(i) {
    var ch = CH[i]; Tale.chi = i; Tale.paused = false; Tale.dlg = null; $('tMap').classList.add('hidden');
    var hn = $('tHint'); hn.style.opacity = ''; clearTimeout(Tale._hintT); Tale._hintT = setTimeout(function () { hn.style.opacity = '0'; }, 9000);
    disposeWorld(); buildWorld(ch); showTale(); G.setView('story');
    $('tCh').innerHTML = '<b>CHAPTER ' + (i + 1) + '</b><span>' + ch.name + '</span>'; $('tCrest').innerHTML = crestsHtml();
    A.music(ch.music);
    setTimeout(function () { if (S && S.ch === ch) say(ch.intro, null, null); }, 600);
  }
  Tale.play = play;
  var pending = null;
  function fight(opp, arena, oskin, boss) {
    pending = { opp: opp, arena: arena, boss: !!boss };
    $('fade').classList.add('on'); hideTale();
    setTimeout(function () { G.setView('fight'); $('fade').classList.remove('on'); GB.UI.launch({ mode: 'story', p1: Tale.hero, p2: opp, arena: arena, diff: GB.save.diff, s1: Tale.skin, s2: oskin || '', boss: !!boss, chapter: Tale.chi }); }, 260);
  }
  function backToWorld(after) {
    G.quit(); showTale(); G.setView('story'); $('result').classList.add('hidden');
    A.music(S ? S.ch.music : 5); if (after) setTimeout(after, 350);
  }
  Tale.matchEnd = function (res, m) {
    var win = res.winner === 0, ch = CH[Tale.chi], rb = $('rBtns');
    var s = GB.save; s.matches++; if (win) s.wins++; else s.losses++; GB.persist();
    $('rWin').textContent = win ? 'YOU WIN!' : GB.fighter(m.cfg.p2).name + ' WINS!'; $('result').style.setProperty('--fc', GB.fighter(win ? m.cfg.p1 : m.cfg.p2).color);
    $('rSub').textContent = 'BRAWLER TALE \u00b7 Chapter ' + (Tale.chi + 1) + (win ? '' : ' \u00b7 So close! Try again?');
    var st = res.stats[0]; $('rStats').innerHTML = 'Rounds <b>' + res.wins[0] + '-' + res.wins[1] + '</b> &nbsp; Best combo <b>' + st.maxCombo + '</b> &nbsp; Damage <b>' + st.dmg + '</b>';
    rb.innerHTML = '';
    function btn(t, fn, alt) { var e = document.createElement('button'); e.className = 'big' + (alt ? ' alt' : ''); e.textContent = t; e.addEventListener('click', function () { A.play('confirm'); fn(); }); rb.appendChild(e); }
    if (win) {
      var isBoss = pending && pending.boss;
      btn('CONTINUE \u25B6', function () {
        if (!isBoss) {
          backToWorld(function () {
            say(ch.post, function () {
              if (ch.boss) { fight(ch.boss.id, ch.boss.arena, ch.boss.skin, true); return; }
              finishChapter(ch);
            }, S && S.rival);
          });
        } else backToWorld(function () { say(ch.end, function () { sv.belt = true; finishChapter(ch); }, null); });
      });
    } else {
      btn('RETRY FIGHT', function () { var p = pending; fight(p.opp, p.arena, p.boss ? 'gold' : '', p.boss); });
      btn('BACK TO WORLD', function () { backToWorld(); }, true);
    }
    GB.UI.show('result');
  };
  function finishChapter(ch) {
    var i = CH.indexOf(ch), first = !sv.done[ch.id]; sv.done[ch.id] = true; sv.ch = Math.max(sv.ch, Math.min(CH.length - 1, i + 1)); GB.persist();
    A.play('unlock'); toast(first ? '\u2B50 ' + GB.fighter(ch.rival).name + '\u2019s crest won! ' + (i + 1 < CH.length ? 'Chapter ' + (i + 2) + ' unlocked!' : 'You are the ELITE CHAMPION!') : 'Chapter cleared again!');
    setTimeout(openMap, 900);
  }

  /* ---------- test hooks ---------- */
  Tale.debug = {
    state: function () { return S ? { ch: S.ch.id, x: +S.pl.x.toFixed(2), z: +S.pl.z.toFixed(2), y: +S.pl.y.toFixed(2), yaw: +S.pl.yaw.toFixed(2), camYaw: +S.camYaw.toFixed(2), got: S.got || 0, dlg: Tale.dlg ? Tale.dlg.lines[Tale.dlg.i][1] : null, npcs: S.npcs.length, shards: S.shards.map(function (s) { return [s.x, s.z, s.y, s.got]; }), rival: [S.rival.x, S.rival.z, S.rival.y], tris: GB.Game.renderer().info.render.triangles, calls: GB.Game.renderer().info.render.calls } : null; },
    tp: function (x, z, y) { if (!S) return; S.pl.x = x; S.pl.z = z; S.pl.y = y || groundAt(x, z, 99); S.pl.vy = 0; },
    bot: function (v) { Tale._bot = v; },
    skipDlg: function () { var n = 0; while (Tale.dlg && n++ < 20) nextDlg(); },
    talk: function () { var n = nearest(); if (n) talk(n); return !!n; },
    save: function () { return JSON.parse(JSON.stringify(sv)); }
  };
})();
