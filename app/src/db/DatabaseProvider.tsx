import type { SQLiteDatabase } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { initializeDatabase } from './database';
import { StorageError } from './errors';

type State =
  | { status: 'loading' }
  | { status: 'ready'; db: SQLiteDatabase }
  | { status: 'error'; error: StorageError };

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

export function useDatabase(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used inside DatabaseProvider');
  return db;
}

/** Opens and migrates the database before rendering children; shows a visible error with retry. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let opened: SQLiteDatabase | null = null;
    initializeDatabase().then(
      (db) => {
        opened = db;
        if (cancelled) void db.closeAsync();
        else setState({ status: 'ready', db });
      },
      (e: unknown) => {
        if (cancelled) return;
        const error =
          e instanceof StorageError
            ? e
            : new StorageError('open_failed', 'Could not open your saved data.', { cause: e });
        console.error(error, error.cause);
        setState({ status: 'error', error });
      },
    );
    return () => {
      cancelled = true;
      if (opened) void opened.closeAsync();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  if (state.status === 'ready') {
    return <DatabaseContext.Provider value={state.db}>{children}</DatabaseContext.Provider>;
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <EmptyState
          title="Your planner could not be opened"
          message={state.error.message}
          actionLabel="Try again"
          onAction={retry}
        />
      </Screen>
    );
  }
  return null;
}
