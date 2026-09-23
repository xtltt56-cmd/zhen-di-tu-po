const assert = require('node:assert/strict');

global.window = global;
require('../src/campaign-navigation.js');

const levels = [
  [2400, 1800, 2240, 150], [3200, 2400, 1650, 120], [4000, 3000, 3740, 180],
  [4300, 3200, 4030, 180], [4600, 3400, 4320, 220], [4900, 3600, 4600, 220],
  [5200, 3800, 4900, 260], [5500, 4000, 5180, 260], [5900, 4300, 5550, 300],
];

function random(seed) {
  let value = seed >>> 0;
  return () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
}

for (const [index, [w, h, gx, gy]] of levels.entries()) {
  const level = { w, h, goal: { x: gx, y: gy } };
  const type = [2, 5].includes(index) ? 'capture' : 'clear';
  const plan = CampaignNavigation.createPlan(level, index, type);
  assert.equal(plan.route.length, 4);
  assert.equal(plan.exit.x, gx);
  for (let seed = 1; seed <= 12; seed++) {
    const rnd = random(index * 1000 + seed);
    const covers = Array.from({ length: 45 + index * 25 }, (_, i) => ({
      x: 130 + rnd() * (w - 230), y: 130 + rnd() * (h - 270),
      r: i % 11 === 0 ? 68 + rnd() * 26 : i % 9 === 0 ? 36 + rnd() * 34 : 19 + rnd() * 11,
      hp: 999,
    }));
    const vehicles = Array.from({ length: Math.min(12, 3 + index) }, (_, i) => ({
      x: w * [0.18, 0.79, 0.22, 0.76, 0.5, 0.34][i % 6],
      y: h * [0.25, 0.23, 0.76, 0.74, 0.34, 0.52][i % 6],
      r: i % 2 ? 35 : 26, hp: 100,
    }));
    const result = CampaignNavigation.prepare(level, plan, covers, vehicles);
    assert.equal(result.validation.reachable, true, `Level ${index + 1}, seed ${seed}: route blocked`);
    assert.equal(result.covers.filter(cover => cover.fixedLandmark).length, 2);
    assert.equal(CampaignNavigation.validate(level, plan, [...result.covers, ...vehicles], 35).reachable, true);
    const actors = result.covers.filter(cover => cover.fixedLandmark).map(cover => ({ x: cover.x, y: cover.y, r: 15 }));
    CampaignNavigation.relocateActors(level, actors, result.covers, vehicles);
    for (const actor of actors) assert(result.covers.every(cover => Math.hypot(actor.x - cover.x, actor.y - cover.y) >= actor.r + cover.r),
      'A spawned actor must be moved out of fixed landmark collision');
  }
}
const blockedLevel = { w: 1200, h: 900, goal: { x: 1080, y: 100 } };
const blockedPlan = CampaignNavigation.createPlan(blockedLevel, 0, 'clear');
const barrier = Array.from({ length: 10 }, (_, index) => ({ x: 600, y: index * 100, r: 70, hp: 999 }));
assert.equal(CampaignNavigation.validate(blockedLevel, blockedPlan, barrier, 35).reachable, false,
  'A sealed cross-map barrier must fail reachability validation');
console.log('Campaign navigation: 9 levels × 12 layouts reachable for infantry/heavy vehicle clearance');
