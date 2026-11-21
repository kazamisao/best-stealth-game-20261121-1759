// Sound, synthesised with WebAudio: no audio files. Footsteps are soft ticks
// that quicken when running, applause is a burst of filtered noise, the alarm
// is a two-note sting, and the win is a short chime. Nothing is created until
// the first user gesture, and M mutes everything.
export function createAudio() {
  let context = null;
  let muted = false;
  let stepTimer = 0;

  function ensure() {
    if (context === null) {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context !== null && context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(freq, duration, type, gainValue, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime + when);
    oscillator.stop(ctx.currentTime + when + duration);
  }

  function noiseBurst(duration, gainValue) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    step(running, moving) {
      if (!moving) return;
      const now = performance.now() / 1000;
      const interval = running ? 0.22 : 0.38;
      if (now - stepTimer < interval) return;
      stepTimer = now;
      tone(running ? 140 : 110, 0.05, 'sine', running ? 0.08 : 0.04);
    },
    applause() {
      noiseBurst(1.6, 0.25);
      noiseBurst(1.2, 0.15);
    },
    evidence() {
      tone(660, 0.12, 'triangle', 0.12);
      tone(990, 0.18, 'triangle', 0.12, 0.1);
    },
    alarm() {
      tone(220, 0.25, 'sawtooth', 0.14);
      tone(185, 0.35, 'sawtooth', 0.14, 0.22);
    },
    levelWon() {
      tone(523, 0.15, 'triangle', 0.12);
      tone(659, 0.15, 'triangle', 0.12, 0.12);
      tone(784, 0.3, 'triangle', 0.12, 0.24);
    },
  };
}
