import { useMemo } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { createTaskRepository } from '@/db/taskRepository';

export function useTaskRepository() {
  const db = useDatabase();
  return useMemo(() => createTaskRepository(db), [db]);
}
