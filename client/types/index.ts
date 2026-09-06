// Cycle data types - designed to support future phases

export interface Cycle {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  totalDays: number;
  isActive: boolean;
  createdAt: string; // ISO timestamp
}

// Task type - Phase 2 implementation
export interface Task {
  id: string;
  cycleId: string;
  dayNumber: number; // 1-based day index
  time: string; // HH:MM (24h)
  name: string;
  musicFileName: string; // reserved for Phase 4
  musicPath: string; // reserved for Phase 4
  isEnabled: boolean;
  isCompleted: boolean;
  createdAt: string; // ISO timestamp
}

export type CycleStatus = 'not_started' | 'in_progress' | 'completed';
