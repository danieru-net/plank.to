import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { readAloudPhrases } from './readAloud';

type Props = {
  task: { title: string; notes: string | null };
};

/** Reads a task's title and notes aloud. Pressing it again, or leaving the screen, stops it. */
export function ReadAloudButton({ task }: Props) {
  const [speaking, setSpeakingState] = useState(false);
  // Mirrors `speaking` so the unmount cleanup only stops speech this button started.
  const speakingRef = useRef(false);
  const setSpeaking = (value: boolean) => {
    speakingRef.current = value;
    setSpeakingState(value);
  };
  useEffect(
    () => () => {
      if (speakingRef.current) void Speech.stop();
    },
    [],
  );

  const toggle = () => {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    const phrases = readAloudPhrases(task);
    if (phrases.length === 0) return;
    // Stop any other task being read so this one starts now instead of queueing behind it.
    void Speech.stop();
    setSpeaking(true);
    // Speech queues each phrase; only the last one ends the "speaking" state.
    phrases.forEach((text, i) => {
      const last = i === phrases.length - 1;
      Speech.speak(text, {
        onDone: last ? () => setSpeaking(false) : undefined,
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    });
  };

  return (
    <Button
      label={speaking ? 'Stop reading' : 'Read aloud'}
      icon={speaking ? 'stop-circle-outline' : 'volume-high-outline'}
      variant="secondary"
      accessibilityLabel={speaking ? `Stop reading ${task.title}` : `Read ${task.title} aloud`}
      inline
      onPress={toggle}
    />
  );
}
