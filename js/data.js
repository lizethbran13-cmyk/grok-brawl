/* Grok Brawl - roster, arenas, difficulty and save data */
window.GB = window.GB || {};
(function () {
  'use strict';
  GB.FIGHTERS = [
    { id: 'blaze', name: 'BLAZE', title: 'Fire Brawler', color: '#ff4a2e', color2: '#ffb020', rim: '#ff8a3d',
      stats: { speed: 3, power: 3, weight: 3 }, scale: 1.0,
      special: { type: 'fireball', name: 'Fireball', desc: 'Throws a blazing fireball across the arena.' },
      super: { type: 'beam', name: 'INFERNO BEAM', desc: 'A screen-long fire beam. Jump or dash to dodge it.' },
      bio: 'Balanced all-rounder. Zone with fireballs, finish with a beam.' },
    { id: 'volt', name: 'VOLT', title: 'Lightning Speedster', color: '#ffd400', color2: '#22e5ff', rim: '#7ff6ff',
      stats: { speed: 5, power: 2, weight: 2 }, scale: 0.95,
      special: { type: 'dashpunch', name: 'Thunder Dash Punch', desc: 'Rockets forward with an electric punch.' },
      super: { type: 'rush', name: 'STORM RUSH', desc: 'A lightning-fast rush that unleashes a flurry of hits.' },
      bio: 'Fastest fighter alive. Rush in, hit hard, get out.' },
    { id: 'boulder', name: 'BOULDER', title: 'Stone Titan', color: '#4fbf5a', color2: '#a8a29e', rim: '#b6ff8a',
      stats: { speed: 1, power: 5, weight: 5 }, scale: 1.14,
      special: { type: 'groundslam', name: 'Ground Slam', desc: 'Leaps at the foe and slams the ground with a shockwave.' },
      super: { type: 'quake', name: 'TITAN QUAKE', desc: 'Shakes the whole arena. Anyone on the ground gets launched.' },
      bio: 'Slow but every hit hurts. Hard to knock around.' },
    { id: 'nova', name: 'NOVA', title: 'Star Ninja', color: '#a259ff', color2: '#ff6be6', rim: '#d6a3ff',
      stats: { speed: 4, power: 3, weight: 2 }, scale: 1.0,
      special: { type: 'teleport', name: 'Star Teleport', desc: 'Blinks behind the opponent and strikes.' },
      super: { type: 'rush', name: 'STARFALL', desc: 'Warps through the foe with a barrage of star strikes.' },
      bio: 'Tricky and mobile. Keep them guessing with teleports.' },
    { id: 'frost', name: 'FROST', title: 'Ice Knight', color: '#3fd8ff', color2: '#e8fbff', rim: '#bff4ff',
      stats: { speed: 3, power: 3, weight: 4 }, scale: 1.05,
      special: { type: 'icespike', name: 'Ice Spike', desc: 'Sends a freezing ice wave along the ground. Jump it!' },
      super: { type: 'glacier', name: 'GLACIER CRASH', desc: 'Giant ice spikes erupt across the floor.' },
      bio: 'Sturdy defender. Freeze foes in place and punish.' },
    { id: 'sakura', name: 'SAKURA', title: 'Cyclone Kicker', color: '#ff5fb0', color2: '#ffffff', rim: '#ffb3dc',
      stats: { speed: 4, power: 2, weight: 3 }, scale: 0.97,
      special: { type: 'cyclone', name: 'Cyclone Kick', desc: 'A rising spinning kick. Great anti-air, briefly invincible.' },
      super: { type: 'rush', name: 'PETAL STORM', desc: 'A whirlwind of kicks and cherry blossoms.' },
      bio: 'Acrobatic kicker. Swat jumpers out of the sky.' },
    { id: 'riptide', name: 'RIPTIDE', title: 'Tidal Wrestler', color: '#14b8a6', color2: '#ff7f50', rim: '#7ff5e6',
      stats: { speed: 2, power: 4, weight: 3 }, scale: 1.1,
      special: { type: 'whirlgrab', name: 'Whirlpool Grab', desc: 'Lunges in, grabs and spin-throws the foe. Beats blocking! Jump, dash or jab to stop it.' },
      super: { type: 'maelstrom', name: 'MAELSTROM', desc: 'A whirlpool drags foes in, then a giant geyser erupts. Jump or dash away to escape the pull.' },
      bio: 'Big wrestler from the deep. Get close and grab anyone who hides behind a block.' },
    { id: 'glitch', name: 'GLITCH', title: 'Pixel Hacker', color: '#9dff00', color2: '#ff2bd6', rim: '#d4ff6a',
      stats: { speed: 4, power: 3, weight: 2 }, scale: 0.94,
      special: { type: 'pixelmine', name: 'Glitch Mine', desc: 'Tosses a pixel mine onto the floor. It blinks, then explodes when a foe steps on it. Jump over it!' },
      super: { type: 'pixelstorm', name: 'PIXEL STORM', desc: 'Giant pixels rain down where the foe stands. Watch for the green squares and dash away.' },
      bio: 'Tricky trap-setter with a TV for a head. Lay mines, then make them dodge.' },
    { id: 'prime', name: 'GROK PRIME', title: 'Final Boss', color: '#ffc531', color2: '#1b1b2a', rim: '#ffd84d',
      stats: { speed: 4, power: 4, weight: 4 }, scale: 1.1, hidden: true,
      special: { type: 'voidorb', name: 'Void Orb', desc: 'Launches a heavy orb of dark energy.' },
      super: { type: 'rush', name: 'SINGULARITY', desc: 'Crushes the foe with a gravity-warping combo.' },
      bio: 'The Arcade boss. Beat Arcade mode to unlock him!' }
  ];

  GB.ARENAS = [
    { id: 'rooftop', name: 'Neon Rooftop', sub: 'City at night', css: 'linear-gradient(180deg,#0b0430 0%,#3d1a78 55%,#ff3fd0 100%)', music: 0 },
    { id: 'vegas', name: 'Vegas Strip', sub: 'Lights, slots, glory', css: 'linear-gradient(180deg,#2a0a4a 0%,#ff5f6d 60%,#ffc371 100%)', music: 1 },
    { id: 'dojo', name: 'Tokyo Dojo', sub: 'Cherry blossom season', css: 'linear-gradient(180deg,#ffd6e8 0%,#f7a8c4 45%,#8b5a2b 100%)', music: 2 },
    { id: 'volcano', name: 'Volcano', sub: 'Do not fall in', css: 'linear-gradient(180deg,#1a0505 0%,#7a1408 55%,#ff7a00 100%)', music: 3 },
    { id: 'hangar', name: 'Area 51 Hangar', sub: 'Top secret', css: 'linear-gradient(180deg,#0f1a14 0%,#2c4a3a 55%,#7dff9e 100%)', music: 4 },
    { id: 'moon', name: 'Moon Base', sub: 'Low gravity \u00b7 dodge the meteors!', css: 'linear-gradient(180deg,#000008 0%,#1c2350 55%,#9aa6c8 100%)', music: 6,
      rules: { half: 10.4, lowGrav: 0.74, meteors: true } },
    { id: 'factory', name: 'Gumball Factory', sub: 'The conveyor belt keeps switching!', css: 'linear-gradient(180deg,#ffd1f0 0%,#ff7ac8 50%,#5ad1ff 100%)', music: 7,
      rules: { belt: 1.25 } }
  ];

  // CPU difficulty knobs (interpolated for the arcade boss)
  GB.DIFFS = {
    easy:   { level: 0, label: 'EASY',   react: 20, block: 0.22, punish: 0.22, aggr: 0.42, chain: 0.45, special: 0.3, antiAir: 0.15, dodge: 0.04, superUse: 0.4, wake: 0.15, think: 22, idleBias: 0.3 },
    normal: { level: 1, label: 'NORMAL', react: 10, block: 0.56, punish: 0.62, aggr: 0.6, chain: 0.82, special: 0.55, antiAir: 0.5, dodge: 0.12, superUse: 0.85, wake: 0.45, think: 13, idleBias: 0.1 },
    hard:   { level: 2, label: 'HARD',   react: 7,  block: 0.72, punish: 0.9,  aggr: 0.68, chain: 0.97, special: 0.75, antiAir: 0.75, dodge: 0.2, superUse: 1.0, wake: 0.7, think: 8, idleBias: 0.04 }
  };
  GB.diffParams = function (name, boost) {
    var order = ['easy', 'normal', 'hard'];
    var lv = Math.max(0, Math.min(2, order.indexOf(name) + (boost || 0)));
    var a = GB.DIFFS[order[Math.floor(lv)]], b = GB.DIFFS[order[Math.min(2, Math.ceil(lv))]], t = lv - Math.floor(lv), o = {};
    for (var k in a) o[k] = typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * t : a[k];
    o.name = name; return o;
  };

  GB.fighter = function (id) { return GB.FIGHTERS.find(function (f) { return f.id === id; }) || GB.FIGHTERS[0]; };
  GB.arena = function (id) { return GB.ARENAS.find(function (a) { return a.id === id; }) || GB.ARENAS[0]; };

  /* ---------- save data ---------- */
  var KEY = 'grokBrawl.save.v1';
  var defaults = { muted: false, diff: 'normal', wins: 0, losses: 0, winsByDiff: { easy: 0, normal: 0, hard: 0 }, arcadeClears: 0, unlocked: { prime: false }, fighterWins: {}, matches: 0 };
  GB.save = (function () {
    var d; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d && typeof d === 'object' ? d : {};
    for (var k in defaults) if (d[k] === undefined) d[k] = JSON.parse(JSON.stringify(defaults[k]));
    return d;
  })();
  GB.persist = function () { try { localStorage.setItem(KEY, JSON.stringify(GB.save)); } catch (e) {} };
  GB.isUnlocked = function (id) { var f = GB.fighter(id); return !f.hidden || !!GB.save.unlocked[id]; };
})();
