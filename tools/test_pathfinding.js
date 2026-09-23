const assert = require('node:assert/strict');

global.window = global;
require('../src/pathfinding-system.js');

const actor = { x: 120, y: 320, r: 18 };
const target = { x: 850, y: 320, r: 18 };
const building = { x: 480, y: 320, r: 125, hp: 999 };
const vehicle = { x: 630, y: 190, r: 40, hp: 200 };
const options = { width: 1000, height: 650, obstacles: [building, vehicle] };

const first = PathfindingSystem.planRoute(actor, target, actor.r, options);
assert(first.length > 2, 'Building should require a multi-waypoint detour');
assert(first.some(point => Math.abs(point.y - building.y) > building.r), 'Detour must go around the building');
for (const point of first) {
  assert(point.x >= actor.r && point.x <= options.width - actor.r);
  assert(point.y >= actor.r && point.y <= options.height - actor.r);
  for (const obstacle of options.obstacles) {
    assert(Math.hypot(point.x - obstacle.x, point.y - obstacle.y) >= obstacle.r + actor.r,
      'Waypoints must be outside active static and dynamic obstacles');
  }
}
assert(Number.isFinite(PathfindingSystem.navigate(actor, target, actor.r, { ...options, lookAhead: 220 })));

vehicle.x = 630; vehicle.y = 450;
const second = PathfindingSystem.planRoute(actor, target, actor.r, options);
assert(second.length > 2);
assert.notDeepEqual(first, second, 'Moving a vehicle should change the planned route');
assert.equal(PathfindingSystem.planRoute(actor, target, actor.r,
  { ...options, obstacles: [{ x: 500, y: 325, r: 360, hp: 999 }] }).length, 0,
  'An impassable full-height barrier must not produce a false route');

const crowded = PathfindingSystem.crowdAngle(actor, 0, actor.r,
  [{ x: actor.x + 10, y: actor.y + 7, r: 18, dead: false }]);
assert(Math.abs(crowded) > .01, 'Nearby infantry should influence movement');
const heavy = { x: 35, y: 35, r: 35 };
const edgeRoute = PathfindingSystem.planRoute(heavy, { x: 850, y: 35 }, heavy.r,
  { width: 1000, height: 650, obstacles: [] });
assert(edgeRoute.length > 0);
assert(edgeRoute.every(point => point.x >= heavy.r + 3 && point.y >= heavy.r + 3),
  'Heavy vehicles must not be routed into the map border');
console.log('Pathfinding: building detour, moving-vehicle replan, blocked route, and crowd steering passed');
