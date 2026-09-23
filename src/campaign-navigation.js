(function (global) {
  'use strict';

  const sites = [
    ['边境公路', '前沿哨站'], ['补给岔路', '弹药库'], ['通信道路', '敌军指挥部'],
    ['山谷通道', '伏击阵地'], ['铁路道口', '枢纽控制区'], ['雨林便道', '补给中转站'],
    ['海岸公路', '要塞外缘'], ['装甲通道', '反击集结区'], ['最终进路', '核心阵地'],
  ];

  function createPlan(level, index, missionType) {
    const names = sites[index] || sites[0];
    const entry = { x: 135, y: level.h - 130, name: '进入点', kind: 'entry' };
    const approach = { x: Math.round(level.w * 0.33), y: Math.round(level.h * 0.73), name: names[0], kind: 'approach' };
    const objective = {
      x: Math.round(level.w * (missionType === 'capture' ? 0.62 : 0.69)),
      y: Math.round(level.h * (missionType === 'capture' ? 0.46 : 0.32)),
      name: names[1], kind: 'objective',
    };
    const exit = { ...level.goal, name: '撤离点', kind: 'exit' };
    return { entry, approach, objective, exit, landmarks: [entry, approach, objective, exit], route: [entry, approach, objective, exit] };
  }

  function segmentDistance(point, start, end) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(point.x - start.x - dx * t, point.y - start.y - dy * t);
  }

  function routeDistance(point, plan) {
    let best = Infinity, segment = 0;
    for (let i = 1; i < plan.route.length; i++) {
      const distance = segmentDistance(point, plan.route[i - 1], plan.route[i]);
      if (distance < best) { best = distance; segment = i - 1; }
    }
    return { distance: best, segment };
  }

  function normal(start, end) {
    const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy) || 1;
    return { x: -dy / length, y: dx / length };
  }

  function fixedStructures(plan) {
    const first = normal(plan.entry, plan.approach), second = normal(plan.approach, plan.objective);
    return [
      { x: plan.approach.x + first.x * 205, y: plan.approach.y + first.y * 205, r: 62, type: 'building', hp: 999, fixedLandmark: true },
      { x: plan.objective.x - second.x * 205, y: plan.objective.y - second.y * 205, r: 70, type: 'building', hp: 999, fixedLandmark: true },
    ];
  }

  function reserve(plan, covers, width = 82) {
    const structures = fixedStructures(plan);
    const remaining = covers.filter(cover => cover.fixedLandmark ||
      routeDistance(cover, plan).distance >= cover.r + width &&
      plan.landmarks.every(site => Math.hypot(cover.x - site.x, cover.y - site.y) >= cover.r + 105) &&
      structures.every(site => Math.hypot(cover.x - site.x, cover.y - site.y) >= cover.r + site.r + 28));
    for (const structure of structures) {
      if (!remaining.some(cover => cover.fixedLandmark && Math.hypot(cover.x - structure.x, cover.y - structure.y) < 10)) remaining.push(structure);
    }
    return remaining;
  }

  function relocateVehicles(level, plan, covers, vehicles) {
    for (const vehicle of vehicles) {
      if (vehicle.dead || vehicle.airborne) continue;
      const overlapsCover = covers.some(cover => cover.hp > 0 && Math.hypot(vehicle.x - cover.x, vehicle.y - cover.y) < vehicle.r + cover.r + 18);
      if (!overlapsCover && routeDistance(vehicle, plan).distance >= vehicle.r + 78) continue;
      const segment = routeDistance(vehicle, plan).segment;
      const side = normal(plan.route[segment], plan.route[segment + 1]);
      const original = { x: vehicle.x, y: vehicle.y };
      for (const offset of [170, 240, 320, 410, 520]) {
        let placed = false;
        for (const sign of [1, -1]) {
          const point = { x: original.x + side.x * offset * sign, y: original.y + side.y * offset * sign };
          if (point.x < vehicle.r + 50 || point.x > level.w - vehicle.r - 50 || point.y < vehicle.r + 50 || point.y > level.h - vehicle.r - 50) continue;
          if (routeDistance(point, plan).distance < vehicle.r + 78) continue;
          if (covers.some(cover => cover.hp > 0 && Math.hypot(point.x - cover.x, point.y - cover.y) < vehicle.r + cover.r + 32)) continue;
          if (vehicles.some(other => other !== vehicle && !other.dead && !other.airborne && Math.hypot(point.x - other.x, point.y - other.y) < vehicle.r + other.r + 45)) continue;
          vehicle.x = point.x; vehicle.y = point.y; placed = true; break;
        }
        if (placed) break;
      }
    }
  }

  function relocateActors(level, actors, covers, vehicles) {
    const obstacles = [...covers, ...vehicles.filter(vehicle => !vehicle.dead && !vehicle.airborne)];
    function clear(point, radius) {
      return point.x >= radius + 8 && point.y >= radius + 8 && point.x <= level.w - radius - 8 && point.y <= level.h - radius - 8 &&
        obstacles.every(item => item.hp <= 0 || Math.hypot(point.x - item.x, point.y - item.y) >= radius + item.r + 8);
    }
    for (const actor of actors) {
      if (actor.dead || actor.active === false || clear(actor, actor.r || 15)) continue;
      const origin = { x: actor.x, y: actor.y };
      let found = false;
      for (const distance of [48, 96, 152, 220, 300, 390]) {
        for (let direction = 0; direction < 16; direction++) {
          const angle = direction * Math.PI / 8;
          const point = { x: origin.x + Math.cos(angle) * distance, y: origin.y + Math.sin(angle) * distance };
          if (!clear(point, actor.r || 15)) continue;
          actor.x = point.x; actor.y = point.y; found = true; break;
        }
        if (found) break;
      }
    }
  }

  function validate(level, plan, obstacles, radius = 35) {
    const cell = 56, columns = Math.ceil(level.w / cell), rows = Math.ceil(level.h / cell);
    const blocked = new Uint8Array(columns * rows);
    const active = obstacles.filter(item => item && !item.dead && !item.airborne && item.hp > 0);
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const px = Math.min(level.w - radius, x * cell + cell / 2), py = Math.min(level.h - radius, y * cell + cell / 2);
      if (px < radius || py < radius || active.some(item => Math.hypot(px - item.x, py - item.y) < radius + item.r + 3)) blocked[y * columns + x] = 1;
    }
    function node(point) {
      if (active.some(item => Math.hypot(point.x - item.x, point.y - item.y) < radius + item.r + 3)) return -1;
      const cx = Math.min(columns - 1, Math.max(0, Math.floor(point.x / cell)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(point.y / cell)));
      for (let reach = 0; reach <= 3; reach++) for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < columns && y < rows && !blocked[y * columns + x]) return y * columns + x;
      }
      return -1;
    }
    const start = node(plan.entry), goals = plan.route.slice(1).map(node);
    if (start < 0 || goals.some(goal => goal < 0)) return { reachable: false, reached: 0, total: goals.length };
    const visited = new Uint8Array(blocked.length), queue = new Int32Array(blocked.length);
    let head = 0, tail = 0;
    queue[tail++] = start; visited[start] = 1;
    while (head < tail) {
      const current = queue[head++], x = current % columns, y = Math.floor(current / columns);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) continue;
        const next = ny * columns + nx;
        if (blocked[next] || visited[next]) continue;
        visited[next] = 1; queue[tail++] = next;
      }
    }
    const reached = goals.filter(goal => visited[goal]).length;
    return { reachable: reached === goals.length, reached, total: goals.length };
  }

  function prepare(level, plan, covers, vehicles) {
    let reserved = reserve(plan, covers);
    relocateVehicles(level, plan, reserved, vehicles);
    let result = validate(level, plan, [...reserved, ...vehicles]);
    if (!result.reachable) {
      reserved = reserve(plan, reserved, 135);
      relocateVehicles(level, plan, reserved, vehicles);
      result = validate(level, plan, [...reserved, ...vehicles]);
    }
    return { covers: reserved, validation: result };
  }

  global.CampaignNavigation = Object.freeze({ createPlan, routeDistance, prepare, validate, relocateActors });
})(window);
