/* Grok Brawl - online 1v1 on two phones (Grok Arcade Multiplayer Antenna).
   Deterministic lockstep: both phones run the same match and only exchange button presses (with a few frames of input delay).
   1v1 (default): host = left fighter, first friend = right fighter, a 3rd player watches.
   3P free-for-all (host picks it in the arcade lobby or on the select screen): all three fight. */
(function () {
  'use strict';
  var O = GB.Online = { active: false };
  var GN = window.GrokNet; if (!GN) return;
  var prm = GN.params(); if (!prm) return;
  O.active = true;
  var DELAY = 4, HASH_EVERY = 90;
  var C = GB.Combat, room = null, meta = {}, mySide = -1, myPid = null, cur = null, frame = 0, bufs = {}, stallF = 0, hashes = {}, stats = { desyncs: 0, hashChecks: 0, stalls: 0, maxStall: 0 };
  var hostName = '', localResult = null, phase = 'connecting', startedMid = 0, lockSent = null, tmp = {}, badge = null, leftShown = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return GN.esc(s); }
  function pool() { return GB.FIGHTERS.filter(function (f) { return !f.hidden; }); }
  function players() { return room ? room.players() : []; }
  function byPid(pid) { return room && room.player(pid); }
  function ffa() { return meta.fmt === 'ffa'; }
  function nSides() { return ffa() ? 3 : 2; }
  function sides() { var l = players(), out = []; for (var i = 0; i < nSides(); i++) out.push(l[i] && l[i].pid); return out; }
  var SPEC = 9; // mySide for a spectator
  function others(s) { return s.filter(function (pid) { return pid && pid !== myPid; }); }
  function nameOf(pid, fb) { var p = byPid(pid); return (p && p.name) || fb || 'your friend'; }
  function bits(c) { var b = 0; C.BTN.forEach(function (k, i) { if (c[k]) b |= 1 << i; }); return b; }
  function unbits(c, b) { C.BTN.forEach(function (k, i) { c[k] = !!(b & (1 << i)); }); }
  function buf(mid) { return bufs[mid] || (bufs[mid] = [{}, {}, {}]); }

  /* ---------- overlay ---------- */
  function build() {
    var css = document.createElement('style');
    css.textContent =
      '#ol{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(10,4,26,.7);padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));font-family:"Trebuchet MS",system-ui,sans-serif;color:#fff}' +
      '#ol.hidden{display:none}#ol .olBox{width:min(860px,100%);max-height:100%;overflow:auto;background:linear-gradient(180deg,rgba(42,18,96,.96),rgba(20,8,48,.96));border:3px solid #ff3d6e;border-radius:18px;padding:12px 14px;box-shadow:0 0 30px rgba(255,61,110,.5);text-align:center}' +
      '#ol h2{margin:2px 0 6px;font-size:22px;letter-spacing:1px}#ol .olTop{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px;margin-bottom:6px}' +
      '#ol .olCode{background:#1b0d3d;border:2px solid #3ff0ff;border-radius:10px;padding:2px 10px;font-weight:900;letter-spacing:3px;color:#3ff0ff}' +
      '#ol .olVs{display:flex;gap:10px;align-items:center;justify-content:center;font-weight:900;font-size:16px}#ol .olVs i{font-style:normal;color:#ffe14d}' +
      '#ol .olP{padding:2px 10px;border-radius:10px;border:2px solid var(--pc);color:#fff;background:rgba(0,0,0,.25)}' +
      '#ol .olGrid{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin:6px 0}' +
      '#ol .olCard{position:relative;border:3px solid rgba(255,255,255,.25);border-radius:12px;background:#140a30 center 30%/cover no-repeat;min-height:104px;cursor:pointer;color:#fff;font:900 13px "Trebuchet MS",sans-serif;display:flex;align-items:flex-end;justify-content:center;padding:4px;touch-action:manipulation}' +
      '#ol .olCard span{background:rgba(0,0,0,.6);border-radius:6px;padding:1px 6px}#ol .olCard.me{border-color:var(--mc);box-shadow:0 0 16px var(--mc)}#ol .olCard.op{outline:3px dashed var(--oc);outline-offset:-8px}' +
      '#ol .olCard .tg{position:absolute;top:4px;font-size:11px;padding:1px 6px;border-radius:6px;color:#1b1030}#ol .olCard .tg.a{left:4px;background:var(--mc)}#ol .olCard .tg.b{right:4px;background:var(--oc)}' +
      '#ol .olArenas{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:4px 0}#ol .olAr{border:2px solid rgba(255,255,255,.3);background:#1b0d3d;color:#fff;border-radius:10px;padding:6px 10px;font:700 13px "Trebuchet MS",sans-serif;cursor:pointer}' +
      '#ol .olAr.on{border-color:#ffe14d;background:#3a2a00;color:#ffe14d}#ol .olAr:disabled{cursor:default;opacity:.8}' +
      '#ol .olBig{min-width:200px;min-height:54px;border:0;border-radius:14px;font:900 20px "Trebuchet MS",sans-serif;color:#1b1030;background:linear-gradient(180deg,#ffe14d,#ff9a1f);margin:6px 4px;cursor:pointer;padding:6px 18px;touch-action:manipulation}' +
      '#ol .olBig.alt{background:linear-gradient(180deg,#7df3ff,#2aa7c9)}#ol .olBig.ok{background:linear-gradient(180deg,#6ff0a8,#22a861)}#ol .olBig.dim{background:#4b3b78;color:#ddd}' +
      '#ol .olStatus{min-height:20px;font-size:15px;color:#e9e2ff}#ol .olWin{font-size:34px;font-weight:900;color:#ffe14d;text-shadow:0 0 14px rgba(255,225,77,.7)}#ol .spin{width:34px;height:34px;border:4px solid rgba(255,255,255,.2);border-top-color:#3ff0ff;border-radius:50%;margin:10px auto;animation:olspin 1s linear infinite}@keyframes olspin{to{transform:rotate(360deg)}}' +
      '#olWait{position:fixed;left:50%;top:max(54px,env(safe-area-inset-top));transform:translateX(-50%);z-index:45;background:rgba(10,4,26,.85);border:2px solid #ffe14d;color:#ffe14d;font:900 14px "Trebuchet MS",sans-serif;padding:5px 12px;border-radius:10px;pointer-events:none}#olWait.hidden{display:none}' +
      'body.online #pauseBtn{display:none!important}' +
      '#ol .olFmt{display:flex;gap:6px;justify-content:center;align-items:center;margin:2px 0 4px;font-size:13px}#ol .olFmt button{border:2px solid rgba(255,255,255,.3);background:#1b0d3d;color:#fff;border-radius:10px;padding:5px 10px;font:900 13px "Trebuchet MS",sans-serif;cursor:pointer}#ol .olFmt button.on{border-color:#ff4fd8;background:#4a0f3e;color:#ffd0f3}#ol .olFmt button:disabled{cursor:default}' +
      '#ol .olCard .tg.b2{top:24px}' +
      '@media (max-height:440px){#ol .olBox{padding:8px 10px}#ol h2{font-size:18px;margin:0 0 4px}#ol .olCard{min-height:84px}#ol .olBig{min-height:46px;font-size:18px;margin:4px}#ol .olGrid{gap:6px;margin:4px 0}}' +
      '@media (max-width:560px){#ol .olGrid{grid-template-columns:repeat(4,1fr)}}';
    document.head.appendChild(css);
    var d = document.createElement('div'); d.id = 'ol'; d.innerHTML = '<div class="olBox" id="olBox"></div>'; document.body.appendChild(d);
    var w = document.createElement('div'); w.id = 'olWait'; w.className = 'hidden'; document.body.appendChild(w);
    document.body.classList.add('online');
  }
  function showOv(html) { $('olBox').innerHTML = html; $('ol').classList.remove('hidden'); }
  function hideOv() { $('ol').classList.add('hidden'); }
  function top() {
    var l = players(), s = sides();
    var vs = '<div class="olVs">' + s.map(function (pid) { var a = byPid(pid); return a ? '<span class="olP" style="--pc:' + a.color + '">' + esc(a.name) + '</span>' : '<span class="olP" style="--pc:#666">waiting\u2026</span>'; }).join('<i>VS</i>') + '</div>';
    var spec = l.slice(nSides()).map(function (p) { return esc(p.name); }).join(', ');
    return '<div class="olTop"><span class="olCode">' + esc(room.code) + '</span>' + vs + '<span>' + (spec ? '\uD83D\uDC40 ' + spec : (l.length) + '/3') + '</span></div>';
  }
  function btn(id, text, cls) { return '<button id="' + id + '" class="olBig ' + (cls || '') + '">' + text + '</button>'; }
  function on(id, fn) { var e = $(id); if (e) e.addEventListener('click', function () { GB.Audio && GB.Audio.play && GB.Audio.play('confirm'); fn(); }); }
  function footBtns() { return room.isHost ? btn('olLobby', 'BACK TO LOBBY', 'alt') : btn('olLeave', 'LEAVE', 'dim'); }
  function bindFoot() { on('olLobby', backToLobby); on('olLeave', leave); }

  function renderWait(msg) {
    phase = phase === 'connecting' ? 'connecting' : 'wait';
    showOv('<h2>GROK BRAWL ONLINE</h2>' + (room && room.opened ? top() : '') + '<div class="spin"></div><div class="olStatus">' + esc(msg) + '</div>' + (room && room.opened ? footBtns() : ''));
    if (room && room.opened) bindFoot();
  }
  function renderSelect() {
    if (phase !== 'select') { var gm = GB.Game.match(); if (gm && gm.mode === 'online') GB.UI.startDemo(); }
    phase = 'select';
    var s = sides(), mine = mySide < SPEC, picks = meta.picks || {}, me = picks[myPid] || {}, opps = mine ? others(s) : s.filter(Boolean), oppPid = opps[0] || null;
    var meP = byPid(myPid) || {}, opP = (oppPid && byPid(oppPid)) || {};
    var portraits = GB.UI.portraits ? GB.UI.portraits() : {};
    var grid = pool().map(function (f) {
      var who = opps.filter(function (pid) { return (picks[pid] || {}).f === f.id; });
      var cls = 'olCard' + (me.f === f.id && mine ? ' me' : '') + (who.length ? ' op' : '');
      var oc = who.length ? ((byPid(who[0]) || {}).color || '#fff') : (opP.color || '#fff');
      return '<button class="' + cls + '" data-id="' + f.id + '" style="background-image:url(' + (portraits[f.id] || '') + ');--mc:' + (meP.color || '#fff') + ';--oc:' + oc + '"' + (mine ? '' : ' disabled') + '>' +
        (me.f === f.id && mine ? '<b class="tg a">YOU</b>' : '') + who.map(function (pid, k) { var pp = byPid(pid) || {}; return '<b class="tg b' + (k ? ' b2' : '') + '" style="background:' + (pp.color || '#fff') + '">' + esc((pp.name || '').slice(0, 8)) + '</b>'; }).join('') + '<span>' + f.name + '</span></button>';
    }).join('');
    var nPl = players().length;
    var fmt = '<div class="olFmt">' + (room.isHost ? '<button id="olF1" class="' + (ffa() ? '' : 'on') + '">1 VS 1</button><button id="olF3" class="' + (ffa() ? 'on' : '') + '"' + (nPl < 3 && !ffa() ? ' disabled title="Needs 3 players"' : '') + '>3P FREE-FOR-ALL</button>' + (nPl < 3 ? '<small>(3P needs a 3rd player)</small>' : '')
      : '<span class="olP" style="--pc:#ff4fd8">' + (ffa() ? '3-PLAYER FREE-FOR-ALL' : '1 VS 1') + '</span>') + '</div>';
    var missing = s.filter(function (pid) { return !pid; }).length, notLocked = opps.filter(function (pid) { return !(picks[pid] || {}).lock; });
    var ar = GB.ARENAS.map(function (a) { return '<button class="olAr' + (meta.arena === a.id ? ' on' : '') + '" data-ar="' + a.id + '"' + (room.isHost ? '' : ' disabled') + '>' + esc(a.name) + '</button>'; }).join('');
    var st;
    if (!mine) st = 'You\u2019re watching this match. It starts when all fighters lock in.';
    else if (missing) st = ffa() ? 'Waiting for a 3rd player to join\u2026' + (room.isHost ? ' (or switch to 1 VS 1)' : '') : 'Waiting for your friend\u2026';
    else if (me.lock && !notLocked.length) st = (ffa() ? 'Everyone' : 'Both') + ' locked in. FIGHT!';
    else if (me.lock) st = notLocked.map(function (pid) { return esc(nameOf(pid)); }).join(' & ') + (notLocked.length > 1 ? ' are' : ' is') + ' choosing\u2026';
    else if (!notLocked.length) st = (opps.length > 1 ? 'Everyone else is' : esc(opP.name) + ' is') + ' ready! Pick and lock in.';
    else st = 'Pick your fighter, then LOCK IN.' + (room.isHost ? ' You choose the arena.' : '');
    showOv('<h2>' + (ffa() ? 'FREE-FOR-ALL: CHOOSE YOUR FIGHTER' : 'CHOOSE YOUR FIGHTER') + '</h2>' + top() + fmt + '<div class="olGrid">' + grid + '</div><div class="olArenas">' + ar + '</div>' +
      '<div class="olStatus" id="olSt">' + st + '</div>' +
      (mine ? btn('olLock', me.lock ? 'LOCKED \u2713' : 'LOCK IN', me.lock ? 'ok' : (me.f ? '' : 'dim')) : '') + footBtns());
    Array.prototype.forEach.call(document.querySelectorAll('#ol .olCard'), function (b) { b.addEventListener('click', function () { if (!mine) return; GB.Audio.play && GB.Audio.play('select'); pick(b.getAttribute('data-id'), false); }); });
    Array.prototype.forEach.call(document.querySelectorAll('#ol .olAr'), function (b) { b.addEventListener('click', function () { if (!room.isHost) return; room.setMeta({ arena: b.getAttribute('data-ar') }); }); });
    on('olF1', function () { if (room.isHost && ffa()) setFmt('1v1'); });
    on('olF3', function () { if (room.isHost && !ffa() && players().length >= 3) setFmt('ffa'); });
    on('olLock', function () { var m2 = (meta.picks || {})[myPid] || {}; if (!m2.f) { pick(pool()[0].id, false); return; } pick(m2.f, !m2.lock); });
    bindFoot();
  }
  function renderResult() {
    phase = 'result';
    var r = (meta.result && cur && meta.result.mid === cur.mid ? meta.result : localResult) || {}, s = (cur && cur.sides) || sides(), w = r.winner, wp = byPid(s[w]) || {}, mine = mySide < SPEC, votes = meta.votes || {};
    var title = w < 0 || w == null ? 'DRAW!' : esc(wp.name || (cur && cur.names && cur.names[w]) || 'Player') + ' WINS!';
    var sub = w < 0 ? '' : mySide === w ? 'You win! \uD83C\uDFC6' : mine ? 'So close! Rematch?' : '';
    var opps = others(s), voted = votes[myPid], waitV = opps.filter(function (pid) { return !votes[pid]; }), wantV = opps.filter(function (pid) { return votes[pid]; });
    var st = voted ? (!waitV.length ? 'Rematch!' : 'Waiting for ' + waitV.map(function (pid) { return esc(nameOf(pid)); }).join(' & ') + '\u2026') : wantV.length ? wantV.map(function (pid) { return esc(nameOf(pid, 'Player')); }).join(' & ') + (wantV.length > 1 ? ' want' : ' wants') + ' a rematch!' : '';
    var score = r.wins ? r.wins.map(function (x, i) { return (cur && cur.names && cur.names[i] ? esc(cur.names[i]) + ' ' : '') + x; }).join(' \u00B7 ') : '';
    showOv('<div class="olWin">' + title + '</div><div class="olStatus">' + sub + '</div>' + top() +
      '<div class="olStatus">Rounds won: ' + score + '</div><div class="olStatus" id="olSt">' + st + '</div>' +
      (mine ? btn('olRematch', voted ? 'REMATCH \u2713' : 'REMATCH', voted ? 'ok' : '') + btn('olChange', 'CHANGE FIGHTERS', 'alt') : '') + footBtns());
    on('olRematch', function () { if (!(meta.votes || {})[myPid]) sendHost({ t: 'vote' }); });
    on('olChange', function () { sendHost({ t: 'reselect' }); });
    bindFoot();
  }
  function render() {
    if (!room || !room.opened) return;
    if (phase !== 'fight' && phase !== 'ending') { var si = sides().indexOf(myPid); mySide = si < 0 ? SPEC : si; }
    var ph = meta.phase || 'select';
    if (players().length < 2 && ph !== 'match') { if (phase !== 'fight') renderWait('Waiting for your friend to join room ' + room.code + '\u2026'); return; }
    if (ph === 'select') renderSelect();
    else if (ph === 'result' && phase !== 'fight') renderResult();
  }

  /* ---------- host logic ---------- */
  function sendHost(msg) { if (room.isHost) hostMsg(msg, myPid); else room.send(msg); }
  function pick(fid, lock) { sendHost({ t: 'pick', f: fid, lock: !!lock }); }
  function hostMsg(d, from) {
    if (!room.isHost || !d) return;
    var s = sides();
    if (d.t === 'pick' && (meta.phase || 'select') === 'select' && s.indexOf(from) >= 0) {
      var picks = JSON.parse(JSON.stringify(meta.picks || {})); picks[from] = { f: d.f, lock: !!d.lock && !!d.f }; room.setMeta({ picks: picks }); maybeStart();
    } else if (d.t === 'vote' && meta.phase === 'result') {
      var v = JSON.parse(JSON.stringify(meta.votes || {})); v[from] = true; room.setMeta({ votes: v });
      var cs = (cur && cur.sides) || s; if (cs.every(function (pid) { return pid && v[pid] && byPid(pid); })) setTimeout(startFromPicks, 700);
    } else if (d.t === 'reselect' && meta.phase === 'result') {
      var p2 = JSON.parse(JSON.stringify(meta.picks || {})); for (var k in p2) p2[k].lock = false;
      room.setMeta({ phase: 'select', picks: p2, votes: {} });
    }
  }
  var startT = 0;
  function maybeStart() {
    var s = sides();
    clearTimeout(startT);
    function ready(p) { return s.every(function (pid) { return pid && p[pid] && p[pid].lock; }); }
    if (ready(meta.picks || {})) startT = setTimeout(function () { if ((meta.phase || 'select') === 'select' && sides().join() === s.join() && ready(meta.picks || {})) startFromPicks(); }, 1100);
  }
  function startFromPicks() {
    var s = sides(), p = meta.picks || {};
    if (!s.every(function (pid) { return pid && byPid(pid) && p[pid] && p[pid].f; })) return;
    var mid = (meta.mid || 0) + 1;
    var cfg = { mode: 'online', p1: p[s[0]].f, p2: p[s[1]].f, arena: meta.arena || 'dojo', names: s.map(function (pid) { return byPid(pid).name.toUpperCase(); }), sides: s.slice(), mid: mid };
    if (s.length > 2) { cfg.p3 = p[s[2]].f; cfg.ffa = true; }
    // dev/test switch only: shorter rounds (localStorage grokBrawl.roundTime = 10..99 seconds)
    var rt = 0; try { rt = +localStorage.getItem('grokBrawl.roundTime') || 0; } catch (e) {} if (rt >= 10 && rt <= 99) cfg.time = rt;
    room.setMeta({ phase: 'match', mid: mid, votes: {}, result: null, cfg: cfg });
  }
  function setFmt(f) {
    var p2 = JSON.parse(JSON.stringify(meta.picks || {})); for (var k in p2) p2[k].lock = false;
    room.setMeta({ fmt: f, picks: p2 });
  }

  /* ---------- match (lockstep) ---------- */
  function startMatch(cfg) {
    if (startedMid === cfg.mid) return; startedMid = cfg.mid;
    mySide = cfg.sides.indexOf(myPid); if (mySide < 0) mySide = SPEC;
    var c = {}; for (var k in cfg) c[k] = cfg[k]; c.mySide = mySide;
    cur = c; frame = 0; stallF = 0; hashes = {}; leftShown = false;
    for (var m in bufs) if (+m < cfg.mid) delete bufs[m];
    phase = 'fight'; hideOv();
    GB.UI.launch(c);
  }
  O.feed = function (F, m) {
    if (!cur || m.cfg.mid !== cur.mid) return true;
    var b = buf(cur.mid), tf = frame + DELAY, n = cur.sides.length, i;
    if (mySide < n && b[mySide][tf] === undefined) {
      GB.Input.read(tmp, null); var v = bits(tmp); b[mySide][tf] = v;
      var msg = { t: 'in', m: cur.mid, s: mySide, f: tf, b: v };
      if (room.isHost) room.broadcast(msg); else room.send(msg);
    }
    var bb = [], miss = -1;
    for (i = 0; i < n; i++) { bb[i] = frame < DELAY ? 0 : b[i][frame]; if (bb[i] === undefined && miss < 0) miss = i; }
    if (miss >= 0) {
      stallF++; if (stallF === 30) stats.stalls++; stats.maxStall = Math.max(stats.maxStall, stallF);
      if (stallF > 30) { var w = $('olWait'), opp = byPid(cur.sides[miss]); w.textContent = 'Waiting for ' + ((opp && opp.name) || 'player') + '\u2026'; w.classList.remove('hidden'); }
      return false;
    }
    if (stallF) { stallF = 0; $('olWait').classList.add('hidden'); }
    for (i = 0; i < n; i++) { unbits(F[i].ctl, bb[i]); delete b[i][frame]; }
    frame++;
    if (frame % HASH_EVERY === 0) {
      var h = hashOf(F); hashes[frame] = h;
      if (!room.isHost) room.send({ t: 'h', m: cur.mid, f: frame, h: h });
      for (var k in hashes) if (+k < frame - HASH_EVERY * 20) delete hashes[k];
    }
    return true;
  };
  function hashOf(F) {
    var h = 7;
    F.forEach(function (f) { h = (h * 31 + Math.round(f.x * 1000)) | 0; h = (h * 31 + Math.round(f.y * 1000)) | 0; h = (h * 31 + Math.round(f.hp)) | 0; h = (h * 31 + Math.round(f.meter * 10)) | 0; h = (h * 31 + f.state.length) | 0; });
    return h;
  }
  function idleBot(w) { w.f.forEach(function (f) { for (var k in f.ctl) f.ctl[k] = false; }); }
  function stopMatch() { var mm = GB.Game.match(); if (mm) { mm.online = false; mm.bot = idleBot; } $('olWait').classList.add('hidden'); GB.UI.show('none'); }
  O.matchEnd = function (res, m) {
    m.online = false; m.bot = idleBot;
    $('olWait').classList.add('hidden');
    phase = 'ending'; localResult = { winner: res.winner, wins: res.wins, mid: m.cfg.mid };
    if (room.isHost) room.setMeta({ phase: 'result', result: { winner: res.winner, wins: res.wins, mid: m.cfg.mid }, votes: {} });
    setTimeout(function () { if (phase === 'ending') { phase = 'result'; GB.UI.show('none'); render(); } }, 1400);
  };

  /* ---------- navigation ---------- */
  function backToLobby() { if (room.isHost) room.broadcast({ t: 'lobby' }, { self: true }); }
  function goLobby() {
    var me = room.me() || {};
    room.markNavigating();
    location.href = GN.buildUrl(GN.hubUrl(), { mode: room.isHost ? 'host' : 'join', code: room.code, name: me.name || prm.name, color: me.color || prm.color, pid: room.pid, slot: me.slot });
  }
  function leave() { room.leave(); location.href = GN.soloUrl(); }
  function hostLeft() {
    if (phase === 'hostleft') return;
    stopMatch(); phase = 'hostleft';
    var hn = hostName || 'The host';
    showOv('<h2 id="olHostLeft">HOST LEFT</h2><div class="olStatus">' + esc(hn) + ' closed the room, so this online game ended.</div><div class="olStatus">You can play solo or start a new room from the arcade.</div>' +
      btn('olSolo', 'PLAY SOLO', '') + btn('olHub', 'BACK TO ARCADE', 'alt'));
    on('olSolo', function () { location.href = GN.soloUrl(); });
    on('olHub', function () { location.href = GN.hubUrl(); });
  }

  /* ---------- boot ---------- */
  O.boot = function () {
    build();
    GB.UI.show('none'); GB.UI.startDemo();
    renderWait('Connecting to room ' + prm.code + '\u2026');
    var unlock = function () { try { GB.Audio.unlock(); } catch (e) {} window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); };
    window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
    room = GN.joinFromParams(prm, { max: 3 });
    myPid = room.pid;
    room.on('open', function () {
      phase = 'wait'; var hp0 = players().filter(function (p) { return p.host; })[0]; if (hp0) hostName = hp0.name;
      badge = GN.ui.badge(room, { pos: 'bc', label: room.code });
      if (room.isHost) { var m0 = room.meta() || {}; if (!m0.phase || m0.phase === 'match') room.setMeta({ game: 'brawl', phase: 'select', fmt: m0.fmt || (prm.q && prm.q.get('fmt') === 'ffa' ? 'ffa' : '1v1'), arena: m0.arena || 'dojo', picks: m0.picks || {}, votes: {} }); }
      meta = room.meta() || {}; render();
    });
    room.on('players', function () {
      var hp = players().filter(function (p) { return p.host; })[0]; if (hp) hostName = hp.name;
      if (room.isHost && meta.phase === 'select') { maybeStart(); }
      if (phase === 'fight' && cur) {
        var gone = cur.sides.filter(function (pid) { return !byPid(pid); });
        if (gone.length && !leftShown) { leftShown = true; stopMatch(); phase = 'left';
          var gi = cur.sides.indexOf(gone[0]), gname = (cur.names && cur.names[gi]) || 'YOUR FRIEND';
          if (room.isHost) room.setMeta({ phase: 'select', votes: {}, fmt: ffa() && players().length < 3 ? '1v1' : meta.fmt });
          showOv('<h2 id="olLeftT">' + esc(gname) + ' LEFT</h2>' + top() + '<div class="olStatus">' + esc(gname.charAt(0) + gname.slice(1).toLowerCase()) + ' left the room, so the match was stopped.</div>' + btn('olBack', room.isHost ? (players().length >= 2 ? 'BACK TO FIGHTER SELECT' : 'WAIT FOR FRIEND') : 'OK', 'alt') + footBtns());
          on('olBack', function () { phase = 'wait'; render(); }); bindFoot(); return; }
      }
      if (phase !== 'fight' && phase !== 'left' && phase !== 'ending' && phase !== 'hostleft') render();
    });
    room.on('meta', function (m) {
      meta = m || {};
      if (meta.phase === 'match' && meta.cfg && meta.cfg.mid !== startedMid) { startMatch(meta.cfg); return; }
      if (phase !== 'fight' && phase !== 'left' && phase !== 'ending' && phase !== 'hostleft') render();
    });
    room.on('message', function (d, from) {
      if (!d) return;
      if (d.t === 'in') {
        buf(d.m)[d.s][d.f] = d.b;
        // host relays every friend's inputs to everyone else (other fighters + spectators)
        if (room.isHost && from !== myPid) players().forEach(function (p) { if (p.pid !== from && p.pid !== myPid) room.sendTo(p.pid, d); });
        return;
      }
      if (d.t === 'h') { if (room.isHost && cur && d.m === cur.mid) { stats.hashChecks++; var mine = hashes[d.f]; if (mine !== undefined && mine !== d.h) { stats.desyncs++; } } return; }
      if (d.t === 'lobby') { goLobby(); return; }
      if (room.isHost) hostMsg(d, from);
    });
    room.on('error', function (e) {
      if (e && e.code === 'hostleft' && room && !room.isHost && room.opened) { hostLeft(); return; }
      GN.ui.error(e);
    });
    room.start();
  };
  O._debug = function () {
    return { phase: phase, side: mySide, frame: frame, meta: meta, isHost: room && room.isHost, players: players().map(function (p) { return { name: p.name, slot: p.slot, pid: p.pid }; }), stats: stats, opened: !!(room && room.opened), cur: cur };
  };
  O.room = function () { return room; };
})();
