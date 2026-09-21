(function (global) {
  'use strict';

  // The home screen delegates to the existing buttons; it never creates a second
  // game loop, writes progress, or duplicates mode initialization.
  const modes = [
    { id: 'campaign', name: '战役行动', icon: 'tank', target: 'start', action: '开始行动',
      description: '亲自进入战场，驾驶载具完成九关突围任务。',
      details: '9 个关卡 / 单人作战 / 自动存档', controls: 'WASD 移动 · 鼠标射击 · F 互动' },
    { id: 'frontline', name: '战线指挥', icon: 'squad', target: 'frontline', action: '选择战役',
      description: '集结步兵与装甲部队，争夺战壕，突破敌军总部。',
      details: '7 场战役 / 战壕指挥 / 逐关解锁', controls: '鼠标部署 · 战壕箭头指挥推进与后撤' },
    { id: 'duel', name: '本地双人', icon: 'duel', target: 'frontline-duel', action: '开始对抗',
      description: '同一台电脑，红蓝双方以相同的经济与兵种争夺战线。',
      details: '同机双人 / 红蓝对抗 / 对称经济', controls: '红方键盘 · 蓝方鼠标' },
    { id: 'zombie', name: '丧尸围城', icon: 'bio', target: 'zombie', action: '进入围城',
      description: '守住兵工厂，集结援军、修筑防线，迎击不断升级的尸潮。',
      details: '无限挑战 / 血月尸潮 / 城区防守', controls: 'WASD 移动 · 鼠标射击 · 功能键选择援军' },
    { id: 'training', name: '训练场', icon: 'target', target: 'training', action: '进入训练场',
      description: '熟悉武器与各种载具，在不会还击的标靶间自由练习。',
      details: '自由训练 / 载具试驾 / 固定标靶', controls: 'F 上下车 · O 重置标靶 · P 补给' },
  ];
  const icons = {
    tank: '<path d="M3 14h16l2 3-2 3H5l-3-3zM8 14V9h7l3 5M14 9V7h9"/><circle cx="6" cy="17" r="1"/><circle cx="11" cy="17" r="1"/><circle cx="16" cy="17" r="1"/>',
    squad: '<circle cx="12" cy="6" r="3"/><circle cx="4" cy="10" r="2"/><circle cx="20" cy="10" r="2"/><path d="M7 21v-7a5 5 0 0 1 10 0v7M1 21v-5a3 3 0 0 1 4-3M23 21v-5a3 3 0 0 0-4-3M10 16v5m4-5v5"/>',
    duel: '<circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M2 21v-5a5 5 0 0 1 10 0v5M12 21v-5a5 5 0 0 1 10 0v5"/>',
    bio: '<circle cx="12" cy="12" r="2"/><path d="M8 3a5 5 0 0 0 8 0M4 10a5 5 0 0 0 4 9M20 10a5 5 0 0 1-4 9M8 3c-4 1-5 6-1 9m9-9c4 1 5 6 1 9M4 10c-4 3-2 9 3 10m13-10c4 3 2 9-3 10M8 19c1 4 7 4 8 0"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
  };
  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  }
  let installed = false;
  function install(state) {
    function initialize() {
      try { mount(state); }
      catch (error) {
        console.error('首页初始化失败', error);
        global.GameHomeBoot?.fail('首页初始化失败，请重新加载；若仍失败，请检查游戏文件是否完整。');
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else initialize();
  }
  function mount(state) {
    if (installed) return;
    const menu = document.querySelector('#menu');
    const legacy = menu?.querySelector('.panel');
    const required = ['start', 'continue-campaign', 'level-select', 'frontline', 'frontline-duel', 'zombie', 'training', 'help', 'settings', 'audio-toggle'];
    // Do not reveal a partial menu or fall back to the old visual surface.
    if (!legacy || required.some(id => !document.getElementById(id))) throw new Error('缺少游戏模式入口');
    if (getComputedStyle(menu).getPropertyValue('--home-style-ready').trim() !== '1') throw new Error('首页样式未加载');
    const home = document.createElement('div');
    home.className = 'command-home';
    home.innerHTML = `
      <div class="home-backdrop" aria-hidden="true"></div>
      <div class="home-atmosphere" aria-hidden="true"></div>
      <header class="home-brand"><h1>阵地突围</h1><p>联合兵种作战</p></header>
      <nav class="home-modes" aria-label="选择游戏模式">
        ${modes.map(mode => `<button type="button" class="home-mode" data-mode="${mode.id}" aria-pressed="false">${icon(mode.icon)}<span>${mode.name}</span></button>`).join('')}
      </nav>
      <div class="home-tools" aria-label="游戏工具"></div>
      <main class="home-brief" aria-labelledby="home-title">
        <h2 id="home-title"></h2><p class="home-description"></p>
        <p class="home-details"></p><p class="home-progress"></p>
        <div class="home-actions"><button type="button" id="home-launch" class="home-action primary"></button><button type="button" id="home-levels" class="home-action">选择关卡</button></div>
      </main>
      <footer class="home-footer"><span class="home-save">本机自动存档</span><span class="home-controls"></span></footer>`;
    menu.appendChild(home);
    for (const id of ['audio-toggle', 'settings', 'help']) home.querySelector('.home-tools').appendChild(document.getElementById(id));
    document.getElementById('settings').textContent = '设置';
    legacy.hidden = true;
    legacy.setAttribute('aria-hidden', 'true');
    let selected = modes[0];
    try { selected = modes.find(mode => mode.id === sessionStorage.getItem('breakout-home-mode')) || selected; } catch { /* Storage can be disabled in offline browsers. */ }
    const launch = home.querySelector('#home-launch');
    const levels = home.querySelector('#home-levels');

    function campaignProgress() {
      const save = state.campaign();
      return { ...save, hasProgress: save.maxUnlocked > 0 || save.completed >= 0 };
    }
    function render() {
      home.dataset.mode = selected.id;
      home.querySelector('#home-title').textContent = selected.name;
      home.querySelector('.home-description').textContent = selected.description;
      home.querySelector('.home-details').textContent = selected.details;
      home.querySelector('.home-controls').textContent = selected.controls;
      let progress = '';
      launch.textContent = selected.action;
      if (selected.id === 'campaign') {
        const save = campaignProgress();
        if (save.hasProgress) {
          launch.textContent = `继续行动 · 第 ${save.maxUnlocked + 1} 关`;
          progress = `已完成 ${save.completed + 1} / ${save.total} 关 · 已保留护甲成长`;
        }
      } else if (selected.id === 'frontline') {
        const save = state.frontline();
        progress = `已解锁 ${save.maxUnlocked + 1} / ${save.total} 场战役`;
      }
      const progressNode = home.querySelector('.home-progress');
      progressNode.textContent = progress;
      progressNode.hidden = !progress;
      levels.hidden = selected.id !== 'campaign';
      for (const button of home.querySelectorAll('.home-mode')) button.setAttribute('aria-pressed', String(button.dataset.mode === selected.id));
      const status = global.GameSaveSystem?.status();
      home.querySelector('.home-save').textContent = status?.lastRecovery || '本机自动存档';
      home.querySelector('.home-save').title = '战役通关后保存解锁进度；存档属于当前浏览器，不包含战斗中途状态。';
    }
    home.querySelector('.home-modes').addEventListener('click', event => {
      const button = event.target.closest('[data-mode]');
      if (!button) return;
      selected = modes.find(mode => mode.id === button.dataset.mode);
      try { sessionStorage.setItem('breakout-home-mode', selected.id); } catch { /* Selection still works without storage. */ }
      render();
    });
    home.querySelector('.home-modes').addEventListener('keydown', event => {
      const keys = ['ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const buttons = [...home.querySelectorAll('.home-mode')];
      const index = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
      buttons[next].click();
    });
    launch.addEventListener('click', () => {
      const target = selected.id === 'campaign' && campaignProgress().hasProgress ? 'continue-campaign' : selected.target;
      document.getElementById(target).click();
    });
    levels.addEventListener('click', () => document.getElementById('level-select').click());
    new MutationObserver(() => {
      if (!menu.classList.contains('hidden')) render();
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
    render();
    installed = true;
    global.GameHomeBoot.complete();
  }
  global.GameHomeScreen = Object.freeze({ install });
})(window);
