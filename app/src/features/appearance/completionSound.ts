import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// A soft 0.4 s chime made by scripts/make-completion-sound.mjs.
const source = require('../../assets/sounds/complete.wav');

let player: AudioPlayer | undefined;

/**
 * Plays the completion sound. The player is created on first use, so nothing loads unless the
 * user chose a sound. The audio mode is set explicitly so the sound follows the device silent
 * switch on iOS and mixes with other audio, so it never interrupts music.
 */
export function playCompletionSound(): void {
  try {
    if (!player) {
      void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
      player = createAudioPlayer(source);
    }
    void player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn(e);
  }
}
