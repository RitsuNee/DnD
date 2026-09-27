/**
 * Sound utility — generates Web Audio API tones for dice & slot machine.
 * No external audio files needed.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Short click/tick sound for slot spinning */
export function playTick() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

/** Dice roll rattle — rapid series of ticks */
export function playDiceRoll(durationMs: number) {
  const count = Math.max(6, Math.floor(durationMs / 60));
  for (let i = 0; i < count; i++) {
    setTimeout(() => playTick(), i * (durationMs / count));
  }
}

/** Triumphant reveal sound */
export function playReveal() {
  const ctx = getCtx();
  const notes = [523, 659, 784]; // C5 E5 G5 chord
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4 + i * 0.06);
    osc.start(ctx.currentTime + i * 0.06);
    osc.stop(ctx.currentTime + 0.5 + i * 0.06);
  });
}

/** Column stop — a single satisfying "clunk" */
export function playSlotStop() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}
