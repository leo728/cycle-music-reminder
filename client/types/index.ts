// Cycle data types - designed to support future phases

export interface Cycle {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  totalDays: number;
  isActive: boolean;
  createdAt: string; // ISO timestamp
}

// Task type - reserved for future phases (Phase 2+)
export interface Task {
  id: string;
  cycleId: string;
  dayNumber: number;
  time: string; // HH:MM
  name: string;
  musicFileName: string;
  musicPath: string;
  isEnabled: boolean;
  isCompleted: boolean;
}

export type CycleStatus = 'not_started' | 'in_progress' | 'completed';
