(function (global) {
  'use strict';

  const assets = {};
  const vehicleSizes = Object.freeze({
    humvee: 86,
    humvee_aa: 88,
    aaHumvee: 88,
    apc: 103,
    hstv: 108,
    bmpt: 113,
    m1: 122,
    t90m: 120,
    apache: 132,
  });
  const infantryHeights = Object.freeze({
    rifle: 78,
    mg: 78,
    sniper: 78,
    engineer: 82,
    commander: 78,
  });
  const defaultColors = Object.freeze({
    red: '#d95a50',
    blue: '#4d94dc',
    friendly: '#62d887',
    enemy: '#e46158',
    neutral: '#a49265',
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

  function canonicalType(type) {
    if (type === 'aaHumvee') return 'humvee_aa';
    return type || 'rifle';
  }

  function assetFile(type) {
    const canonical = canonicalType(type);
    if (canonical === 'humvee_aa') return 'vehicle-humvee';
    if (canonical === 'commander') return 'infantry-rifle';
    return canonical;
  }

  function load(key, file, extension = 'png') {
    if (assets[key]) return assets[key];
    const image = new Image();
    image.decoding = 'async';
    image.src = `assets/frontline/${file}.${extension}`;
    assets[key] = image;
    return image;
  }

  function ready(image) {
    return Boolean(image && image.complete && image.naturalWidth > 0);
  }

  for (const type of ['rifle', 'mg', 'sniper', 'engineer']) {
    load(`infantry-${type}`, `infantry-${type}`);
  }
  assets['infantry-commander'] = assets['infantry-rifle'];
  for (const type of ['humvee', 'apc', 'hstv', 'bmpt', 'm1', 't90m', 'apache']) {
    load(`vehicle-${type}`, `vehicle-${type}`);
  }
  assets['vehicle-humvee_aa'] = assets['vehicle-humvee'];
  assets['vehicle-aaHumvee'] = assets['vehicle-humvee'];
  for (let level = 1; level <= 5; level++) load(`hq-${level}`, `hq-level-${level}`);
  load('emplacement-trenchMg', 'trench-mg-v2', 'svg');
  load('emplacement-trenchAt', 'trench-at-v2', 'svg');

  function sideOf(unit, options = {}) {
    if (Number.isFinite(options.side)) return options.side >= 0 ? 1 : -1;
    if (Number.isFinite(unit?.side)) return unit.side >= 0 ? 1 : -1;
    const team = options.team || unit?.team;
    return team === 'blue' || team === 'enemy' ? -1 : 1;
  }

  function colorOf(unit, options = {}) {
    if (options.color) return options.color;
    const team = options.team || unit?.team;
    if (team === 'red') return defaultColors.red;
    if (team === 'blue') return defaultColors.blue;
    return sideOf(unit, options) === 1 ? defaultColors.friendly : defaultColors.enemy;
  }

  function maxHpOf(unit) {
    return Math.max(1, finite(unit?.maxHp, finite(unit?.max, finite(unit?.hp, 1))));
  }

  function drawHealthBar(ctx, x, y, width, ratio, color, marker = true) {
    const safeRatio = clamp(finite(ratio, 0), 0, 1);
    ctx.save();
    ctx.fillStyle = '#070a08eb';
    ctx.fillRect(x - width / 2 - 2, y - 2, width + 4, 8);
    ctx.fillStyle = '#283028';
    ctx.fillRect(x - width / 2, y, width, 4);
    const gradient = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#f0d995');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - width / 2, y, width * safeRatio, 4);
    if (marker) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 5, y - 3);
      ctx.lineTo(x - 5, y - 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawInfantry(ctx, unit, options = {}) {
    const type = canonicalType(options.type || unit.type || unit.role);
    const visualType = type === 'commander' ? 'rifle' : type;
    const image = assets[`infantry-${visualType}`];
    if (!ready(image)) return false;

    const side = sideOf(unit, options);
    const color = colorOf(unit, options);
    const height = finite(options.height, infantryHeights[type] || 78);
    const width = height * image.naturalWidth / image.naturalHeight;
    const alpha = unit.dead ? clamp(finite(unit.fade, 1), 0, 1) : 1;
    const moving = options.moving !== undefined
      ? Boolean(options.moving)
      : Boolean(unit.moving || finite(unit.visualSpeed, finite(unit._v4Speed, 0)) > 0.8);
    const time = finite(options.time, performance.now() / 1000);
    const phase = Number.isFinite(unit.visualPhase)
      ? unit.visualPhase
      : Number.isFinite(unit._v4Travel)
        ? unit._v4Travel * 0.18 + finite(unit.formationSlot, 0) * 0.55
        : Number.isFinite(unit.walk)
          ? unit.walk
          : time * 6 + finite(unit.x, 0) * 0.027;
    const stride = moving ? Math.sin(phase) : 0;
    const bob = moving ? Math.abs(Math.sin(phase)) * 3.2 : 0;
    const x = finite(options.x, finite(unit.x, 0));
    const y = finite(options.y, finite(unit.y, 0));
    const baseY = y + finite(options.baseOffset, 10) - bob;
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const legY = Math.floor(ih * 0.56);
    const half = Math.floor(iw / 2);
    const scale = height / ih;
    const hipY = -height + legY * scale;
    const swing = stride * 0.34;
    const firing = finite(unit.muzzle, 0) > 0 || Boolean(options.firing);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(20,24,18,${moving ? 0.3 : 0.48})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 12, moving ? 18 + Math.abs(stride) * 3 : 18, moving ? 4 : 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, baseY);
    if (unit.dead) ctx.rotate(side * 0.9);
    else if (moving) ctx.rotate(stride * 0.025);
    ctx.scale(side, 1);
    ctx.shadowColor = `${color}88`;
    ctx.shadowBlur = 5;

    if (moving && !unit.dead) {
      const drawLeg = (sourceX, sourceWidth, pivot, angle, lift) => {
        ctx.save();
        ctx.translate(pivot, hipY - lift);
        ctx.rotate(angle);
        ctx.drawImage(
          image,
          sourceX,
          legY,
          sourceWidth,
          ih - legY,
          -width / 2 + sourceX * scale - pivot,
          0,
          sourceWidth * scale,
          (ih - legY) * scale,
        );
        ctx.restore();
      };
      drawLeg(half, iw - half, width * 0.11, -swing, Math.max(0, stride) * 2.8);
      drawLeg(0, half, -width * 0.11, swing, Math.max(0, -stride) * 2.8);
      const upperHeight = Math.min(ih, legY + 18);
      ctx.drawImage(image, 0, 0, iw, upperHeight, -width / 2, -height, width, upperHeight * scale);
    } else {
      ctx.drawImage(image, -width / 2, -height, width, height);
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.92;
    ctx.fillStyle = color;
    ctx.fillRect(-side * 3, -height * 0.68, 7, 4);

    if (type === 'commander') {
      ctx.fillStyle = '#e4d16d';
      ctx.beginPath();
      ctx.moveTo(0, -height - 9);
      ctx.lineTo(7, -height + 1);
      ctx.lineTo(0, -height - 2);
      ctx.lineTo(-7, -height + 1);
      ctx.closePath();
      ctx.fill();
    }
    if (firing) {
      ctx.fillStyle = '#ffe89a';
      ctx.shadowColor = '#ff963c';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(width * 0.43, -height * 0.48 - 3);
      ctx.lineTo(width * 0.43 + 12, -height * 0.48);
      ctx.lineTo(width * 0.43, -height * 0.48 + 3);
      ctx.fill();
    }
    ctx.restore();

    if (!unit.dead && options.health !== false) {
      drawHealthBar(ctx, x, baseY - height - 8, finite(options.barWidth, 38), finite(unit.hp, maxHpOf(unit)) / maxHpOf(unit), color);
    }
    if (type === 'mg' && finite(unit.mgSetup, 0) > 0) {
      const setup = clamp(1 - finite(unit.mgSetup, 0) / 0.5, 0, 1);
      ctx.fillStyle = '#101510dd';
      ctx.fillRect(x - 22, baseY - height - 16, 44, 5);
      ctx.fillStyle = '#e7c65e';
      ctx.fillRect(x - 22, baseY - height - 16, 44 * setup, 5);
    }
    return true;
  }

  function drawVehicleMotion(ctx, type, width, height, travel) {
    if (type === 'apache') return;
    const tracked = ['hstv', 'bmpt', 'm1', 't90m'].includes(type);
    ctx.save();
    ctx.globalAlpha = 0.38;
    if (tracked) {
      ctx.strokeStyle = '#c2c4af';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -(travel % 9);
      ctx.beginPath();
      ctx.moveTo(-width * 0.39, height * 0.34);
      ctx.lineTo(width * 0.39, height * 0.34);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#b8beac';
      ctx.lineWidth = 1.7;
      for (const px of [-width * 0.3, width * 0.3]) {
        ctx.save();
        ctx.translate(px, height * 0.3);
        ctx.rotate(travel * 0.09);
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 6);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawAaRack(ctx, width) {
    ctx.fillStyle = '#303c32';
    ctx.fillRect(-10, -8, 22, 15);
    for (const y of [-7, 1]) {
      ctx.fillStyle = '#69775f';
      ctx.fillRect(5, y, 25, 6);
      ctx.fillStyle = '#d6d1a3';
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(38, y + 3);
      ctx.lineTo(30, y + 6);
      ctx.fill();
    }
    ctx.fillStyle = '#202722';
    ctx.fillRect(-width * 0.06, 6, width * 0.24, 4);
  }

  function drawVehicle(ctx, unit, options = {}) {
    const type = canonicalType(options.type || unit.type);
    const imageType = assetFile(type).replace('vehicle-', '');
    const image = assets[`vehicle-${imageType}`];
    if (!ready(image)) return false;

    const side = sideOf(unit, options);
    const color = colorOf(unit, options);
    const width = finite(options.width, vehicleSizes[type] || 104);
    const height = width * image.naturalHeight / image.naturalWidth;
    const x = finite(options.x, finite(unit.x, 0));
    const y = finite(options.y, finite(unit.y, 0));
    const travel = finite(unit.visualTravel, finite(unit._v4Travel, finite(unit.walk, 0)));
    const moving = finite(unit.visualSpeed, finite(unit._v4Speed, 0)) > 0.8 || Boolean(unit.moving);
    const suspension = moving && type !== 'apache' ? Math.abs(Math.sin(travel * 0.18)) * 1.4 : 0;
    const baseY = y + (type === 'apache' ? 18 : 11) - suspension;
    const alpha = unit.dead ? clamp(finite(unit.fade, 1), 0, 1) : 1;
    const def = options.def || {};
    const firing = finite(unit.muzzle, 0) > 0
      || Boolean(options.firing)
      || (Number.isFinite(unit.fire) && Number.isFinite(def.rate) && unit.fire > Math.max(0.025, def.rate - 0.095));

    ctx.save();
    ctx.globalAlpha = alpha;
    if (type === 'apache') {
      ctx.fillStyle = '#1017133d';
      ctx.beginPath();
      ctx.ellipse(x + side * 18, finite(options.ground, y + 175) + 8, 58, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#10130f66';
      ctx.beginPath();
      ctx.ellipse(x + side * 4, baseY + 3, width * 0.44, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(x, baseY);
    ctx.scale(side, 1);
    drawVehicleMotion(ctx, type, width, height, travel);
    ctx.shadowColor = `${color}88`;
    ctx.shadowBlur = 6;
    ctx.drawImage(image, -width / 2, -height, width, height);
    ctx.shadowBlur = 0;

    if (type === 'apache') {
      const rotor = finite(options.time, performance.now() / 1000) * 11;
      ctx.save();
      ctx.translate(0, -height * 0.58);
      ctx.rotate(rotor);
      ctx.strokeStyle = 'rgba(225,233,222,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-width * 0.5, 0);
      ctx.lineTo(width * 0.5, 0);
      ctx.moveTo(0, -width * 0.16);
      ctx.lineTo(0, width * 0.16);
      ctx.stroke();
      ctx.restore();
    }
    if (type === 'humvee_aa') {
      ctx.save();
      ctx.translate(0, -height * 0.76);
      drawAaRack(ctx, width);
      ctx.restore();
    }

    ctx.fillStyle = color;
    ctx.fillRect(-5, -height * 0.58, 10, 4);
    if (firing) {
      const mainTank = ['m1', 't90m'].includes(type);
      const muzzleX = width * (mainTank ? 0.55 : 0.47);
      const muzzleY = -height * (mainTank ? 0.63 : type === 'apache' ? 0.48 : 0.54);
      const size = mainTank ? 20 : 11;
      ctx.fillStyle = '#fff0a0';
      ctx.shadowColor = '#ff8f35';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(muzzleX, muzzleY - size * 0.35);
      ctx.lineTo(muzzleX + size, muzzleY);
      ctx.lineTo(muzzleX, muzzleY + size * 0.35);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (finite(unit.hit, 0) > 0) {
      ctx.fillStyle = `rgba(255,226,173,${clamp(unit.hit * 2.2, 0, 0.7)})`;
      ctx.beginPath();
      ctx.ellipse(0, -height * 0.45, width * 0.45, height * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (def.deploy && !unit.deployed) {
      ctx.fillStyle = 'rgba(8,12,9,.84)';
      ctx.fillRect(-23, -height - 17, 46, 13);
      ctx.strokeStyle = '#e2c36c';
      ctx.strokeRect(-23, -height - 17, 46, 13);
      ctx.fillStyle = '#e2c36c';
      ctx.font = 'bold 8px Microsoft YaHei';
      ctx.textAlign = 'center';
      ctx.fillText('满载步兵', 0, -height - 8);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    if (!unit.dead && options.health !== false) {
      const barWidth = type === 'apache' ? 68 : ['m1', 't90m', 'bmpt'].includes(type) ? 64 : 58;
      const barY = baseY - height - 11;
      drawHealthBar(ctx, x, barY, barWidth, finite(unit.hp, maxHpOf(unit)) / maxHpOf(unit), color);
      if (options.label !== false) {
        ctx.fillStyle = color;
        ctx.font = 'bold 9px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(options.name || def.name || type, x, baseY + 18);
        ctx.textAlign = 'left';
      }
      if (type === 'apache' && finite(unit.flares, 0) > 0) {
        ctx.fillStyle = '#f3ad69';
        for (let index = 0; index < unit.flares; index++) ctx.fillRect(x - 12 + index * 7, baseY + 23, 4, 4);
      }
      const ratio = finite(unit.hp, maxHpOf(unit)) / maxHpOf(unit);
      if (ratio < 0.56) {
        const time = finite(options.time, performance.now() / 1000) + x * 0.01;
        ctx.fillStyle = `rgba(39,44,39,${(0.56 - ratio) * 0.62})`;
        for (let index = 0; index < 3; index++) {
          ctx.beginPath();
          ctx.arc(x - 7 + Math.sin(time + index) * 7, barY - 8 - index * 9, 6 + index * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    return true;
  }

  function drawHeadquarters(ctx, hq, options = {}) {
    const level = clamp(Math.round(finite(hq.level, 1)), 1, 5);
    const image = assets[`hq-${level}`];
    if (!ready(image)) return false;
    const side = sideOf(hq, options);
    const color = colorOf(hq, options);
    const width = [0, 125, 135, 145, 155, 168][level];
    const height = width * image.naturalHeight / image.naturalWidth;
    const x = finite(options.x, finite(hq.x, 0));
    const ground = finite(options.ground, 470);
    const bottom = finite(options.bottom, ground + 3);
    const max = Math.max(1, finite(hq.maxHp, finite(hq.max, finite(hq.hp, 1))));
    const ratio = clamp(finite(hq.hp, max) / max, 0, 1);

    ctx.save();
    ctx.fillStyle = '#10130f77';
    ctx.beginPath();
    ctx.ellipse(x, bottom + 2, width * 0.44, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, bottom);
    ctx.scale(side, 1);
    ctx.shadowColor = `${color}77`;
    ctx.shadowBlur = 8;
    ctx.drawImage(image, -width / 2, -height, width, height);
    ctx.restore();

    const barY = Math.max(finite(options.topLimit, 72), bottom - height - 19);
    drawHealthBar(ctx, x, barY, 98, ratio, color, false);
    ctx.fillStyle = '#f0e7d0';
    ctx.font = 'bold 11px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(options.label || `${options.teamLabel || (side === 1 ? '我军' : '敌军')}总部 · Lv.${level}`, x, barY - 5);
    ctx.textAlign = 'left';

    if (ratio < 0.7) {
      const time = finite(options.time, performance.now() / 1000);
      for (let index = 0; index < 3; index++) {
        ctx.fillStyle = `rgba(35,39,36,${0.08 + (0.7 - ratio) * 0.26})`;
        ctx.beginPath();
        ctx.arc(x + Math.sin(time * 1.4 + index + x) * 6, bottom - height - 3 - index * 14, 7 + index * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return true;
  }

  function ownerSide(owner) {
    if (owner === 'red' || owner === 1 || owner === 'friendly') return 1;
    if (owner === 'blue' || owner === -1 || owner === 'enemy') return -1;
    return 0;
  }

  function trenchColor(trench, options = {}) {
    if (options.color) return options.color;
    if (trench.owner === 'red') return defaultColors.red;
    if (trench.owner === 'blue') return defaultColors.blue;
    if (trench.owner === 1) return defaultColors.friendly;
    if (trench.owner === -1) return defaultColors.enemy;
    return defaultColors.neutral;
  }

  function drawTrench(ctx, trench, index, options = {}) {
    const ground = finite(options.ground, 470);
    const x = finite(options.x, finite(trench.x, 0));
    const level = clamp(Math.round(finite(trench.level, finite(trench.fort, 1))), 1, 3);
    const side = ownerSide(trench.owner);
    const color = trenchColor(trench, options);
    const selected = Boolean(options.selected);

    ctx.save();
    ctx.translate(x, ground + 2);
    ctx.fillStyle = '#15171466';
    ctx.beginPath();
    ctx.ellipse(0, 42, 63, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    const earth = ctx.createLinearGradient(0, -10, 0, 45);
    earth.addColorStop(0, '#7a6749');
    earth.addColorStop(0.28, '#594832');
    earth.addColorStop(1, '#342b23');
    ctx.fillStyle = earth;
    ctx.strokeStyle = color;
    ctx.lineWidth = selected ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(-53, 0);
    ctx.lineTo(-49, 38);
    ctx.lineTo(49, 38);
    ctx.lineTo(53, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    for (let px = -48; px < 48; px += 16) {
      ctx.fillStyle = ((px / 16) & 1) ? '#806a48' : '#927b56';
      ctx.beginPath();
      ctx.ellipse(px + 8, -1, 10, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,28,20,.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = '#201d18';
    ctx.fillRect(-39, 10, 78, 26);
    for (let plank = -34; plank <= 34; plank += 17) {
      ctx.fillStyle = '#4a3a28';
      ctx.fillRect(plank, 10, 4, 27);
      ctx.fillStyle = '#6b5437';
      ctx.fillRect(plank + 4, 14, 12, 4);
    }
    ctx.strokeStyle = '#8f7b58';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-35, 34);
    ctx.lineTo(35, 34);
    ctx.stroke();

    ctx.strokeStyle = '#252921';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -61);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(2, -59);
    ctx.lineTo(side < 0 ? -29 : 29, -48);
    ctx.lineTo(2, -37);
    ctx.closePath();
    ctx.fill();

    const mgActive = options.embeddedTurrets !== false && finite(trench.mgHp, level >= 2 ? 1 : 0) > 0;
    const atActive = options.embeddedTurrets !== false && finite(trench.atHp, level >= 3 ? 1 : 0) > 0;
    if (mgActive) {
      const image = assets['emplacement-trenchMg'];
      if (ready(image)) {
        const width = 76;
        const height = width * image.naturalHeight / image.naturalWidth;
        ctx.save();
        ctx.translate(-19, -14);
        ctx.scale(side || 1, 1);
        ctx.drawImage(image, -width / 2, -height, width, height);
        ctx.restore();
      }
    }
    if (atActive) {
      const image = assets['emplacement-trenchAt'];
      if (ready(image)) {
        const width = 88;
        const height = width * image.naturalHeight / image.naturalWidth;
        ctx.save();
        ctx.translate(22, -13);
        ctx.scale(side || 1, 1);
        ctx.drawImage(image, -width / 2, -height, width, height);
        ctx.restore();
      }
    }
    if (level >= 2) {
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

    const control = clamp(finite(trench.control, 0), -100, 100);
    const captureRatio = (control + 100) / 200;
    ctx.fillStyle = '#101511';
    ctx.fillRect(x - 44, ground + 48, 88, 6);
    ctx.fillStyle = options.leftColor || defaultColors.red;
    ctx.fillRect(x - 43, ground + 49, 86 * captureRatio, 4);
    ctx.fillStyle = options.rightColor || defaultColors.blue;
    ctx.fillRect(x - 43 + 86 * captureRatio, ground + 49, 86 * (1 - captureRatio), 4);
    ctx.fillStyle = '#d9dfcc';
    ctx.font = 'bold 11px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`${index + 1}号战壕 · ${'★'.repeat(level)}`, x, ground + 70);
    if (options.orderLabel) {
      ctx.fillStyle = color;
      ctx.font = '10px Microsoft YaHei';
      ctx.fillText(options.orderLabel, x, ground + 84);
    }
    ctx.textAlign = 'left';
    return true;
  }

  function drawShot(ctx, shot, options = {}) {
    const hasExplicitMax = Number.isFinite(shot.max) || Number.isFinite(shot.maxT);
    const max = Math.max(0.001, finite(shot.max, finite(shot.maxT, finite(shot.life, finite(shot.t, 0.1)))));
    const life = finite(shot.life, finite(shot.t, max));
    const progress = hasExplicitMax ? clamp(1 - life / max, 0, 1) : 1;
    const x = finite(shot.x1, 0) + (finite(shot.x2, 0) - finite(shot.x1, 0)) * progress;
    const y = finite(shot.y1, 0) + (finite(shot.y2, 0) - finite(shot.y1, 0)) * progress;
    const projectile = shot.projectile || (/rocket|stinger|missile|engineer/i.test(shot.type || '') ? 'missile' : /m1|t90|hstv|tank|artillery|trenchAt/i.test(shot.type || '') ? 'shell' : shot.type === 'sniper' ? 'sniper' : 'bullet');
    const side = sideOf(shot, { side: shot.side, team: shot.team });
    const color = projectile === 'missile' ? '#f7b654' : projectile === 'shell' ? '#fff0b5' : projectile === 'sniper' ? '#fff9d8' : side === 1 ? '#ff9b72' : '#8cc7ff';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = projectile === 'missile' || projectile === 'shell' ? '#ff9c3a' : color;
    ctx.shadowBlur = projectile === 'missile' || projectile === 'shell' ? 9 : 3;
    ctx.lineWidth = projectile === 'shell' || projectile === 'missile' ? 4 : projectile === 'sniper' ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x - (finite(shot.x2, 0) - finite(shot.x1, 0)) * (projectile === 'missile' ? 0.07 : 0.025), y - (finite(shot.y2, 0) - finite(shot.y1, 0)) * (projectile === 'missile' ? 0.07 : 0.025));
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (projectile === 'missile') {
      const angle = Math.atan2(finite(shot.y2, 0) - finite(shot.y1, 0), finite(shot.x2, 0) - finite(shot.x1, 0));
      for (let puff = 1; puff <= 4; puff++) {
        ctx.fillStyle = `rgba(218,221,207,${0.2 / puff})`;
        ctx.beginPath();
        ctx.arc(x - Math.cos(angle) * puff * 9, y - Math.sin(angle) * puff * 9, 3 + puff * 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (projectile === 'shell') {
      ctx.fillStyle = '#fff9cf';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEffect(ctx, effect, options = {}) {
    if (finite(effect.delay, 0) > 0) return;
    const max = Math.max(0.001, finite(effect.max, finite(effect.life, finite(effect.t, 1))));
    const life = finite(effect.life, finite(effect.t, max));
    const ratio = clamp(life / max, 0, 1);
    const x = finite(effect.x, 0);
    const y = finite(effect.y, 0);
    const type = effect.type;
    ctx.save();
    if (['blast', 'delayedBlast', 'artillery'].includes(type)) {
      const radius = 10 + (1 - ratio) * 46;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(255,231,139,${ratio})`);
      gradient.addColorStop(0.45, `rgba(231,98,43,${ratio * 0.8})`);
      gradient.addColorStop(1, 'rgba(50,39,30,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(44,47,42,${(1 - ratio) * 0.24})`;
      for (let puff = 0; puff < 3; puff++) {
        ctx.beginPath();
        ctx.arc(x - 9 + puff * 9, y - 15 - puff * 8, 7 + puff * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (['upgrade', 'capture', 'deploy'].includes(type)) {
      const color = options.color || colorOf(effect, options);
      ctx.strokeStyle = color;
      ctx.globalAlpha = ratio;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 12 + (1 - ratio) * 35, 0, Math.PI * 2);
      ctx.stroke();
      if (ratio > 0.35 && options.labels !== false) {
        ctx.fillStyle = color;
        ctx.font = 'bold 10px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(type === 'upgrade' ? '阵地强化' : type === 'capture' ? '阵地占领' : '步兵下车', x, y - 24 - (1 - ratio) * 12);
      }
    } else if (type === 'hit') {
      ctx.fillStyle = '#fff2ad';
      ctx.globalAlpha = ratio;
      ctx.beginPath();
      ctx.arc(x, y, 4 + (1 - ratio) * 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'aps') {
      ctx.strokeStyle = '#85dbff';
      ctx.globalAlpha = ratio;
      ctx.beginPath();
      ctx.arc(x, y, 22 + (1 - ratio) * 18, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'fall' || type === 'death') {
      ctx.fillStyle = `rgba(99,44,37,${ratio * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(x, y + 15, 13 + (1 - ratio) * 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDust(ctx, particles) {
    for (const particle of particles || []) {
      const alpha = clamp(finite(particle.life, 0) / Math.max(0.001, finite(particle.max, 1)), 0, 1) * 0.2;
      ctx.fillStyle = `rgba(176,157,116,${alpha})`;
      ctx.beginPath();
      ctx.arc(finite(particle.x, 0), finite(particle.y, 0), finite(particle.size, 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBackground(ctx, options = {}) {
    const width = finite(options.width, 1280);
    const height = finite(options.height, 720);
    const top = finite(options.top, 64);
    const ground = finite(options.ground, 470);
    const bottom = finite(options.bottom, 578);
    const time = finite(options.time, 0);
    const sky = ctx.createLinearGradient(0, top, 0, ground);
    sky.addColorStop(0, '#8c968d');
    sky.addColorStop(0.55, '#67736c');
    sky.addColorStop(1, '#4e574f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, top, width, ground - top);

    ctx.fillStyle = '#d8d2bd22';
    for (let index = 0; index < 8; index++) {
      ctx.beginPath();
      ctx.ellipse((index * 193 + time * 2) % (width + 170) - 80, top + 28 + (index % 3) * 43, 80, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#26332c33';
    ctx.beginPath();
    ctx.moveTo(0, ground - 220);
    for (let px = 0; px <= width; px += 80) ctx.lineTo(px, ground - 255 + Math.sin(px * 0.012) * 28);
    ctx.lineTo(width, ground - 170);
    ctx.lineTo(0, ground - 170);
    ctx.fill();
    ctx.fillStyle = '#18231e22';
    ctx.beginPath();
    ctx.moveTo(0, ground - 140);
    for (let px = 0; px <= width; px += 55) ctx.lineTo(px, ground - 170 + Math.sin(px * 0.019 + 1.4) * 18);
    ctx.lineTo(width, ground - 105);
    ctx.lineTo(0, ground - 105);
    ctx.fill();

    const field = ctx.createLinearGradient(0, ground - 2, 0, bottom);
    field.addColorStop(0, '#4d4938');
    field.addColorStop(1, '#2d2e25');
    ctx.fillStyle = field;
    ctx.fillRect(0, ground - 2, width, Math.max(0, bottom - ground + 2));
    for (let index = 0; index < 22; index++) {
      const px = (index * 83 + 31) % width;
      ctx.fillStyle = index % 2 ? '#272820' : '#5c543b';
      ctx.beginPath();
      ctx.ellipse(px, ground + 25 + (index % 4) * 19, 18 + index % 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const scorch of options.scorches || []) {
      const ratio = clamp(finite(scorch.life, 0) / Math.max(0.001, finite(scorch.max, 1)), 0, 1);
      ctx.fillStyle = `rgba(20,21,17,${0.12 + ratio * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(finite(scorch.x, 0), finite(scorch.y, ground), finite(scorch.size, 24), finite(scorch.size, 24) * 0.35, finite(scorch.angle, 0), 0, Math.PI * 2);
      ctx.fill();
    }
    if (options.weather !== false) {
      ctx.strokeStyle = 'rgba(208,220,207,.08)';
      ctx.lineWidth = 1;
      for (let index = 0; index < 34; index++) {
        const px = (index * 137 + time * 12) % (width + 80) - 40;
        const py = top + 22 + (index * 79 % Math.max(1, ground - top - 40));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 7, py + 13);
        ctx.stroke();
      }
    }
  }

  global.FrontlineVisuals = Object.freeze({
    assets,
    vehicleSizes,
    infantryHeights,
    colors: defaultColors,
    canonicalType,
    load,
    ready,
    drawHealthBar,
    drawInfantry,
    drawVehicle,
    drawHeadquarters,
    drawTrench,
    drawShot,
    drawEffect,
    drawDust,
    drawBackground,
  });
})(window);
