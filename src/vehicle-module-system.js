(function (global) {
  'use strict';

  const tuning = global.PositionBreakoutConfig?.vehicleModules || {};
  const heavyTypes = new Set(tuning.heavyArmorTypes || ['m1', 't90m', 'bmpt']);
  const labels = Object.freeze({
    engine: '发动机',
    tracks: '行走机构',
    breech: '炮闩',
    turret: '炮塔驱动',
    optics: '观瞄系统',
    ammo: '弹药舱',
  });
  const moduleKeys = Object.freeze(Object.keys(labels));

  function create(type) {
    const modules = {};
    for (const key of moduleKeys) modules[key] = { hp: 100, max: 100, hit: 0 };
    return {
      type,
      heavy: heavyTypes.has(type),
      modules,
      lastHit: null,
      lastHitTimer: 0,
    };
  }

  function ensure(vehicle) {
    if (!vehicle.moduleState?.modules) vehicle.moduleState = create(vehicle.type);
    if (!Number.isFinite(vehicle.baseMove)) vehicle.baseMove = Number.isFinite(vehicle.move) ? vehicle.move : 0;
    return vehicle.moduleState;
  }

  function projectileDamageCap(vehicle, damage, projectile) {
    if (!Number.isFinite(damage) || damage <= 0) return 0;
    if (!projectile?.shell && !projectile?.missile && !projectile?.sniperRound) return damage;
    const fraction = tuning.singleProjectileDamageCaps?.[vehicle.type];
    if (!Number.isFinite(fraction)) return damage;
    return Math.min(damage, Math.max(1, vehicle.max * fraction));
  }

  function modulePool(zone) {
    if (zone === 'rear') return ['engine', 'engine', 'tracks', 'ammo', 'turret'];
    if (zone === 'side') return ['tracks', 'engine', 'ammo', 'breech', 'turret'];
    return ['tracks', 'breech', 'turret', 'optics', 'tracks'];
  }

  function applyHit(vehicle, projectile, zone, hullDamage) {
    const state = ensure(vehicle);
    if (!projectile?.shell && !projectile?.missile && !projectile?.sniperRound) return null;
    const pool = modulePool(zone);
    const seed = Math.abs(Math.floor((projectile.x || 0) * 13 + (projectile.y || 0) * 7 + (projectile.damage || 0)));
    const key = pool[seed % pool.length];
    const module = state.modules[key];
    const shellScale = projectile.shellKind === 'ap' ? 1.15 : projectile.shellKind === 'heat' ? 1 : projectile.missile ? 0.82 : 0.62;
    const proportional = Math.min(24, Math.max(0, hullDamage / Math.max(1, vehicle.max) * 70));
    const perHitLimit = state.heavy ? 29 : 46;
    const amount = Math.min(perHitLimit, (12 + proportional) * shellScale);
    const before = module.hp;
    module.hp = Math.max(0, module.hp - amount);
    module.hit = 0.32;
    state.lastHit = key;
    state.lastHitTimer = 2.4;
    return {
      key,
      label: labels[key],
      amount: before - module.hp,
      hp: module.hp,
      critical: module.hp < 25,
      damaged: module.hp < 65,
    };
  }

  function modifiers(vehicle) {
    const state = ensure(vehicle);
    const ratio = key => state.modules[key].hp / state.modules[key].max;
    const heavyFloor = state.heavy ? (tuning.minimumHeavyMobility || 0.62) : (tuning.minimumOtherMobility || 0.48);
    const mobilityHealth = Math.min(ratio('engine'), ratio('tracks'));
    const mobility = Math.max(heavyFloor, 0.52 + mobilityHealth * 0.48);
    const reload = 1 + (1 - ratio('breech')) * 0.34 + (1 - ratio('ammo')) * 0.14;
    const traverse = Math.max(state.heavy ? 0.68 : 0.55, 0.48 + ratio('turret') * 0.52);
    const detection = Math.max(0.62, 0.55 + ratio('optics') * 0.45);
    return { mobility, reload, traverse, detection };
  }

  function update(vehicle, dt, crewCount) {
    const state = ensure(vehicle);
    state.lastHitTimer = Math.max(0, state.lastHitTimer - dt);
    for (const module of Object.values(state.modules)) module.hit = Math.max(0, module.hit - dt);
    if (vehicle.stationary >= (tuning.moduleRepairDelay || 2) && vehicle.lastDamage <= 0 && crewCount > 0) {
      const repair = (1.4 + crewCount * 0.72) * dt;
      for (const module of Object.values(state.modules)) module.hp = Math.min(module.max, module.hp + repair);
    }
    const current = modifiers(vehicle);
    vehicle.move = vehicle.baseMove * current.mobility;
    vehicle.moduleModifiers = current;
    return current;
  }

  function status(vehicle) {
    const state = ensure(vehicle);
    return moduleKeys.map(key => ({
      key,
      label: labels[key],
      hp: state.modules[key].hp,
      max: state.modules[key].max,
      hit: state.modules[key].hit,
    }));
  }

  function rotateTowards(current, target, maxStep) {
    const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + Math.max(-maxStep, Math.min(maxStep, difference));
  }

  global.VehicleModuleSystem = Object.freeze({
    create,
    ensure,
    projectileDamageCap,
    applyHit,
    modifiers,
    update,
    status,
    rotateTowards,
    labels,
    isHeavy: vehicle => heavyTypes.has(vehicle?.type),
  });
})(window);
