export type SoundCue =
  | "select"
  | "draw"
  | "cardDraw"
  | "discard"
  | "cardDiscard"
  | "turn"
  | "caramba"
  | "result"
  | "eliminate"
  | "victory"
  | "winner"
  | "notification";

export function canPlayAudio(enabled: boolean, unlocked: boolean): boolean {
  return enabled && unlocked;
}

type Tone = { frequency: number; duration: number; type?: OscillatorType; delay: number };

const CUES: Record<SoundCue, Tone[]> = {
  select: [{ frequency: 640, duration: 0.06, type: "triangle", delay: 0 }],
  draw: [{ frequency: 420, duration: 0.1, type: "sine", delay: 0 }],
  cardDraw: [{ frequency: 420, duration: 0.1, type: "sine", delay: 0 }],
  discard: [{ frequency: 280, duration: 0.12, type: "sawtooth", delay: 0 }],
  cardDiscard: [{ frequency: 280, duration: 0.12, type: "sawtooth", delay: 0 }],
  turn: [{ frequency: 520, duration: 0.16, type: "square", delay: 0 }],
  caramba: [
    { frequency: 196, duration: 0.22, type: "sawtooth", delay: 0 },
    { frequency: 392, duration: 0.14, type: "triangle", delay: 0.08 },
    { frequency: 523, duration: 0.16, type: "triangle", delay: 0.18 },
    { frequency: 659, duration: 0.18, type: "triangle", delay: 0.3 },
    { frequency: 784, duration: 0.32, type: "triangle", delay: 0.42 },
  ],
  result: [{ frequency: 480, duration: 0.2, type: "sine", delay: 0 }],
  eliminate: [{ frequency: 180, duration: 0.25, type: "sawtooth", delay: 0 }],
  victory: [
    { frequency: 523, duration: 0.15, delay: 0 },
    { frequency: 659, duration: 0.15, delay: 0.12 },
    { frequency: 784, duration: 0.25, delay: 0.24 },
  ],
  winner: [
    { frequency: 523, duration: 0.15, delay: 0 },
    { frequency: 659, duration: 0.15, delay: 0.12 },
    { frequency: 784, duration: 0.25, delay: 0.24 },
  ],
  notification: [
    { frequency: 740, duration: 0.07, type: "sine", delay: 0 },
    { frequency: 880, duration: 0.09, type: "sine", delay: 0.09 },
  ],
};

let context: AudioContext | null = null;
let unlocked = false;

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function unlockAudio(): void {
  unlocked = true;
  if (!context) {
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) {
      return;
    }
    context = new AudioCtx();
  }
  void context.resume();
}

export function playCue(kind: SoundCue, enabled: boolean): boolean {
  if (!canPlayAudio(enabled, unlocked) || !context || context.state === "suspended") {
    return false;
  }
  const now = context.currentTime;
  for (const tone of CUES[kind]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.type ?? "sine";
    oscillator.frequency.value = tone.frequency;
    gain.gain.value = 0.045;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const start = now + tone.delay;
    oscillator.start(start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
    oscillator.stop(start + tone.duration);
  }
  return true;
}
