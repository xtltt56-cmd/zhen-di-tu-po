(function (global) {
  'use strict';

  const WIDTH = 1280;
  const HEIGHT = 720;
  const TOP = 92;
  const GROUND = 455;
  const PANEL_TOP = 552;
  const RED = '#d95a50';
  const RED_DARK = '#7f2929';
  const BLUE = '#4d94dc';
  const BLUE_DARK = '#214f7e';
  const GOLD = '#e2c36c';
  const TRENCH_X = [190, 415, 640, 865, 1090];
  const HQ_X = { red: 55, blue: 1225 };
  const TEAM_DIR = { red: 1, blue: -1 };

  const unitDefs = {
    rifle: { name: '步枪兵', short: '步枪', cost: 3, hp: 82, speed: 48, range: 205, rate: 0.68, damage: 14, capture: 1, unlock: 1, kind: 'infantry', role: 'rifle' },
    mg: { name: '机枪兵', short: '机枪', cost: 6, hp: 112, speed: 34, range: 285, rate: 0.18, damage: 10, capture: 0.72, unlock: 1, kind: 'infantry', role: 'mg', suppress: 0.16, canAir: true },
    sniper: { name: '狙击兵', short: '狙击', cost: 8, hp: 68, speed: 31, range: 430, rate: 2.55, damage: 58, capture: 0.55, unlock: 1, kind: 'infantry', role: 'sniper' },
    engineer: { name: '工兵', short: '工兵', cost: 7, hp: 94, speed: 40, range: 235, rate: 1.35, damage: 31, capture: 1.65, unlock: 1, kind: 'infantry', role: 'engineer', antiArmor: 2.5, projectile: 'rocket' },
    commander: { name: '指挥官', short: '指挥', cost: 11, hp: 105, speed: 38, range: 220, rate: 0.72, damage: 14, capture: 0.9, unlock: 2, kind: 'infantry', role: 'commander', aura: true },
    humvee: { name: '悍马运兵车', short: '悍马', cost: 12, hp: 280, speed: 55, range: 0, rate: 9, damage: 0, capture: 0.08, armor: 0.18, unlock: 2, kind: 'vehicle', role: 'transport', deploy: true },
    aaHumvee: { name: '防空悍马', short: '防空', cost: 18, hp: 300, speed: 45, range: 390, rate: 1.5, damage: 95, capture: 0.08, armor: 0.2, unlock: 3, kind: 'vehicle', role: 'aa', canAir: true, antiAir: 2.2, projectile: 'missile' },
    apc: { name: 'CM34装甲车', short: 'CM34', cost: 22, hp: 540, speed: 39, range: 265, rate: 0.6, damage: 20, capture: 0.1, armor: 0.38, unlock: 2, kind: 'vehicle', role: 'apc', deploy: true },
    hstv: { name: 'HSTV轻型坦克', short: 'HSTV', cost: 31, hp: 720, speed: 34, range: 345, rate: 1.65, damage: 102, capture: 0.12, armor: 0.56, unlock: 3, kind: 'vehicle', role: 'lightTank', antiArmor: 1.45, splash: 22, projectile: 'shell' },
    bmpt: { name: 'BMPT坦克歼击车', short: 'BMPT', cost: 39, hp: 1220, speed: 28, range: 320, rate: 0.18, damage: 21, capture: 0.1, armor: 0.84, unlock: 4, kind: 'vehicle', role: 'bmpt', heavy: true, antiArmor: 1.25, suppress: 0.2, canAir: true },
    m1: { name: 'M1主战坦克', short: 'M1', cost: 50, hp: 1240, speed: 23, range: 445, rate: 2, damage: 202, capture: 0.08, armor: 0.84, unlock: 4, kind: 'vehicle', role: 'mainTank', heavy: true, antiArmor: 1.75, antiFort: 2.2, splash: 44, canAir: true, projectile: 'shell' },
    t90m: { name: 'T-90M主战坦克', short: 'T-90M', cost: 48, hp: 1320, speed: 24, range: 420, rate: 2.7, damage: 178, capture: 0.08, armor: 0.88, unlock: 4, kind: 'vehicle', role: 'mainTank', heavy: true, antiArmor: 1.55, antiFort: 1.9, splash: 38, canAir: true, projectile: 'shell' },
    apache: { name: '守护者阿帕奇', short: '阿帕奇', cost: 64, hp: 780, speed: 48, range: 400, rate: 0.22, damage: 19, capture: 0, armor: 0.42, unlock: 5, kind: 'vehicle', role: 'apache', heavy: true, airborne: true, canAir: true, antiArmor: 1.15, projectile: 'cannon' },
  };

  const pages = [
    ['rifle', 'mg', 'sniper', 'engineer', 'commander', 'humvee', 'apc', 'aaHumvee'],
    ['hstv', 'bmpt', 'm1', 't90m', 'apache', 'upgradeHQ', 'upgradeTrench', 'artillery'],
  ];

  const actionDefs = {
    upgradeHQ: { name: '升级总部', short: '总部升级' },
    upgradeTrench: { name: '升级所选战壕', short: '战壕升级' },
    artillery: { name: '炮火支援', short: '炮火' },
  };

  let canvas;
  let ctx;
  let active = false;
  let animationFrame = 0;
  let lastTime = 0;
  let state = null;
  let hover = null;
  let redCardRects = [];
  let blueCardRects = [];
  let blueReadyRect = null;
  let endRestartRect = null;
  let endMenuRect = null;
  let pauseRect = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const otherTeam = team => team === 'red' ? 'blue' : 'red';
  const teamColor = team => team === 'red' ? RED : BLUE;
  const teamDark = team => team === 'red' ? RED_DARK : BLUE_DARK;
  const teamLabel = team => team === 'red' ? '红方' : '蓝方';
  const sideValue = team => team === 'red' ? 1 : -1;

  function createTeam(team) {
    return {
      team,
      points: 14,
      income: 1.35,
      hq: { x: HQ_X[team], hp: 2400, maxHp: 2400, level: 1, fire: 0, missile: 0 },
      page: 0,
      selectedTrench: team === 'red' ? 0 : TRENCH_X.length - 1,
      queue: [],
      spawnCooldown: 0,
      artilleryCooldown: 0,
      message: '等待双方准备',
      messageTimer: 4,
      ready: false,
      kills: 0,
      lost: 0,
      tactical: 0,
    };
  }

  function createState() {
    return {
      phase: 'briefing',
      paused: false,
      teams: { red: createTeam('red'), blue: createTeam('blue') },
      trenches: TRENCH_X.map((x, index) => {
        const owner = index === 0 ? 'red' : index === TRENCH_X.length - 1 ? 'blue' : null;
        return {
          x,
          owner,
          control: owner === 'red' ? 100 : owner === 'blue' ? -100 : 0,
          level: 1,
          mgHp: 0,
          mgMax: 340,
          mgFire: 0,
          atHp: 0,
          atMax: 460,
          atFire: 0,
          orders: { red: 'advance', blue: 'advance' },
          lastOwner: owner,
        };
      }),
      units: [],
      shots: [],
      effects: [],
      pendingHits: [],
      dust: [],
      scorches: [],
      time: 0,
      deploymentPulse: 0,
      winner: null,
      nextId: 1,
    };
  }

  function teamOwnedTrenches(team) {
    return state.trenches.filter(trench => trench.owner === team);
  }

  function frontlineTrench(team) {
    const owned = teamOwnedTrenches(team);
    if (!owned.length) return null;
    return owned.sort((a, b) => TEAM_DIR[team] * (b.x - a.x))[0];
  }

  function selectedTrench(team) {
    const player = state.teams[team];
    const trench = state.trenches[player.selectedTrench];
    if (trench?.owner === team) return trench;
    const front = frontlineTrench(team);
    if (front) player.selectedTrench = state.trenches.indexOf(front);
    return front;
  }

  function setMessage(team, text, seconds = 2.4) {
    state.teams[team].message = text;
    state.teams[team].messageTimer = seconds;
  }

  function currentHeavyCount(team) {
    return state.units.filter(unit => !unit.dead && unit.team === team && unitDefs[unit.type]?.heavy).length
      + state.teams[team].queue.filter(item => unitDefs[item.type]?.heavy).length;
  }

  function currentAirCount(team) {
    return state.units.filter(unit => !unit.dead && unit.team === team && unitDefs[unit.type]?.airborne).length
      + state.teams[team].queue.filter(item => unitDefs[item.type]?.airborne).length;
  }

  function actionCost(team, action) {
    const player = state.teams[team];
    if (unitDefs[action]) return unitDefs[action].cost;
    if (action === 'upgradeHQ') return [0, 25, 42, 65, 88][player.hq.level] ?? Infinity;
    if (action === 'upgradeTrench') {
      const trench = selectedTrench(team);
      return !trench ? Infinity : trench.level === 1 ? 18 : trench.level === 2 ? 32 : Infinity;
    }
    if (action === 'artillery') return 25;
    return Infinity;
  }

  function actionLocked(team, action) {
    const player = state.teams[team];
    if (unitDefs[action]) {
      const def = unitDefs[action];
      if (def.unlock > player.hq.level) return `需总部 ${def.unlock} 级`;
      if (def.heavy && currentHeavyCount(team) >= 3) return '重装甲槽已满';
      if (def.airborne && currentAirCount(team) >= 1) return '直升机已在场';
      if (state.units.filter(unit => !unit.dead && unit.team === team).length + player.queue.length >= 52) return '单位达到上限';
      if (player.queue.length >= 6) return '出兵队列已满';
      return '';
    }
    if (action === 'upgradeHQ') return player.hq.level >= 5 ? '总部已满级' : '';
    if (action === 'upgradeTrench') {
      const trench = selectedTrench(team);
      if (!trench) return '没有己方战壕';
      return trench.level >= 3 ? '战壕已三星' : '';
    }
    if (action === 'artillery') {
      if (player.hq.level < 2) return '需总部 2 级';
      return player.artilleryCooldown > 0 ? `冷却 ${Math.ceil(player.artilleryCooldown)}秒` : '';
    }
    return '';
  }

  function executeAction(team, action) {
    if (!active || state.phase !== 'battle' || state.paused) return;
    const player = state.teams[team];
    const locked = actionLocked(team, action);
    if (locked) {
      setMessage(team, locked);
      global.GameAudio?.playUi('warning');
      return;
    }
    const cost = actionCost(team, action);
    if (player.points + 1e-6 < cost) {
      setMessage(team, `资源不足：需要 ${cost} 点`);
      global.GameAudio?.playUi('warning');
      return;
    }
    player.points -= cost;

    if (unitDefs[action]) {
      player.queue.push({ type: action, id: state.nextId++ });
      setMessage(team, `${unitDefs[action].name} 已加入出兵队列`);
      global.GameAudio?.playUi('confirm');
      return;
    }
    if (action === 'upgradeHQ') {
      player.hq.level++;
      player.hq.maxHp += 320;
      player.hq.hp = Math.min(player.hq.maxHp, player.hq.hp + 520);
      setMessage(team, `总部升级至 ${player.hq.level} 级`);
      state.effects.push({ type: 'upgrade', x: player.hq.x, y: GROUND - 55, team, life: 1.4, max: 1.4 });
      global.GameAudio?.playUi('pickup');
      return;
    }
    if (action === 'upgradeTrench') {
      const trench = selectedTrench(team);
      trench.level++;
      if (trench.level >= 2) trench.mgHp = trench.mgMax;
      if (trench.level >= 3) trench.atHp = trench.atMax;
      setMessage(team, `${state.trenches.indexOf(trench) + 1}号战壕升级至 ${trench.level} 星`);
      state.effects.push({ type: 'upgrade', x: trench.x, y: GROUND - 20, team, life: 1.2, max: 1.2 });
      global.GameAudio?.playUi('pickup');
      return;
    }
    if (action === 'artillery') {
      player.artilleryCooldown = 32;
      const target = frontlineTrench(otherTeam(team)) || state.trenches[Math.floor(state.trenches.length / 2)];
      artilleryStrike(team, target.x);
      setMessage(team, `炮火覆盖 ${state.trenches.indexOf(target) + 1}号战壕`);
    }
  }

  function artilleryStrike(team, x) {
    const enemy = otherTeam(team);
    for (let index = 0; index < 5; index++) {
      const px = x - 55 + index * 27;
      state.effects.push({ type: 'delayedBlast', x: px, y: GROUND - 10, team, delay: index * 0.17, life: 1.4 + index * 0.17, max: 1.4 });
    }
    for (const unit of state.units) {
      if (!unit.dead && unit.team === enemy && Math.abs(unit.x - x) < 92) damageUnit(unit, 125, { team, antiArmor: 1.2, antiFort: 1.4, role: 'artillery' });
    }
    const trench = state.trenches.find(item => Math.abs(item.x - x) < 5);
    if (trench?.owner === enemy) {
      trench.mgHp = Math.max(0, trench.mgHp - 180);
      trench.atHp = Math.max(0, trench.atHp - 150);
    }
    global.GameAudio?.playExplosion({ x, y: GROUND, r: 150 }, { x: WIDTH / 2, y: GROUND });
  }

  function spawnUnit(team, type, options = {}) {
    const def = unitDefs[type];
    if (!def) return null;
    const direction = TEAM_DIR[team];
    const unit = {
      id: state.nextId++,
      type,
      team,
      side: direction,
      x: options.x ?? HQ_X[team] + direction * (def.airborne ? 25 : 42),
      y: def.airborne ? GROUND - 154 : GROUND - (def.kind === 'vehicle' ? 15 : 13) + (Math.random() * 12 - 6),
      hp: def.hp,
      maxHp: def.hp,
      fire: Math.random() * Math.min(0.4, def.rate),
      dead: false,
      fade: 1,
      walk: Math.random() * Math.PI * 2,
      visualPhase: Math.random() * Math.PI * 2,
      visualTravel: 0,
      visualSpeed: 0,
      suppressed: 0,
      setup: 0,
      deployed: false,
      trenchIndex: -1,
      aps: type === 't90m' || type === 'bmpt' ? 2 : type === 'm1' ? 4 : 0,
      airborne: Boolean(def.airborne),
      flares: def.airborne ? 4 : 0,
      muzzle: 0,
      hit: 0,
      recoil: 0,
    };
    state.units.push(unit);
    return unit;
  }

  function deployTransport(unit) {
    if (unit.deployed || !unitDefs[unit.type].deploy) return;
    const front = frontlineTrench(unit.team);
    if (!front || Math.abs(unit.x - front.x) > 54) return;
    unit.deployed = true;
    const types = ['rifle', 'rifle', 'rifle', 'mg'];
    types.forEach((type, index) => spawnUnit(unit.team, type, {
      x: unit.x - unit.side * (18 + index * 7),
    }));
    setMessage(unit.team, `${unitDefs[unit.type].name} 抵达前线并投放步兵`);
    state.effects.push({ type: 'deploy', x: unit.x, y: GROUND - 42, team: unit.team, life: 1.1, max: 1.1 });
  }

  function unitInOwnedTrench(unit) {
    return state.trenches.findIndex(trench => trench.owner === unit.team && Math.abs(trench.x - unit.x) < 48);
  }

  function hasCommanderAura(unit) {
    return state.units.some(other => !other.dead && other.team === unit.team && other.type === 'commander' && Math.abs(other.x - unit.x) < 145);
  }

  function canTarget(attacker, target) {
    const def = attacker.def || unitDefs[attacker.type] || attacker;
    if (target.airborne && !def.canAir) return false;
    return true;
  }

  function makeEmplacementTarget(trench, kind) {
    return {
      emplacement: true,
      kind,
      trench,
      team: trench.owner,
      x: trench.x + (kind === 'mg' ? -18 : 20),
      y: GROUND - (kind === 'mg' ? 42 : 49),
      get hp() { return kind === 'mg' ? trench.mgHp : trench.atHp; },
      set hp(value) { if (kind === 'mg') trench.mgHp = value; else trench.atHp = value; },
      get maxHp() { return kind === 'mg' ? trench.mgMax : trench.atMax; },
      airborne: false,
    };
  }

  function enemyTargets(team) {
    const enemy = otherTeam(team);
    const targets = state.units.filter(unit => !unit.dead && unit.team === enemy);
    for (const trench of state.trenches) {
      if (trench.owner !== enemy) continue;
      if (trench.mgHp > 0) targets.push(makeEmplacementTarget(trench, 'mg'));
      if (trench.atHp > 0) targets.push(makeEmplacementTarget(trench, 'at'));
    }
    targets.push({ hq: true, team: enemy, x: state.teams[enemy].hq.x, y: GROUND - 50, hp: state.teams[enemy].hq.hp, maxHp: state.teams[enemy].hq.maxHp, airborne: false });
    return targets;
  }

  function closestTarget(unit) {
    const def = unitDefs[unit.type];
    if (!def.range) return null;
    let best = null;
    let score = Infinity;
    for (const target of enemyTargets(unit.team)) {
      if (!canTarget(unit, target)) continue;
      const distance = Math.abs(target.x - unit.x);
      if (distance > def.range) continue;
      const behindPenalty = (target.x - unit.x) * unit.side < -45 ? 180 : 0;
      const priority = target.airborne && def.antiAir ? -160 : target.emplacement && def.antiFort ? -80 : target.hq ? 65 : 0;
      const value = distance + behindPenalty + priority;
      if (value < score) {
        score = value;
        best = target;
      }
    }
    return best;
  }

  function damageUnit(unit, amount, attacker) {
    if (!unit || unit.dead || amount <= 0) return;
    const def = unitDefs[unit.type];
    let damage = amount;
    if (def.armor) {
      const antiArmor = attacker?.antiArmor ?? (attacker?.role === 'engineer' ? 2.5 : 0.25);
      damage *= antiArmor * (1 - def.armor * 0.58);
      if (unit.aps > 0 && attacker?.projectile === 'missile') {
        unit.aps--;
        damage *= 0.18;
        state.effects.push({ type: 'aps', x: unit.x, y: unit.y - 18, team: unit.team, life: 0.5, max: 0.5 });
      }
    }
    if (def.airborne && unit.flares > 0 && attacker?.projectile === 'missile') {
      unit.flares--;
      if (Math.random() < 0.8) {
        damage *= 0.2;
        state.effects.push({ type: 'aps', x: unit.x, y: unit.y - 8, team: unit.team, life: 0.55, max: 0.55 });
      }
    }
    const trenchIndex = unitInOwnedTrench(unit);
    if (trenchIndex >= 0 && def.kind === 'infantry') {
      const trench = state.trenches[trenchIndex];
      damage *= trench.level === 3 ? 0.45 : trench.level === 2 ? 0.5 : 0.55;
    }
    if (hasCommanderAura(unit) && def.kind === 'infantry') damage *= 0.82;
    unit.hp -= Math.max(0.5, damage);
    unit.hit = 0.2;
    state.effects.push({ type: 'hit', x: unit.x, y: unit.y - 20, team: unit.team, life: 0.22, max: 0.22 });
    if (unit.hp <= 0) {
      unit.dead = true;
      unit.fade = 1.3;
      state.teams[attacker?.team || otherTeam(unit.team)].kills++;
      state.teams[unit.team].lost++;
      state.effects.push({ type: def.kind === 'vehicle' ? 'blast' : 'fall', x: unit.x, y: unit.y, team: unit.team, life: def.kind === 'vehicle' ? 0.9 : 0.5, max: def.kind === 'vehicle' ? 0.9 : 0.5 });
      if (def.kind === 'vehicle') {
        state.scorches.push({ x: unit.x, y: GROUND + 2, size: def.heavy ? 38 : 27, life: 70, max: 70 });
        if (state.scorches.length > 28) state.scorches.shift();
      }
      if (def.kind === 'vehicle') global.GameAudio?.playExplosion({ x: unit.x, y: unit.y, r: 90 }, { x: WIDTH / 2, y: GROUND });
    }
  }

  function damageTarget(target, amount, attacker) {
    if (target.hq) {
      const enemyTeam = target.team;
      const owned = teamOwnedTrenches(enemyTeam).length;
      let reduction = owned > 0 ? 0.95 : 0;
      if (state.time > 1080 && reduction) reduction = clamp(0.95 - (state.time - 1080) / 90 * 0.2, 0.75, 0.95);
      const damage = amount * (attacker?.antiFort || 1) * (1 - reduction);
      state.teams[enemyTeam].hq.hp = Math.max(0, state.teams[enemyTeam].hq.hp - damage);
      state.effects.push({ type: 'hit', x: target.x, y: target.y, team: enemyTeam, life: 0.28, max: 0.28 });
      return;
    }
    if (target.emplacement) {
      target.hp = Math.max(0, target.hp - amount * (attacker?.antiFort || 1));
      state.effects.push({ type: 'hit', x: target.x, y: target.y, team: target.team, life: 0.25, max: 0.25 });
      if (target.hp <= 0) {
        if (target.kind === 'at') target.trench.level = Math.min(target.trench.level, 2);
        else target.trench.level = 1;
        state.effects.push({ type: 'blast', x: target.x, y: target.y, team: target.team, life: 0.7, max: 0.7 });
      }
      return;
    }
    damageUnit(target, amount, attacker);
  }

  function queueHit(target, amount, attacker) {
    state.pendingHits.push({ target, amount, attacker });
  }

  function flushPendingHits() {
    const hits = state.pendingHits;
    state.pendingHits = [];
    for (const hit of hits) damageTarget(hit.target, hit.amount, hit.attacker);
  }

  function fireAt(unit, target) {
    const def = unitDefs[unit.type];
    let damage = def.damage;
    if (hasCommanderAura(unit) && def.kind === 'infantry') damage *= 1.24;
    if (target.emplacement || target.hq) damage *= def.antiFort || 1;
    if (target.airborne) {
      if (def.role === 'mainTank') damage = 10;
      else damage *= def.antiAir || (def.canAir ? 0.42 : 0);
    } else if (def.role === 'aa') {
      damage *= 0.35;
    }
    queueHit(target, damage, { ...def, team: unit.team, type: unit.type });
    unit.muzzle = def.projectile === 'shell' ? 0.14 : def.projectile === 'missile' ? 0.18 : 0.07;
    unit.recoil = def.projectile === 'shell' ? 1 : def.role === 'sniper' ? 0.45 : 0.18;
    if (def.suppress && !target.emplacement && !target.hq) target.suppressed = Math.max(target.suppressed || 0, def.suppress * 4);
    if (def.splash && !target.hq) {
      for (const other of state.units) {
        if (!other.dead && other.team !== unit.team && other !== target && Math.abs(other.x - target.x) < def.splash) {
          queueHit(other, damage * 0.28, { ...def, team: unit.team });
        }
      }
    }
    const visualProjectile = target.airborne && def.role === 'mainTank'
      ? 'bullet'
      : !target.airborne && def.role === 'aa'
        ? 'bullet'
        : def.projectile || (def.role === 'sniper' ? 'sniper' : 'bullet');
    state.shots.push({
      x1: unit.x,
      y1: unit.y - (def.airborne ? 15 : def.kind === 'vehicle' ? 24 : 18),
      x2: target.x,
      y2: target.y - (target.airborne ? 10 : 14),
      life: visualProjectile === 'shell' || visualProjectile === 'missile' ? 0.3 : 0.12,
      max: visualProjectile === 'shell' || visualProjectile === 'missile' ? 0.3 : 0.12,
      team: unit.team,
      projectile: visualProjectile,
    });
    if (visualProjectile === 'shell' || visualProjectile === 'missile') {
      global.GameAudio?.playWeapon({ ...unit, main: visualProjectile === 'shell' }, { shellKind: visualProjectile === 'shell' ? 'ap' : undefined, missile: visualProjectile === 'missile' ? 'stinger' : undefined }, { x: WIDTH / 2, y: GROUND });
    }
  }

  function updateUnit(unit, dt) {
    const def = unitDefs[unit.type];
    if (unit.dead) {
      unit.fade -= dt;
      return;
    }
    const previousX = unit.x;
    unit.fire -= dt;
    unit.suppressed = Math.max(0, unit.suppressed - dt);
    unit.muzzle = Math.max(0, unit.muzzle - dt);
    unit.hit = Math.max(0, unit.hit - dt);
    unit.recoil = Math.max(0, unit.recoil - dt * 5);
    deployTransport(unit);
    const target = closestTarget(unit);
    const trenchIndex = unitInOwnedTrench(unit);
    unit.trenchIndex = trenchIndex;

    let moving = false;
    if (target) {
      if (unit.fire <= 0) {
        if (def.role === 'mg' && trenchIndex >= 0 && unit.setup < 0.5) {
          unit.setup += dt;
        } else {
          fireAt(unit, target);
          unit.fire = (target.airborne && def.role === 'mainTank' ? 0.2 : def.rate) * (unit.suppressed > 0 ? 1.35 : 1);
        }
      }
    } else {
      unit.setup = Math.max(0, unit.setup - dt * 0.8);
      let direction = unit.side;
      if (def.role === 'transport') {
        const blocked = state.units.some(other => !other.dead && other.team !== unit.team && !unitDefs[other.type].airborne && (other.x - unit.x) * unit.side > 0 && Math.abs(other.x - unit.x) < 72);
        if (blocked) direction = 0;
      }
      if (def.kind === 'infantry' && trenchIndex >= 0) {
        const order = state.trenches[trenchIndex].orders[unit.team];
        if (order === 'hold') direction = 0;
        else if (order === 'retreat') direction = -unit.side;
        else if (order === 'rally') {
          const nearby = state.units.filter(other => !other.dead && other.team === unit.team && Math.abs(other.x - unit.x) < 85).length;
          direction = nearby >= 5 ? unit.side : 0;
        }
      }
      if (direction) {
        const slow = unit.suppressed > 0 ? 0.68 : 1;
        const next = unit.x + direction * def.speed * slow * dt;
        unit.x = clamp(next, 28, WIDTH - 28);
        unit.walk += def.speed * dt * 0.11;
        moving = true;
        if (def.kind === 'vehicle' && !def.airborne && Math.random() < dt * (def.heavy ? 5 : 3.2)) {
          state.dust.push({
            x: unit.x - unit.side * (def.heavy ? 34 : 25),
            y: GROUND + 4,
            vx: -unit.side * (5 + Math.random() * 8),
            vy: -8 - Math.random() * 8,
            size: 4 + Math.random() * (def.heavy ? 10 : 7),
            life: 0.75,
            max: 0.75,
          });
          if (state.dust.length > 90) state.dust.shift();
        }
      }
    }
    unit.moving = moving;
    const travel = Math.abs(unit.x - previousX);
    unit.visualTravel = finite(unit.visualTravel, 0) + travel;
    unit.visualSpeed = travel / Math.max(0.001, dt);
    if (travel > 0.001) unit.visualPhase = finite(unit.visualPhase, unit.walk) + travel * 0.18;
  }

  function updateTrenchCapture(dt) {
    for (const trench of state.trenches) {
      let redPower = 0;
      let bluePower = 0;
      for (const unit of state.units) {
        if (unit.dead || unit.airborne || Math.abs(unit.x - trench.x) > 51) continue;
        const capture = unitDefs[unit.type].capture || 0;
        if (unit.team === 'red') redPower += capture;
        else bluePower += capture;
      }
      const contested = redPower > 0 && bluePower > 0;
      if (!contested && redPower !== bluePower) {
        trench.control = clamp(trench.control + (redPower - bluePower) * 11 * dt, -100, 100);
      }
      const previous = trench.owner;
      trench.owner = trench.control >= 62 ? 'red' : trench.control <= -62 ? 'blue' : null;
      if (trench.owner && trench.owner !== previous) {
        const previousClaim = trench.lastOwner;
        trench.level = 1;
        trench.mgHp = 0;
        trench.atHp = 0;
        const index = state.trenches.indexOf(trench);
        const reward = previousClaim && previousClaim !== trench.owner ? 2 : 4;
        state.teams[trench.owner].points += reward;
        trench.lastOwner = trench.owner;
        state.teams[trench.owner].selectedTrench = index;
        setMessage(trench.owner, `占领 ${index + 1}号战壕 · 前线补给 +${reward}`);
        state.effects.push({ type: 'capture', x: trench.x, y: GROUND - 55, team: trench.owner, life: 1.3, max: 1.3 });
      }
    }
  }

  function updateEmplacements(dt) {
    for (const trench of state.trenches) {
      if (!trench.owner) continue;
      const enemy = otherTeam(trench.owner);
      trench.mgFire -= dt;
      trench.atFire -= dt;
      if (trench.mgHp > 0 && trench.mgFire <= 0) {
        const target = state.units
          .filter(unit => !unit.dead && unit.team === enemy && !unitDefs[unit.type].airborne && Math.abs(unit.x - trench.x) < 310)
          .sort((a, b) => Math.abs(a.x - trench.x) - Math.abs(b.x - trench.x))[0];
        if (target) {
          queueHit(target, unitDefs[target.type].armor ? 5 : 11, { team: trench.owner, role: 'mgTurret', antiArmor: 0.16 });
          state.shots.push({ x1: trench.x - 18, y1: GROUND - 44, x2: target.x, y2: target.y - 15, life: 0.1, max: 0.1, team: trench.owner, projectile: 'bullet' });
          trench.mgFire = 0.22;
        }
      }
      if (trench.atHp > 0 && trench.atFire <= 0) {
        const target = state.units
          .filter(unit => !unit.dead && unit.team === enemy && unitDefs[unit.type].kind === 'vehicle' && !unitDefs[unit.type].airborne && Math.abs(unit.x - trench.x) < 390)
          .sort((a, b) => Math.abs(a.x - trench.x) - Math.abs(b.x - trench.x))[0];
        if (target) {
          queueHit(target, 102, { team: trench.owner, role: 'atTurret', antiArmor: 1.65, projectile: 'shell' });
          state.shots.push({ x1: trench.x + 20, y1: GROUND - 50, x2: target.x, y2: target.y - 18, life: 0.28, max: 0.28, team: trench.owner, projectile: 'shell' });
          trench.atFire = 2.6;
        }
      }
    }
  }

  function updateHeadquarters(dt) {
    for (const team of ['red', 'blue']) {
      const player = state.teams[team];
      const hq = player.hq;
      hq.fire -= dt;
      hq.missile -= dt;
      const enemy = otherTeam(team);
      const range = 270 + hq.level * 35;
      const groundTarget = state.units
        .filter(unit => !unit.dead && unit.team === enemy && !unitDefs[unit.type].airborne && Math.abs(unit.x - hq.x) < range)
        .sort((a, b) => Math.abs(a.x - hq.x) - Math.abs(b.x - hq.x))[0];
      if (groundTarget && hq.fire <= 0) {
        const damage = 15 + hq.level * 7;
        queueHit(groundTarget, damage, { team, role: 'hqTurret', antiArmor: hq.level >= 3 ? 0.8 : 0.25 });
        state.shots.push({ x1: hq.x, y1: GROUND - 72, x2: groundTarget.x, y2: groundTarget.y - 18, life: 0.15, max: 0.15, team, projectile: hq.level >= 3 ? 'shell' : 'bullet' });
        hq.fire = Math.max(0.24, 0.72 - hq.level * 0.08);
      }
      if (hq.level >= 4 && hq.missile <= 0) {
        const airTarget = state.units.find(unit => !unit.dead && unit.team === enemy && unitDefs[unit.type].airborne && Math.abs(unit.x - hq.x) < 520);
        if (airTarget) {
          queueHit(airTarget, hq.level >= 5 ? 170 : 78, { team, role: 'hqAA', antiAir: 2, projectile: 'missile' });
          state.shots.push({ x1: hq.x, y1: GROUND - 82, x2: airTarget.x, y2: airTarget.y, life: 0.42, max: 0.42, team, projectile: 'missile' });
          hq.missile = hq.level >= 5 ? 4.5 : 1.2;
        }
      }
    }
  }

  function updateEconomy(dt) {
    const redOwned = teamOwnedTrenches('red').length;
    const blueOwned = teamOwnedTrenches('blue').length;
    for (const team of ['red', 'blue']) {
      const player = state.teams[team];
      const behind = team === 'red' ? blueOwned - redOwned : redOwned - blueOwned;
      const comeback = behind >= 2 ? Math.min(0.12, 0.06 + (behind - 2) * 0.03) : 0;
      const decisive = state.time > 1080 ? 1.25 : 1;
      player.income = 1.35 * (1 + comeback) * decisive;
      player.points = Math.min(180, player.points + player.income * dt);
      player.spawnCooldown -= dt;
      player.artilleryCooldown = Math.max(0, player.artilleryCooldown - dt);
      player.messageTimer = Math.max(0, player.messageTimer - dt);
      if (player.queue.length && player.spawnCooldown <= 0) {
        const item = player.queue.shift();
        spawnUnit(team, item.type);
        player.spawnCooldown = 0.82;
        state.deploymentPulse = 0.35;
      }
    }
  }

  function updateEffects(dt) {
    for (const shot of state.shots) shot.life -= dt;
    state.shots = state.shots.filter(shot => shot.life > 0);
    for (const effect of state.effects) {
      effect.life -= dt;
      if (effect.delay !== undefined) effect.delay -= dt;
    }
    state.effects = state.effects.filter(effect => effect.life > 0);
    for (const particle of state.dust) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.size += dt * 12;
    }
    state.dust = state.dust.filter(particle => particle.life > 0);
    for (const scorch of state.scorches) scorch.life -= dt;
    state.scorches = state.scorches.filter(scorch => scorch.life > 0);
    state.deploymentPulse = Math.max(0, state.deploymentPulse - dt);
    state.units = state.units.filter(unit => !unit.dead || unit.fade > 0);
  }

  function checkVictory() {
    if (state.teams.red.hq.hp <= 0 && state.teams.blue.hq.hp <= 0) {
      state.winner = 'draw';
      state.phase = 'ended';
    } else if (state.teams.red.hq.hp <= 0) {
      state.winner = 'blue';
      state.phase = 'ended';
    } else if (state.teams.blue.hq.hp <= 0) {
      state.winner = 'red';
      state.phase = 'ended';
    }
    if (state.phase === 'ended') {
      const loser = state.winner === 'draw' ? 'red' : otherTeam(state.winner);
      global.GameAudio?.playExplosion({ x: state.teams[loser].hq.x, y: GROUND - 50, r: 180 }, { x: WIDTH / 2, y: GROUND });
    }
  }

  function update(dt) {
    if (!state || state.phase !== 'battle' || state.paused) return;
    state.time += dt;
    updateEconomy(dt);
    for (const unit of state.units) updateUnit(unit, dt);
    updateEmplacements(dt);
    updateHeadquarters(dt);
    flushPendingHits();
    updateTrenchCapture(dt);
    updateEffects(dt);
    checkVictory();
  }

  function drawBackgroundLegacy() {
    const time = state.time;
    const sky = ctx.createLinearGradient(0, TOP, 0, GROUND);
    sky.addColorStop(0, '#76847e');
    sky.addColorStop(0.42, '#68766f');
    sky.addColorStop(0.76, '#56635a');
    sky.addColorStop(1, '#404b42');
    ctx.fillStyle = sky;
    ctx.fillRect(0, TOP, WIDTH, GROUND - TOP);

    const sun = ctx.createRadialGradient(780, 145, 8, 780, 145, 190);
    sun.addColorStop(0, 'rgba(241,224,174,.18)');
    sun.addColorStop(1, 'rgba(241,224,174,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(570, TOP, 430, 290);

    ctx.fillStyle = 'rgba(226,231,217,.12)';
    for (let index = 0; index < 9; index++) {
      const drift = (index * 187 + time * (1.2 + index % 3)) % (WIDTH + 240) - 120;
      ctx.beginPath();
      ctx.ellipse(drift, 126 + (index % 4) * 32, 62 + (index % 3) * 31, 15 + (index % 2) * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#5a6760';
    ctx.beginPath();
    ctx.moveTo(0, 325);
    for (let x = 0; x <= WIDTH; x += 80) ctx.lineTo(x, 258 + Math.sin(x * 0.012) * 32 + Math.sin(x * 0.025) * 13);
    ctx.lineTo(WIDTH, GROUND);
    ctx.lineTo(0, GROUND);
    ctx.fill();

    ctx.fillStyle = '#46534b';
    ctx.beginPath();
    ctx.moveTo(0, 363);
    for (let x = 0; x <= WIDTH; x += 70) ctx.lineTo(x, 319 + Math.sin(x * 0.018 + 1.2) * 24 + Math.cos(x * 0.009) * 16);
    ctx.lineTo(WIDTH, GROUND);
    ctx.lineTo(0, GROUND);
    ctx.fill();

    // 远景废墟与通信设施，沿用单人战线的横向层次但保持低对比度。
    ctx.fillStyle = '#38443d';
    ctx.strokeStyle = '#303a34';
    ctx.lineWidth = 2;
    for (let index = 0; index < 10; index++) {
      const x = 38 + index * 137;
      const width = 42 + (index % 3) * 17;
      const height = 28 + (index * 19 % 58);
      ctx.fillRect(x, GROUND - 105 - height, width, height);
      ctx.fillStyle = '#27322d';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) ctx.fillRect(x + 8 + col * 17, GROUND - 95 - height + row * 16, 7, 8);
      }
      ctx.fillStyle = '#38443d';
      if (index % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(x + width * 0.6, GROUND - 105 - height);
        ctx.lineTo(x + width, GROUND - 122 - height);
        ctx.lineTo(x + width, GROUND - 105 - height);
        ctx.fill();
      }
    }
    for (const x of [315, 972]) {
      ctx.strokeStyle = '#344139';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, GROUND - 115);
      ctx.lineTo(x, 188);
      ctx.moveTo(x, 218);
      ctx.lineTo(x - 29, 277);
      ctx.moveTo(x, 218);
      ctx.lineTo(x + 29, 277);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(207,214,198,.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, 190, 22, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }

    // 战场烟柱。
    for (let index = 0; index < 5; index++) {
      const baseX = 215 + index * 230;
      for (let puff = 0; puff < 5; puff++) {
        const sway = Math.sin(time * 0.22 + index * 2 + puff) * 10;
        const py = GROUND - 105 - puff * 25;
        ctx.fillStyle = `rgba(41,47,43,${0.045 + puff * 0.013})`;
        ctx.beginPath();
        ctx.arc(baseX + sway + puff * 4, py, 13 + puff * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const soil = ctx.createLinearGradient(0, GROUND - 5, 0, PANEL_TOP);
    soil.addColorStop(0, '#554c36');
    soil.addColorStop(0.45, '#403a2c');
    soil.addColorStop(1, '#262720');
    ctx.fillStyle = soil;
    ctx.fillRect(0, GROUND - 5, WIDTH, PANEL_TOP - GROUND + 5);

    ctx.strokeStyle = 'rgba(127,118,84,.35)';
    ctx.lineWidth = 2;
    for (let index = 0; index < 7; index++) {
      const x = 105 + index * 185;
      ctx.beginPath();
      ctx.moveTo(x - 42, GROUND + 35 + index % 2 * 8);
      ctx.lineTo(x + 46, GROUND + 29 + index % 3 * 5);
      ctx.stroke();
      for (let post = -1; post <= 1; post++) {
        ctx.beginPath();
        ctx.moveTo(x + post * 36, GROUND + 15);
        ctx.lineTo(x + post * 36, GROUND + 47);
        ctx.stroke();
      }
    }

    for (const scorch of state.scorches) {
      const ratio = clamp(scorch.life / scorch.max, 0, 1);
      ctx.fillStyle = `rgba(20,21,17,${0.12 + ratio * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(scorch.x, scorch.y, scorch.size, scorch.size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(101,77,49,${ratio * 0.28})`;
      ctx.beginPath();
      ctx.moveTo(scorch.x - scorch.size * 0.65, scorch.y);
      ctx.lineTo(scorch.x + scorch.size * 0.58, scorch.y + 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(10,12,10,.18)';
    for (let index = 0; index < 28; index++) {
      const x = (index * 83 + 31) % WIDTH;
      const y = GROUND + 10 + (index * 29) % 75;
      ctx.beginPath();
      ctx.ellipse(x, y, 14 + (index % 3) * 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(173,181,164,.12)';
    ctx.lineWidth = 1;
    for (let index = 0; index < 34; index++) {
      const x = (index * 137 + time * 12) % (WIDTH + 80) - 40;
      const y = TOP + 22 + (index * 79 % 340);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y + 13);
      ctx.stroke();
    }
  }

  function drawBackground() {
    if (global.FrontlineVisuals) {
      global.FrontlineVisuals.drawBackground(ctx, {
        width: WIDTH,
        height: HEIGHT,
        top: TOP,
        ground: GROUND,
        bottom: PANEL_TOP,
        time: state.time,
        scorches: state.scorches,
      });
      return;
    }
    drawBackgroundLegacy();
  }

  function drawHeadquartersLegacy(team) {
    const player = state.teams[team];
    const hq = player.hq;
    const direction = TEAM_DIR[team];
    ctx.save();
    ctx.translate(hq.x, GROUND - 28);
    ctx.scale(direction, 1);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(0, 34, 55, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    const concrete = ctx.createLinearGradient(0, -58, 0, 28);
    concrete.addColorStop(0, team === 'red' ? '#6d5147' : '#486475');
    concrete.addColorStop(0.38, teamDark(team));
    concrete.addColorStop(1, '#30372f');
    ctx.fillStyle = concrete;
    ctx.strokeStyle = teamColor(team);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-50, 25);
    ctx.lineTo(-43, -19);
    ctx.lineTo(-23, -42);
    ctx.lineTo(27, -42);
    ctx.lineTo(46, -17);
    ctx.lineTo(50, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#161c19';
    ctx.fillRect(-18, -7, 31, 32);
    ctx.fillStyle = '#090d0b';
    ctx.fillRect(-13, 0, 20, 25);
    ctx.fillStyle = '#747a68';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        ctx.fillStyle = (row + col) % 2 ? '#736e5b' : '#85806c';
        ctx.beginPath();
        ctx.roundRect(-44 + col * 18 + (row % 2) * 5, -34 + row * 14, 15, 8, 3);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#171d19';
    ctx.beginPath();
    ctx.roundRect(-7, -60, 45 + hq.level * 3, 10, 3);
    ctx.fill();
    ctx.fillStyle = teamColor(team);
    ctx.fillRect(-12, -62, 19, 12);
    ctx.fillStyle = '#111714';
    ctx.fillRect(23, -48, 17, 7);
    ctx.fillStyle = '#8b927e';
    ctx.fillRect(36, -46, 9 + hq.level * 2, 3);
    ctx.strokeStyle = '#1c231e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, -39);
    ctx.lineTo(-32, -72);
    ctx.lineTo(-20, -86);
    ctx.stroke();
    ctx.fillStyle = teamColor(team);
    ctx.beginPath();
    ctx.moveTo(-20, -86);
    ctx.lineTo(6, -79);
    ctx.lineTo(-20, -72);
    ctx.closePath();
    ctx.fill();
    if (hq.level >= 4) {
      ctx.strokeStyle = '#2b302b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -53);
      ctx.lineTo(18, -78);
      ctx.stroke();
      ctx.fillStyle = '#2c342d';
      ctx.fillRect(12, -82, 18, 9);
      ctx.fillStyle = '#818a7a';
      ctx.fillRect(26, -80, 22, 4);
    }
    if (hq.level >= 3) {
      ctx.fillStyle = '#323a33';
      for (let block = 0; block < 3; block++) {
        ctx.fillRect(-47 + block * 17, -48, 13, 9);
        ctx.strokeStyle = '#858b7b';
        ctx.strokeRect(-47 + block * 17, -48, 13, 9);
      }
    }
    ctx.restore();
    const damageRatio = 1 - hq.hp / hq.maxHp;
    if (damageRatio > 0.18) {
      for (let puff = 0; puff < 3; puff++) {
        const sway = Math.sin(state.time * 1.4 + puff + hq.x) * 6;
        ctx.fillStyle = `rgba(35,39,36,${0.1 + damageRatio * 0.22})`;
        ctx.beginPath();
        ctx.arc(hq.x + sway, GROUND - 98 - puff * 16, 7 + puff * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawHealthBar(hq.x - 48, GROUND - 102, 96, 8, hq.hp / hq.maxHp, teamColor(team));
    ctx.fillStyle = '#eceddc';
    ctx.font = 'bold 11px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`${teamLabel(team)}总部 Lv.${hq.level}`, hq.x, GROUND - 108);
    ctx.textAlign = 'left';
  }

  function drawHeadquarters(team) {
    const player = state.teams[team];
    const drawn = global.FrontlineVisuals?.drawHeadquarters(ctx, player.hq, {
      x: player.hq.x,
      side: TEAM_DIR[team],
      team,
      color: teamColor(team),
      ground: GROUND,
      bottom: GROUND + 3,
      time: state.time,
      label: `${teamLabel(team)}总部 · Lv.${player.hq.level}`,
    });
    if (!drawn) drawHeadquartersLegacy(team);
  }

  function drawTrenchLegacy(trench, index) {
    const selectedRed = state.teams.red.selectedTrench === index && trench.owner === 'red';
    const selectedBlue = state.teams.blue.selectedTrench === index && trench.owner === 'blue';
    ctx.save();
    ctx.translate(trench.x, GROUND + 2);
    ctx.fillStyle = '#15171466';
    ctx.beginPath();
    ctx.ellipse(0, 42, 63, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    const earth = ctx.createLinearGradient(0, -10, 0, 45);
    earth.addColorStop(0, '#7a6749');
    earth.addColorStop(0.28, '#594832');
    earth.addColorStop(1, '#342b23');
    ctx.fillStyle = earth;
    ctx.strokeStyle = trench.owner ? teamColor(trench.owner) : '#a39268';
    ctx.lineWidth = selectedRed || selectedBlue ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(-53, 0);
    ctx.lineTo(-49, 38);
    ctx.lineTo(49, 38);
    ctx.lineTo(53, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#88714e';
    for (let x = -48; x < 48; x += 16) {
      ctx.fillStyle = ((x / 16) & 1) ? '#806a48' : '#927b56';
      ctx.beginPath();
      ctx.ellipse(x + 8, -1, 10, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,28,20,.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = '#201d18';
    ctx.fillRect(-39, 10, 78, 26);
    ctx.fillStyle = '#4a3a28';
    for (let plank = -34; plank <= 34; plank += 17) {
      ctx.fillRect(plank, 10, 4, 27);
      ctx.fillStyle = '#6b5437';
      ctx.fillRect(plank + 4, 14, 12, 4);
      ctx.fillStyle = '#4a3a28';
    }
    ctx.strokeStyle = '#8f7b58';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-35, 34);
    ctx.lineTo(35, 34);
    ctx.stroke();
    const flag = trench.owner ? teamColor(trench.owner) : '#a49265';
    ctx.strokeStyle = '#252921';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -61);
    ctx.stroke();
    ctx.fillStyle = flag;
    ctx.beginPath();
    ctx.moveTo(2, -59);
    ctx.lineTo(trench.owner === 'blue' ? -29 : 29, -48);
    ctx.lineTo(2, -37);
    ctx.closePath();
    ctx.fill();
    if (trench.mgHp > 0) {
      ctx.fillStyle = '#232a25';
      ctx.beginPath();
      ctx.roundRect(-31, -32, 31, 14, 3);
      ctx.fill();
      ctx.fillStyle = '#667062';
      ctx.beginPath();
      ctx.arc(-17, -35, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a201c';
      ctx.fillRect(-17, -38, trench.owner === 'blue' ? -35 : 35, 5);
      ctx.fillStyle = '#8a927f';
      ctx.fillRect(trench.owner === 'blue' ? -48 : 13, -37, 11, 3);
    }
    if (trench.atHp > 0) {
      ctx.fillStyle = '#323a33';
      ctx.beginPath();
      ctx.roundRect(7, -37, 31, 17, 4);
      ctx.fill();
      ctx.strokeStyle = '#818977';
      ctx.stroke();
      ctx.fillStyle = '#171d19';
      ctx.fillRect(22, -42, trench.owner === 'red' ? 39 : -39, 7);
      ctx.fillStyle = '#939988';
      ctx.fillRect(trench.owner === 'red' ? 56 : -22, -40, trench.owner === 'red' ? 9 : -9, 3);
    }
    if (trench.level >= 2) {
      ctx.strokeStyle = 'rgba(154,160,141,.72)';
      ctx.lineWidth = 1.5;
      for (const wireY of [-15, -8]) {
        ctx.beginPath();
        for (let px = -49; px <= 49; px += 9) {
          const py = wireY + Math.sin(px * 0.45) * 3;
          if (px === -49) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    const captureRatio = (trench.control + 100) / 200;
    ctx.fillStyle = '#101511';
    ctx.fillRect(trench.x - 44, GROUND + 48, 88, 6);
    ctx.fillStyle = RED;
    ctx.fillRect(trench.x - 43, GROUND + 49, 86 * captureRatio, 4);
    ctx.fillStyle = BLUE;
    ctx.fillRect(trench.x - 43 + 86 * captureRatio, GROUND + 49, 86 * (1 - captureRatio), 4);
    ctx.fillStyle = '#d9dfcc';
    ctx.font = 'bold 11px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`${index + 1}号战壕 · ${'★'.repeat(trench.level)}`, trench.x, GROUND + 70);
    if (trench.owner) {
      const order = trench.orders[trench.owner];
      const labels = { advance: '推进', hold: '驻守', rally: '集结', retreat: '后撤' };
      ctx.fillStyle = teamColor(trench.owner);
      ctx.font = '10px Microsoft YaHei';
      ctx.fillText(labels[order] || '推进', trench.x, GROUND + 84);
    }
    ctx.textAlign = 'left';
  }

  function drawTrench(trench, index) {
    const selected = (state.teams.red.selectedTrench === index && trench.owner === 'red')
      || (state.teams.blue.selectedTrench === index && trench.owner === 'blue');
    const labels = { advance: '推进', hold: '驻守', rally: '集结', retreat: '后撤' };
    const order = trench.owner ? trench.orders[trench.owner] : '';
    const drawn = global.FrontlineVisuals?.drawTrench(ctx, trench, index, {
      ground: GROUND,
      selected,
      leftColor: RED,
      rightColor: BLUE,
      orderLabel: labels[order] || '',
    });
    if (!drawn) drawTrenchLegacy(trench, index);
  }

  function drawHealthBar(x, y, width, height, ratio, color) {
    ctx.fillStyle = 'rgba(5,8,6,.86)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, (width - 2) * clamp(ratio, 0, 1), height - 2);
  }

  function drawSoldierLegacy(unit, def) {
    const direction = unit.side;
    const phase = unit.moving ? unit.walk : 0;
    const stride = Math.sin(phase) * (unit.moving ? 8 : 1);
    const bob = unit.moving ? Math.abs(Math.cos(phase)) * 1.8 : 0;
    const kneeling = def.role === 'mg' && unit.trenchIndex >= 0 && unit.setup >= 0.5;
    const bodyY = kneeling ? 5 : 0;
    const deathProgress = unit.dead ? clamp(1 - unit.fade / 1.3, 0, 1) : 0;
    ctx.save();
    ctx.translate(unit.x, unit.y + bob + bodyY);
    ctx.rotate(direction * deathProgress * 1.12);
    ctx.scale(direction, 1);
    ctx.globalAlpha = unit.dead ? clamp(unit.fade / 1.3, 0, 1) : 1;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(-1, kneeling ? 12 : 18, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 双段腿部动画，移动时膝盖与靴子产生不同相位。
    ctx.strokeStyle = '#292d27';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (kneeling) {
      ctx.moveTo(-4, 3); ctx.lineTo(-10, 10); ctx.lineTo(-2, 15);
      ctx.moveTo(4, 3); ctx.lineTo(10, 12); ctx.lineTo(16, 13);
    } else {
      ctx.moveTo(-4, 4); ctx.lineTo(-5 + stride * 0.45, 10); ctx.lineTo(-8 + stride, 19);
      ctx.moveTo(4, 4); ctx.lineTo(5 - stride * 0.45, 11); ctx.lineTo(8 - stride, 19);
    }
    ctx.stroke();

    ctx.strokeStyle = '#151a17';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(kneeling ? -4 : -8 + stride, kneeling ? 15 : 19);
    ctx.lineTo(kneeling ? 4 : -1 + stride, kneeling ? 15 : 19);
    ctx.moveTo(kneeling ? 13 : 8 - stride, kneeling ? 13 : 19);
    ctx.lineTo(kneeling ? 20 : 15 - stride, kneeling ? 13 : 19);
    ctx.stroke();

    const uniform = unit.team === 'red' ? '#74453c' : '#3c5e79';
    const uniformLight = unit.team === 'red' ? '#966054' : '#557c9b';
    ctx.fillStyle = uniform;
    ctx.strokeStyle = teamColor(unit.team);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-9, -15, 19, 22, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2b342d';
    ctx.beginPath();
    ctx.roundRect(-13, -13, 6, 16, 2);
    ctx.fill();
    ctx.fillStyle = '#a18c6d';
    ctx.fillRect(-7, -8, 15, 3);
    ctx.fillStyle = uniformLight;
    ctx.fillRect(-4, -13, 4, 12);

    // 手臂随武器后坐产生轻微动作。
    const recoil = unit.recoil * 3;
    ctx.strokeStyle = uniformLight;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(5 - recoil, -5);
    ctx.moveTo(7, -10);
    ctx.lineTo(15 - recoil, -5);
    ctx.stroke();

    ctx.fillStyle = '#b7a38a';
    ctx.beginPath();
    ctx.arc(1, -22, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = unit.team === 'red' ? '#5a3933' : '#304c61';
    ctx.beginPath();
    ctx.arc(0, -24, 8, Math.PI, 0);
    ctx.lineTo(8, -21);
    ctx.lineTo(-8, -21);
    ctx.fill();

    const weaponLength = def.role === 'sniper' ? 39 : def.role === 'mg' ? 35 : def.role === 'engineer' ? 34 : 28;
    const weaponY = kneeling ? -6 : -7;
    ctx.strokeStyle = '#202721';
    ctx.lineWidth = def.role === 'engineer' ? 7 : def.role === 'mg' ? 5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(3 - recoil, weaponY);
    ctx.lineTo(weaponLength - recoil, weaponY + 2);
    ctx.stroke();

    if (def.role === 'rifle') {
      ctx.fillStyle = '#7d6445';
      ctx.fillRect(7 - recoil, weaponY - 1, 10, 4);
      ctx.fillStyle = '#181d1a';
      ctx.fillRect(15 - recoil, weaponY + 3, 6, 7);
    } else if (def.role === 'mg') {
      ctx.fillStyle = '#151b18';
      ctx.beginPath();
      ctx.arc(20 - recoil, weaponY + 5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#252c27';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28, weaponY + 4); ctx.lineTo(23, weaponY + 15);
      ctx.moveTo(30, weaponY + 4); ctx.lineTo(35, weaponY + 15);
      ctx.stroke();
    } else if (def.role === 'sniper') {
      ctx.fillStyle = '#111713';
      ctx.fillRect(16 - recoil, weaponY - 5, 10, 3);
      ctx.fillStyle = '#806a49';
      ctx.fillRect(5 - recoil, weaponY, 14, 4);
    } else if (def.role === 'engineer') {
      ctx.fillStyle = '#7c836f';
      ctx.beginPath();
      ctx.moveTo(weaponLength - 5, weaponY - 7);
      ctx.lineTo(weaponLength + 5, weaponY + 2);
      ctx.lineTo(weaponLength - 5, weaponY + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#343c34';
      ctx.fillRect(4, weaponY - 6, 7, 12);
    }

    if (def.role === 'commander') {
      ctx.fillStyle = GOLD;
      ctx.fillRect(-4, -32, 10, 4);
      ctx.fillStyle = '#252d27';
      ctx.fillRect(-14, -17, 7, 15);
      ctx.strokeStyle = '#707a6b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, -17);
      ctx.lineTo(-15, -35);
      ctx.stroke();
    }

    if (unit.muzzle > 0) {
      const muzzleX = weaponLength + 2 - recoil;
      ctx.fillStyle = '#fff2a6';
      ctx.shadowColor = '#ff9d35';
      ctx.shadowBlur = 11;
      ctx.beginPath();
      ctx.moveTo(muzzleX, weaponY - 5);
      ctx.lineTo(muzzleX + 13 + unit.muzzle * 20, weaponY + 2);
      ctx.lineTo(muzzleX, weaponY + 7);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (unit.hit > 0) {
      ctx.fillStyle = `rgba(255,222,165,${unit.hit * 2.5})`;
      ctx.beginPath();
      ctx.ellipse(0, -7, 14, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (!unit.dead) {
      drawHealthBar(unit.x - 19, unit.y - 48, 38, 5, unit.hp / unit.maxHp, teamColor(unit.team));
      if (unit.suppressed > 0) {
        ctx.fillStyle = '#e3bd63';
        ctx.font = 'bold 9px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('压制', unit.x, unit.y - 52);
        ctx.textAlign = 'left';
      }
    }
  }

  function drawSoldier(unit, def) {
    const drawn = global.FrontlineVisuals?.drawInfantry(ctx, unit, {
      type: unit.type,
      side: unit.side,
      team: unit.team,
      color: teamColor(unit.team),
      time: state.time,
      moving: unit.moving,
      firing: unit.muzzle > 0,
    });
    if (!drawn) drawSoldierLegacy(unit, def);
  }

  function drawWheel(x, y, radius, phase) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(phase);
    ctx.fillStyle = '#151a17';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#777d70';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-radius * 0.52, 0);
    ctx.lineTo(radius * 0.52, 0);
    ctx.moveTo(0, -radius * 0.52);
    ctx.lineTo(0, radius * 0.52);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrack(width, phase, heavy = false) {
    const height = heavy ? 22 : 19;
    ctx.fillStyle = '#141916';
    ctx.beginPath();
    ctx.roundRect(-width / 2, 2, width, height, height / 2);
    ctx.fill();
    ctx.strokeStyle = '#4f574e';
    ctx.lineWidth = 2;
    ctx.stroke();
    const wheelCount = heavy ? 6 : 5;
    for (let index = 0; index < wheelCount; index++) {
      const px = -width * 0.36 + index * (width * 0.72 / (wheelCount - 1));
      ctx.fillStyle = index % 2 ? '#4b5149' : '#596057';
      ctx.beginPath();
      ctx.arc(px, 12, heavy ? 7 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#818677';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.strokeStyle = '#8a8e80';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -(phase % 10);
    ctx.beginPath();
    ctx.moveTo(-width * 0.4, 4);
    ctx.lineTo(width * 0.4, 4);
    ctx.moveTo(-width * 0.4, 21);
    ctx.lineTo(width * 0.4, 21);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function vehiclePaint(team) {
    return team === 'red'
      ? { body: '#6d4b3f', light: '#906756', dark: '#3d302a' }
      : { body: '#456479', light: '#6086a0', dark: '#293d4b' };
  }

  function drawVehicleMuzzle(x, y, unit, scale = 1) {
    if (unit.muzzle <= 0) return;
    ctx.fillStyle = '#fff2a6';
    ctx.shadowColor = '#ff8d31';
    ctx.shadowBlur = 16 * scale;
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * scale);
    ctx.lineTo(x + (18 + unit.muzzle * 60) * scale, y);
    ctx.lineTo(x, y + 6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawVehicleLegacy(unit, def) {
    const direction = unit.side;
    const paint = vehiclePaint(unit.team);
    const alpha = unit.dead ? clamp(unit.fade / 1.3, 0, 1) : 1;
    const recoil = unit.recoil * 6;
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.scale(direction, 1);
    ctx.globalAlpha = alpha;

    if (def.airborne) {
      ctx.fillStyle = 'rgba(0,0,0,.24)';
      ctx.beginPath();
      ctx.ellipse(0, 151, 56, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // 阿帕奇侧视建模：驾驶舱、短翼、武器挂架、尾梁与双旋翼。
      ctx.strokeStyle = 'rgba(221,227,215,.72)';
      ctx.lineWidth = 2.5;
      const rotorPhase = state.time * 18;
      ctx.save();
      ctx.translate(-3, -30);
      ctx.rotate(Math.sin(rotorPhase) * 0.045);
      ctx.beginPath();
      ctx.moveTo(-72, 0);
      ctx.lineTo(72, 0);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = paint.dark;
      ctx.beginPath();
      ctx.moveTo(-63, -6);
      ctx.lineTo(-16, -10);
      ctx.lineTo(4, 2);
      ctx.lineTo(-53, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = paint.body;
      ctx.beginPath();
      ctx.moveTo(-15, -14);
      ctx.lineTo(17, -17);
      ctx.quadraticCurveTo(43, -12, 45, 3);
      ctx.quadraticCurveTo(34, 17, 7, 17);
      ctx.lineTo(-19, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = teamColor(unit.team);
      ctx.lineWidth = 2;
      ctx.stroke();
      const cockpit = ctx.createLinearGradient(17, -16, 43, 8);
      cockpit.addColorStop(0, '#1a292e');
      cockpit.addColorStop(1, '#57747c');
      ctx.fillStyle = cockpit;
      ctx.beginPath();
      ctx.moveTo(18, -13);
      ctx.lineTo(32, -8);
      ctx.lineTo(40, 2);
      ctx.lineTo(18, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#9aa79c';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = paint.light;
      ctx.fillRect(-3, 7, 36, 5);
      ctx.fillRect(-28, -1, 57, 5);
      ctx.fillStyle = '#202722';
      for (const px of [-21, -10, 12, 23]) {
        ctx.fillRect(px, 6, 7, 12);
        ctx.fillStyle = '#7d826d';
        ctx.fillRect(px + 1, 15, 5, 5);
        ctx.fillStyle = '#202722';
      }
      ctx.strokeStyle = '#222a24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-3, 15); ctx.lineTo(-15, 31); ctx.lineTo(2, 31);
      ctx.moveTo(14, 15); ctx.lineTo(27, 31); ctx.lineTo(9, 31);
      ctx.stroke();
      ctx.save();
      ctx.translate(-61, -6);
      ctx.rotate(-state.time * 8);
      ctx.strokeStyle = '#c5cbbc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-13, 0); ctx.lineTo(13, 0);
      ctx.moveTo(0, -13); ctx.lineTo(0, 13);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 7px Microsoft YaHei';
      ctx.fillText(`热焰 ${unit.flares}`, -6, -20);
      drawVehicleMuzzle(48, 6, unit, 0.65);
    } else if (unit.type === 'humvee' || unit.type === 'aaHumvee') {
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath();
      ctx.ellipse(0, 22, 38, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const px of [-22, 22]) drawWheel(px, 13, 10, unit.walk * 0.4);
      ctx.fillStyle = paint.body;
      ctx.strokeStyle = teamColor(unit.team);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-33, 10);
      ctx.lineTo(-31, -8);
      ctx.lineTo(-12, -17);
      ctx.lineTo(18, -17);
      ctx.lineTo(32, -5);
      ctx.lineTo(34, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1c292b';
      ctx.fillRect(-8, -14, 16, 12);
      ctx.fillRect(11, -14, 12, 12);
      ctx.fillStyle = paint.light;
      ctx.fillRect(-29, -5, 15, 8);
      ctx.fillStyle = '#242b25';
      ctx.fillRect(-34, 7, 68, 5);
      ctx.fillStyle = teamColor(unit.team);
      ctx.fillRect(-27, -2, 10, 3);
      if (unit.type === 'aaHumvee') {
        ctx.fillStyle = '#293229';
        ctx.fillRect(-2, -27, 11, 11);
        ctx.fillStyle = '#666f63';
        ctx.beginPath();
        ctx.roundRect(5, -33, 32, 13, 3);
        ctx.fill();
        ctx.strokeStyle = '#232a24';
        for (let tube = 0; tube < 3; tube++) {
          ctx.beginPath();
          ctx.moveTo(11 + tube * 10, -31);
          ctx.lineTo(36 + tube * 2, -27);
          ctx.stroke();
        }
        drawVehicleMuzzle(38, -27, unit, 0.7);
      }
    } else if (unit.type === 'apc') {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(0, 22, 45, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const px of [-31, -12, 12, 31]) drawWheel(px, 13, 8, unit.walk * 0.35);
      ctx.fillStyle = paint.body;
      ctx.strokeStyle = teamColor(unit.team);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-40, 8);
      ctx.lineTo(-37, -14);
      ctx.lineTo(21, -20);
      ctx.lineTo(39, -7);
      ctx.lineTo(42, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = paint.light;
      for (let panel = 0; panel < 4; panel++) {
        ctx.fillRect(-29 + panel * 16, -10, 12, 7);
        ctx.strokeStyle = paint.dark;
        ctx.strokeRect(-29 + panel * 16, -10, 12, 7);
      }
      ctx.fillStyle = '#232c27';
      ctx.beginPath();
      ctx.ellipse(4, -21, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(6, -24, 34 - recoil, 4);
      ctx.fillStyle = '#919887';
      ctx.fillRect(37 - recoil, -23, 8, 2);
      drawVehicleMuzzle(45 - recoil, -22, unit, 0.65);
    } else {
      const heavy = ['bmpt', 'm1', 't90m'].includes(unit.type);
      const width = unit.type === 'hstv' ? 68 : unit.type === 'bmpt' ? 80 : 84;
      ctx.fillStyle = 'rgba(0,0,0,.37)';
      ctx.beginPath();
      ctx.ellipse(0, 24, width * 0.6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      drawTrack(width, unit.walk * 1.8, heavy);
      ctx.fillStyle = paint.body;
      ctx.strokeStyle = teamColor(unit.team);
      ctx.lineWidth = 2;

      if (unit.type === 'hstv') {
        ctx.beginPath();
        ctx.moveTo(-35, 7); ctx.lineTo(-29, -10); ctx.lineTo(28, -13); ctx.lineTo(39, 2); ctx.lineTo(34, 10); ctx.lineTo(-34, 10); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = paint.light;
        ctx.beginPath();
        ctx.moveTo(-10, -14); ctx.lineTo(13, -21); ctx.lineTo(27, -15); ctx.lineTo(17, -7); ctx.lineTo(-10, -7); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#202721';
        ctx.fillRect(10, -18, 53 - recoil, 5);
        ctx.fillStyle = '#8d9483';
        ctx.fillRect(58 - recoil, -17, 9, 3);
        ctx.fillStyle = '#252d27';
        ctx.fillRect(-25, -8, 16, 6);
        drawVehicleMuzzle(67 - recoil, -15, unit, 0.82);
      } else if (unit.type === 'bmpt') {
        ctx.beginPath();
        ctx.moveTo(-42, 6); ctx.lineTo(-34, -13); ctx.lineTo(31, -15); ctx.lineTo(44, 0); ctx.lineTo(39, 11); ctx.lineTo(-39, 11); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = paint.light;
        for (let panel = 0; panel < 6; panel++) ctx.fillRect(-33 + panel * 12, -8, 9, 7);
        ctx.fillStyle = paint.dark;
        ctx.beginPath();
        ctx.roundRect(-11, -28, 30, 16, 5);
        ctx.fill();
        ctx.fillStyle = '#171d19';
        ctx.fillRect(12, -27, 48 - recoil, 4);
        ctx.fillRect(12, -18, 48 - recoil, 4);
        ctx.fillStyle = '#737b6d';
        ctx.fillRect(-20, -32, 14, 12);
        ctx.fillRect(19, -32, 14, 12);
        ctx.strokeStyle = '#242a25';
        for (let tube = 0; tube < 2; tube++) {
          ctx.beginPath(); ctx.moveTo(-18, -29 + tube * 6); ctx.lineTo(-31, -26 + tube * 5); ctx.stroke();
        }
        drawVehicleMuzzle(62 - recoil, -22, unit, 0.72);
      } else if (unit.type === 'm1') {
        ctx.beginPath();
        ctx.moveTo(-43, 7); ctx.lineTo(-36, -15); ctx.lineTo(33, -18); ctx.lineTo(45, -3); ctx.lineTo(40, 11); ctx.lineTo(-40, 11); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = paint.light;
        ctx.fillRect(-34, -10, 65, 8);
        ctx.fillStyle = paint.dark;
        ctx.beginPath();
        ctx.moveTo(-16, -20); ctx.lineTo(-4, -34); ctx.lineTo(26, -32); ctx.lineTo(39, -20); ctx.lineTo(25, -12); ctx.lineTo(-13, -13); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#8c927f';
        ctx.stroke();
        ctx.fillStyle = '#171d19';
        ctx.fillRect(19, -29, 69 - recoil, 7);
        ctx.fillStyle = '#9ba18e';
        ctx.fillRect(83 - recoil, -28, 11, 4);
        ctx.fillStyle = '#272f29';
        ctx.fillRect(-9, -39, 12, 8);
        ctx.fillRect(5, -38, 9, 7);
        drawVehicleMuzzle(94 - recoil, -25, unit, 1);
      } else {
        ctx.beginPath();
        ctx.moveTo(-42, 7); ctx.lineTo(-37, -16); ctx.lineTo(30, -17); ctx.lineTo(44, -1); ctx.lineTo(39, 11); ctx.lineTo(-40, 11); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = paint.light;
        for (let panel = 0; panel < 6; panel++) {
          ctx.fillRect(-34 + panel * 12, -11, 10, 7);
          ctx.strokeStyle = paint.dark;
          ctx.strokeRect(-34 + panel * 12, -11, 10, 7);
        }
        ctx.fillStyle = paint.dark;
        ctx.beginPath();
        ctx.ellipse(5, -24, 25, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8c927f';
        ctx.stroke();
        ctx.fillStyle = paint.light;
        for (const [px, py] of [[-9, -29], [3, -32], [14, -29], [-3, -21], [10, -20]]) ctx.fillRect(px, py, 9, 6);
        ctx.fillStyle = '#171d19';
        ctx.fillRect(18, -29, 63 - recoil, 6);
        ctx.fillStyle = '#969d89';
        ctx.fillRect(76 - recoil, -28, 10, 3);
        ctx.fillStyle = '#252d27';
        ctx.beginPath();
        ctx.arc(-5, -39, 6, 0, Math.PI * 2);
        ctx.fill();
        drawVehicleMuzzle(86 - recoil, -26, unit, 0.95);
      }
    }

    if (def.deploy && !unit.deployed) {
      ctx.fillStyle = 'rgba(8,12,9,.8)';
      ctx.fillRect(-18, -43, 36, 13);
      ctx.strokeStyle = GOLD;
      ctx.strokeRect(-18, -43, 36, 13);
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 8px Microsoft YaHei';
      ctx.textAlign = 'center';
      ctx.fillText('满载步兵', 0, -34);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = teamColor(unit.team);
    ctx.fillRect(-5, def.airborne ? -8 : -5, 10, 4);
    if (unit.hit > 0) {
      ctx.fillStyle = `rgba(255,226,173,${unit.hit * 2.2})`;
      ctx.beginPath();
      ctx.ellipse(0, def.airborne ? 0 : -4, def.airborne ? 48 : 45, def.airborne ? 24 : 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (!unit.dead) {
      const barWidth = def.airborne ? 58 : def.heavy ? 64 : 52;
      const barY = unit.y - (def.airborne ? 47 : unit.type === 'm1' || unit.type === 't90m' ? 58 : unit.type === 'bmpt' ? 55 : 47);
      drawHealthBar(unit.x - barWidth / 2, barY, barWidth, 6, unit.hp / unit.maxHp, teamColor(unit.team));
      if (unit.hp / unit.maxHp < 0.48) {
        for (let puff = 0; puff < 3; puff++) {
          const sway = Math.sin(state.time * 2 + unit.id + puff) * 5;
          ctx.fillStyle = `rgba(34,39,35,${0.13 + (0.48 - unit.hp / unit.maxHp) * 0.35})`;
          ctx.beginPath();
          ctx.arc(unit.x - unit.side * 11 + sway, barY - 8 - puff * 10, 5 + puff * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawVehicle(unit, def) {
    const drawn = global.FrontlineVisuals?.drawVehicle(ctx, unit, {
      type: unit.type,
      side: unit.side,
      team: unit.team,
      color: teamColor(unit.team),
      ground: GROUND,
      time: state.time,
      def,
      name: def.name,
      firing: unit.muzzle > 0,
    });
    if (!drawn) drawVehicleLegacy(unit, def);
  }

  function drawUnits() {
    const sorted = [...state.units].sort((a, b) => (unitDefs[a.type].airborne ? 1 : 0) - (unitDefs[b.type].airborne ? 1 : 0));
    for (const unit of sorted) {
      const def = unitDefs[unit.type];
      if (def.kind === 'vehicle') drawVehicle(unit, def);
      else drawSoldier(unit, def);
    }
  }

  function drawDustLegacy() {
    for (const particle of state.dust) {
      const alpha = clamp(particle.life / particle.max, 0, 1) * 0.22;
      ctx.fillStyle = `rgba(176,157,116,${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDust() {
    if (global.FrontlineVisuals) global.FrontlineVisuals.drawDust(ctx, state.dust);
    else drawDustLegacy();
  }

  function drawShotsAndEffectsLegacy() {
    for (const shot of state.shots) {
      const progress = 1 - shot.life / shot.max;
      const x = shot.x1 + (shot.x2 - shot.x1) * progress;
      const y = shot.y1 + (shot.y2 - shot.y1) * progress;
      const projectileColor = shot.projectile === 'missile' ? '#f7b654' : shot.projectile === 'shell' ? '#fff0b5' : shot.projectile === 'sniper' ? '#fff9d8' : shot.team === 'red' ? '#ff9b72' : '#8cc7ff';
      ctx.strokeStyle = projectileColor;
      ctx.shadowColor = shot.projectile === 'missile' || shot.projectile === 'shell' ? '#ff9c3a' : projectileColor;
      ctx.shadowBlur = shot.projectile === 'missile' || shot.projectile === 'shell' ? 9 : 3;
      ctx.lineWidth = shot.projectile === 'shell' || shot.projectile === 'missile' ? 4 : shot.projectile === 'sniper' ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x - (shot.x2 - shot.x1) * (shot.projectile === 'missile' ? 0.07 : 0.025), y - (shot.y2 - shot.y1) * (shot.projectile === 'missile' ? 0.07 : 0.025));
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (shot.projectile === 'missile') {
        const angle = Math.atan2(shot.y2 - shot.y1, shot.x2 - shot.x1);
        for (let puff = 1; puff <= 4; puff++) {
          ctx.fillStyle = `rgba(218,221,207,${0.2 / puff})`;
          ctx.beginPath();
          ctx.arc(x - Math.cos(angle) * puff * 9, y - Math.sin(angle) * puff * 9, 3 + puff * 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (shot.projectile === 'shell') {
        ctx.fillStyle = '#fff9cf';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const effect of state.effects) {
      if (effect.delay > 0) continue;
      const ratio = clamp(effect.life / effect.max, 0, 1);
      if (effect.type === 'blast' || effect.type === 'delayedBlast') {
        const radius = 10 + (1 - ratio) * 46;
        const gradient = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, radius);
        gradient.addColorStop(0, `rgba(255,231,139,${ratio})`);
        gradient.addColorStop(0.45, `rgba(231,98,43,${ratio * 0.8})`);
        gradient.addColorStop(1, 'rgba(50,39,30,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(44,47,42,${(1 - ratio) * 0.24})`;
        for (let puff = 0; puff < 3; puff++) {
          ctx.beginPath();
          ctx.arc(effect.x - 9 + puff * 9, effect.y - 15 - puff * 8, 7 + puff * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = `rgba(229,188,96,${ratio * 0.6})`;
        ctx.lineWidth = 2;
        for (let fragment = 0; fragment < 5; fragment++) {
          const angle = fragment * 1.27 + effect.x * 0.01;
          ctx.beginPath();
          ctx.moveTo(effect.x, effect.y);
          ctx.lineTo(effect.x + Math.cos(angle) * radius * 0.8, effect.y + Math.sin(angle) * radius * 0.45);
          ctx.stroke();
        }
      } else if (effect.type === 'upgrade' || effect.type === 'capture' || effect.type === 'deploy') {
        ctx.strokeStyle = teamColor(effect.team);
        ctx.globalAlpha = ratio;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 12 + (1 - ratio) * 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (ratio > 0.35) {
          ctx.fillStyle = teamColor(effect.team);
          ctx.font = 'bold 10px Microsoft YaHei';
          ctx.textAlign = 'center';
          ctx.fillText(effect.type === 'upgrade' ? '阵地强化' : effect.type === 'capture' ? '阵地占领' : '步兵下车', effect.x, effect.y - 24 - (1 - ratio) * 12);
          ctx.textAlign = 'left';
        }
      } else if (effect.type === 'hit') {
        ctx.fillStyle = '#fff2ad';
        ctx.globalAlpha = ratio;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 4 + (1 - ratio) * 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (effect.type === 'aps') {
        ctx.strokeStyle = '#85dbff';
        ctx.globalAlpha = ratio;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 22 + (1 - ratio) * 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (effect.type === 'fall') {
        ctx.fillStyle = `rgba(99,44,37,${ratio * 0.35})`;
        ctx.beginPath();
        ctx.ellipse(effect.x, effect.y + 15, 13 + (1 - ratio) * 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawShotsAndEffects() {
    if (!global.FrontlineVisuals) {
      drawShotsAndEffectsLegacy();
      return;
    }
    for (const shot of state.shots) global.FrontlineVisuals.drawShot(ctx, shot);
    for (const effect of state.effects) {
      global.FrontlineVisuals.drawEffect(ctx, effect, {
        team: effect.team,
        color: effect.team ? teamColor(effect.team) : undefined,
      });
    }
  }

  function drawBattlefieldAtmosphere() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, TOP, WIDTH, PANEL_TOP - TOP);
    ctx.clip();
    const haze = ctx.createLinearGradient(0, TOP, 0, PANEL_TOP);
    haze.addColorStop(0, 'rgba(222,230,217,.025)');
    haze.addColorStop(0.6, 'rgba(232,211,157,.012)');
    haze.addColorStop(1, 'rgba(8,12,9,.16)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, TOP, WIDTH, PANEL_TOP - TOP);
    const vignette = ctx.createRadialGradient(WIDTH / 2, 320, 240, WIDTH / 2, 320, 790);
    vignette.addColorStop(0.58, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(2,7,4,.33)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, TOP, WIDTH, PANEL_TOP - TOP);
    ctx.strokeStyle = 'rgba(173,186,167,.22)';
    ctx.strokeRect(0.5, TOP + 0.5, WIDTH - 1, PANEL_TOP - TOP - 1);
    ctx.restore();
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  function drawTopHud() {
    ctx.fillStyle = '#07100beF';
    ctx.fillRect(0, 0, WIDTH, TOP);
    ctx.strokeStyle = '#708061';
    ctx.beginPath();
    ctx.moveTo(0, TOP - 1);
    ctx.lineTo(WIDTH, TOP - 1);
    ctx.stroke();
    for (const team of ['red', 'blue']) {
      const player = state.teams[team];
      const left = team === 'red' ? 18 : 860;
      ctx.fillStyle = teamColor(team);
      ctx.font = 'bold 18px Microsoft YaHei';
      ctx.fillText(`${teamLabel(team)} · ${team === 'red' ? '键盘' : '鼠标'}`, left, 25);
      ctx.fillStyle = '#e6eadc';
      ctx.font = 'bold 13px Microsoft YaHei';
      ctx.fillText(`资源 ${Math.floor(player.points)}  收入 +${player.income.toFixed(2)}/秒`, left, 49);
      ctx.fillText(`总部 Lv.${player.hq.level}  重装 ${currentHeavyCount(team)}/3  队列 ${player.queue.length}/6`, left, 70);
      drawHealthBar(left + 280, 15, 110, 9, player.hq.hp / player.hq.maxHp, teamColor(team));
      ctx.fillStyle = '#b8c2ae';
      ctx.font = '10px Microsoft YaHei';
      ctx.fillText(`${Math.ceil(player.hq.hp)}/${player.hq.maxHp}`, left + 282, 38);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 20px Consolas,monospace';
    ctx.fillText(formatTime(state.time), WIDTH / 2, 28);
    ctx.fillStyle = '#c5d0bc';
    ctx.font = '11px Microsoft YaHei';
    ctx.fillText(state.time > 1080 ? '决胜阶段 · 收入提升 · 总部减伤衰减' : '摧毁敌方总部获胜', WIDTH / 2, 49);
    ctx.fillStyle = '#8fa38a';
    ctx.fillText('红方：1–8出兵/升级 · 9换页 · 0切换命令 · Q/E选战壕', WIDTH / 2, 69);
    ctx.textAlign = 'left';
    pauseRect = { x: WIDTH / 2 - 36, y: 72, w: 72, h: 17 };
    ctx.fillStyle = '#1d2a20';
    ctx.fillRect(pauseRect.x, pauseRect.y, pauseRect.w, pauseRect.h);
    ctx.strokeStyle = '#78896b';
    ctx.strokeRect(pauseRect.x, pauseRect.y, pauseRect.w, pauseRect.h);
    ctx.fillStyle = '#d6ddca';
    ctx.font = '10px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(state.paused ? '继续' : '暂停', WIDTH / 2, 84);
    ctx.textAlign = 'left';
  }

  function cardStatus(team, action) {
    const cost = actionCost(team, action);
    const lock = actionLocked(team, action);
    if (lock) return lock;
    if (!Number.isFinite(cost)) return '不可用';
    return `${cost} 点`;
  }

  function drawActionCard(team, action, slot, rect, keyboard) {
    const player = state.teams[team];
    const def = unitDefs[action] || actionDefs[action];
    const locked = actionLocked(team, action);
    const affordable = player.points >= actionCost(team, action);
    const hovered = team === 'blue' && hover && hover.x >= rect.x && hover.x <= rect.x + rect.w && hover.y >= rect.y && hover.y <= rect.y + rect.h;
    ctx.fillStyle = locked ? '#151b17' : hovered ? `${teamDark(team)}ee` : '#17221b';
    ctx.strokeStyle = locked ? '#465046' : affordable ? teamColor(team) : '#7a6b4c';
    ctx.lineWidth = hovered ? 3 : 1;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = locked ? '#647064' : '#e8eddf';
    ctx.font = 'bold 12px Microsoft YaHei';
    ctx.fillText(`${keyboard ? `[${slot}] ` : ''}${def.short || def.name}`, rect.x + 8, rect.y + 18);
    ctx.fillStyle = locked ? '#596159' : affordable ? GOLD : '#d98c62';
    ctx.font = '10px Microsoft YaHei';
    ctx.fillText(cardStatus(team, action), rect.x + 8, rect.y + 36);
    if (unitDefs[action]) {
      ctx.fillStyle = '#99a895';
      ctx.textAlign = 'right';
      ctx.fillText(unitDefs[action].kind === 'vehicle' ? '载具' : '步兵', rect.x + rect.w - 7, rect.y + 36);
      ctx.textAlign = 'left';
    }
  }

  function drawTeamPanel(team) {
    const player = state.teams[team];
    const halfX = team === 'red' ? 0 : WIDTH / 2;
    const width = WIDTH / 2;
    ctx.fillStyle = team === 'red' ? '#160d0ded' : '#09131ded';
    ctx.fillRect(halfX, PANEL_TOP, width, HEIGHT - PANEL_TOP);
    ctx.strokeStyle = teamColor(team);
    ctx.strokeRect(halfX + 1, PANEL_TOP + 1, width - 2, HEIGHT - PANEL_TOP - 2);
    ctx.fillStyle = teamColor(team);
    ctx.font = 'bold 13px Microsoft YaHei';
    ctx.fillText(`${teamLabel(team)} · ${player.page === 0 ? '步兵/支援页' : '装甲/升级页'}`, halfX + 14, PANEL_TOP + 21);
    ctx.fillStyle = '#9eae9a';
    ctx.font = '10px Microsoft YaHei';
    const selected = selectedTrench(team);
    ctx.fillText(`所选：${selected ? `${state.trenches.indexOf(selected) + 1}号战壕 ${'★'.repeat(selected.level)}` : '无阵地'} · 命令 ${selected ? selected.orders[team] : '-'}`, halfX + 220, PANEL_TOP + 20);

    const rects = [];
    const startX = halfX + 12;
    const startY = PANEL_TOP + 31;
    const cardWidth = 145;
    const cardHeight = 49;
    const gap = 8;
    pages[player.page].forEach((action, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const rect = { x: startX + column * (cardWidth + gap), y: startY + row * (cardHeight + 7), w: cardWidth, h: cardHeight, action };
      rects.push(rect);
      drawActionCard(team, action, index + 1, rect, team === 'red');
    });
    if (team === 'red') redCardRects = rects;
    else blueCardRects = rects;

    const queueText = player.queue.length ? player.queue.map(item => unitDefs[item.type].short).join(' → ') : '空';
    ctx.fillStyle = '#97a491';
    ctx.font = '10px Microsoft YaHei';
    ctx.fillText(`出兵队列：${queueText}`, halfX + 14, HEIGHT - 17);
    ctx.fillStyle = player.messageTimer > 0 ? GOLD : '#71806f';
    ctx.textAlign = team === 'red' ? 'left' : 'right';
    ctx.fillText(player.message, team === 'red' ? halfX + 14 : halfX + width - 14, HEIGHT - 4);
    ctx.textAlign = 'left';

    const pageX = team === 'red' ? halfX + width - 82 : halfX + 10;
    ctx.fillStyle = teamDark(team);
    ctx.strokeStyle = teamColor(team);
    ctx.fillRect(pageX, PANEL_TOP + 4, 72, 21);
    ctx.strokeRect(pageX, PANEL_TOP + 4, 72, 21);
    ctx.fillStyle = '#eef2e8';
    ctx.font = '10px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(team === 'red' ? '[9] 换页' : '点击换页', pageX + 36, PANEL_TOP + 18);
    ctx.textAlign = 'left';
    if (team === 'blue') player.pageRect = { x: pageX, y: PANEL_TOP + 4, w: 72, h: 21 };
  }

  function drawOrders() {
    const redTrench = selectedTrench('red');
    const blueTrench = selectedTrench('blue');
    if (redTrench) {
      ctx.fillStyle = '#200e0ed9';
      ctx.strokeStyle = RED;
      ctx.fillRect(12, 508, 350, 35);
      ctx.strokeRect(12, 508, 350, 35);
      ctx.fillStyle = '#eee5d6';
      ctx.font = '11px Microsoft YaHei';
      ctx.fillText('红方阵地命令：[Z]后撤 [X]驻守 [C]集结 [V]推进 · [0]循环', 23, 530);
    }
    if (blueTrench) {
      const labels = [
        { order: 'retreat', text: '后撤' },
        { order: 'hold', text: '驻守' },
        { order: 'rally', text: '集结' },
        { order: 'advance', text: '推进' },
      ];
      ctx.fillStyle = '#081522e8';
      ctx.strokeStyle = BLUE;
      ctx.fillRect(895, 508, 373, 35);
      ctx.strokeRect(895, 508, 373, 35);
      blueTrench.orderRects = [];
      labels.forEach((item, index) => {
        const rect = { x: 904 + index * 88, y: 514, w: 80, h: 23, order: item.order };
        blueTrench.orderRects.push(rect);
        ctx.fillStyle = blueTrench.orders.blue === item.order ? BLUE_DARK : '#17231d';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = BLUE;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = '#e7eee5';
        ctx.font = '10px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(item.text, rect.x + rect.w / 2, rect.y + 16);
      });
      ctx.textAlign = 'left';
    }
  }

  function drawBriefing() {
    ctx.fillStyle = 'rgba(3,7,5,.88)';
    ctx.fillRect(170, 125, 940, 415);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(170, 125, 940, 415);
    ctx.fillStyle = '#ead691';
    ctx.font = 'bold 30px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('本地双人战线 · 红蓝对抗', WIDTH / 2, 170);
    ctx.fillStyle = '#d9e1d2';
    ctx.font = '14px Microsoft YaHei';
    ctx.fillText('双方拥有完全相同的经济、兵种、总部升级、战壕升级与编制上限', WIDTH / 2, 202);
    ctx.textAlign = 'left';

    ctx.fillStyle = RED;
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.fillText('红方 · 键盘', 230, 250);
    ctx.fillStyle = '#d8ddd0';
    ctx.font = '14px Microsoft YaHei';
    const redLines = [
      '数字键 1–8：购买当前页对应单位或升级',
      '数字键 9：切换步兵页 / 装甲页',
      '数字键 0：循环所选战壕命令',
      'Q / E：切换己方战壕；Z/X/C/V：下达阵地命令',
      'Enter：准备 / 重新开始',
    ];
    redLines.forEach((line, index) => ctx.fillText(line, 230, 282 + index * 29));

    ctx.fillStyle = BLUE;
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.fillText('蓝方 · 鼠标', 700, 250);
    ctx.fillStyle = '#d8ddd0';
    ctx.font = '14px Microsoft YaHei';
    const blueLines = [
      '点击单位卡：购买并加入出兵队列',
      '点击“换页”：切换步兵页 / 装甲页',
      '点击己方战壕：选择升级和命令目标',
      '点击后撤/驻守/集结/推进：改变步兵行为',
      '点击下方按钮：准备开始',
    ];
    blueLines.forEach((line, index) => ctx.fillText(line, 700, 282 + index * 29));

    ctx.fillStyle = state.teams.red.ready ? '#3f8a4c' : RED_DARK;
    ctx.strokeStyle = RED;
    ctx.fillRect(245, 452, 280, 52);
    ctx.strokeRect(245, 452, 280, 52);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(state.teams.red.ready ? '红方已准备' : '红方按 Enter 准备', 385, 484);

    blueReadyRect = { x: 755, y: 452, w: 280, h: 52 };
    ctx.fillStyle = state.teams.blue.ready ? '#3f8a4c' : BLUE_DARK;
    ctx.strokeStyle = BLUE;
    ctx.fillRect(blueReadyRect.x, blueReadyRect.y, blueReadyRect.w, blueReadyRect.h);
    ctx.strokeRect(blueReadyRect.x, blueReadyRect.y, blueReadyRect.w, blueReadyRect.h);
    ctx.fillStyle = '#fff';
    ctx.fillText(state.teams.blue.ready ? '蓝方已准备' : '蓝方点击准备', 895, 484);
    ctx.textAlign = 'left';
  }

  function drawPause() {
    ctx.fillStyle = 'rgba(2,5,3,.78)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#e7d17e';
    ctx.font = 'bold 34px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('对局已暂停', WIDTH / 2, 310);
    ctx.fillStyle = '#dce3d6';
    ctx.font = '16px Microsoft YaHei';
    ctx.fillText('红方按 Enter 继续；蓝方点击中央“继续”；再次按 ESC 返回主菜单', WIDTH / 2, 349);
    ctx.textAlign = 'left';
  }

  function drawEnded() {
    ctx.fillStyle = 'rgba(2,5,3,.82)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = state.winner === 'draw' ? GOLD : teamColor(state.winner);
    ctx.font = 'bold 42px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(state.winner === 'draw' ? '双方总部同时摧毁 · 平局' : `${teamLabel(state.winner)}胜利`, WIDTH / 2, 272);
    ctx.fillStyle = '#e1e7da';
    ctx.font = '15px Microsoft YaHei';
    ctx.fillText(`用时 ${formatTime(state.time)} · 红方击毁 ${state.teams.red.kills} · 蓝方击毁 ${state.teams.blue.kills}`, WIDTH / 2, 312);
    endRestartRect = { x: 420, y: 350, w: 200, h: 54 };
    endMenuRect = { x: 660, y: 350, w: 200, h: 54 };
    for (const [rect, label] of [[endRestartRect, '重新对抗 · Enter'], [endMenuRect, '返回主菜单']]) {
      ctx.fillStyle = '#1c2b20';
      ctx.strokeStyle = GOLD;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = '#edf1e6';
      ctx.font = 'bold 15px Microsoft YaHei';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + 33);
    }
    ctx.textAlign = 'left';
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();
    drawHeadquarters('red');
    drawHeadquarters('blue');
    state.trenches.forEach(drawTrench);
    drawDust();
    drawUnits();
    drawShotsAndEffects();
    drawBattlefieldAtmosphere();
    drawTopHud();
    drawOrders();
    drawTeamPanel('red');
    drawTeamPanel('blue');
    if (state.phase === 'briefing') drawBriefing();
    if (state.paused) drawPause();
    if (state.phase === 'ended') drawEnded();
  }

  function loop(time) {
    if (!active) return;
    const dt = clamp((time - lastTime) / 1000 || 0.016, 0, 0.05);
    lastTime = time;
    update(dt);
    draw();
    animationFrame = requestAnimationFrame(loop);
  }

  function pointInRect(point, rect) {
    return rect && point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * WIDTH / bounds.width,
      y: (event.clientY - bounds.top) * HEIGHT / bounds.height,
    };
  }

  function setOrder(team, order) {
    const trench = selectedTrench(team);
    if (!trench) return;
    trench.orders[team] = order;
    const labels = { advance: '推进', hold: '驻守', rally: '集结', retreat: '后撤' };
    setMessage(team, `${state.trenches.indexOf(trench) + 1}号战壕命令：${labels[order]}`);
    global.GameAudio?.playUi('confirm');
  }

  function cycleOrder(team) {
    const trench = selectedTrench(team);
    if (!trench) return;
    const sequence = ['advance', 'rally', 'hold', 'retreat'];
    const index = sequence.indexOf(trench.orders[team]);
    setOrder(team, sequence[(index + 1) % sequence.length]);
  }

  function cycleSelectedTrench(team, direction) {
    const player = state.teams[team];
    const owned = state.trenches
      .map((trench, index) => ({ trench, index }))
      .filter(item => item.trench.owner === team);
    if (!owned.length) return;
    const current = owned.findIndex(item => item.index === player.selectedTrench);
    const next = (current + direction + owned.length) % owned.length;
    player.selectedTrench = owned[next].index;
    setMessage(team, `已选择 ${owned[next].index + 1}号战壕`);
  }

  function beginIfReady() {
    if (state.teams.red.ready && state.teams.blue.ready) {
      state.phase = 'battle';
      state.teams.red.message = '对局开始';
      state.teams.blue.message = '对局开始';
      state.teams.red.messageTimer = 2;
      state.teams.blue.messageTimer = 2;
      global.GameAudio?.playUi('pickup');
    }
  }

  function handleKey(event) {
    if (!active) return;
    const code = event.code;
    if (code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.phase === 'briefing' || state.phase === 'ended') stop();
      else if (state.paused) stop();
      else state.paused = true;
      return;
    }
    if (code === 'Enter') {
      event.preventDefault();
      if (state.phase === 'briefing') {
        state.teams.red.ready = true;
        beginIfReady();
      } else if (state.phase === 'ended') restart();
      else if (state.paused) state.paused = false;
      return;
    }
    if (state.phase !== 'battle' || state.paused) return;
    const digitMatch = code.match(/^(?:Digit|Numpad)([0-9])$/);
    if (digitMatch) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const digit = Number(digitMatch[1]);
      if (digit >= 1 && digit <= 8) executeAction('red', pages[state.teams.red.page][digit - 1]);
      else if (digit === 9) {
        state.teams.red.page = 1 - state.teams.red.page;
        setMessage('red', state.teams.red.page ? '切换至装甲/升级页' : '切换至步兵/支援页');
      } else if (digit === 0) cycleOrder('red');
      return;
    }
    if (code === 'KeyQ') cycleSelectedTrench('red', -1);
    else if (code === 'KeyE') cycleSelectedTrench('red', 1);
    else if (code === 'KeyZ') setOrder('red', 'retreat');
    else if (code === 'KeyX') setOrder('red', 'hold');
    else if (code === 'KeyC') setOrder('red', 'rally');
    else if (code === 'KeyV') setOrder('red', 'advance');
    else if (code === 'KeyP') state.paused = true;
  }

  function handleClick(event) {
    if (!active) return;
    const point = canvasPoint(event);
    if (state.phase === 'briefing') {
      if (pointInRect(point, blueReadyRect)) {
        state.teams.blue.ready = true;
        beginIfReady();
      }
      return;
    }
    if (state.phase === 'ended') {
      if (pointInRect(point, endRestartRect)) restart();
      else if (pointInRect(point, endMenuRect)) stop();
      return;
    }
    if (state.paused) {
      if (pointInRect(point, pauseRect) || (point.x > 470 && point.x < 810 && point.y > 260 && point.y < 390)) state.paused = false;
      return;
    }
    if (pointInRect(point, pauseRect)) {
      state.paused = true;
      return;
    }
    const blue = state.teams.blue;
    if (pointInRect(point, blue.pageRect)) {
      blue.page = 1 - blue.page;
      setMessage('blue', blue.page ? '切换至装甲/升级页' : '切换至步兵/支援页');
      return;
    }
    for (const rect of blueCardRects) {
      if (pointInRect(point, rect)) {
        executeAction('blue', rect.action);
        return;
      }
    }
    const trench = selectedTrench('blue');
    for (const rect of trench?.orderRects || []) {
      if (pointInRect(point, rect)) {
        setOrder('blue', rect.order);
        return;
      }
    }
    for (const [index, trench] of state.trenches.entries()) {
      if (trench.owner === 'blue' && Math.abs(point.x - trench.x) < 64 && point.y > GROUND - 95 && point.y < GROUND + 95) {
        blue.selectedTrench = index;
        setMessage('blue', `已选择 ${index + 1}号战壕`);
        return;
      }
    }
  }

  function restart() {
    stop();
    start();
  }

  function start() {
    if (active) return;
    const team = createTeam('red');
    global.GamePreparation.open({
      mode: 'duel', modeName: '本地双人', title: '红蓝对抗 · 联合战线', duel: true,
      objective: '双方争夺战壕、部署部队，率先摧毁对方总部的一方获胜。',
      facts: [['双方开局点数', `${team.points} 点`], ['双方基础收入', `${team.income} 点每秒`], ['双方总部耐久', team.hq.maxHp], ['初始总部等级', `${team.hq.level} 级`]],
      groups: [{ title: '兵种与载具 · 按总部等级解锁', items: Object.values(unitDefs).map(unit => ({ name: unit.name, detail: `${unit.cost} 点 · 总部 ${unit.unlock} 级`, locked: unit.unlock > team.hq.level })) }],
      tips: ['双方共享同一套经济、兵种和升级规则。', '单位加入出兵队列后自动作战；用战壕命令组织推进。'],
      map: { kind: 'frontline', trenches: TRENCH_X.length, friendlyOwned: 1, enemyOwned: 1, caption: '初始阵地 · 红方在左，蓝方在右' },
      redControls: [['1–8', '购买当前页单位或升级'], ['9 / 0', '换页 / 循环阵地命令'], ['Q / E', '选择己方战壕'], ['Z / X / C / V', '后撤 / 驻守 / 集结 / 推进'], ['Enter', '准备 / 取消准备']],
      blueControls: [['鼠标', '点击单位卡加入出兵队列'], ['换页按钮', '切换步兵与装甲页面'], ['己方战壕', '选择升级和命令目标'], ['命令按钮', '下达后撤、驻守、集结、推进命令'], ['准备按钮', '准备 / 取消准备']],
    }, {
      launch: startPreparedMatch,
      cancel: () => {
        document.querySelector('#menu')?.classList.remove('hidden');
        document.querySelector('#overlay')?.classList.add('hidden');
        global.GameAudio?.setMode('menu');
      },
      failed: () => { active = false; cancelAnimationFrame(animationFrame); animationFrame = 0; state = null; },
    });
  }

  function startPreparedMatch() {
    if (active) return;
    active = true;
    state = createState();
    state.teams.red.ready = true;
    state.teams.blue.ready = true;
    beginIfReady();
    hover = null;
    document.querySelector('#menu')?.classList.add('hidden');
    document.querySelector('#overlay')?.classList.add('hidden');
    document.querySelector('#settings-screen')?.classList.add('hidden');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cursor = 'default';
    global.GameAudio?.setMode('frontline');
    void global.GameAudio?.unlock();
    lastTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  function stop() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    state = null;
    canvas.style.cursor = 'crosshair';
    document.querySelector('#menu')?.classList.remove('hidden');
    document.querySelector('#overlay')?.classList.add('hidden');
    global.GameAudio?.setMode('menu');
  }

  function install() {
    canvas = document.querySelector('#game');
    ctx = canvas?.getContext('2d');
    const menu = document.querySelector('#menu .panel');
    const frontlineButton = document.querySelector('#frontline');
    if (!canvas || !ctx || !menu || document.querySelector('#frontline-duel')) return;
    const button = document.createElement('button');
    button.className = 'btn';
    button.id = 'frontline-duel';
    button.textContent = '本地双人战线 · 红蓝对抗';
    button.addEventListener('click', start);
    menu.insertBefore(button, frontlineButton || document.querySelector('#help'));
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', event => {
      if (active) hover = canvasPoint(event);
    });
    canvas.addEventListener('contextmenu', event => {
      if (active) event.preventDefault();
    });
    addEventListener('keydown', handleKey, { capture: true });
  }

  global.FrontlineDuelSystem = Object.freeze({
    start,
    stop,
    restart,
    isActive: () => active,
    status: () => {
      if (!state) return { active: false };
      return {
        active,
        phase: state.phase,
        paused: state.paused,
        time: state.time,
        red: {
          points: state.teams.red.points,
          income: state.teams.red.income,
          hq: state.teams.red.hq,
          queue: state.teams.red.queue.length,
          units: state.units.filter(unit => !unit.dead && unit.team === 'red').length,
        },
        blue: {
          points: state.teams.blue.points,
          income: state.teams.blue.income,
          hq: state.teams.blue.hq,
          queue: state.teams.blue.queue.length,
          units: state.units.filter(unit => !unit.dead && unit.team === 'blue').length,
        },
        trenches: state.trenches.map(trench => ({ owner: trench.owner, control: trench.control, level: trench.level, orders: { ...trench.orders } })),
      };
    },
  });

  queueMicrotask(install);
})(window);
