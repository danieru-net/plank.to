import { Button } from '@/components/Button';
import { useReadAloud } from './useReadAloud';

type Props = {
  task: { title: string; notes: string | null };
};

/** Reads a task's title and notes aloud. Pressing it again, or leaving the screen, stops it. */
export function ReadAloudButton({ task }: Props) {
  const { speaking, toggle } = useReadAloud(task);
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
