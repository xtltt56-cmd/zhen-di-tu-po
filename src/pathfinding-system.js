(function (global) {
  'use strict';

  const memory = new WeakMap();
  const cellSize = 64;
  const planBudget = { window: 0, count: 0 };

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
      if (!obstacle || obstacle === entity || obstacle === ignored || obstacle.airborne) continue;
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
    const previous = memory.get(entity) || {};
    if (previous.side !== -1 && previous.side !== 1) previous.side = Math.random() < 0.5 ? -1 : 1;
    if (!Number.isFinite(previous.until)) previous.until = 0;
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

  function planRoute(entity, target, radius, options) {
    const width = finite(options.width), height = finite(options.height);
    if (width <= 0 || height <= 0) return [];
    const columns = Math.ceil(width / cellSize), rows = Math.ceil(height / cellSize);
    const blocked = new Uint8Array(columns * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const px = (x + .5) * cellSize, py = (y + .5) * cellSize;
      if (px < radius + 3 || py < radius + 3 || px > width - radius - 3 || py > height - radius - 3) blocked[y * columns + x] = 1;
    }
    const obstacles = options.obstacles || [];
    for (const obstacle of obstacles) {
      if (!obstacle || obstacle === entity || obstacle === target || obstacle === options.ignore || obstacle.airborne) continue;
      const reach = obstacleRadius(obstacle) + radius + 5;
      if (reach <= 0) continue;
      const minX = Math.max(0, Math.floor((obstacle.x - reach) / cellSize));
      const maxX = Math.min(columns - 1, Math.floor((obstacle.x + reach) / cellSize));
      const minY = Math.max(0, Math.floor((obstacle.y - reach) / cellSize));
      const maxY = Math.min(rows - 1, Math.floor((obstacle.y + reach) / cellSize));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const px = Math.min(width - radius, x * cellSize + cellSize / 2);
        const py = Math.min(height - radius, y * cellSize + cellSize / 2);
        if (Math.hypot(px - obstacle.x, py - obstacle.y) < reach) blocked[y * columns + x] = 1;
      }
    }
    function nearestFree(point) {
      const cx = Math.max(0, Math.min(columns - 1, Math.floor(point.x / cellSize)));
      const cy = Math.max(0, Math.min(rows - 1, Math.floor(point.y / cellSize)));
      for (let reach = 0; reach <= 4; reach++) {
        let best = -1, bestDistance = Infinity;
        for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= columns || y >= rows || blocked[y * columns + x]) continue;
          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) { best = y * columns + x; bestDistance = distance; }
        }
        if (best >= 0) return best;
      }
      return -1;
    }
    const start = nearestFree(entity), goal = nearestFree(target);
    if (start < 0 || goal < 0 || start === goal) return [];
    const scores = new Float32Array(blocked.length).fill(Infinity);
    const parent = new Int32Array(blocked.length).fill(-1);
    const closed = new Uint8Array(blocked.length);
    const heap = [];
    const heuristic = node => {
      const dx = Math.abs(node % columns - goal % columns);
      const dy = Math.abs(Math.floor(node / columns) - Math.floor(goal / columns));
      return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    function push(node, score) {
      let index = heap.length;
      heap.push({ node, score });
      while (index > 0) {
        const parentIndex = (index - 1) >> 1;
        if (heap[parentIndex].score <= score) break;
        heap[index] = heap[parentIndex]; index = parentIndex;
      }
      heap[index] = { node, score };
    }
    function pop() {
      const first = heap[0], last = heap.pop();
      if (heap.length) {
        let index = 0;
        while (index * 2 + 1 < heap.length) {
          let child = index * 2 + 1;
          if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
          if (heap[child].score >= last.score) break;
          heap[index] = heap[child]; index = child;
        }
        heap[index] = last;
      }
      return first.node;
    }
    scores[start] = 0;
    push(start, heuristic(start));
    let expanded = 0;
    while (heap.length && expanded++ < 4500) {
      const current = pop();
      if (closed[current]) continue;
      if (current === goal) {
        const path = [];
        for (let node = goal; node !== start && node >= 0; node = parent[node]) {
          path.push({ x: Math.min(width - radius, (node % columns + .5) * cellSize), y: Math.min(height - radius, (Math.floor(node / columns) + .5) * cellSize) });
        }
        return path.reverse();
      }
      closed[current] = 1;
      const x = current % columns, y = Math.floor(current / columns);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) continue;
        const next = ny * columns + nx;
        if (blocked[next] || closed[next]) continue;
        if (dx && dy && (blocked[y * columns + nx] || blocked[ny * columns + x])) continue;
        const cost = scores[current] + (dx && dy ? Math.SQRT2 : 1);
        if (cost >= scores[next]) continue;
        scores[next] = cost; parent[next] = current;
        push(next, cost + heuristic(next));
      }
    }
    return [];
  }

  function navigate(entity, target, radius, options = {}) {
    const desired = Math.atan2(target.y - entity.y, target.x - entity.x);
    const obstacles = options.obstacles || [];
    const distance = Math.hypot(target.x - entity.x, target.y - entity.y);
    if (distance < radius + 45) return desired;
    const now = performance.now();
    const state = memory.get(entity) || {};
    if (state.target !== target || Math.hypot(target.x - finite(state.targetX, target.x), target.y - finite(state.targetY, target.y)) > 110) {
      state.path = null; state.target = target; state.nextPlan = 0;
    }
    const obstacleMoved = state.path?.length && !segmentClear(entity,
      Math.atan2(state.path[0].y - entity.y, state.path[0].x - entity.x), radius,
      Math.hypot(state.path[0].x - entity.x, state.path[0].y - entity.y), obstacles, options.ignore).clear;
    if (obstacleMoved || now > finite(state.expires)) state.path = null;
    const blockedAhead = !segmentClear(entity, desired, radius, Math.min(distance, finite(options.lookAhead, 190)), obstacles, options.ignore).clear;
    if (!state.path && blockedAhead && now >= finite(state.nextPlan)) {
      if (now - planBudget.window >= 100) { planBudget.window = now; planBudget.count = 0; }
      if (planBudget.count < 2) {
        planBudget.count++;
        state.path = planRoute(entity, target, radius, options);
        state.nextPlan = now + (state.path.length ? 800 : 450);
        state.expires = now + 1400;
        state.targetX = target.x; state.targetY = target.y;
      }
    }
    while (state.path?.length && Math.hypot(state.path[0].x - entity.x, state.path[0].y - entity.y) < cellSize * .65) state.path.shift();
    memory.set(entity, state);
    const waypoint = state.path?.[0];
    return steerAngle(entity, waypoint ? Math.atan2(waypoint.y - entity.y, waypoint.x - entity.x) : desired, radius, options);
  }

  function crowdAngle(entity, desired, radius, neighbors) {
    let awayX = 0, awayY = 0;
    for (const other of neighbors || []) {
      if (!other || other === entity || other.dead || other.inVehicle) continue;
      const dx = entity.x - other.x, dy = entity.y - other.y;
      const distance = Math.hypot(dx, dy);
      const preferred = radius + finite(other.r, radius) + 18;
      if (distance >= preferred || distance < .01) continue;
      const weight = (preferred - distance) / preferred;
      awayX += dx / distance * weight;
      awayY += dy / distance * weight;
    }
    if (!awayX && !awayY) return desired;
    return Math.atan2(Math.sin(desired) + awayY * .55, Math.cos(desired) + awayX * .55);
  }

  global.PathfindingSystem = Object.freeze({
    steerAngle,
    navigate,
    planRoute,
    crowdAngle,
    clear(entity) {
      memory.delete(entity);
    },
    debug(entity) {
      return { ...(memory.get(entity) || {}) };
    },
  });
})(window);
