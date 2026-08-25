(function (global) {
  'use strict';

  const memory = new WeakMap();

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function angleDifference(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function obstacleRadius(obstacle) {
    if (obstacle.dead || finite(obstacle.hp, 1) <= 0) return 0;
    return Math.max(
      finite(obstacle.r, 0),
      Math.hypot(finite(obstacle.w, 0), finite(obstacle.h, 0)) * 0.42,
      finite(obstacle.size, 0) * 0.55,
    );
  }

  function segmentClear(entity, angle, radius, distance, obstacles, ignored) {
    const endX = entity.x + Math.cos(angle) * distance;
    const endY = entity.y + Math.sin(angle) * distance;
    const vx = endX - entity.x;
    const vy = endY - entity.y;
    const lengthSq = vx * vx + vy * vy || 1;
    let nearest = Infinity;
    for (const obstacle of obstacles || []) {
      if (!obstacle || obstacle === ignored) continue;
      const blockRadius = obstacleRadius(obstacle);
      if (!blockRadius) continue;
      const t = Math.max(0, Math.min(1, ((obstacle.x - entity.x) * vx + (obstacle.y - entity.y) * vy) / lengthSq));
      const px = entity.x + vx * t;
      const py = entity.y + vy * t;
      const clearance = Math.hypot(px - obstacle.x, py - obstacle.y) - blockRadius - radius - 8;
      nearest = Math.min(nearest, clearance);
      if (clearance < 0) return { clear: false, clearance, obstacle };
    }
    return { clear: true, clearance: nearest };
  }

  function steerAngle(entity, desiredAngle, radius, options = {}) {
    const obstacles = options.obstacles || [];
    const lookAhead = Math.max(90, Math.min(360, finite(options.lookAhead, 190)));
    const direct = segmentClear(entity, desiredAngle, radius, lookAhead, obstacles, options.ignore);
    const previous = memory.get(entity) || { side: Math.random() < 0.5 ? -1 : 1, angle: desiredAngle, until: 0 };
    const now = performance.now();
    if (direct.clear) {
      previous.angle = desiredAngle;
      previous.until = now + 220;
      memory.set(entity, previous);
      return desiredAngle;
    }

    const offsets = [0.32, 0.58, 0.86, 1.15, 1.5, 1.9, 2.35];
    let best = null;
    for (const offset of offsets) {
      for (const side of [previous.side, -previous.side]) {
        const candidate = desiredAngle + offset * side;
        const result = segmentClear(entity, candidate, radius, lookAhead * (offset > 1.4 ? 0.7 : 1), obstacles, options.ignore);
        const persistence = side === previous.side ? 0.2 : 0;
        const score = (result.clear ? 5 : 0) + Math.min(2.5, finite(result.clearance, -30) / 45) - Math.abs(angleDifference(candidate, desiredAngle)) * 0.45 + persistence;
        if (!best || score > best.score) best = { angle: candidate, side, score };
      }
    }

    if (best) {
      previous.side = best.side;
      previous.angle = best.angle;
      previous.until = now + 700;
      memory.set(entity, previous);
      return best.angle;
    }
    return now < previous.until ? previous.angle : desiredAngle + previous.side * 1.35;
  }

  global.PathfindingSystem = Object.freeze({
    steerAngle,
    clear(entity) {
      memory.delete(entity);
    },
    debug(entity) {
      return { ...(memory.get(entity) || {}) };
    },
  });
})(window);
