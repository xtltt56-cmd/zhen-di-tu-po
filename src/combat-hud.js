(function (global) {
  'use strict';

  const palette = { ink: '#edf1e5', muted: '#a9b8ac', line: '#56685c', gold: '#e5c784', green: '#83d99b', blue: '#84bfea', red: '#ff947c', panel: '#101b18ee' };
  const number = value => Number.isFinite(value) ? value : 0;
  const ratio = (value, max = 1) => Math.max(0, Math.min(1, number(value) / Math.max(.01, number(max))));
  const remaining = value => number(value) > 0 ? `${value.toFixed(1)} s` : '就绪';

  // Render-only adapter. Reading the HUD never spends points or updates combat.
  function draw(ctx, width, height, state) {
    const p = state.player, v = p.inVehicle, c = palette;
    const bottom = height - 144, equipmentX = 296, equipmentWidth = width - equipmentX - 16;
    const crew = v ? 1 + v.crew.filter(unit => !unit.dead).length : 0;
    function text(value, x, y, size = 13, color = c.ink, maxWidth) {
      ctx.fillStyle = color;
      ctx.font = `${size >= 18 ? 'bold ' : ''}${size}px "Microsoft YaHei",sans-serif`;
      let label = String(value);
      if (maxWidth && ctx.measureText(label).width > maxWidth) {
        while (label.length && ctx.measureText(label + '…').width > maxWidth) label = label.slice(0, -1);
        label += '…';
      }
      ctx.fillText(label, x, y);
    }
    function panel(x, y, w, h, color = c.line) {
      ctx.fillStyle = c.panel; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    }
    function meter(x, y, w, value, color) {
      ctx.fillStyle = '#2b3932'; ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = color; ctx.fillRect(x, y, w * ratio(value), 5);
    }

    ctx.save(); ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.shadowBlur = 0;
    ctx.fillStyle = '#101916'; ctx.fillRect(0, 0, width, 48); ctx.fillRect(0, bottom, width, 144);
    ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(0, 47.5); ctx.lineTo(width, 47.5); ctx.moveTo(0, bottom + .5); ctx.lineTo(width, bottom + .5); ctx.stroke();
    text(state.levelName, 18, 31, 18, c.ink, 390);
    text(state.mode === 'zombie' ? `第 ${state.wave} 波${state.wave > 0 && state.wave % 10 === 0 ? ' · 血月' : ''}` : state.mode === 'training' ? '自由训练' : '战役行动', 435, 30, 15, c.gold);
    const heading = ((number((v || p).angle) * 180 / Math.PI + 90) % 360 + 360) % 360;
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    text(`${directions[Math.round(heading / 45) % 8]} ${Math.round(heading).toString().padStart(3, '0')}°`, 670, 30, 12, c.muted);
    text(`击杀 ${state.killed}    友军 ${state.allies}    敌军 ${state.enemies}`, width - 390, 30, 13, c.muted);
    text('ESC 暂停', width - 90, 30, 12, c.gold);

    const missionWidth = Math.min(680, width - 276), missionX = width - missionWidth - 16;
    const tracked = Boolean(state.objective.navigation);
    panel(missionX, 60, missionWidth, tracked ? 96 : 68);
    text(state.objective.title, missionX + 16, 84, 16, state.objective.warning ? c.red : c.gold, missionWidth - 32);
    text(state.objective.detail, missionX + 16, 106, 13, c.muted, missionWidth - 32);
    if (tracked) text(state.objective.navigation, missionX + 16, 130, 13, c.blue, missionWidth - 32);
    if (state.objective.progress != null) meter(missionX + 16, tracked ? 143 : 117, missionWidth - 32, state.objective.progress, state.objective.warning ? c.red : c.green);

    const reinforcements = state.reinforcements;
    const supportHeight = state.mode === 'zombie' ? 334 : state.mode === 'training' ? 238 : 180;
    panel(16, 218, 205, supportHeight);
    text(`增援点  ${Math.floor(number(p.spawnPoints))}`, 28, 244, 18, c.gold);
    text(state.mode === 'zombie' ? 'F1–F12 选择持续增援' : 'F1–F4 呼叫队友', 28, 267, 12, c.muted);
    reinforcements.forEach((entry, index) => {
      const y = 291 + index * (state.mode === 'zombie' ? 19 : 24);
      const selected = entry.type === state.autoType;
      if (selected) { ctx.fillStyle = '#344739'; ctx.fillRect(22, y - 14, 193, 18); }
      text(`${selected ? '›' : ''}F${index + 1} ${entry.name}`, 28, y, 12, selected ? c.gold : c.ink, 147);
      text(`${entry.cost}`, 185, y, 12, p.spawnPoints >= entry.cost ? c.green : c.muted);
    });
    if (state.mode === 'zombie') {
      const selected = reinforcements.find(entry => entry.type === state.autoType);
      text(selected ? `下次增援 ${Math.floor(p.spawnPoints)} / ${selected.cost} 点` : '等待增援', 28, 533, 12, c.gold, 181);
    } else if (state.mode === 'training') {
      text('训练工具', 28, 400, 13, c.gold);
      text('O 重置标靶    P 满状态补给', 28, 424, 12, c.muted);
      text('敌军标靶不会反击', 28, 443, 12, c.muted);
    }

    panel(16, bottom + 12, 264, 120, p.hp <= 30 ? c.red : c.line);
    text(v ? '乘员生命' : '人物生命', 30, bottom + 34, 13, c.muted);
    text(`${Math.ceil(Math.max(0, number(p.hp)))} / 100`, 150, bottom + 35, 20, p.hp <= 30 ? c.red : c.green);
    meter(30, bottom + 46, 236, ratio(p.hp, 100), c.green);
    text(`护甲 ${Math.ceil(number(p.armor))} / 100`, 30, bottom + 73, 14, c.blue);
    text(`G 手雷 ${p.grenades}`, 171, bottom + 73, 13, c.gold);
    meter(30, bottom + 82, 236, ratio(p.armor, 100), c.blue);
    text(p.hp >= 100 ? '生命状态良好' : p.hurtTimer > 0 ? `脱战回血等待 ${p.hurtTimer.toFixed(1)} s` : '呼吸回血中 · 每秒恢复 10%', 30, bottom + 111, 12, p.hp <= 30 ? c.red : c.muted);

    if (!v || v.openTop) drawInfantry();
    else drawVehicle();
    if (v) drawModules();
    if (state.construction) {
      const task = state.construction, top = v ? (v.openTop ? 346 : 310) : 144;
      panel(width - 264, top, 248, 64);
      text(`防线升级 · ${task.name}`, width - 252, top + 23, 13, c.gold);
      text(`施工进度 ${Math.floor(ratio(task.progress) * 100)}%`, width - 252, top + 43, 12, c.muted);
      meter(width - 252, top + 52, 224, task.progress, c.gold);
    }
    ctx.restore();

    function drawInfantry() {
      const weapon = state.weapons[p.weapon];
      const loading = p.reload > 0 && Number.isInteger(p.reloadWeapon);
      const loadName = loading ? state.weapons[p.reloadWeapon].name : '';
      const status = loading ? `${loadName}换弹 ${p.reload.toFixed(1)} s${p.reloadWeapon !== p.weapon ? ' · 当前武器暂不可射击' : ''}` : p.ammo[p.weapon] <= 0 ? (p.reserve[p.weapon] > 0 ? '等待自动换弹' : '弹药耗尽 · 切换武器') : `弹匣 ${p.ammo[p.weapon]} / ${weapon.cap}    备弹 ${p.reserve[p.weapon]}`;
      text(weapon.name, equipmentX, bottom + 31, 21, c.gold);
      text(status, equipmentX + 158, bottom + 30, 13, loading || p.ammo[p.weapon] <= 0 ? c.gold : c.ink, equipmentWidth - 160);
      text(v ? `${v.name} · 使用乘员枪械  |  Q 上一把 / E 下一把  |  1–6 直选  |  F 下车` : 'Q 上一把  ←  六种武器循环  →  E 下一把    |    1–6 直选    |    R 换弹', equipmentX, bottom + 52, 12, c.muted, equipmentWidth);
      const gap = 7, cardWidth = (equipmentWidth - gap * 5) / 6;
      state.weapons.forEach((spec, index) => {
        const left = equipmentX + index * (cardWidth + gap), selected = index === p.weapon, reloading = loading && index === p.reloadWeapon;
        panel(left, bottom + 65, cardWidth, 64, selected ? c.gold : c.line);
        if (selected) { ctx.fillStyle = '#e5c784'; ctx.fillRect(left, bottom + 65, 3, 64); }
        text(`${index + 1}  ${spec.name}`, left + 10, bottom + 88, 13, selected ? c.gold : c.ink, cardWidth - 16);
        text(reloading ? `装填 ${p.reload.toFixed(1)} s` : `${p.ammo[index]} / ${spec.cap}  ·  备 ${p.reserve[index]}`, left + 10, bottom + 110, 12, reloading ? c.gold : p.ammo[index] <= 0 ? c.red : c.muted, cardWidth - 16);
        meter(left + 10, bottom + 118, cardWidth - 20, reloading ? 1 - ratio(p.reload, p.reloadTotal) : ratio(p.ammo[index], spec.cap), reloading ? c.gold : selected ? c.green : c.line);
      });
    }

    function drawVehicle() {
      text(v.name, equipmentX, bottom + 32, 21, c.gold, 350);
      text(`耐久 ${Math.ceil(v.hp)} / ${v.max}    乘员 ${crew} / ${v.capacity}`, equipmentX + 365, bottom + 31, 15, v.disabled ? c.red : c.ink);
      text('F 下车', width - 81, bottom + 31, 12, c.muted);
      meter(equipmentX, bottom + 43, equipmentWidth, ratio(v.hp, v.max), v.disabled ? c.red : c.green);
      const cardWidth = (equipmentWidth - 16) / 3, y = bottom + 56;
      for (let i = 0; i < 3; i++) panel(equipmentX + i * (cardWidth + 8), y, cardWidth, 76);
      const a = equipmentX + 10, b = equipmentX + cardWidth + 18, d = equipmentX + (cardWidth + 8) * 2 + 10;
      if (v.main) {
        text(`主炮 · ${remaining(v.fire)}`, a, y + 22, 15, v.fire > 0 ? c.gold : c.green);
        ['he', 'heat', 'ap'].forEach((kind, index) => {
          const left = a + index * ((cardWidth - 20) / 3);
          if (v.ammoType === kind) { ctx.fillStyle = '#405241'; ctx.fillRect(left - 3, y + 32, (cardWidth - 20) / 3 - 3, 24); }
          text(`${index + 3} ${state.shells[kind].name}`, left, y + 49, 12, v.ammoType === kind ? c.gold : c.muted);
        });
        meter(a, y + 65, cardWidth - 20, 1 - ratio(v.fire, v.reload), c.gold);
        text(`同轴机枪 · ${remaining(v.coaxFire)}`, b, y + 22, 14, c.ink);
        text(v.autoGunBase ? (crew >= 3 ? '高射机枪 · 自动索敌' : '高射机枪 · 需至少 3 名乘员') : '鼠标左键 · 主炮与同轴同步开火', b, y + 47, 12, c.muted, cardWidth - 20);
        text(v.type === 'm1' && crew === 3 ? '3 人乘员：主炮装填时间增加 30%' : '主炮装填时仍可使用同轴机枪', b, y + 66, 11, c.gold, cardWidth - 20);
      } else {
        text(`${v.type === 'bmpt' ? '双联' : ''}机炮 · 热量 ${Math.round(ratio(v.heat) * 100)}%`, a, y + 23, 15, v.overheated ? c.red : c.ink);
        text(v.overheated ? '过热锁定 · 冷却至 35% 恢复' : '鼠标左键 · 持续开火', a, y + 46, 12, v.overheated ? c.red : c.muted);
        meter(a, y + 62, cardWidth - 20, v.heat, v.overheated ? c.red : c.gold);
        if (v.type === 'bmpt') {
          text(`毒刺 · ${v.missileReload > 0 ? '装填 ' + remaining(v.missileReload) : v.missileAmmo + '/4 发 · ' + remaining(v.missileFire)}`, b, y + 23, 14, c.gold, cardWidth - 20);
          text(`榴弹 · ${crew < 4 ? '需至少 4 名乘员' : remaining(v.grenadeFire)}`, b, y + 47, 12, c.muted);
          text('左键：机炮 + 毒刺；榴弹自动射击', b, y + 66, 11, c.muted);
        } else if (v.airborne) {
          text(`毒刺 · ${remaining(v.missileFire)}`, b, y + 23, 14, c.gold);
          text('鼠标左键 · 机炮与导弹同步开火', b, y + 47, 12, c.muted);
        } else {
          text(`侧面机枪 · ${crew >= 4 ? '两侧可用' : crew === 3 ? '单侧可用' : '乘员不足'}`, b, y + 23, 14, c.ink);
          text('3 人开启一侧，4 人开启双侧', b, y + 47, 12, c.muted);
        }
      }
      text(v.type === 'm1' ? `主动防御 ${v.aps} / 4` : v.airborne ? `自动干扰弹 ${v.flares} / 4` : v.frontLockImmune ? '正面导弹锁定防护' : '乘员协同维修', d, y + 23, 14, c.blue);
      text(v.disabled ? '机动瘫痪 · 耐久恢复至 20% 可移动' : v.stationary >= 2 && v.lastDamage <= 0 && v.hp < v.max ? '停车维修中' : '停车并脱离受击 2 秒开始维修', d, y + 47, 12, v.disabled ? c.red : c.muted, cardWidth - 20);
      text(v.disabled ? '武器系统仍可使用' : v.type === 'm1' ? '正面复合装甲提供额外防护' : '更多乘员可提高车体维修速度', d, y + 66, 11, c.muted, cardWidth - 20);
    }

    function drawModules() {
      const x = width - 264, y = 144;
      panel(x, y, 248, v.openTop ? 190 : 154);
      text('载具模块', x + 12, y + 24, 14, c.gold);
      state.modules.forEach((module, index) => {
        const top = y + 46 + index * 16;
        text(module.label, x + 12, top, 11, c.muted);
        meter(x + 88, top - 6, 99, ratio(module.hp, module.max), module.hp < 30 ? c.red : c.green);
        text(`${Math.ceil(ratio(module.hp, module.max) * 100)}%`, x + 200, top, 11, c.ink);
      });
      if (v.openTop) {
        text(`耐久 ${Math.ceil(v.hp)}/${v.max} · 乘员 ${crew}/${v.capacity}`, x + 12, y + 156, 12, v.disabled ? c.red : c.ink);
        text(v.disabled ? '机动瘫痪 · 维修至 20% 恢复' : '乘员枪械可用 · F 下车', x + 12, y + 177, 12, c.gold);
      }
    }
  }
  global.CombatHUD = Object.freeze({ draw });
})(window);
