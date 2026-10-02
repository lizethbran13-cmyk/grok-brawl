/* Grok Brawl - screens, menus and game flow */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var G = GB.Game, A = GB.Audio, I = GB.Input;
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (isTouch) document.body.classList.add('touch');
  var arenaTapped = null, portraits = {}, screen = 'title', sel = null, arenaPick = null, arcade = null, lastCfg = null, resultCtx = null;
  var UI = GB.UI = {};
  var SCREENS = ['title', 'menu', 'select', 'arenaSel', 'ladder', 'result', 'pause', 'moves'];

  function show(name) {
    screen = name;
    SCREENS.forEach(function (s) { $(s).classList.toggle('hidden', s !== name && !(name === 'moves' && s === 'pause' && UI._movesFromPause)); });
    var fighting = name === 'fight';
    $('hud').classList.toggle('hidden', !(fighting || name === 'pause' || name === 'moves' && G.match() && G.match().mode !== 'demo'));
    $('touch').classList.toggle('hidden', !(fighting && isTouch));
    document.body.classList.toggle('fighting', fighting);
  }
  UI.screen = function () { return screen; };

  /* ---------- title / demo ---------- */
  function startDemo() {
    var pool = GB.FIGHTERS.filter(function (f) { return !f.hidden; });
    var a = pool[(Math.random() * pool.length) | 0], b = pool[(Math.random() * pool.length) | 0];
    if (a === b) b = pool[(pool.indexOf(a) + 1) % pool.length];
    var ar = GB.ARENAS[(Math.random() * GB.ARENAS.length) | 0];
    G.start({ mode: 'demo', p1: a.id, p2: b.id, arena: ar.id, diff: 'normal' });
    G.debug.skipIntro();
  }
  G.onDemoEnd = function () { if (screen === 'title' || screen === 'menu') startDemo(); };
  function toMenu() {
    G.pause(false);
    var m = G.match(); if (!m || m.mode !== 'demo') startDemo();
    show('menu'); A.music(5); refreshMenu();
  }

  /* ---------- menu ---------- */
  function refreshMenu() {
    document.querySelectorAll('.diff button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-diff') === GB.save.diff); });
    $('muteBtn').textContent = 'SOUND: ' + (A.isMuted() ? 'OFF' : 'ON');
    $('pMute').textContent = 'SOUND: ' + (A.isMuted() ? 'OFF' : 'ON');
    var s = GB.save; $('record').textContent = 'Wins ' + s.wins + ' \u00b7 Losses ' + s.losses + ' \u00b7 Arcade clears ' + s.arcadeClears;
    $('btn2p').classList.toggle('hidden', isTouch);
  }

  /* ---------- character select ---------- */
  function statBars(label, v, fc) { var h = '<div class="st"><span>' + label + '</span><div class="bars">'; for (var i = 1; i <= 5; i++) h += '<i class="' + (i <= v ? 'on' : '') + '"></i>'; return h + '</div></div>'; }
  function infoHtml(def, who, locked) {
    if (locked) return '<span class="who">' + who + '</span><div class="nm">???</div><div class="ti">Secret fighter</div><div class="sp">Beat <b>ARCADE</b> mode to unlock this fighter!</div>';
    return '<span class="who">' + who + '</span><div class="nm">' + def.name + '</div><div class="ti">' + def.title + '</div>' +
      statBars('SPEED', def.stats.speed) + statBars('POWER', def.stats.power) + statBars('WEIGHT', def.stats.weight) +
      '<div class="sp"><b>SPECIAL:</b> ' + def.special.name + '<br><b>SUPER:</b> ' + def.super.name + '</div>';
  }
  function slotLabel(i) { if (!sel) return ''; if (i === 0) return 'PLAYER 1'; return sel.mode === '2p' ? 'PLAYER 2' : sel.mode === 'training' ? 'DUMMY' : 'CPU'; }
  function openSelect(mode) {
    sel = { mode: mode, slot: 0, picks: [sel && sel.picks[0] || 'blaze', sel && sel.picks[1] || 'volt'], nSlots: mode === 'arcade' ? 1 : 2, cursor: 0, locked: [false, false] };
    if (sel.nSlots === 1) sel.picks[1] = null;
    buildCards(); show('select'); updateSelect(); A.music(5);
  }
  function buildCards() {
    var wrap = $('cards'); wrap.innerHTML = '';
    GB.FIGHTERS.concat([{ id: 'random', name: 'RANDOM', color: '#ffffff' }]).forEach(function (f, i) {
      var b = document.createElement('button'); b.className = 'card' + (f.id === 'random' ? ' rand' : '') + (f.id !== 'random' && !GB.isUnlocked(f.id) ? ' locked' : '');
      b.style.setProperty('--fc', f.color); b.setAttribute('data-id', f.id); b.setAttribute('aria-label', f.name);
      if (portraits[f.id] && GB.isUnlocked(f.id)) b.style.backgroundImage = 'url(' + portraits[f.id] + ')';
      b.innerHTML = '<span class="cn">' + (f.id !== 'random' && !GB.isUnlocked(f.id) ? '???' : f.name) + '</span>';
      b.addEventListener('click', function () { pickCard(f.id); });
      wrap.appendChild(b);
    });
  }
  function randomId() { var pool = GB.FIGHTERS.filter(function (f) { return GB.isUnlocked(f.id); }); return pool[(Math.random() * pool.length) | 0].id; }
  function pickCard(id) {
    A.unlock();
    if (id !== 'random' && !GB.isUnlocked(id)) { sel.tapped = null; A.play('back'); $('info' + sel.slot).innerHTML = infoHtml(null, slotLabel(sel.slot), true); return; }
    var real = id === 'random' ? randomId() : id;
    if (sel.picks[sel.slot] === real && sel.tapped === real && id !== 'random') { confirmSlot(); return; }
    sel.picks[sel.slot] = real; sel.tapped = real; A.play('select'); updateSelect();
  }
  function confirmSlot() {
    A.play('confirm'); G.showroom(sel.picks, sel.slot);
    sel.tapped = null;
    if (sel.slot + 1 < sel.nSlots) { sel.slot++; updateSelect(); return; }
    setTimeout(function () {
      if (sel.mode === 'arcade') startArcade(sel.picks[0]);
      else openArena();
    }, 450);
  }
  function updateSelect() {
    G.showroom(sel.picks);
    $('selTitle').textContent = sel.nSlots === 1 ? 'CHOOSE YOUR FIGHTER' : sel.slot === 0 ? 'PLAYER 1: CHOOSE' : (sel.mode === '2p' ? 'PLAYER 2: CHOOSE' : sel.mode === 'training' ? 'CHOOSE DUMMY' : 'CHOOSE CPU FIGHTER');
    for (var i = 0; i < 2; i++) {
      var el = $('info' + i), id = sel.picks[i];
      if (!id) { el.classList.add('hidden'); continue; }
      el.classList.remove('hidden'); el.classList.toggle('wait', i > sel.slot);
      var def = GB.fighter(id); el.style.setProperty('--fc', def.color); el.innerHTML = infoHtml(def, slotLabel(i));
    }
    document.querySelectorAll('#cards .card').forEach(function (c) {
      var id = c.getAttribute('data-id'); c.classList.toggle('sel0', sel.picks[0] === id); c.classList.toggle('sel1', sel.picks[1] === id && sel.nSlots > 1);
      c.querySelectorAll('.badge').forEach(function (b) { b.remove(); });
      if (sel.picks[0] === id) c.insertAdjacentHTML('beforeend', '<span class="badge">P1</span>');
      if (sel.nSlots > 1 && sel.picks[1] === id && sel.slot >= 1) c.insertAdjacentHTML('beforeend', '<span class="badge b1">' + (sel.mode === '2p' ? 'P2' : sel.mode === 'training' ? 'DUM' : 'CPU') + '</span>');
    });
    $('selGo').innerHTML = (sel.slot + 1 < sel.nSlots ? 'NEXT' : sel.mode === 'arcade' ? 'START' : 'ARENA') + ' &#9654;';
  }

  /* ---------- arena select ---------- */
  function openArena() {
    arenaPick = arenaPick || 'rooftop'; arenaTapped = null;
    var wrap = $('acards'); wrap.innerHTML = '';
    GB.ARENAS.concat([{ id: 'random', name: 'RANDOM', css: 'linear-gradient(135deg,#ff4a2e,#7d3aff,#3ff0ff)' }]).forEach(function (a) {
      var b = document.createElement('button'); b.className = 'card acard'; b.style.background = a.css; b.setAttribute('data-id', a.id);
      b.innerHTML = '<span class="cn">' + a.name + '</span>';
      b.addEventListener('click', function () { var id = a.id === 'random' ? GB.ARENAS[(Math.random() * GB.ARENAS.length) | 0].id : a.id; if (id === arenaPick && arenaTapped === id && a.id !== 'random') { goFight(); return; } arenaPick = id; arenaTapped = id; A.play('select'); updArena(); });
      wrap.appendChild(b);
    });
    show('arenaSel'); updArena();
  }
  function updArena() {
    var a = GB.arena(arenaPick); $('aName').innerHTML = a.name + '<small>' + a.sub + '</small>';
    document.querySelectorAll('#acards .card').forEach(function (c) { c.classList.toggle('sel0', c.getAttribute('data-id') === arenaPick); });
    G.previewArena(arenaPick, sel.picks[0], sel.picks[1]);
  }
  function goFight() {
    A.play('confirm');
    var cfg = { mode: sel.mode, p1: sel.picks[0], p2: sel.picks[1], arena: arenaPick, diff: GB.save.diff };
    launch(cfg);
  }

  /* ---------- arcade ---------- */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function startArcade(p1) {
    var opp = shuffle(GB.FIGHTERS.filter(function (f) { return !f.hidden && f.id !== p1; }).map(function (f) { return f.id; }));
    var arenas = ['rooftop', 'vegas', 'dojo', 'volcano'];
    var list = opp.map(function (id, i) { return { id: id, arena: arenas[i % arenas.length] }; });
    list.push({ id: 'prime', arena: 'hangar', boss: true });
    arcade = { p1: p1, list: list, idx: 0, diff: GB.save.diff };
    openLadder();
  }
  function openLadder() {
    var row = $('ladRow'); row.innerHTML = '';
    arcade.list.forEach(function (o, i) {
      var d = GB.fighter(o.id), el = document.createElement('div');
      el.className = 'lad' + (i < arcade.idx ? ' done' : '') + (i === arcade.idx ? ' cur' : '') + (o.boss ? ' boss' : '');
      el.style.setProperty('--fc', d.color);
      var showImg = !o.boss || GB.isUnlocked('prime') || i <= arcade.idx;
      if (showImg) el.style.backgroundImage = 'url(' + portraits[o.id] + ')';
      el.innerHTML = '<span class="ln">' + (o.boss && !showImg ? 'BOSS' : d.name) + '</span>';
      row.appendChild(el);
    });
    var cur = arcade.list[arcade.idx], cd = GB.fighter(cur.id);
    $('ladTitle').textContent = 'ARCADE \u00b7 ' + GB.DIFFS[arcade.diff].label;
    $('ladVs').innerHTML = GB.fighter(arcade.p1).name + ' <span style="color:#ff4fd8">VS</span> ' + cd.name + '<small>' + (cur.boss ? 'FINAL BOSS \u00b7 ' : 'Stage ' + (arcade.idx + 1) + ' of ' + arcade.list.length + ' \u00b7 ') + GB.arena(cur.arena).name + '</small>';
    G.showroom([arcade.p1, cur.id]);
    show('ladder'); A.music(5);
  }
  function arcadeFight() {
    var cur = arcade.list[arcade.idx];
    launch({ mode: 'arcade', p1: arcade.p1, p2: cur.id, arena: cur.arena, diff: arcade.diff, boss: !!cur.boss });
  }

  /* ---------- fight ---------- */
  function launch(cfg) {
    lastCfg = cfg;
    $('fade').classList.add('on');
    setTimeout(function () {
      G.start(cfg); G.hudInit(portraits);
      document.querySelectorAll('#trainBar [data-dm]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-dm') === 'stand'); });
      $('tMeter').classList.add('on'); $('tInfo').textContent = cfg.mode === 'training' ? 'TIP: tap JUMP up to 3 times for a TRIPLE JUMP' : '';
      show('fight'); A.music(GB.arena(cfg.arena).music);
      $('fade').classList.remove('on');
    }, 250);
  }
  UI.launch = launch;
  G.onMatchEnd = function (res, m) {
    var cfg = m.cfg, win = res.winner, wd = GB.fighter(win === 0 ? cfg.p1 : cfg.p2), s = GB.save;
    if (cfg.mode !== '2p') {
      s.matches++; if (win === 0) { s.wins++; s.winsByDiff[cfg.diff] = (s.winsByDiff[cfg.diff] || 0) + 1; s.fighterWins[cfg.p1] = (s.fighterWins[cfg.p1] || 0) + 1; } else s.losses++;
    }
    var btns = [], sub = '', top = false;
    if (cfg.mode === 'arcade') {
      if (win === 0) {
        if (arcade.idx + 1 >= arcade.list.length) {
          sub = 'ARCADE CLEAR! You beat the boss!';
          s.arcadeClears++; var newUnlock = !s.unlocked.prime; s.unlocked.prime = true;
          btns = [['MENU', toMenuFade]];
          if (newUnlock) setTimeout(showUnlock, 900);
        } else { sub = 'Stage ' + (arcade.idx + 1) + ' cleared!'; btns = [['NEXT FIGHT \u25B6', function () { arcade.idx++; openLadder(); }]]; }
      } else { sub = 'CONTINUE?'; btns = [['RETRY', function () { arcadeFight(); }], ['QUIT', toMenuFade]]; }
    } else {
      sub = cfg.mode === '2p' ? (win === 0 ? 'Player 1 takes it!' : 'Player 2 takes it!') : (win === 0 ? 'You win!' : 'The CPU wins this time');
      btns = [['REMATCH', function () { var c = {}; for (var k in cfg) c[k] = cfg[k]; delete c.seed; launch(c); }], ['CHANGE FIGHTERS', function () { openSelect(cfg.mode); }], ['MENU', toMenuFade]];
    }
    GB.persist();
    var st = res.stats[0];
    $('rWin').textContent = wd.name + ' WINS!'; $('result').style.setProperty('--fc', wd.color);
    $('rSub').textContent = sub;
    $('rStats').innerHTML = 'Rounds <b>' + res.wins[0] + '-' + res.wins[1] + '</b> &nbsp; Best combo <b>' + st.maxCombo + '</b> &nbsp; Damage <b>' + st.dmg + '</b> &nbsp; Specials <b>' + st.specials + '</b> &nbsp; Supers <b>' + st.supers + '</b>';
    var rb = $('rBtns'); rb.innerHTML = '';
    btns.forEach(function (b, i) { var e = document.createElement('button'); e.className = 'big' + (i ? ' alt' : ''); e.textContent = b[0]; e.addEventListener('click', function () { A.play('confirm'); b[1](); }); rb.appendChild(e); });
    show('result');
  };
  function showUnlock() { A.play('unlock'); $('uImg').src = portraits.prime; $('unlock').classList.remove('hidden'); }
  function toMenuFade() { $('fade').classList.add('on'); setTimeout(function () { G.quit(); toMenu(); $('fade').classList.remove('on'); }, 250); }

  /* ---------- pause / moves ---------- */
  function pause() { var m = G.match(); if (!m || m.mode === 'demo' || screen !== 'fight') return; G.pause(true); show('pause'); A.play('select'); refreshMenu(); }
  function resume() { G.pause(false); show('fight'); }
  function movesHtml(def) {
    var k = function (s) { return s.split('/').map(function (x) { return '<kbd>' + x.trim() + '</kbd>'; }).join(' '); };
    var h = '';
    if (def) h += '<h3>' + def.name + ' \u2014 ' + def.title + '</h3><table><tr><td>SPECIAL: ' + def.special.name.toUpperCase() + '</td><td>' + def.special.desc + ' Costs 1/3 of the meter.</td></tr><tr><td>SUPER: ' + def.super.name + '</td><td>' + def.super.desc + ' Needs a full meter.</td></tr></table>';
    h += '<h3>MOVES (ALL FIGHTERS)</h3><table>' +
      '<tr><td>PUNCH CHAIN</td><td>Tap Punch up to 3 times. The 3rd hit is an uppercut launcher.</td></tr>' +
      '<tr><td>KICK CHAIN</td><td>Tap Kick up to 3 times. The 3rd kick knocks them flying. Mix punches and kicks too!</td></tr>' +
      '<tr><td>CANCEL</td><td>Hit with a punch or kick, then press Special to cancel into it.</td></tr>' +
      '<tr><td>TRIPLE JUMP</td><td>Press Jump again in the air for a double jump (flip!) and a third time for a triple jump. Jump right over your opponent to hit them from behind!</td></tr>' +
      '<tr><td>AIR ATTACK</td><td>Punch or Kick while jumping. You get a fresh air attack after every extra jump.</td></tr>' +
      '<tr><td>BLOCK</td><td>Hold Block (or hold down). Blocking too much breaks your guard.</td></tr>' +
      '<tr><td>DASH / DODGE</td><td>Dash forward or back. You are briefly invincible while dashing.</td></tr>' +
      '<tr><td>METER</td><td>Fills when you deal or take damage. 1/3 = Special, full = SUPER.</td></tr></table>';
    h += '<h3>KEYBOARD</h3><table>' +
      '<tr><td>MOVE</td><td>' + k('A / D') + ' or ' + k('\u2190 / \u2192') + '</td></tr><tr><td>JUMP</td><td>' + k('W / \u2191') + '</td></tr>' +
      '<tr><td>PUNCH / KICK</td><td>' + k('J') + ' / ' + k('K') + '</td></tr><tr><td>BLOCK</td><td>' + k('L') + ' or ' + k('S / \u2193') + '</td></tr>' +
      '<tr><td>SPECIAL</td><td>' + k('I') + '</td></tr><tr><td>DASH</td><td>' + k('Shift') + ' (+ direction)</td></tr><tr><td>SUPER</td><td>' + k('J') + '+' + k('K') + ' together, or ' + k('O') + '</td></tr>' +
      '<tr><td>PAUSE</td><td>' + k('Esc / P') + ' &nbsp; Mute: ' + k('M') + '</td></tr></table>';
    h += '<h3>2 PLAYERS (SAME KEYBOARD)</h3><table><tr><td>PLAYER 1</td><td>' + k('W A S D') + ' move, ' + k('F') + ' punch, ' + k('G') + ' kick, ' + k('H') + ' block, ' + k('R') + ' special, ' + k('T') + ' super, ' + k('Q') + ' dash</td></tr>' +
      '<tr><td>PLAYER 2</td><td>Arrows move, ' + k('J') + ' punch, ' + k('K') + ' kick, ' + k('L') + ' block, ' + k('I') + ' special, ' + k('O') + ' super, ' + k('U') + ' / Right ' + k('Shift') + ' dash</td></tr></table>';
    h += '<h3>PHONE</h3><table><tr><td>LEFT THUMB</td><td>Joystick: left/right to walk, up to jump (flick up again to double / triple jump), down to block. Flick twice to dash.</td></tr><tr><td>RIGHT THUMB</td><td>PUNCH, KICK, BLOCK, JUMP (tap up to 3 times for a triple jump), DASH, SPECIAL (glows when ready), SUPER (glows gold when full).</td></tr></table>';
    return h;
  }
  function openMoves(fromPause) {
    var m = G.match(), def = m && m.mode !== 'demo' ? GB.fighter(m.cfg.p1) : null;
    UI._movesFromPause = !!fromPause; $('mvTitle').textContent = def ? 'MOVE LIST' : 'CONTROLS';
    $('mvList').innerHTML = movesHtml(def); $('moves').classList.remove('hidden'); UI._prevScreen = screen; $('mvList').scrollTop = 0;
    if (m && m.mode !== 'demo' && screen === 'fight') G.pause(true);
  }
  function closeMoves() { $('moves').classList.add('hidden'); if (UI._prevScreen === 'fight') { G.pause(false); } }

  /* ---------- wiring ---------- */
  function init() {
    G.init($('c'), isTouch);
    I.initTouch();
    try { portraits = G.portraits(); } catch (e) { portraits = {}; }
    startDemo();
    show('title');
    $('titleHelp').textContent = isTouch ? 'Hold your phone sideways \u00b7 joystick on the left, buttons on the right' : 'Keyboard: A/D move \u00b7 W jump \u00b7 J punch \u00b7 K kick \u00b7 L block \u00b7 I special \u00b7 Shift dash \u00b7 O super';
    var start = function () { if (screen !== 'title') return; A.unlock(); A.play('confirm'); toMenu(); };
    $('startBtn').addEventListener('click', start);
    $('title').addEventListener('pointerup', function (e) { if (e.target === $('title')) start(); });
    document.querySelectorAll('.mbtn').forEach(function (b) { b.addEventListener('click', function () { A.unlock(); A.play('confirm'); openSelect(b.getAttribute('data-mode')); }); });
    document.querySelectorAll('.diff button').forEach(function (b) { b.addEventListener('click', function () { GB.save.diff = b.getAttribute('data-diff'); GB.persist(); A.play('select'); refreshMenu(); }); });
    $('muteBtn').addEventListener('click', function () { A.unlock(); A.toggle(); refreshMenu(); });
    $('pMute').addEventListener('click', function () { A.toggle(); refreshMenu(); });
    $('howBtn').addEventListener('click', function () { openMoves(false); });
    document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', back); });
    $('selGo').addEventListener('click', function () { confirmSlot(); });
    $('arenaGo').addEventListener('click', goFight);
    $('ladGo').addEventListener('click', function () { A.play('confirm'); arcadeFight(); });
    $('pauseBtn').addEventListener('click', pause);
    $('pResume').addEventListener('click', resume);
    $('pMoves').addEventListener('click', function () { openMoves(true); });
    $('pRestart').addEventListener('click', function () { G.pause(false); var m = G.match(); launch(m && m.mode !== 'demo' ? m.cfg : lastCfg); });
    $('pQuit').addEventListener('click', function () { G.pause(false); toMenuFade(); });
    $('mvClose').addEventListener('click', closeMoves);
    $('uOk').addEventListener('click', function () { $('unlock').classList.add('hidden'); });
    document.querySelectorAll('#trainBar [data-dm]').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('#trainBar [data-dm]').forEach(function (x) { x.classList.toggle('on', x === b); }); G.setTrainingDummy(b.getAttribute('data-dm')); }); });
    $('tMeter').addEventListener('click', function () { var on = !$('tMeter').classList.contains('on'); $('tMeter').classList.toggle('on', on); G.setTrainingMeter(on); });
    $('tMoves').addEventListener('click', function () { openMoves(false); });
    $('tReset').addEventListener('click', function () { G.resetPositions(); });
    I.onKey = onKey;
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && screen === 'fight') pause(); });
  }
  function back() {
    A.play('back');
    if (screen === 'select') { if (sel.slot > 0) { sel.slot--; updateSelect(); } else toMenu(); }
    else if (screen === 'arenaSel') { sel.slot = sel.nSlots - 1; show('select'); updateSelect(); }
    else if (screen === 'ladder') { toMenu(); }
  }
  function onKey(e) {
    if (e.repeat) return false;
    var c = e.code;
    if (c === 'KeyM' && screen !== 'fight') { A.unlock(); A.toggle(); refreshMenu(); return true; }
    if (!$('moves').classList.contains('hidden')) { if (c === 'Escape' || c === 'Enter') { closeMoves(); return true; } return false; }
    if (!$('unlock').classList.contains('hidden')) { if (c === 'Enter' || c === 'Space' || c === 'Escape') { $('unlock').classList.add('hidden'); return true; } }
    switch (screen) {
      case 'title': if (c === 'Enter' || c === 'Space' || c === 'KeyJ') { A.unlock(); A.play('confirm'); toMenu(); return true; } break;
      case 'menu':
        var bs = Array.prototype.filter.call(document.querySelectorAll('.mbtn'), function (b) { return !b.classList.contains('hidden'); });
        var cur = bs.findIndex(function (b) { return b.classList.contains('focus'); });
        if (c === 'ArrowDown' || c === 'KeyS') { cur = (cur + 1) % bs.length; } else if (c === 'ArrowUp' || c === 'KeyW') { cur = (cur - 1 + bs.length) % bs.length; }
        else if ((c === 'Enter' || c === 'KeyJ' || c === 'Space') && cur >= 0) { bs[cur].click(); return true; }
        else if (c === 'ArrowLeft' || c === 'ArrowRight') { var o = ['easy', 'normal', 'hard'], k = o.indexOf(GB.save.diff) + (c === 'ArrowRight' ? 1 : -1); GB.save.diff = o[Math.max(0, Math.min(2, k))]; GB.persist(); refreshMenu(); A.play('select'); return true; }
        else return false;
        bs.forEach(function (b, i) { b.classList.toggle('focus', i === cur); }); A.play('select'); return true;
      case 'select':
        var ids = GB.FIGHTERS.filter(function (f) { return GB.isUnlocked(f.id); }).map(function (f) { return f.id; });
        var i = Math.max(0, ids.indexOf(sel.picks[sel.slot]));
        if (c === 'ArrowRight' || c === 'KeyD') { sel.picks[sel.slot] = ids[(i + 1) % ids.length]; A.play('select'); updateSelect(); return true; }
        if (c === 'ArrowLeft' || c === 'KeyA') { sel.picks[sel.slot] = ids[(i - 1 + ids.length) % ids.length]; A.play('select'); updateSelect(); return true; }
        if (c === 'Enter' || c === 'KeyJ' || c === 'Space') { confirmSlot(); return true; }
        if (c === 'Escape' || c === 'Backspace') { back(); return true; }
        break;
      case 'arenaSel':
        var as = GB.ARENAS.map(function (a) { return a.id; }), j = as.indexOf(arenaPick);
        if (c === 'ArrowRight' || c === 'KeyD') { arenaPick = as[(j + 1) % as.length]; A.play('select'); updArena(); return true; }
        if (c === 'ArrowLeft' || c === 'KeyA') { arenaPick = as[(j - 1 + as.length) % as.length]; A.play('select'); updArena(); return true; }
        if (c === 'Enter' || c === 'KeyJ' || c === 'Space') { goFight(); return true; }
        if (c === 'Escape' || c === 'Backspace') { back(); return true; }
        break;
      case 'ladder': if (c === 'Enter' || c === 'KeyJ' || c === 'Space') { A.play('confirm'); arcadeFight(); return true; } if (c === 'Escape') { back(); return true; } break;
      case 'result': if (c === 'Enter' || c === 'Space') { var fb = document.querySelector('#rBtns button'); if (fb) fb.click(); return true; } break;
      case 'fight': if (c === 'Escape' || c === 'KeyP') { pause(); return true; } if (c === 'KeyM') { A.toggle(); return true; } break;
      case 'pause': if (c === 'Escape' || c === 'KeyP') { resume(); return true; } break;
    }
    return false;
  }
  UI.portraits = function () { return portraits; };
  UI.openSelect = openSelect; UI.toMenu = toMenu; UI.startArcade = startArcade; UI.sel = function () { return sel; }; UI.arcade = function () { return arcade; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
