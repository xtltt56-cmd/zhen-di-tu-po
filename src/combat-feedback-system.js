(function (global) {
  'use strict';

  const floating = [];
  const incoming = [];
  let marker = 0;
  let markerCritical = false;
  let shake = 0;

  function enabled(name, fallback = true) {
    const value = global.GameSettings?.get(name);
    return value === undefined ? fallback : Boolean(value);
  }

  function recordHit(options = {}) {
    const amount = Math.max(0, Number(options.amount) || 0);
    if (!amount) return;
    marker = Math.min(0.34, marker + 0.13);
    markerCritical = markerCritical || Boolean(options.critical);
    if (enabled('hitMarkers') && Number.isFinite(options.x) && Number.isFinite(options.y)) {
      floating.push({
        x: options.x,
        y: options.y,
        amount,
        life: 0.72,
        max: 0.72,
        critical: Boolean(options.critical),
        armor: Boolean(options.armor),
        label: options.label || '',
      });
      if (floating.length > 36) floating.splice(0, floating.length - 36);
    }
    if (options.heavy) shake = Math.min(1, shake + 0.3);
  }

  function recordIncoming(options = {}) {
    const amount = Math.max(0, Number(options.amount) || 0);
    if (!amount) return;
    incoming.push({
      x: Number(options.x),
      y: Number(options.y),
      life: 0.8,
      max: 0.8,
      amount,
    });
    if (incoming.length > 8) incoming.shift();
    shake = Math.min(1, shake + Math.min(0.5, amount / 130));
  }

  function update(dt) {
    const step = Math.max(0, Math.min(0.05, Number(dt) || 0));
    marker = Math.max(0, marker - step);
    if (!marker) markerCritical = false;
    shake = Math.max(0, shake - step * 2.8);
    for (const item of floating) {
      item.life -= step;
      item.y -= step * 22;
    }
    for (const item of incoming) item.life -= step;
    while (floating.length && floating[0].life <= 0) floating.shift();
    while (incoming.length && incoming[0].life <= 0) incoming.shift();
  }

  function shakeOffset() {
    if (!enabled('screenShake') || shake <= 0.01) return { x: 0, y: 0 };
    const strength = shake * 3.5;
    return { x: (Math.random() * 2 - 1) * strength, y: (Math.random() * 2 - 1) * strength };
  }

  function draw(context, worldToScreen, width, height, listener) {
    context.save();
    if (enabled('hitMarkers') && marker > 0) {
      const alpha = Math.min(1, marker * 7);
      context.translate(width / 2, height / 2);
      context.strokeStyle = markerCritical ? `rgba(255,205,86,${alpha})` : `rgba(238,244,226,${alpha})`;
      context.lineWidth = markerCritical ? 3 : 2;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        context.beginPath();
        context.moveTo(sx * 9, sy * 9);
        context.lineTo(sx * 17, sy * 17);
        context.stroke();
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
    }

    if (enabled('hitMarkers')) {
      context.textAlign = 'center';
      context.font = 'bold 13px Microsoft YaHei';
      for (const item of floating) {
        const point = worldToScreen(item);
        const alpha = Math.max(0, Math.min(1, item.life / item.max));
        context.fillStyle = item.armor ? `rgba(126,205,255,${alpha})` : item.critical ? `rgba(255,199,72,${alpha})` : `rgba(242,246,232,${alpha})`;
        context.shadowColor = '#000';
        context.shadowBlur = 4;
        context.fillText(item.label || `${Math.round(item.amount)}`, point.x, point.y - 26);
      }
      context.shadowBlur = 0;
      context.textAlign = 'left';
    }

    if (enabled('damageVignette') && listener) {
      for (const item of incoming) {
        if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
        const angle = Math.atan2(item.y - listener.y, item.x - listener.x);
        const alpha = Math.max(0, Math.min(0.7, item.life / item.max));
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate(angle);
        context.strokeStyle = `rgba(232,72,54,${alpha})`;
        context.lineWidth = 8;
        context.beginPath();
        context.arc(0, 0, Math.min(width, height) * 0.34, -0.22, 0.22);
        context.stroke();
        context.restore();
      }
    }
    context.restore();
  }

  global.CombatFeedback = Object.freeze({
    recordHit,
    recordIncoming,
    update,
    draw,
    shakeOffset,
    reset() {
      floating.length = 0;
      incoming.length = 0;
      marker = 0;
      shake = 0;
    },
    status: () => ({ floating: floating.length, incoming: incoming.length, marker, shake }),
  });
})(window);
