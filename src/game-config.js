(function (global) {
  'use strict';

  const freeze = value => Object.freeze(value);

  global.PositionBreakoutConfig = freeze({
    version: '3.0.0-modular',
    performance: freeze({
      spatialCellSize: 240,
      zombieMediumThreshold: 72,
      zombieHighThreshold: 132,
      maxBullets: 560,
      maxEffects: 320,
      maxGrenades: 72,
    }),
    audio: freeze({
      defaultVolume: 0.68,
      engineVolume: 0.22,
      ambientVolume: 0.1,
    }),
    vehicleModules: freeze({
      heavyArmorTypes: freeze(['m1', 't90m', 'bmpt']),
      singleProjectileDamageCaps: freeze({
        m1: 0.34,
        t90m: 0.32,
        bmpt: 0.34,
        hstv: 0.52,
        apc: 0.62,
        humvee: 0.85,
        apache: 0.62,
      }),
      minimumHeavyMobility: 0.62,
      minimumOtherMobility: 0.48,
      moduleRepairDelay: 2,
    }),
  });
})(window);
