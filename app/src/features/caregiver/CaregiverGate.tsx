import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useAppearance } from '@/features/appearance/context';
import { HOLD_MS, generateQuestion, isCorrect, type Question } from './caregiverLock';
import { useCaregiverLock } from './CaregiverLockProvider';
import { minTouchTarget } from '@/theme';

type Props = {
  /** What is locked, in a few words, for example "Settings". */
  what: string;
  /** Shown as a quiet "Not now" button, for screens that can be closed. */
  onCancel?: () => void;
};

/**
 * The gate: hold a button for three seconds, then answer a multiplication question. There is no
 * PIN and no account. People using a screen reader double tap the button instead of holding it.
 */
export function CaregiverGate({ what, onCancel }: Props) {
  const { palette: theme, spacing } = useAppearance();
  const { unlock } = useCaregiverLock();
  const [step, setStep] = useState<'hold' | 'question'>('hold');
  const [question, setQuestion] = useState<Question>(() => generateQuestion());
  const [wrong, setWrong] = useState(false);
  const [holding, setHolding] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [screenReader, setScreenReader] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => active && setScreenReader(on));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const stop = () => {
    clearTimeout(timer.current);
    clearInterval(tick.current);
    setHolding(false);
    setSeconds(0);
  };
  useEffect(() => stop, []);

  const goToQuestion = () => {
    stop();
    setWrong(false);
    setStep('question');
    AccessibilityInfo.announceForAccessibility(`Question. ${question.prompt}`);
  };

  const startHold = () => {
    stop();
    setHolding(true);
    const start = Date.now();
    tick.current = setInterval(
      () => setSeconds(Math.min(3, Math.floor((Date.now() - start) / 1000) + 1)),
      200,
    );
    setSeconds(1);
    timer.current = setTimeout(goToQuestion, HOLD_MS);
  };

  const answer = (choice: number) => {
    if (isCorrect(question, choice)) {
      unlock();
      return;
    }
    setWrong(true);
    setQuestion(generateQuestion());
    AccessibilityInfo.announceForAccessibility('That is not it. Here is a new question.');
  };

  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title" accessibilityRole="header">
          {what} is locked
        </Text>
        <Text muted>
          For grown-ups: the caregiver lock is on, so a child can use Today without changing the
          plan. After answering, you can turn the lock off in Settings, Caregiver lock.
        </Text>
      </View>

      {step === 'hold' ? (
        <Card style={{ gap: spacing.md }}>
          <Text variant="bodyStrong">Step 1 of 2</Text>
          <Text>Hold the button for 3 seconds.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hold for 3 seconds"
            accessibilityHint="Screen reader users can double tap instead of holding"
            accessibilityActions={[{ name: 'activate', label: 'Continue without holding' }]}
            onAccessibilityAction={() => goToQuestion()}
            // A screen reader cannot hold, so a plain tap continues.
            onPress={screenReader ? goToQuestion : undefined}
            onPressIn={screenReader ? undefined : startHold}
            onPressOut={screenReader ? undefined : stop}
            style={[
              styles.hold,
              {
                backgroundColor: holding ? theme.primary : theme.surface,
                borderColor: theme.primary,
                padding: spacing.md,
              },
            ]}
          >
            <Text
              variant="bodyStrong"
              style={{ color: holding ? theme.onPrimary : theme.primary, textAlign: 'center' }}
            >
              {holding ? `Keep holding… ${seconds}` : 'Hold here'}
            </Text>
          </Pressable>
        </Card>
      ) : (
        <Card style={{ gap: spacing.md }}>
          <Text variant="bodyStrong">Step 2 of 2</Text>
          {wrong ? <Text accessibilityRole="alert">That is not it. Try this one.</Text> : null}
          <Text variant="title" accessibilityRole="header">
            {question.prompt}
          </Text>
          <View style={[styles.choices, { gap: spacing.sm }]}>
            {question.choices.map((choice) => (
              <View key={`${question.prompt}-${choice}`} style={styles.choice}>
                <Button
                  label={String(choice)}
                  variant="secondary"
                  accessibilityLabel={`${choice}`}
                  accessibilityHint={`Answer to ${question.a} times ${question.b}`}
                  onPress={() => answer(choice)}
                />
              </View>
            ))}
          </View>
        </Card>
      )}

      {onCancel ? <Button label="Not now" variant="plain" onPress={onCancel} /> : null}
    </Screen>
  );
}

type GuardProps = {
  /** What is locked, for the gate's title. */
  what: string;
  onCancel?: () => void;
  /**
   * Keep showing the content once it has opened, even if the unlock ends meanwhile. Used for
   * editing screens, so a form is never replaced by the gate halfway through typing.
   */
  sticky?: boolean;
  children: ReactNode;
};

/** Shows `children` when the lock is off or open, and the gate when it is locked. */
export function CaregiverGuard({ what, onCancel, sticky = false, children }: GuardProps) {
  const { status } = useCaregiverLock();
  const [opened, setOpened] = useState(false);
  if (status === 'open' && !opened) setOpened(true);
  if (status === 'open' || (sticky && opened)) return <>{children}</>;
  if (status === 'loading') return null;
  return <CaregiverGate what={what} onCancel={onCancel} />;
}

const styles = StyleSheet.create({
  hold: {
    minHeight: minTouchTarget + 24,
    borderWidth: 2,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap' },
  choice: { flexGrow: 1, flexBasis: '45%' },
});
