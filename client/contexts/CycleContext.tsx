import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Cycle } from '@/types';
import { loadCycles, saveCycles, getCycleStatus } from '@/utils/storage';

interface CycleContextType {
  cycles: Cycle[];
  isLoading: boolean;
  activeCycle: Cycle | null;
  addCycle: (cycle: Cycle) => Promise<{ success: boolean; message?: string }>;
  toggleCycleActive: (id: string) => Promise<void>;
  refreshCycles: () => Promise<void>;
}

const CycleContext = createContext<CycleContextType | null>(null);

export function CycleProvider({ children }: { children: ReactNode }) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const refreshCycles = useCallback(async () => {
    const data = await loadCycles();
    setCycles(data);
  }, []);

  useEffect(() => {
    if (!isInitialLoad.current) return;
    isInitialLoad.current = false;
    loadCycles().then((data) => {
      setCycles(data);
      setIsLoading(false);
    });
  }, []);

  const activeCycle = cycles.find((c) => {
    const status = getCycleStatus(c);
    return c.isActive && status === 'in_progress';
  }) ?? null;

  const addCycle = useCallback(
    async (cycle: Cycle): Promise<{ success: boolean; message?: string }> => {
      const current = await loadCycles();

      // Check if there's already an active in-progress cycle
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

  const toggleCycleActive = useCallback(
    async (id: string) => {
      const current = await loadCycles();
      const target = current.find((c) => c.id === id);
      if (!target) return;

      if (!target.isActive) {
        // Trying to activate - check if another is active
        const hasActive = current.some((c) => {
          const status = getCycleStatus(c);
          return c.isActive && status === 'in_progress' && c.id !== id;
        });
        if (hasActive) {
          // Deactivate the other one first
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
    },
    [],
  );

  return (
    <CycleContext.Provider
      value={{ cycles, isLoading, activeCycle, addCycle, toggleCycleActive, refreshCycles }}
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
