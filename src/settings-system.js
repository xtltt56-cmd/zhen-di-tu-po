(function (global) {
  'use strict';

  const DEFAULTS = {
    renderQuality: 'auto',
    particles: 0.85,
    screenShake: true,
    damageVignette: true,
    hitMarkers: true,
    audio: { master: 1, weapons: 1, effects: 0.9, engines: 0.82, ambience: 0.72 },
  };
  const saved = global.GameSaveSystem?.loadSection('settings', DEFAULTS) || {};
  const state = {
    ...DEFAULTS,
    ...saved,
    audio: { ...DEFAULTS.audio, ...(saved.audio || {}) },
  };

  function persist() {
    global.GameSaveSystem?.saveSection('settings', state);
    global.GameAudio?.setMixes(state.audio);
    document.documentElement.dataset.renderQuality = state.renderQuality;
  }

  function qualityMultiplier() {
    if (state.renderQuality === 'high') return 1;
    if (state.renderQuality === 'medium') return 0.78;
    if (state.renderQuality === 'low') return 0.55;
    return 1;
  }

  function close() {
    document.querySelector('#settings-screen')?.classList.add('hidden');
  }

  function slider(label, key, value) {
    return `<label class="game-setting-row"><span>${label}</span><input data-audio="${key}" type="range" min="0" max="100" value="${Math.round(value * 100)}"><output>${Math.round(value * 100)}%</output></label>`;
  }

  function install() {
    if (document.querySelector('#settings-screen')) return;
    const style = document.createElement('style');
    style.textContent = `
      #settings-screen{z-index:8;background:rgba(4,8,5,.86);backdrop-filter:blur(7px)}
      #settings-screen .panel{width:min(760px,94vw);text-align:left}
      .settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px}
      .settings-group{border:1px solid #6f7f5b66;background:#101810c9;padding:15px}
      .settings-group h3{margin:0 0 12px;color:#ddc474;letter-spacing:2px}
      .game-setting-row{display:grid;grid-template-columns:120px 1fr 46px;gap:10px;align-items:center;margin:11px 0;font-size:13px}
      .game-setting-row input[type=range]{accent-color:#d6a64d;width:100%}
      .game-setting-row select{background:#172217;color:#e8efdc;border:1px solid #718264;padding:7px}
      .game-setting-check{display:flex;align-items:center;gap:10px;margin:12px 0}
      .settings-actions{display:flex;gap:10px;margin-top:16px}.settings-actions .btn{margin:0}
      @media(max-width:700px){.settings-grid{grid-template-columns:1fr}.game-setting-row{grid-template-columns:105px 1fr 42px}}
    `;
    document.head.appendChild(style);

    const section = document.createElement('section');
    section.id = 'settings-screen';
    section.className = 'screen hidden';
    section.innerHTML = `<div class="panel">
      <h2 style="text-align:center;color:#dcc273">战场设置</h2>
      <div class="settings-grid">
        <div class="settings-group"><h3>画面与反馈</h3>
          <label class="game-setting-row"><span>渲染质量</span><select id="render-quality">
            <option value="auto">自动调节</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option>
          </select><output></output></label>
          <label class="game-setting-row"><span>粒子密度</span><input id="particle-density" type="range" min="25" max="100" value="${Math.round(state.particles * 100)}"><output>${Math.round(state.particles * 100)}%</output></label>
          <label class="game-setting-check"><input id="screen-shake" type="checkbox"> 轻微镜头震动</label>
          <label class="game-setting-check"><input id="damage-vignette" type="checkbox"> 受伤方向与暗角</label>
          <label class="game-setting-check"><input id="hit-markers" type="checkbox"> 命中标记与伤害数字</label>
        </div>
        <div class="settings-group"><h3>声音混音</h3>
          ${slider('总音量', 'master', state.audio.master)}
          ${slider('武器', 'weapons', state.audio.weapons)}
          ${slider('爆炸/命中', 'effects', state.audio.effects)}
          ${slider('载具引擎', 'engines', state.audio.engines)}
          ${slider('环境', 'ambience', state.audio.ambience)}
        </div>
      </div>
      <div class="settings-actions"><button class="btn" id="settings-audio-test">试听音效</button><button class="btn" id="settings-close">保存并返回</button></div>
      <p class="hint">设置会自动保存。自动画质会结合实时帧率降低粒子数量，不改变兵种和载具数值。</p>
    </div>`;
    document.body.appendChild(section);

    const menu = document.querySelector('#menu .panel');
    const help = document.querySelector('#help');
    if (menu && help) {
      const button = document.createElement('button');
      button.className = 'btn';
      button.id = 'settings';
      button.textContent = '画面 / 音效设置';
      button.addEventListener('click', () => section.classList.remove('hidden'));
      menu.insertBefore(button, help);
    }

    section.querySelector('#render-quality').value = state.renderQuality;
    section.querySelector('#screen-shake').checked = state.screenShake;
    section.querySelector('#damage-vignette').checked = state.damageVignette;
    section.querySelector('#hit-markers').checked = state.hitMarkers;

    section.addEventListener('input', event => {
      const target = event.target;
      if (target.dataset.audio) {
        state.audio[target.dataset.audio] = Number(target.value) / 100;
        target.nextElementSibling.value = `${target.value}%`;
      } else if (target.id === 'particle-density') {
        state.particles = Number(target.value) / 100;
        target.nextElementSibling.value = `${target.value}%`;
      } else if (target.id === 'render-quality') state.renderQuality = target.value;
      else if (target.id === 'screen-shake') state.screenShake = target.checked;
      else if (target.id === 'damage-vignette') state.damageVignette = target.checked;
      else if (target.id === 'hit-markers') state.hitMarkers = target.checked;
      persist();
    });
    section.querySelector('#settings-close').addEventListener('click', close);
    section.querySelector('#settings-audio-test').addEventListener('click', () => global.GameAudio?.test());
    addEventListener('keydown', event => {
      if (event.key === 'Escape' && !section.classList.contains('hidden')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    }, { capture: true });
    persist();
  }

  global.GameSettings = Object.freeze({
    get: key => state[key],
    state,
    qualityMultiplier,
    particleMultiplier: () => state.particles,
    persist,
    open: () => document.querySelector('#settings-screen')?.classList.remove('hidden'),
  });
  queueMicrotask(install);
})(window);
