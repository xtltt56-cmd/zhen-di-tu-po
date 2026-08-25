(function (global) {
  'use strict';

  const config = global.PositionBreakoutConfig?.performance || {};

  class SpatialHash {
    constructor(cellSize = config.spatialCellSize || 240) {
      this.cellSize = cellSize;
      this.cells = new Map();
    }

    key(x, y) {
      return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    }

    rebuild(items) {
      this.cells.clear();
      for (const item of items || []) {
        if (!item || item.dead || !Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
        const key = this.key(item.x, item.y);
        let bucket = this.cells.get(key);
        if (!bucket) this.cells.set(key, bucket = []);
        bucket.push(item);
      }
      return this;
    }

    query(x, y, radius) {
      const result = [];
      const minX = Math.floor((x - radius) / this.cellSize);
      const maxX = Math.floor((x + radius) / this.cellSize);
      const minY = Math.floor((y - radius) / this.cellSize);
      const maxY = Math.floor((y + radius) / this.cellSize);
      const radiusSquared = radius * radius;
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          const bucket = this.cells.get(`${cx},${cy}`);
          if (!bucket) continue;
          for (const item of bucket) {
            const dx = item.x - x;
            const dy = item.y - y;
            if (dx * dx + dy * dy <= radiusSquared) result.push(item);
          }
        }
      }
      return result;
    }
  }

  const grids = new Map();
  const state = {
    frame: 0,
    fps: 60,
    frameMs: 16.7,
    quality: 1,
    sampleStarted: performance.now(),
    sampleFrames: 0,
  };

  function grid(name, items) {
    let value = grids.get(name);
    if (!value) grids.set(name, value = new SpatialHash());
    return value.rebuild(items);
  }

  function nearest(items, source, predicate, maxDistance = Infinity) {
    let best = null;
    let bestSquared = maxDistance * maxDistance;
    for (const item of items || []) {
      if (!item || item.dead || (predicate && !predicate(item))) continue;
      const dx = item.x - source.x;
      const dy = item.y - source.y;
      const squared = dx * dx + dy * dy;
      if (squared < bestSquared) {
        bestSquared = squared;
        best = item;
      }
    }
    return best;
  }

  function sample(now) {
    state.frame++;
    state.sampleFrames++;
    const elapsed = now - state.sampleStarted;
    if (elapsed < 750) return state;
    state.fps = Math.round(state.sampleFrames * 1000 / elapsed);
    state.frameMs = elapsed / Math.max(1, state.sampleFrames);
    state.quality = state.fps < 43 ? 0.68 : state.fps < 55 ? 0.84 : 1;
    state.sampleStarted = now;
    state.sampleFrames = 0;
    return state;
  }

  function zombieStride(count) {
    const high = config.zombieHighThreshold || 132;
    const medium = config.zombieMediumThreshold || 72;
    if (count >= high) return state.quality < 0.8 ? 4 : 3;
    if (count >= medium) return 2;
    return 1;
  }

  function shouldSimulate(index, stride, nearAction = false) {
    return nearAction || ((index + state.frame) % Math.max(1, stride) === 0);
  }

  function compact(array, maxItems, keep) {
    if (!Array.isArray(array)) return [];
    const filtered = keep ? array.filter(keep) : array.filter(Boolean);
    return filtered.length > maxItems ? filtered.slice(filtered.length - maxItems) : filtered;
  }

  global.GamePerformance = Object.freeze({
    SpatialHash,
    state,
    grid,
    nearest,
    sample,
    zombieStride,
    shouldSimulate,
    compact,
  });
})(window);
