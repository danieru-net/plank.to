import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAppearance } from '@/features/appearance/context';
import { useFeedback } from '@/features/appearance/feedback';
import { minTouchTarget } from '@/theme';

type Options = {
  onMove: (from: number, to: number) => void;
};

type Drag = { from: number; to: number };

/**
 * Lets rows be put in a new order by dragging a handle. `row` wraps one row and passes it the
 * handle to place at its end. The handle is hidden from screen readers; rows offer "Move up" and
 * "Move down" actions instead. While `dragging` is true the screen should stop scrolling.
 */
export function useReorder({ onMove }: Options) {
  const feedback = useFeedback();
  const heights = useRef<number[]>([]);
  const [offset] = useState(() => new Animated.Value(0));
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const startY = useRef(0);

  const setDragState = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  /** The index the dragged row would land on, from how far its center has moved. */
  const targetFor = (from: number, dy: number) => {
    const h = heights.current;
    let top = 0;
    const mids = h.map((height) => {
      const mid = top + height / 2;
      top += height;
      return mid;
    });
    const center = (mids[from] ?? 0) + dy;
    return mids.filter((mid, j) => j !== from && mid < center).length;
  };

  const start = (from: number, pageY: number) => {
    startY.current = pageY;
    offset.setValue(0);
    setDragState({ from, to: from });
    feedback.tap();
  };

  const update = (pageY: number) => {
    const current = dragRef.current;
    if (!current) return;
    const dy = pageY - startY.current;
    offset.setValue(dy);
    const to = targetFor(current.from, dy);
    if (to !== current.to) {
      setDragState({ from: current.from, to });
      feedback.tap();
    }
  };

  const finish = () => {
    const current = dragRef.current;
    offset.setValue(0);
    setDragState(null);
    if (current && current.to !== current.from) onMove(current.from, current.to);
  };

  /** How far a row that is not being dragged shifts to make room for the dragged one. */
  const shiftFor = (index: number) => {
    if (!drag || index === drag.from) return 0;
    const h = heights.current[drag.from] ?? 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -h;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return h;
    return 0;
  };

  const row = (index: number, key: string, render: (handle: ReactNode) => ReactNode) => {
    const dragging = drag?.from === index;
    return (
      <Animated.View
        key={key}
        onLayout={(e) => {
          heights.current[index] = e.nativeEvent.layout.height;
        }}
        style={
          dragging
            ? { transform: [{ translateY: offset }], zIndex: 1, opacity: 0.85 }
            : { transform: [{ translateY: shiftFor(index) }] }
        }
      >
        {render(
          <DragHandle
            onStart={(pageY) => start(index, pageY)}
            onMove={update}
            onEnd={finish}
            active={dragging}
          />,
        )}
      </Animated.View>
    );
  };

  return { row, dragging: drag !== null };
}

type HandleProps = {
  onStart: (pageY: number) => void;
  onMove: (pageY: number) => void;
  onEnd: () => void;
  active: boolean;
};

function DragHandle({ onStart, onMove, onEnd, active }: HandleProps) {
  const { palette: theme } = useAppearance();
  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => onStart(e.nativeEvent.pageY)}
      onResponderMove={(e) => onMove(e.nativeEvent.pageY)}
      onResponderRelease={onEnd}
      onResponderTerminate={onEnd}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="drag-handle"
      style={styles.handle}
    >
      <Ionicons
        name="reorder-three-outline"
        size={24}
        color={active ? theme.primary : theme.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    minWidth: minTouchTarget - 8,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
