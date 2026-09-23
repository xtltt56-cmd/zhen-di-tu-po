(function (global) {
  'use strict';

  const props = new Image();
  props.decoding = 'async';
  props.src = 'assets/environment-v5/field-props.png';
  const armory = new Image();
  armory.decoding = 'async';
  armory.src = 'assets/environment-v5/armory.png';

  const crop = Object.freeze({
    crate: [90, 236, 450, 315],
    sand: [665, 255, 530, 265],
    tunnel: [67, 697, 503, 462],
    concrete: [660, 842, 553, 226],
  });
  const ready = image => image.complete && image.naturalWidth > 0;

  function drawProp(ctx, type, x, y, width, height) {
    if (!ready(props) || !crop[type]) return false;
    const [sx, sy, sw, sh] = crop[type];
    ctx.save();
    ctx.fillStyle = 'rgba(8, 9, 7, .26)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + height * .3, width * .42, height * .3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(props, sx, sy, sw, sh, x - width / 2, y - height / 2, width, height);
    ctx.restore();
    return true;
  }

  function drawTerrain(ctx, image, options) {
    if (!ready(image)) return false;
    const { width, height, cameraX, cameraY, zombie, training, roadY, covers, factory } = options;
    const tile = 880;
    const left = Math.floor(cameraX / tile) - 1;
    const right = Math.ceil((cameraX + width) / tile);
    const top = Math.floor(cameraY / tile) - 1;
    const bottom = Math.ceil((cameraY + height) / tile);
    ctx.save();
    for (let ty = top; ty <= bottom; ty++) for (let tx = left; tx <= right; tx++) {
      const px = tx * tile - cameraX, py = ty * tile - cameraY;
      ctx.save();
      ctx.translate(px + (tx % 2 ? tile : 0), py + (ty % 2 ? tile : 0));
      ctx.scale(tx % 2 ? -1 : 1, ty % 2 ? -1 : 1);
      ctx.drawImage(image, 0, 0, tile, tile);
      ctx.restore();
    }

    // Hardstanding and roads are visual only; all movement and collision stay in the level data.
    if (zombie && factory) {
      const fx = factory.x - cameraX, fy = factory.y - cameraY;
      const pad = ctx.createRadialGradient(fx, fy, 60, fx, fy, 245);
      pad.addColorStop(0, 'rgba(115, 114, 103, .18)');
      pad.addColorStop(1, 'rgba(80, 77, 70, 0)');
      ctx.fillStyle = pad;
      ctx.fillRect(fx - 245, fy - 245, 490, 490);
      ctx.strokeStyle = 'rgba(173, 170, 145, .11)';
      ctx.lineWidth = 2;
      for (let offset = -180; offset <= 180; offset += 90) {
        ctx.beginPath(); ctx.moveTo(fx - 235, fy + offset); ctx.lineTo(fx + 235, fy + offset); ctx.stroke();
      }
    } else if (Number.isFinite(roadY)) {
      const ry = roadY - cameraY;
      const road = ctx.createLinearGradient(0, ry - 95, 0, ry + 95);
      road.addColorStop(0, 'rgba(94, 74, 47, 0)');
      road.addColorStop(.28, 'rgba(97, 72, 45, .25)');
      road.addColorStop(.5, 'rgba(83, 65, 42, .32)');
      road.addColorStop(.72, 'rgba(97, 72, 45, .25)');
      road.addColorStop(1, 'rgba(94, 74, 47, 0)');
      ctx.fillStyle = road;
      ctx.fillRect(0, ry - 95, width, 190);
      ctx.strokeStyle = 'rgba(34, 31, 25, .18)';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 10]);
      for (const offset of [-30, 30]) {
        ctx.beginPath(); ctx.moveTo(0, ry + offset); ctx.lineTo(width, ry + offset); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    if (!zombie) for (const cover of covers || []) {
      if (cover.hp <= 0 || cover.type !== 'building') continue;
      const px = cover.x - cameraX, py = cover.y - cameraY;
      if (px < -cover.r * 2 || px > width + cover.r * 2 || py < -cover.r * 2 || py > height + cover.r * 2) continue;
      ctx.fillStyle = 'rgba(75, 68, 54, .18)';
      ctx.fillRect(px - cover.r * 1.2, py - cover.r, cover.r * 2.4, cover.r * 2);
    }
    if (training) {
      ctx.strokeStyle = 'rgba(207, 194, 123, .27)';
      ctx.lineWidth = 2;
      for (let index = 0; index < 4; index++) {
        const px = 300 + index * 160 - cameraX, py = 420 - cameraY;
        ctx.strokeRect(px, py, 90, 70);
      }
    }
    ctx.restore();
    return true;
  }

  function drawArmory(ctx, x, y) {
    if (!ready(armory)) return false;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 7, .36)';
    ctx.beginPath(); ctx.ellipse(x + 6, y + 9, 53, 46, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(armory, x - 53, y - 56, 106, 112);
    ctx.restore();
    return true;
  }

  function drawDefenseFooting(ctx, length, level, breached) {
    ctx.save();
    ctx.fillStyle = breached ? 'rgba(37, 31, 26, .4)' : level >= 2 ? 'rgba(75, 69, 59, .25)' : 'rgba(72, 54, 32, .32)';
    ctx.beginPath(); ctx.ellipse(0, 0, length * .53, level >= 2 ? 28 : 25, 0, 0, Math.PI * 2); ctx.fill();
    if (!breached && level >= 2) {
      ctx.strokeStyle = 'rgba(187, 177, 152, .18)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-length * .46, -18); ctx.lineTo(length * .46, -18); ctx.stroke();
    }
    ctx.restore();
  }

  global.GameEnvironmentV5 = Object.freeze({ drawProp, drawTerrain, drawArmory, drawDefenseFooting, ready });
})(window);
