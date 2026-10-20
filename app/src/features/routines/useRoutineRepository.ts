import { useMemo } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { createRoutineRepository } from '@/db/routineRepository';

export function useRoutineRepository() {
  const db = useDatabase();
  return useMemo(() => createRoutineRepository(db), [db]);
}
