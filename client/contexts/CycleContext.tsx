import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Cycle, Task } from '@/types';
import {
  loadCycles,
  saveCycles,
  getCycleStatus,
  loadTasks,
  saveTasks,
  deepCopyTasks,
} from '@/utils/storage';
import { rescheduleAllNotifications } from '@/utils/notificationService';

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
  copyPreviousDay: (cycleId: string, dayNumber: number) => Promise<{ success: boolean; count: number; error?: string }>;
  copyToAllSubsequentDays: (cycleId: string, dayNumber: number, totalDays: number) => Promise<{ success: boolean; count: number; targetDays: number; error?: string }>;
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

  // 数据变化时自动重新调度通知
  const isInitialSchedule = useRef(true);
  useEffect(() => {
    // 跳过初始加载时的调度（由 Provider 中的初始化调度处理）
    if (isInitialSchedule.current) {
      isInitialSchedule.current = false;
      return;
    }
    if (isLoading) return;
    // 延迟调度，确保数据已稳定
    const timer = setTimeout(() => {
      rescheduleAllNotifications(cycles, tasks).catch(() => { /* ignore */ });
    }, 300);
    return () => clearTimeout(timer);
  }, [cycles, tasks, isLoading]);

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

  const copyPreviousDay = useCallback(
    async (cycleId: string, dayNumber: number): Promise<{ success: boolean; count: number; error?: string }> => {
      try {
        if (dayNumber <= 1) return { success: false, count: 0, error: '第 1 天没有前一天' };

        const current = await loadTasks();
        console.log('[CopyPreviousDay] Loaded tasks from storage:', current.length, 'total tasks');
        console.log('[CopyPreviousDay] Looking for cycleId:', cycleId, 'dayNumber:', dayNumber - 1);

        const sourceTasks = current.filter(
          (t) => t.cycleId === cycleId && t.dayNumber === dayNumber - 1,
        );
        console.log('[CopyPreviousDay] Found source tasks:', sourceTasks.length);

        if (sourceTasks.length === 0) {
          console.log('[CopyPreviousDay] No source tasks found. All tasks:', JSON.stringify(current.map(t => ({ id: t.id, cycleId: t.cycleId, dayNumber: t.dayNumber, name: t.name }))));
          return { success: false, count: 0, error: '前一天没有任务' };
        }

        // Remove existing tasks on the target day, then add deep copies
        const withoutTarget = current.filter(
          (t) => !(t.cycleId === cycleId && t.dayNumber === dayNumber),
        );
        const copied = deepCopyTasks(sourceTasks, cycleId, dayNumber);
        console.log('[CopyPreviousDay] Copied tasks:', copied.length, 'new IDs:', copied.map(t => t.id));

        const updated = [...withoutTarget, ...copied];
        console.log('[CopyPreviousDay] Saving', updated.length, 'total tasks to storage');
        await saveTasks(updated);

        // Verify the save was successful
        const verify = await loadTasks();
        const targetTasks = verify.filter(t => t.cycleId === cycleId && t.dayNumber === dayNumber);
        console.log('[CopyPreviousDay] Verification: target day now has', targetTasks.length, 'tasks');

        setTasks(updated);
        return { success: true, count: copied.length };
      } catch (error) {
        console.error('[CopyPreviousDay] Error:', error);
        return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    [],
  );

  const copyToAllSubsequentDays = useCallback(
    async (
      cycleId: string,
      dayNumber: number,
      totalDays: number,
    ): Promise<{ success: boolean; count: number; targetDays: number; error?: string }> => {
      try {
        if (dayNumber >= totalDays) return { success: false, count: 0, targetDays: 0, error: '已经是最后一天' };

        const current = await loadTasks();
        console.log('[CopyToAll] Loaded tasks from storage:', current.length, 'total tasks');
        console.log('[CopyToAll] Source: cycleId:', cycleId, 'dayNumber:', dayNumber);

        const sourceTasks = current.filter(
          (t) => t.cycleId === cycleId && t.dayNumber === dayNumber,
        );
        console.log('[CopyToAll] Found source tasks:', sourceTasks.length);

        if (sourceTasks.length === 0) return { success: false, count: 0, targetDays: 0, error: '当天没有任务' };

        const targetDays = totalDays - dayNumber;

        // Remove existing tasks on all subsequent days, then add deep copies
        const withoutTargets = current.filter(
          (t) => !(t.cycleId === cycleId && t.dayNumber > dayNumber),
        );

        const allCopied: Task[] = [];
        for (let d = dayNumber + 1; d <= totalDays; d++) {
          allCopied.push(...deepCopyTasks(sourceTasks, cycleId, d));
        }
        console.log('[CopyToAll] Copied', allCopied.length, 'tasks to', targetDays, 'days');

        const updated = [...withoutTargets, ...allCopied];
        await saveTasks(updated);

        // Verify
        const verify = await loadTasks();
        const targetTasks = verify.filter(t => t.cycleId === cycleId && t.dayNumber > dayNumber);
        console.log('[CopyToAll] Verification: target days now have', targetTasks.length, 'tasks total');

        setTasks(updated);
        return { success: true, count: sourceTasks.length, targetDays };
      } catch (error) {
        console.error('[CopyToAll] Error:', error);
        return { success: false, count: 0, targetDays: 0, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    [],
  );

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
        copyPreviousDay,
        copyToAllSubsequentDays,
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
