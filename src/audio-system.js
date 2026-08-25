(function (global) {
  'use strict';

  const config = global.PositionBreakoutConfig?.audio || {};
  const AudioContextClass = global.AudioContext || global.webkitAudioContext;
  let context = null;
  let master = null;
  let compressor = null;
  let noiseBuffer = null;
  let engine = null;
  let ambient = null;
  let muted = localStorage.getItem('position_breakout_muted') === '1';
  let mode = 'menu';
  let lastZombieVoice = 0;
  let lastError = '';
  let scheduledEvents = 0;
  let lastEvent = 'none';
  let lastEventAt = 0;
  let activeChannel = 'effects';
  const mix = {
    master: Number(localStorage.getItem('position_breakout_audio_master') ?? 1),
    weapons: Number(localStorage.getItem('position_breakout_audio_weapons') ?? 1),
    effects: Number(localStorage.getItem('position_breakout_audio_effects') ?? 1),
    engines: Number(localStorage.getItem('position_breakout_audio_engines') ?? 0.82),
    ambience: Number(localStorage.getItem('position_breakout_audio_ambience') ?? 0.72),
    ui: Number(localStorage.getItem('position_breakout_audio_ui') ?? 0.9),
  };
  const cooldowns = new Map();

  for (const key of Object.keys(mix)) {
    if (!Number.isFinite(mix[key])) mix[key] = 1;
    mix[key] = Math.max(0, Math.min(1, mix[key]));
  }

  function channelVolume(name = activeChannel) {
    return mix[name] ?? 1;
  }

  function withChannel(name, callback) {
    const previous = activeChannel;
    activeChannel = name;
    try {
      return callback();
    } finally {
      activeChannel = previous;
    }
  }

  function ensure() {
    if (!AudioContextClass) return false;
    if (context) return true;
    try {
      context = new AudioContextClass();
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.28;
      master = context.createGain();
      master.gain.value = muted ? 0 : (config.defaultVolume || 0.68) * mix.master;
      master.connect(compressor);
      compressor.connect(context.destination);
      noiseBuffer = createNoiseBuffer(2);
      createAmbient();
      createEngine();
      context.addEventListener?.('statechange', updateButton);
      lastError = '';
      updateButton();
      return true;
    } catch (error) {
      lastError = error?.message || String(error);
      context = null;
      master = null;
      updateButton();
      return false;
    }
  }

  function recordEvent(name) {
    scheduledEvents++;
    lastEvent = name;
    lastEventAt = performance.now();
  }

  function createNoiseBuffer(seconds) {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.88 + white * 0.12;
      data[i] = white * 0.55 + last * 0.45;
    }
    return buffer;
  }

  function outputNode(pan = 0) {
    if (!context.createStereoPanner) return master;
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    panner.connect(master);
    return panner;
  }

  function spatial(position, listener) {
    if (!position || !listener) return { gain: 1, pan: 0 };
    const dx = position.x - listener.x;
    const dy = position.y - listener.y;
    const distance = Math.hypot(dx, dy);
    return {
      gain: Math.max(0.12, 1 / (1 + distance / 620)),
      pan: Math.max(-0.9, Math.min(0.9, dx / 700)),
    };
  }

  function noise(duration, volume, lowpass, pan = 0, delay = 0) {
    if (!ensure()) return;
    const now = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpass, now);
    const gain = context.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, volume * channelVolume()), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(outputNode(pan));
    source.start(now);
    source.stop(now + duration + 0.03);
  }

  function tone(startFrequency, endFrequency, duration, volume, type = 'sine', pan = 0, delay = 0) {
    if (!ensure()) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, startFrequency), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume * channelVolume()), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(outputNode(pan));
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function throttle(key, milliseconds) {
    const now = performance.now();
    if (now - (cooldowns.get(key) || 0) < milliseconds) return false;
    cooldowns.set(key, now);
    return true;
  }

  function weaponKind(owner, projectile) {
    if (owner?.main || projectile?.shellKind || owner?.type === 'trenchAt') return 'cannon';
    if (owner?.type === 'engineer' || owner?.weapon === 4 || owner?.weapon === 5 || projectile?.missile) return 'rocket';
    if (owner?.type === 'bmpt' || owner?.type === 'apc' || owner?.gun) return 'autocannon';
    if (owner?.type === 'sniper' || owner?.fortress || owner?.weapon === 3) return 'sniper';
    if (owner?.type === 'mg' || owner?.type === 'fortressMg' || owner?.weapon === 2) return 'mg';
    if (owner?.weapon === 1) return 'shotgun';
    return 'rifle';
  }

  function playWeapon(owner, projectile, listener) {
    if (!ensure()) return;
    const kind = weaponKind(owner, projectile);
    const limits = { rifle: 55, shotgun: 90, mg: 42, sniper: 150, autocannon: 48, rocket: 150, cannon: 180 };
    if (!throttle(`weapon:${kind}`, limits[kind])) return;
    recordEvent(`weapon:${kind}`);
    const s = spatial(owner, listener);
    const volume = s.gain;
    withChannel('weapons', () => {
    if (kind === 'cannon') {
      noise(0.38, 0.72 * volume, 1150, s.pan);
      tone(92, 32, 0.42, 0.48 * volume, 'sine', s.pan);
      noise(0.16, 0.24 * volume, 3600, s.pan, 0.035);
    } else if (kind === 'rocket') {
      noise(0.22, 0.3 * volume, 2400, s.pan);
      tone(220, 58, 0.28, 0.19 * volume, 'sawtooth', s.pan);
    } else if (kind === 'autocannon') {
      noise(0.12, 0.31 * volume, 2500, s.pan);
      tone(150, 68, 0.1, 0.16 * volume, 'square', s.pan);
    } else if (kind === 'sniper') {
      noise(0.2, 0.38 * volume, 3300, s.pan);
      tone(210, 70, 0.18, 0.22 * volume, 'triangle', s.pan);
    } else if (kind === 'shotgun') {
      noise(0.22, 0.34 * volume, 2100, s.pan);
      tone(130, 58, 0.18, 0.14 * volume, 'triangle', s.pan);
    } else {
      noise(kind === 'mg' ? 0.08 : 0.11, (kind === 'mg' ? 0.18 : 0.23) * volume, kind === 'mg' ? 3100 : 3900, s.pan);
      tone(kind === 'mg' ? 170 : 205, 82, 0.075, 0.1 * volume, 'square', s.pan);
    }
    });
  }

  function playExplosion(effect, listener) {
    if (!ensure() || !throttle('explosion', 45)) return;
    recordEvent('explosion');
    const s = spatial(effect, listener);
    const scale = Math.max(0.45, Math.min(1.5, (effect?.r || 80) / 95));
    withChannel('effects', () => {
      noise(0.5 * scale, 0.62 * s.gain, 850 / scale, s.pan);
      tone(72, 24, 0.55 * scale, 0.4 * s.gain, 'sine', s.pan);
      noise(0.16, 0.2 * s.gain, 3800, s.pan, 0.025);
    });
  }

  function playImpact(position, listener, penetrated = false) {
    if (!ensure() || !throttle(`impact:${penetrated ? 1 : 0}`, 36)) return;
    recordEvent(penetrated ? 'impact:penetrated' : 'impact');
    const s = spatial(position, listener);
    withChannel('effects', () => {
      tone(penetrated ? 760 : 1180, penetrated ? 190 : 420, 0.1, 0.12 * s.gain, 'triangle', s.pan);
      noise(0.08, 0.12 * s.gain, penetrated ? 2100 : 4700, s.pan);
    });
  }

  function playHit(position, listener, zombie = false) {
    if (!ensure() || !throttle(`hit:${zombie ? 'zombie' : 'human'}`, 52)) return;
    recordEvent(zombie ? 'hit:zombie' : 'hit:human');
    const s = spatial(position, listener);
    withChannel('effects', () => {
      noise(zombie ? 0.13 : 0.085, (zombie ? 0.11 : 0.075) * s.gain, zombie ? 720 : 1450, s.pan);
      tone(zombie ? 96 : 180, zombie ? 48 : 92, zombie ? 0.16 : 0.085, 0.045 * s.gain, 'triangle', s.pan);
    });
  }

  function playUi(kind = 'confirm') {
    if (!ensure() || !throttle(`ui:${kind}`, 50)) return;
    recordEvent(`ui:${kind}`);
    withChannel('ui', () => {
    if (kind === 'pickup') {
      tone(420, 650, 0.12, 0.09, 'sine');
      tone(620, 880, 0.13, 0.07, 'sine', 0, 0.08);
    } else if (kind === 'reload') {
      noise(0.045, 0.07, 5200);
      tone(310, 250, 0.06, 0.04, 'square', 0, 0.1);
    } else if (kind === 'warning') {
      tone(180, 145, 0.2, 0.1, 'square');
    } else {
      tone(540, 680, 0.08, 0.055, 'sine');
    }
    });
  }

  function createAmbient() {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 260;
    filter.Q.value = 0.5;
    gain.gain.value = config.ambientVolume || 0.1;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    ambient = { source, filter, gain };
  }

  function createEngine() {
    const oscillator = context.createOscillator();
    const harmonic = context.createOscillator();
    const gain = context.createGain();
    const trackSource = context.createBufferSource();
    const trackFilter = context.createBiquadFilter();
    const trackGain = context.createGain();
    oscillator.type = 'sawtooth';
    harmonic.type = 'square';
    oscillator.frequency.value = 48;
    harmonic.frequency.value = 96;
    gain.gain.value = 0;
    trackSource.buffer = noiseBuffer;
    trackSource.loop = true;
    trackFilter.type = 'bandpass';
    trackFilter.frequency.value = 920;
    trackFilter.Q.value = 1.2;
    trackGain.gain.value = 0;
    oscillator.connect(gain);
    harmonic.connect(gain);
    gain.connect(master);
    trackSource.connect(trackFilter);
    trackFilter.connect(trackGain);
    trackGain.connect(master);
    oscillator.start();
    harmonic.start();
    trackSource.start();
    engine = { oscillator, harmonic, gain, trackGain };
  }

  function updateEngine(vehicle) {
    if (!ensure() || !engine) return;
    const now = context.currentTime;
    const active = vehicle && !vehicle.dead;
    const moving = active && vehicle.stationary < 0.16;
    const heavy = active && ['hstv', 'm1', 't90m', 'bmpt'].includes(vehicle.type);
    const frequency = active ? (heavy ? 46 : 62) * (moving ? 1.55 : 1) : 38;
    engine.oscillator.frequency.setTargetAtTime(frequency, now, 0.08);
    engine.harmonic.frequency.setTargetAtTime(frequency * 2.03, now, 0.08);
    engine.gain.gain.setTargetAtTime(active ? (config.engineVolume || 0.22) * mix.engines * (moving ? 1 : 0.55) : 0, now, 0.12);
    engine.trackGain.gain.setTargetAtTime((moving && heavy ? 0.085 : moving ? 0.035 : 0) * mix.engines, now, 0.08);
  }

  function updateWorld(options = {}) {
    if (!ensure()) return;
    const now = context.currentTime;
    if (ambient) {
      ambient.filter.frequency.setTargetAtTime(options.zombieMode ? 150 : options.frontlineMode ? 330 : 250, now, 0.6);
      ambient.gain.gain.setTargetAtTime((config.ambientVolume || 0.1) * mix.ambience * (mode === 'menu' ? 0.35 : 1), now, 0.5);
    }
    if (options.zombieMode && options.enemyCount > 0 && now - lastZombieVoice > Math.max(1.8, 4.8 - options.enemyCount / 55)) {
      lastZombieVoice = now;
      withChannel('ambience', () => {
        tone(78 + Math.random() * 22, 35, 0.5, 0.07, 'sawtooth', Math.random() * 1.4 - 0.7);
        noise(0.32, 0.045, 620, Math.random() * 1.4 - 0.7);
      });
    }
  }

  function setMode(value) {
    mode = value || 'menu';
  }

  async function unlock() {
    if (!ensure()) return false;
    try {
      if (context.state !== 'running') await context.resume();
      lastError = '';
      updateButton();
      return context.state === 'running';
    } catch (error) {
      lastError = error?.message || String(error);
      updateButton();
      return false;
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    localStorage.setItem('position_breakout_muted', muted ? '1' : '0');
    if (master) master.gain.setTargetAtTime(muted ? 0 : (config.defaultVolume || 0.68) * mix.master, context.currentTime, 0.04);
    updateButton();
    return muted;
  }

  function toggleMute() {
    ensure();
    return setMuted(!muted);
  }

  function setMix(name, value) {
    if (!(name in mix)) return false;
    const normalized = Math.max(0, Math.min(1, Number(value)));
    if (!Number.isFinite(normalized)) return false;
    mix[name] = normalized;
    localStorage.setItem(`position_breakout_audio_${name}`, String(normalized));
    if (name === 'master' && master && context) {
      master.gain.setTargetAtTime(muted ? 0 : (config.defaultVolume || 0.68) * mix.master, context.currentTime, 0.04);
    }
    return true;
  }

  function setMixes(values = {}) {
    for (const [name, value] of Object.entries(values)) setMix(name, value);
    return { ...mix };
  }

  function playTestSequence() {
    if (!ensure() || muted || context.state !== 'running') return false;
    recordEvent('test');
    tone(360, 520, 0.12, 0.12, 'sine', -0.18);
    tone(540, 760, 0.14, 0.1, 'sine', 0.18, 0.1);
    noise(0.08, 0.055, 4200, 0, 0.2);
    return true;
  }

  async function activateOrToggle(forceActivation = false) {
    const needsActivation = forceActivation || !context || context.state !== 'running';
    if (needsActivation && !muted) {
      const ready = await unlock();
      if (ready) playTestSequence();
      return muted;
    }
    if (muted) {
      setMuted(false);
      const ready = await unlock();
      if (ready) playTestSequence();
      return false;
    }
    playUi('confirm');
    setMuted(true);
    return true;
  }

  function updateButton() {
    const button = document.querySelector('#audio-toggle');
    if (!button) return;
    let state = '点击启用';
    if (!AudioContextClass) state = '浏览器不支持';
    else if (muted) state = '关闭';
    else if (context?.state === 'running') state = '开启';
    else if (context) state = '待恢复';
    button.textContent = `战场音效：${state} · M`;
    button.title = lastError ? `音频初始化失败：${lastError}` : muted ? '点击开启并试听' : context?.state === 'running' ? '点击关闭音效' : '点击激活并试听';
    button.dataset.audioState = context?.state || 'not-created';
  }

  function installUi() {
    if (document.querySelector('#audio-toggle')) return;
    const menu = document.querySelector('#menu .panel');
    const help = document.querySelector('#help');
    if (!menu || !help) return;
    const button = document.createElement('button');
    button.className = 'btn';
    button.id = 'audio-toggle';
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const forceActivation = button.dataset.activateOnly === '1';
      delete button.dataset.activateOnly;
      await activateOrToggle(forceActivation);
    });
    menu.insertBefore(button, help);
    updateButton();
  }

  addEventListener('pointerdown', event => {
    const activationIntent = !context || context.state !== 'running';
    const audioButton = event.target.closest?.('#audio-toggle');
    if (audioButton) audioButton.dataset.activateOnly = activationIntent ? '1' : '0';
    void unlock();
  }, { capture: true });
  addEventListener('touchstart', () => { void unlock(); }, { capture: true, passive: true });
  addEventListener('keydown', event => {
    const activationIntent = !context || context.state !== 'running';
    void unlock();
    if (event.key.toLowerCase() === 'm' && !event.repeat) {
      event.preventDefault();
      void activateOrToggle(activationIntent);
    }
  }, { capture: true });
  document.addEventListener('visibilitychange', updateButton);
  document.addEventListener('click', event => {
    if (event.target.closest?.('.btn') && event.target.id !== 'audio-toggle') playUi('confirm');
  });

  global.GameAudio = Object.freeze({
    unlock,
    installUi,
    setMode,
    playWeapon,
    playExplosion,
    playImpact,
    playHit,
    playUi,
    updateEngine,
    updateWorld,
    toggleMute,
    activateOrToggle,
    setMix,
    setMixes,
    getMix: () => ({ ...mix }),
    test: async () => {
      const ready = await unlock();
      return ready && playTestSequence();
    },
    isMuted: () => muted,
    isAvailable: () => Boolean(AudioContextClass),
    status: () => ({
      available: Boolean(AudioContextClass),
      contextState: context?.state || 'not-created',
      muted,
      mix: { ...mix },
      masterGain: master?.gain?.value ?? 0,
      scheduledEvents,
      lastEvent,
      lastEventAt,
      lastError,
    }),
  });

  queueMicrotask(installUi);
})(window);
