/* Grok Brawl - WebAudio synth sound effects + simple beat */
(function () {
  'use strict';
  var A = GB.Audio = {};
  var ctx = null, master, sfxBus, musBus, noiseBuf, muted = !!GB.save.muted;
  var music = { on: false, track: -1, step: 0, next: 0, timer: null, bpm: 120 };

  A.unlock = function () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { ctx = new AC(); } catch (e) { ctx = null; return; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(comp);
      musBus = ctx.createGain(); musBus.gain.value = 0.33; musBus.connect(comp);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  };
  A.ready = function () { return !!ctx; };
  A.isMuted = function () { return muted; };
  A.setMuted = function (m) {
    muted = !!m; GB.save.muted = muted; GB.persist();
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.02);
    document.body.classList.toggle('muted', muted);
  };
  A.toggle = function () { A.setMuted(!muted); return muted; };

  function tone(type, f0, f1, dur, vol, when, bus) {
    if (!ctx) return; var t = (when || ctx.currentTime);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, fType, f0, f1, when, bus, q) {
    if (!ctx) return; var t = (when || ctx.currentTime);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = fType || 'lowpass'; f.frequency.setValueAtTime(f0 || 2000, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 1;
    var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  var SFX = {
    hit: function (p) { p = p || 1; noise(0.09 + 0.05 * p, 0.5 + 0.2 * p, 'lowpass', 3500, 400); tone('sine', 160 + 40 * p, 50, 0.12 + 0.05 * p, 0.7); tone('square', 900, 200, 0.04, 0.12); },
    heavy: function () { noise(0.22, 0.8, 'lowpass', 2500, 200); tone('sine', 120, 35, 0.3, 0.9); tone('triangle', 300, 60, 0.15, 0.3); },
    block: function () { tone('square', 1400, 900, 0.05, 0.16); noise(0.06, 0.3, 'highpass', 3000, 1500); tone('triangle', 520, 380, 0.08, 0.25); },
    whoosh: function () { noise(0.14, 0.18, 'bandpass', 800, 2600, 0, 0, 2); },
    jump: function () { tone('sine', 260, 520, 0.12, 0.18); },
    land: function () { noise(0.07, 0.2, 'lowpass', 600, 150); },
    dash: function () { noise(0.18, 0.3, 'bandpass', 2600, 500, 0, 0, 1.5); },
    fire: function () { noise(0.4, 0.5, 'lowpass', 1800, 300); tone('sawtooth', 220, 90, 0.3, 0.2); },
    zap: function () { tone('sawtooth', 1200, 200, 0.18, 0.25); tone('square', 1800, 600, 0.1, 0.12); noise(0.12, 0.25, 'highpass', 4000, 2000); },
    slam: function () { tone('sine', 90, 28, 0.6, 1.0); noise(0.5, 0.8, 'lowpass', 1200, 80); },
    teleport: function () { tone('sine', 400, 1800, 0.12, 0.25); tone('sine', 1800, 300, 0.15, 0.2, ctx && ctx.currentTime + 0.12); },
    ice: function () { tone('triangle', 2400, 1200, 0.25, 0.18); noise(0.3, 0.3, 'highpass', 5000, 2500); },
    void: function () { tone('sawtooth', 120, 60, 0.5, 0.3); tone('sine', 60, 40, 0.5, 0.5); },
    spin: function () { noise(0.3, 0.3, 'bandpass', 600, 3000, 0, 0, 3); },
    superStart: function () { if (!ctx) return; var t = ctx.currentTime; [0, 4, 7, 12].forEach(function (n, i) { tone('sawtooth', 220 * Math.pow(2, n / 12), 0, 0.5, 0.18, t + i * 0.06); }); noise(0.8, 0.4, 'bandpass', 400, 4000, t, 0, 1); tone('sine', 55, 110, 0.8, 0.6, t); },
    ko: function () { if (!ctx) return; var t = ctx.currentTime; tone('sine', 110, 30, 1.2, 1); noise(1.0, 0.8, 'lowpass', 3000, 60, t); tone('sawtooth', 440, 55, 1.0, 0.25, t + 0.05); },
    bell: function () { if (!ctx) return; var t = ctx.currentTime; [880, 1320, 1760].forEach(function (f) { tone('sine', f, 0, 1.2, 0.2, t); }); },
    fight: function () { if (!ctx) return; var t = ctx.currentTime; tone('sawtooth', 330, 0, 0.25, 0.2, t); tone('sawtooth', 495, 0, 0.25, 0.2, t); tone('sawtooth', 660, 0, 0.5, 0.25, t + 0.12); noise(0.4, 0.4, 'highpass', 2000, 6000, t); },
    select: function () { tone('square', 660, 0, 0.06, 0.12); },
    confirm: function () { if (!ctx) return; var t = ctx.currentTime; tone('square', 523, 0, 0.08, 0.15, t); tone('square', 784, 0, 0.14, 0.15, t + 0.07); },
    back: function () { tone('square', 440, 220, 0.1, 0.12); },
    warn: function () { if (!ctx) return; var t = ctx.currentTime; tone('square', 880, 0, 0.08, 0.1, t); tone('square', 660, 0, 0.08, 0.1, t + 0.12); },
    splash: function () { if (!ctx) return; var t = ctx.currentTime; noise(0.6, 0.5, 'lowpass', 2600, 300, t, 0, 1); tone('sine', 190, 60, 0.45, 0.4, t); },
    pixel: function () { if (!ctx) return; var t = ctx.currentTime; [0, 7, 12].forEach(function (n, i) { tone('square', 523 * Math.pow(2, n / 12), 0, 0.06, 0.09, t + i * 0.04); }); },
    win: function () { if (!ctx) return; var t = ctx.currentTime; [0, 4, 7, 12, 7, 12, 16].forEach(function (n, i) { tone('square', 392 * Math.pow(2, n / 12), 0, 0.22, 0.13, t + i * 0.12); }); },
    lose: function () { if (!ctx) return; var t = ctx.currentTime; [7, 5, 3, 0].forEach(function (n, i) { tone('triangle', 330 * Math.pow(2, n / 12), 0, 0.3, 0.2, t + i * 0.2); }); },
    unlock: function () { if (!ctx) return; var t = ctx.currentTime; for (var i = 0; i < 8; i++) tone('sine', 523 * Math.pow(2, i / 6), 0, 0.2, 0.15, t + i * 0.07); }
  };
  A.play = function (name, arg) { if (!ctx || muted) return; var f = SFX[name]; if (f) try { f(arg); } catch (e) {} };

  /* ---------- music: tiny step sequencer ---------- */
  var TRACKS = [
    { bpm: 118, root: 45, scale: [0, 3, 7, 10], bass: [0, 0, 7, 0, 3, 0, 10, 7], lead: 'square' },     // rooftop synthwave
    { bpm: 124, root: 43, scale: [0, 4, 7, 9], bass: [0, 7, 9, 7, 4, 7, 0, 12], lead: 'square' },      // vegas funk
    { bpm: 104, root: 50, scale: [0, 2, 5, 7, 9], bass: [0, 0, 5, 7, 0, 9, 7, 5], lead: 'triangle' },   // dojo pentatonic
    { bpm: 136, root: 40, scale: [0, 1, 5, 7], bass: [0, 0, 1, 0, 7, 0, 5, 1], lead: 'sawtooth' },     // volcano
    { bpm: 128, root: 42, scale: [0, 3, 6, 10], bass: [0, 6, 0, 3, 0, 10, 6, 3], lead: 'square' },     // hangar
    { bpm: 112, root: 48, scale: [0, 4, 7, 11], bass: [0, 7, 4, 7, 0, 11, 7, 4], lead: 'triangle' },   // menu
    { bpm: 96, root: 41, scale: [0, 2, 7, 9, 14], bass: [0, 0, 7, 0, 2, 0, 9, 7], lead: 'sine' },        // moon base
    { bpm: 132, root: 47, scale: [0, 4, 7, 12], bass: [0, 12, 7, 12, 4, 12, 7, 0], lead: 'square' }     // gumball factory
  ];
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function schedule() {
    if (!ctx || !music.on) return;
    var tr = TRACKS[music.track] || TRACKS[0], spb = 60 / tr.bpm / 4;
    while (music.next < ctx.currentTime + 0.12) {
      var s = music.step % 16, t = music.next, bar = Math.floor(music.step / 16) % 4;
      if (s % 4 === 0) { tone('sine', 140, 40, 0.18, 0.9, t, musBus); }
      if (s === 4 || s === 12) noise(0.14, 0.45, 'bandpass', 1800, 900, t, musBus, 0.8);
      if (s % 2 === 1) noise(0.03, 0.18, 'highpass', 8000, 7000, t, musBus);
      if (s % 2 === 0) { var bn = tr.bass[(s / 2) % 8] + (bar === 3 ? 5 : 0); tone('sawtooth', midi(tr.root + bn), 0, spb * 1.6, 0.22, t, musBus); }
      if ((s === 2 || s === 6 || s === 10 || s === 15) && music.track !== 5) {
        var n = tr.scale[(music.step * 7 + bar * 3) % tr.scale.length]; tone(tr.lead, midi(tr.root + 24 + n), 0, spb * 1.2, 0.07, t, musBus);
      }
      if (music.track === 5 && s % 4 === 2) { var mn = tr.scale[(music.step / 4 + bar) % tr.scale.length | 0]; tone('triangle', midi(tr.root + 12 + mn), 0, spb * 3, 0.12, t, musBus); }
      music.step++; music.next += spb;
    }
  }
  A.music = function (track) {
    if (!ctx) return;
    if (music.on && music.track === track) return;
    music.track = track; music.on = true; music.step = 0; music.next = ctx.currentTime + 0.05;
    if (!music.timer) music.timer = setInterval(schedule, 30);
  };
  A.stopMusic = function () { music.on = false; music.track = -1; };
  document.body && document.body.classList.toggle('muted', muted);
})();
