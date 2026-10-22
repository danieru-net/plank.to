// Generates assets/sounds/complete.wav: a soft, short chime (two sine tones, about 0.4 s,
// quiet peak, 10 ms fade-in and a smooth fade-out). Run: node scripts/make-completion-sound.mjs
import { writeFileSync } from 'node:fs';

const rate = 22050;
const seconds = 0.4;
const count = Math.round(rate * seconds);
const peak = 0.25;
const samples = new Int16Array(count);
for (let i = 0; i < count; i++) {
  const t = i / rate;
  const attack = Math.min(1, t / 0.01);
  const decay = Math.pow(1 - t / seconds, 2);
  const tone = Math.sin(2 * Math.PI * 659.25 * t) * 0.6 + Math.sin(2 * Math.PI * 987.77 * t) * 0.4;
  samples[i] = Math.round(tone * attack * decay * peak * 32767);
}

const data = Buffer.from(samples.buffer);
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
writeFileSync(
  new URL('../assets/sounds/complete.wav', import.meta.url),
  Buffer.concat([header, data]),
);
