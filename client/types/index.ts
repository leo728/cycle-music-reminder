// Cycle data types - designed to support future phases

export interface Cycle {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  totalDays: number;
  isActive: boolean;
  createdAt: string; // ISO timestamp
}

// Task type - Phase 2 implementation, Phase 4 music support
export interface Task {
  id: string;
  cycleId: string;
  dayNumber: number; // 1-based day index
  time: string; // HH:MM (24h)
  name: string;
  musicFileName: string; // display name, e.g. "morning.mp3" (empty if no music)
  musicPath: string; // permanent storage path for playback (empty if no music)
  isEnabled: boolean;
  isCompleted: boolean;
  createdAt: string; // ISO timestamp
}

export type CycleStatus = 'not_started' | 'in_progress' | 'completed';
