import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Cycle, Task } from '@/types';
import {
  loadCycles,
  saveCycles,
  getCycleStatus,
  loadTasks,
  saveTasks,
} from '@/utils/storage';

interface CycleContextType {
  cycles: Cycle[];
  tasks: Task[];
  isLoading: boolean;
  activeCycle: Cycle | null;
  addCycle: (cycle: Cycle) => Promise<{ success: boolean; message?: string }>;
  toggleCycleActive: (id: string) => Promise<void>;
  refreshCycles: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskEnabled: (taskId: string) => Promise<void>;
}

const CycleContext = createContext<CycleContextType | null>(null);

export function CycleProvider({ children }: { children: ReactNode }) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const refreshCycles = useCallback(async () => {
    const data = await loadCycles();
    setCycles(data);
  }, []);

  const refreshTasks = useCallback(async () => {
    const data = await loadTasks();
    setTasks(data);
  }, []);

  useEffect(() => {
    if (!isInitialLoad.current) return;
    isInitialLoad.current = false;
    const init = async () => {
      const [cycleData, taskData] = await Promise.all([loadCycles(), loadTasks()]);
      setCycles(cycleData);
      setTasks(taskData);
      setIsLoading(false);
    };
    init();
  }, []);

  const activeCycle = cycles.find((c) => {
    const status = getCycleStatus(c);
    return c.isActive && status === 'in_progress';
  }) ?? null;

  const addCycle = useCallback(
    async (cycle: Cycle): Promise<{ success: boolean; message?: string }> => {
      const current = await loadCycles();

      if (cycle.isActive) {
        const hasActive = current.some((c) => {
          const status = getCycleStatus(c);
          return c.isActive && status === 'in_progress';
        });
        if (hasActive) {
          return {
            success: false,
            message: '当前已有进行中的周期，同一时间只能有一个进行中的周期。新周期将保存为未启用状态。',
          };
        }
      }

      const updated = [...current, cycle];
      await saveCycles(updated);
      setCycles(updated);
      return { success: true };
    },
    [],
  );

  const toggleCycleActive = useCallback(async (id: string) => {
    const current = await loadCycles();
    const target = current.find((c) => c.id === id);
    if (!target) return;

    if (!target.isActive) {
      const hasActive = current.some((c) => {
        const status = getCycleStatus(c);
        return c.isActive && status === 'in_progress' && c.id !== id;
      });
      if (hasActive) {
        const updated = current.map((c) => {
          if (c.id === id) return { ...c, isActive: true };
          const status = getCycleStatus(c);
          if (c.isActive && status === 'in_progress') return { ...c, isActive: false };
          return c;
        });
        await saveCycles(updated);
        setCycles(updated);
        return;
      }
    }

    const updated = current.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c));
    await saveCycles(updated);
    setCycles(updated);
  }, []);

  // ─── Task Operations ──────────────────────────────────

  const addTask = useCallback(async (task: Task) => {
    const current = await loadTasks();
    const updated = [...current, task];
    await saveTasks(updated);
    setTasks(updated);
  }, []);

  const updateTask = useCallback(async (task: Task) => {
    const current = await loadTasks();
    const updated = current.map((t) => (t.id === task.id ? task : t));
    await saveTasks(updated);
    setTasks(updated);
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    const current = await loadTasks();
    const updated = current.filter((t) => t.id !== taskId);
    await saveTasks(updated);
    setTasks(updated);
  }, []);

  const toggleTaskEnabled = useCallback(async (taskId: string) => {
    const current = await loadTasks();
    const updated = current.map((t) =>
      t.id === taskId ? { ...t, isEnabled: !t.isEnabled } : t,
    );
    await saveTasks(updated);
    setTasks(updated);
  }, []);

  return (
    <CycleContext.Provider
      value={{
        cycles,
        tasks,
        isLoading,
        activeCycle,
        addCycle,
        toggleCycleActive,
        refreshCycles,
        refreshTasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskEnabled,
      }}
    >
      {children}
    </CycleContext.Provider>
  );
}

export function useCycles() {
  const ctx = useContext(CycleContext);
  if (!ctx) throw new Error('useCycles must be used within CycleProvider');
  return ctx;
}
