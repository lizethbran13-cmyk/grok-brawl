/* Grok Brawl - CPU opponent. Sees the player with a reaction delay and presses the same virtual buttons. */
(function () {
  'use strict';
  var C = GB.Combat;
  var AI = GB.AI = {};
  var PROJ = { fireball: 1, voidorb: 1, icespike: 1 };

  AI.create = function (f, params, seed) {
    return { f: f, p: params, hist: [], plan: null, planT: 0, planEnd: 0, blockUntil: 0, rolled: null, projRolled: null, cineRolled: null,
      combo: null, comboIdx: 0, hold: {}, press: {}, seed: seed || 1, lastPlans: [], frame: 0, punishRolled: null, aaRolled: null, wakeBlock: 0, jumpCd: 0, specCd: 0, oppBlocks: 0 };
  };
  function rnd(ai) { ai.seed = (ai.seed * 16807) % 2147483647; return (ai.seed - 1) / 2147483646; }

  function snapshot(o, w) {
    return { state: o.state, phase: C.attackPhase(o), mv: o.move, mvName: o.move ? o.move.def.name : null, mvKind: o.move ? o.move.def.kind : null,
      x: o.x, y: o.y, vx: o.vx, vy: o.vy, facing: o.facing, invuln: o.invuln };
  }

  function reachOf(o) { return 1.75 * o.sc + 0.45; }

  AI.think = function (ai, w) {
    var f = ai.f, o = w.f[0] === f ? w.f[1] : w.f[0], p = ai.p, c = f.ctl;
    ai.frame++;
    ai.hist.push(snapshot(o, w)); if (ai.hist.length > 40) ai.hist.shift();
    var v = ai.hist[Math.max(0, ai.hist.length - 1 - Math.round(p.react))];
    if (v.mv && v.mv !== ai.lastSeenMv) { ai.lastSeenMv = v.mv; if (v.mvKind === 'normal') ai.oppAgg = Math.min(1, (ai.oppAgg || 0) + 0.1); }
    ai.oppAgg = (ai.oppAgg || 0) * 0.996;
    var dx = v.x - f.x, dist = Math.abs(dx), toward = Math.sign(dx) || f.facing;
    // reset buttons (held ones re-applied below)
    C.BTN.forEach(function (b) { c[b] = false; });
    if (ai.jumpCd > 0) ai.jumpCd--; if (ai.specCd > 0) ai.specCd--;
    var press = function (b) { c[b] = !f.pc[b]; if (f.pc[b]) ai.press[b] = 1; }; // release then press next frame if needed
    if (ai.press) { for (var k in ai.press) { if (ai.press[k] && !f.pc[k]) { c[k] = true; ai.press[k] = 0; } } }
    var moveDir = function (d) { if (d > 0) c.right = true; else if (d < 0) c.left = true; };
    var myState = f.state, canAct = myState === 'idle' || myState === 'walk' || myState === 'block' || myState === 'land' || myState === 'dash';
    var busy = myState === 'atk';

    // --- training dummy jump mode is handled outside; here full CPU ---
    // wake-up defense
    if (myState === 'getup' || myState === 'down') { if (ai.wakeBlock === 0) ai.wakeBlock = rnd(ai) < p.wake ? 1 : -1; c.block = ai.wakeBlock > 0; return; }
    if (ai.wakeBlock && canAct) { if (ai.wakeBlock > 0 && dist < 2.5 && rnd(ai) < 0.9) ai.blockUntil = ai.frame + 14; ai.wakeBlock = 0; }

    // combo continuation (own state)
    if (busy && ai.combo && f.move && f.move.def.kind === 'normal' && !f.move.def.air) {
      var d = f.move.def;
      if (ai.comboIdx < ai.combo.length && f.move.t >= d.chainAt - 4) {
        var confirm = f.move.connected || rnd(ai) < (p.level >= 1.5 ? 0.15 : p.level >= 0.5 ? 0.3 : 0.6);
        var nxt = ai.combo[ai.comboIdx];
        if (confirm && rnd(ai) < (0.55 + 0.45 * p.chain)) {
          if (nxt === 's') { if (f.meter >= C.SPECIAL_COST && f.move.connected) press('special'); }
          else press(nxt === 'p' ? 'punch' : 'kick');
          ai.comboIdx++;
        } else { ai.combo = null; }
      }
      return;
    }
    if (busy) return;
    if (!canAct && myState !== 'air') { if (myState === 'bstun') { c.block = true; ai.afterBlock = true; } return; }

    // air: maybe air attack when near
    if (myState === 'air') {
      if (!f.airAtk && dist < 1.7 && Math.abs(v.y - f.y) < 1.6 && rnd(ai) < 0.25 + 0.4 * p.aggr) press(rnd(ai) < 0.6 ? 'kick' : 'punch');
      moveDir(toward * (ai.planDir || 0));
      return;
    }

    var oppAttacking = (v.phase === 'startup' || v.phase === 'active') && v.mv;
    var oppSuper = w.cine && w.cine.f === o;
    // react to super flash (after cinematic ends the AI sees startup)
    if (v.mvKind === 'super' && v.mv && ai.cineRolled !== v.mv) {
      ai.cineRolled = v.mv; var r0 = rnd(ai);
      var st = o.def.super.type;
      if (r0 < p.dodge * 2 + p.block * 0.5) {
        if (st === 'quake' || st === 'rush' || st === 'glacier') { press('up'); ai.planDir = -1; return; }
        ai.blockUntil = ai.frame + 50;
      }
    }
    // incoming attack -> block / dodge roll once per enemy move
    if (oppAttacking && dist < reachOf(o) + (v.mvKind === 'special' ? 3 : 0.4) && ai.rolled !== v.mv) {
      ai.rolled = v.mv; var r = rnd(ai), bonus = Math.min(0.2, ai.oppPattern || 0);
      if (r < p.block + bonus) ai.blockUntil = ai.frame + 16 + Math.round(rnd(ai) * 8);
      else if (r < p.block + bonus + p.dodge) { press('dash'); moveDir(-toward); return; }
    }
    // incoming projectile
    var proj = null; w.projs.forEach(function (pr) { if (pr.owner !== f && Math.sign(pr.vx) === Math.sign(f.x - pr.x) && Math.abs(pr.x - f.x) < 5.5) proj = pr; });
    if (proj && ai.projRolled !== proj) {
      ai.projRolled = proj; var rp = rnd(ai);
      if (rp < p.block * 0.6 + p.dodge) { if (proj.ground || rnd(ai) < 0.5) { ai.jumpWait = Math.max(0, Math.round((Math.abs(proj.x - f.x) - 2.4) / Math.abs(proj.vx) * 60)); ai.jumpProj = proj; } else ai.blockUntil = ai.frame + 40; }
      else if (rp < p.block + p.dodge) ai.blockUntil = ai.frame + 40;
      else if (f.meter >= C.SPECIAL_COST && PROJ[f.def.special.type] && rnd(ai) < p.special) { press('special'); return; }
    }
    if (ai.jumpProj) {
      if (w.projs.indexOf(ai.jumpProj) < 0) ai.jumpProj = null;
      else if (Math.abs(ai.jumpProj.x - f.x) < 2.6) { press('up'); ai.planDir = toward; ai.jumpProj = null; return; }
    }
    if (ai.blockUntil > ai.frame) {
      // stop blocking early to punish if the attacker is clearly in recovery
      if (!(v.phase === 'recovery' && dist < 1.9 && rnd(ai) < p.punish * 0.5)) { c.block = true; return; }
      ai.blockUntil = 0;
    }
    // punish whiffs / dizzy / landing
    var punishable = (v.phase === 'recovery' && v.mvKind !== 'normal') || (v.phase === 'recovery' && v.mv && v.mv.def.name && /3$/.test(v.mv.def.name)) || v.state === 'dizzy' || (v.state === 'land');
    if (punishable && dist < 2.0 && ai.punishRolled !== (v.mv || v.state + ai.frame)) {
      ai.punishRolled = v.mv || v.state + ai.frame;
      if (rnd(ai) < p.punish) { return startCombo(ai, f, o, press, dist, true); }
    }
    if (ai.afterBlock) {
      ai.afterBlock = false;
      if (dist < 1.8 && rnd(ai) < p.punish * 0.7) return startCombo(ai, f, o, press, dist, true);
    }
    // anti-air
    if (v.state === 'air' && v.y > 0.5 && dist < 2.6 && Math.sign(v.vx) === -toward && ai.aaRolled !== Math.floor(ai.frame / 30)) {
      ai.aaRolled = Math.floor(ai.frame / 30);
      if (rnd(ai) < p.antiAir) {
        if (f.def.special.type === 'cyclone' && f.meter >= C.SPECIAL_COST) { press('special'); return; }
        if (dist < 1.7) { ai.combo = ['p', 'p']; ai.comboIdx = 0; press('punch'); return; }
        ai.blockUntil = ai.frame + 18; c.block = true; return;
      }
    }
    // super
    if (f.meter >= C.SUPER_COST && v.state !== 'down' && v.state !== 'getup' && !v.invuln && v.y < 0.3) {
      var t = f.def.super.type, inRange = t === 'rush' ? dist < 6.5 : t === 'quake' ? true : t === 'beam' ? true : dist < 11;
      if (inRange && rnd(ai) < p.superUse * 0.12) { press('super'); return; }
    }

    // close-range neutral: guess between guarding, attacking first, or backing off
    var range = 1.35 * f.sc + 0.35;
    var oppNeutral = v.state === 'idle' || v.state === 'walk' || v.state === 'block' || v.state === 'land';
    if (dist < range + 0.25 && oppNeutral && ai.frame >= (ai.nextClose || 0)) {
      ai.nextClose = ai.frame + Math.round(p.think * (0.5 + rnd(ai) * 0.7));
      var rc = rnd(ai), pb = p.block * (0.25 + 0.6 * ai.oppAgg);
      if (rc < pb) { ai.blockUntil = ai.frame + 10 + Math.round(rnd(ai) * 10); c.block = true; return; }
      if (rc < pb + p.aggr * 0.8) return startCombo(ai, f, o, press, dist);
      if (rc < pb + p.aggr * 0.8 + p.dodge) { press('dash'); moveDir(-toward); return; }
    }
    // plans
    if (!ai.plan || ai.frame >= ai.planEnd) choosePlan(ai, f, o, dist, w);
    switch (ai.plan) {
      case 'approach':
        if (dist > range) moveDir(toward); else { if (rnd(ai) < 0.35 + p.aggr * 0.5) return startCombo(ai, f, o, press, dist); ai.plan = null; }
        break;
      case 'pressure':
        if (dist > range + 0.2) moveDir(toward); else return startCombo(ai, f, o, press, dist);
        break;
      case 'retreat': moveDir(-toward); if (dist > 4.5) ai.plan = null; break;
      case 'wait': if (dist < 2.2 && rnd(ai) < 0.5) c.block = true; break;
      case 'block': c.block = true; break;
      case 'zone':
        if (f.meter >= C.SPECIAL_COST && ai.specCd <= 0) { press('special'); ai.specCd = 90; ai.plan = null; return; }
        ai.plan = null; break;
      case 'special':
        if (f.meter >= C.SPECIAL_COST && ai.specCd <= 0) { press('special'); ai.specCd = 70; ai.plan = null; return; }
        ai.plan = null; break;
      case 'jumpin':
        if (ai.jumpCd <= 0 && dist < 4.6 && dist > 1.6) { press('up'); moveDir(toward); ai.planDir = 1; ai.jumpCd = 50; ai.plan = null; return; }
        if (dist >= 4.6) moveDir(toward); else ai.plan = null;
        break;
      case 'dashin':
        if (dist > 2.2) { press('dash'); moveDir(toward); ai.combo = null; ai.plan = 'pressure'; ai.planEnd = ai.frame + 40; return; }
        ai.plan = 'pressure'; break;
      case 'bait':
        if (dist < 2.6) moveDir(-toward); else if (dist > 3.4) moveDir(toward); break;
    }
  };

  function startCombo(ai, f, o, press, dist, punish) {
    var p = ai.p, r = rnd(ai), combos;
    var canS = f.meter >= C.SPECIAL_COST && f.def.special.type !== 'groundslam';
    if (dist > 1.5) combos = [['k', 'k', 'k'], ['k', 'k'], ['k']];
    else combos = [['p', 'p', 'p'], ['p', 'p', 'k'], ['k', 'k', 'k'], ['p', 'k', 'k'], ['p', 'p'], ['p'], ['k', 'k']];
    var pick = combos[Math.floor(r * combos.length)].slice();
    // up close against an aggressive opponent, start with the fast jab so trades go our way
    if (dist < 1.6 && !punish && rnd(ai) < 0.3 + 0.5 * p.level / 2 + (ai.oppAgg || 0) * 0.3) pick[0] = 'p';
    if (rnd(ai) > p.chain) pick = pick.slice(0, Math.max(1, Math.floor(1 + rnd(ai) * 2)));
    if (canS && (punish || rnd(ai) < p.special * 0.5) && pick.length >= 2 && rnd(ai) < p.special) pick = pick.slice(0, 2).concat(['s']);
    ai.combo = pick; ai.comboIdx = 1;
    press(pick[0] === 'p' ? 'punch' : 'kick');
    ai.plan = null;
  }

  function choosePlan(ai, f, o, dist, w) {
    var p = ai.p, W = {};
    var projSp = PROJ[f.def.special.type], meterOK = f.meter >= C.SPECIAL_COST;
    W.approach = dist > 2 ? 3 : 1;
    W.pressure = (dist < 2.4 ? 3 : 1) * (0.5 + p.aggr);
    W.retreat = dist < 2 ? 0.6 : 0.2;
    W.wait = 0.4 + p.idleBias * 4;
    W.block = 0.2 + (o.state === 'atk' ? 1 : 0) * p.block;
    W.zone = projSp && meterOK && dist > 3.5 ? 2.5 * p.special : 0;
    W.special = !projSp && meterOK ? (f.def.special.type === 'teleport' ? 1.4 : f.def.special.type === 'groundslam' ? (dist < 5 ? 1.2 : 0.3) : f.def.special.type === 'dashpunch' ? (dist < 5 && dist > 1.5 ? 1.5 : 0.3) : 0.3) * p.special : 0;
    W.jumpin = dist > 2 && dist < 5 ? 0.8 * p.aggr : 0.1;
    W.dashin = dist > 3 ? 0.9 * p.aggr : 0;
    W.bait = 0.3 + p.level * 0.25;
    // variety: penalise recently used plans
    ai.lastPlans.forEach(function (pl, i) { if (W[pl]) W[pl] *= 0.55 + i * 0.1; });
    var tot = 0, k; for (k in W) tot += W[k];
    var r = rnd(ai) * tot; for (k in W) { r -= W[k]; if (r <= 0) break; }
    ai.plan = k; ai.planEnd = ai.frame + Math.round(p.think * (0.6 + rnd(ai) * 1.4)) + (k === 'wait' ? 10 : 0);
    ai.lastPlans.push(k); if (ai.lastPlans.length > 3) ai.lastPlans.shift();
    ai.planDir = 0;
  }

  // simple training dummy behaviours
  AI.dummy = function (f, mode, w) {
    var c = f.ctl; C.BTN.forEach(function (b) { c[b] = false; });
    if (mode === 'jump') { if (w.frame % 70 === 0) c.up = true; }
    if (mode === 'block') c.block = true;
  };
})();
