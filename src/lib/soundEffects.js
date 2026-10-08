/**
 * Sistema de Efeitos Sonoros do Edutask
 * Utiliza a Web Audio API sintetizada nativamente (zero arquivos externos, zero latência, funciona offline).
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("edutask_sound_enabled") !== "false";
}

export function setSoundEnabled(enabled) {
  if (typeof window === "undefined") return;
  localStorage.setItem("edutask_sound_enabled", enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent("sound-setting-changed", { detail: { enabled } }));
}

export function toggleSound() {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  return next;
}

/**
 * Som comemorativo de tarefa concluída (Tríade maior ascendente com brilho)
 */
export function playTaskCompleteSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
      { freq: 659.25, time: 0.08, dur: 0.14 }, // E5
      { freq: 783.99, time: 0.16, dur: 0.16 }, // G5
      { freq: 1046.50, time: 0.24, dur: 0.35 }, // C6 (brilho final)
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
    masterGain.connect(ctx.destination);

    notes.forEach(({ freq, time, dur }) => {
      const start = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(1.0, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  } catch (e) {
    // Audio context may require prior user gesture
  }
}

/**
 * Som suave ao desmarcar uma tarefa (descer rápido)
 */
export function playTaskUncheckSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, start);
    osc.frequency.exponentialRampToValueAtTime(260, start + 0.12);

    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.13);
  } catch (e) {}
}

/**
 * Som temático One Piece — Fanfarra triunfante de pirata e tilintar de moedas de ouro
 */
export function playOnePieceSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const fanfare = [
      { freq: 392.00, time: 0.00, dur: 0.12, type: "sawtooth", vol: 0.15 }, // G4
      { freq: 523.25, time: 0.09, dur: 0.14, type: "sawtooth", vol: 0.18 }, // C5
      { freq: 659.25, time: 0.18, dur: 0.14, type: "triangle", vol: 0.20 }, // E5
      { freq: 783.99, time: 0.28, dur: 0.26, type: "triangle", vol: 0.22 }, // G5
      // Berries coin shine
      { freq: 1567.98, time: 0.38, dur: 0.22, type: "sine", vol: 0.18 }, // G6
      { freq: 2093.00, time: 0.44, dur: 0.35, type: "sine", vol: 0.20 }, // C7
    ];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.2, ctx.currentTime);
    master.connect(ctx.destination);

    fanfare.forEach(({ freq, time, dur, type, vol }) => {
      const start = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  } catch (e) {}
}

/**
 * Som temático Laboratório Químico — Borbulhar efervescente de reação e faísca sci-fi
 */
export function playChemistryLabSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Bubbles (frequency sweeps)
    const bubbles = [
      { startF: 220, endF: 480, time: 0.00, dur: 0.09 },
      { startF: 280, endF: 620, time: 0.07, dur: 0.09 },
      { startF: 350, endF: 780, time: 0.14, dur: 0.10 },
      { startF: 450, endF: 950, time: 0.21, dur: 0.12 },
    ];

    bubbles.forEach(({ startF, endF, time, dur }) => {
      const start = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(startF, start);
      osc.frequency.exponentialRampToValueAtTime(endF, start + dur);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + dur + 0.02);
    });

    // Final energetic chemical spark
    const sparkStart = ctx.currentTime + 0.28;
    const sparkOsc = ctx.createOscillator();
    const sparkGain = ctx.createGain();
    sparkOsc.type = "triangle";
    sparkOsc.frequency.setValueAtTime(1200, sparkStart);
    sparkOsc.frequency.exponentialRampToValueAtTime(2400, sparkStart + 0.15);
    sparkGain.gain.setValueAtTime(0.15, sparkStart);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, sparkStart + 0.18);
    sparkOsc.connect(sparkGain);
    sparkGain.connect(ctx.destination);
    sparkOsc.start(sparkStart);
    sparkOsc.stop(sparkStart + 0.2);
  } catch (e) {}
}

/**
 * Som temático Japão Tradicional — Acordes de Koto e sino de vento Furin zen
 */
export function playJapanSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Japanese Insen pentatonic scale plucked notes
    const kotoNotes = [
      { freq: 293.66, time: 0.00, dur: 0.40 }, // D4
      { freq: 311.13, time: 0.10, dur: 0.40 }, // Eb4
      { freq: 392.00, time: 0.20, dur: 0.45 }, // G4
      { freq: 440.00, time: 0.30, dur: 0.50 }, // A4
      { freq: 587.33, time: 0.42, dur: 0.65 }, // D5 (zen resonance)
      // Furin wind chime sparkle
      { freq: 1760.00, time: 0.50, dur: 0.45 }, // A6
    ];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.2, ctx.currentTime);
    master.connect(ctx.destination);

    kotoNotes.forEach(({ freq, time, dur }) => {
      const start = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.8, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  } catch (e) {}
}

/**
 * Som temático Minecraft — Ding de coletar orbe de experiência / Level Up
 */
export function playMinecraftSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Fast iconic XP pickup double-ding (pitch shift up)
    const tones = [
      { freq: 1046.50, time: 0.00, dur: 0.12 }, // C6
      { freq: 1396.91, time: 0.08, dur: 0.25 }, // F6
      { freq: 1760.00, time: 0.15, dur: 0.38 }, // A6 level up bell ring
    ];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.24, ctx.currentTime);
    master.connect(ctx.destination);

    tones.forEach(({ freq, time, dur }) => {
      const start = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(1.0, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + dur + 0.03);
    });
  } catch (e) {}
}

/**
 * Som mágico ao equipar ou comprar uma moldura / tema
 */
export function playEquipThemeSound(effectId = null) {
  if (!isSoundEnabled()) return;
  if (effectId === "one_piece") return playOnePieceSound();
  if (effectId === "chemistry_lab") return playChemistryLabSound();
  if (effectId === "japan" || effectId === "sakura") return playJapanSound();
  if (effectId === "minecraft") return playMinecraftSound();

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const chords = [
      { freq: 440.00, time: 0.00 }, // A4
      { freq: 554.37, time: 0.06 }, // C#5
      { freq: 659.25, time: 0.12 }, // E5
      { freq: 880.00, time: 0.18 }, // A5
      { freq: 1108.73, time: 0.25 }, // C#6
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.2, ctx.currentTime);
    masterGain.connect(ctx.destination);

    chords.forEach(({ freq, time }) => {
      const start = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.01, start);
      gain.gain.exponentialRampToValueAtTime(1, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch (e) {}
}

/**
 * Fanfarra régia de vencedor do prêmio / destaque
 */
export function playWinnerFanfareSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const fanfare = [
      { freq: 523.25, time: 0.00, dur: 0.14 }, // C5
      { freq: 523.25, time: 0.14, dur: 0.14 }, // C5
      { freq: 523.25, time: 0.28, dur: 0.14 }, // C5
      { freq: 659.25, time: 0.42, dur: 0.22 }, // E5
      { freq: 783.99, time: 0.65, dur: 0.22 }, // G5
      { freq: 1046.50, time: 0.88, dur: 0.55 }, // C6
    ];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.22, ctx.currentTime);
    master.connect(ctx.destination);

    fanfare.forEach(({ freq, time, dur }) => {
      const start = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.01, start);
      gain.gain.linearRampToValueAtTime(1.0, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  } catch (e) {}
}
