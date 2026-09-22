(function (global) {
  'use strict';

  let root;
  let current = null;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function install() {
    if (root) return;
    if (getComputedStyle(document.documentElement).getPropertyValue('--preparation-style-ready').trim() !== '1') throw new Error('出战准备样式未加载');
    root = document.createElement('section');
    root.id = 'preparation';
    root.className = 'hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'prep-title');
    document.body.appendChild(root);
    root.addEventListener('click', event => {
      const action = event.target.closest('[data-prep-action]')?.dataset.prepAction;
      if (action === 'back') cancel();
      else if (action === 'launch') launch();
      else if (action === 'red' || action === 'blue') ready(action);
    });
  }

  // Tactical symbols describe fixed objectives only. Random geometry is generated
  // by the game on launch, never by visiting or cancelling the briefing.
  function mapMarkup(map, duel) {
    const colors = { friendly: duel ? '#e5857d' : '#8cc7b4', enemy: duel ? '#86b9ec' : '#db8376', neutral: '#a6afa5', goal: '#ddc28b' };
    let shapes = '';
    const marker = (x, y, label, color, anchor = 'start') => `<circle cx="${x}" cy="${y}" r="8" fill="${color}"/><circle cx="${x}" cy="${y}" r="16" fill="none" stroke="${color}" opacity=".45"/><text x="${x + (anchor === 'end' ? -22 : 22)}" y="${y + 5}" text-anchor="${anchor}" fill="${color}">${escape(label)}</text>`;
    if (map.kind === 'frontline') {
      shapes += '<path d="M50 160H590" stroke="#8c9680" stroke-width="2"/>';
      shapes += marker(45, 100, duel ? '红方总部' : '我军总部', colors.friendly);
      shapes += marker(595, 100, duel ? '蓝方总部' : '敌军总部', colors.enemy, 'end');
      for (let i = 0; i < map.trenches; i++) {
        const x = 105 + i * 430 / Math.max(1, map.trenches - 1);
        const color = i < map.friendlyOwned ? colors.friendly : i >= map.trenches - map.enemyOwned ? colors.enemy : colors.neutral;
        shapes += `<path d="M${x - 15} 147v23h30v-23" fill="none" stroke="${color}" stroke-width="4"/><text x="${x}" y="200" text-anchor="middle" fill="${color}">${i + 1}号</text>`;
      }
      shapes += '<text x="320" y="256" text-anchor="middle" fill="#aab7a5">逐段争夺阵地 · 摧毁对方总部</text>';
    } else if (map.kind === 'zombie') {
      for (const size of [130, 190, 250]) shapes += `<rect x="${320 - size / 2}" y="${160 - size / 2}" width="${size}" height="${size}" fill="none" stroke="#708474" stroke-dasharray="6 5"/>`;
      shapes += marker(320, 160, '兵工厂', colors.goal);
      shapes += marker(258, 205, '我方出生区', colors.friendly, 'end');
      shapes += '<path d="M80 160h65m350 0h65M320 25v22m0 226v22" stroke="#c97166" stroke-width="3"/><text x="70" y="135" fill="#db8376">尸潮来袭</text>';
    } else {
      const point = p => ({ x: 50 + p.x / map.width * 540, y: 32 + p.y / map.height * 244 });
      const entry = point(map.entry);
      shapes += marker(entry.x, entry.y, map.kind === 'training' ? '训练入口' : '我方进入点', colors.friendly);
      if (map.goal) { const goal = point(map.goal); shapes += marker(goal.x, goal.y, '撤离点', colors.goal, 'end'); }
      if (map.objective) { const goal = point(map.objective); shapes += marker(goal.x, goal.y, '占领区', colors.goal, 'end'); }
      if (map.kind === 'training') shapes += marker(355, 125, '载具与固定标靶', colors.goal, 'end');
      shapes += `<text x="590" y="292" text-anchor="end" fill="#98a58f">区域规模 ${map.width} × ${map.height}</text>`;
    }
    return `<svg class="prep-map" viewBox="0 0 640 320" role="img" aria-label="${escape(map.caption)}"><defs><pattern id="prep-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#a3b499" stroke-opacity=".13"/></pattern></defs><rect x="1" y="1" width="638" height="318" rx="2" fill="#101c18" stroke="#72806c"/><rect width="640" height="320" fill="url(#prep-grid)"/><text x="20" y="26" fill="#a3b499">N ↑</text>${shapes}</svg><figcaption>${escape(map.caption)}</figcaption>`;
  }

  function render(model) {
    const facts = model.facts.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('');
    const groups = model.groups.map(group => `<section class="prep-section"><h3>${escape(group.title)}</h3><ul class="prep-units">${group.items.map(item => `<li${item.locked ? ' class="locked"' : ''}><span>${escape(item.name)}</span>${item.detail ? `<small>${escape(item.detail)}</small>` : ''}</li>`).join('')}</ul></section>`).join('');
    const controls = list => `<dl class="prep-controls">${list.map(([key, text]) => `<div><dt><kbd>${escape(key)}</kbd></dt><dd>${escape(text)}</dd></div>`).join('')}</dl>`;
    const team = (id, title, list) => `<section class="prep-team ${id}"><h3>${title}</h3>${controls(list)}</section>`;
    root.dataset.mode = model.mode;
    root.innerHTML = `
      <header class="prep-header"><div><h2>出战准备</h2><span>${escape(model.modeName)}</span></div><button type="button" class="prep-button quiet" data-prep-action="back">返回</button></header>
      <div class="prep-scroll">
        <div class="prep-columns">
          <main class="prep-mission"><h1 id="prep-title" tabindex="-1">${escape(model.title)}</h1><h3 class="prep-objective-label">${model.mode === 'training' ? '训练目标' : '作战目标'}</h3><p class="prep-objective">${escape(model.objective)}</p>
          <figure>${mapMarkup(model.map, model.duel)}</figure><ul class="prep-tips">${model.tips.map(tip => `<li>${escape(tip)}</li>`).join('')}</ul></main>
          <aside class="prep-intel"><section class="prep-section"><h3>出战信息</h3><dl class="prep-facts">${facts}</dl></section>${groups}${model.duel ? '' : `<section class="prep-section"><h3>操作提示</h3>${controls(model.controls)}</section>`}</aside>
        </div>
        ${model.duel ? `<div class="prep-teams">${team('red', '红方 · 键盘', model.redControls)}${team('blue', '蓝方 · 鼠标', model.blueControls)}</div>` : ''}
      </div>
      <footer class="prep-footer"><button type="button" class="prep-button" data-prep-action="back">${escape(model.backLabel || '返回首页')}</button><p class="prep-feedback" role="status">${model.duel ? '等待双方准备 · 准备期间不计时、不增加点数' : 'Enter 出战 · Esc 返回'}</p>${model.duel ? '<button type="button" class="prep-button red-ready" data-prep-action="red" aria-pressed="false">红方准备 · Enter</button><button type="button" class="prep-button blue-ready" data-prep-action="blue" aria-pressed="false">蓝方点击准备</button>' : `<button type="button" class="prep-button primary" data-prep-action="launch">${model.mode === 'training' ? '开始训练' : '确认出战'}</button>`}</footer>`;
  }

  function open(model, actions) {
    if (current) return false;
    install();
    render(model);
    const previousFocus = document.activeElement;
    const background = ['menu', 'overlay', 'game'].map(id => document.getElementById(id)).filter(Boolean).map(node => ({ node, inert: node.inert }));
    current = { model, actions, previousFocus, background, red: false, blue: false, launching: false };
    background.forEach(({ node }) => { node.inert = true; });
    root.classList.remove('hidden');
    root.querySelector('.prep-scroll').scrollTop = 0;
    root.querySelector('#prep-title').focus({ preventScroll: true });
    return true;
  }

  function close() {
    const previous = current;
    current = null;
    root.classList.add('hidden');
    previous.background.forEach(({ node, inert }) => { node.inert = inert; });
    return previous;
  }
  function cancel() {
    if (!current || current.launching) return;
    const previous = close();
    previous.actions.cancel?.();
    if (previous.previousFocus?.isConnected && previous.previousFocus.getClientRects().length) previous.previousFocus.focus({ preventScroll: true });
    else document.querySelector('#home-launch')?.focus({ preventScroll: true });
  }
  function launch() {
    if (!current || current.launching || (current.model.duel && !(current.red && current.blue))) return;
    current.launching = true;
    root.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try {
      current.actions.launch();
      close();
    } catch (error) {
      console.error('出战失败', error);
      current.launching = false;
      current.actions.failed?.();
      root.querySelectorAll('button').forEach(button => { button.disabled = false; });
      root.querySelector('.prep-feedback').textContent = '出战失败，请返回后重试。';
    }
  }
  function ready(team) {
    if (!current?.model.duel || current.launching) return;
    current[team] = !current[team];
    const button = root.querySelector(`[data-prep-action="${team}"]`);
    button.setAttribute('aria-pressed', String(current[team]));
    button.textContent = current[team] ? `${team === 'red' ? '红方' : '蓝方'}已准备 · 再次操作取消` : team === 'red' ? '红方准备 · Enter' : '蓝方点击准备';
    root.querySelector('.prep-feedback').textContent = current.red ? '等待蓝方准备' : current.blue ? '等待红方准备' : '等待双方准备 · 准备期间不计时、不增加点数';
    if (current.red && current.blue) launch();
  }

  // Registered before game listeners: briefing keys must not move units, spend
  // reinforcement points, or pass Enter through to the newly started match.
  addEventListener('keydown', event => {
    if (!current) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat) return;
      if (document.activeElement?.dataset.prepAction === 'back') cancel();
      else if (current.model.duel) ready('red');
      else launch();
    } else if (event.key === 'Tab') {
      const buttons = [...root.querySelectorAll('button:not(:disabled)')];
      let index = buttons.indexOf(document.activeElement);
      if (index < 0 && event.shiftKey) index = 0;
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    } else if (/^F\d+$/.test(event.key)) event.preventDefault();
  }, { capture: true });
  addEventListener('keyup', event => { if (current) event.stopImmediatePropagation(); }, { capture: true });
  global.GamePreparation = Object.freeze({ install, open, cancel, isOpen: () => !!current });
})(window);
