import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Cycle, Task } from '@/types';

const CYCLES_STORAGE_KEY = '@cycle_music_reminder:cycles';
const TASKS_STORAGE_KEY = '@cycle_music_reminder:tasks';

/**
 * Load all cycles from AsyncStorage
 */
export async function loadCycles(): Promise<Cycle[]> {
  try {
    const raw = await AsyncStorage.getItem(CYCLES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Cycle[];
  } catch {
    return [];
  }
}

/**
 * Save all cycles to AsyncStorage
 */
export async function saveCycles(cycles: Cycle[]): Promise<void> {
  await AsyncStorage.setItem(CYCLES_STORAGE_KEY, JSON.stringify(cycles));
}

/**
 * Calculate cycle status based on dates
 */
export function getCycleStatus(cycle: Cycle): 'not_started' | 'in_progress' | 'completed' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(cycle.startDate + 'T00:00:00');
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + cycle.totalDays - 1);

  if (today < startDate) return 'not_started';
  if (today > endDate) return 'completed';
  return 'in_progress';
}

/**
 * Get the current day number for an active cycle
 */
export function getCurrentDay(cycle: Cycle): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(cycle.startDate + 'T00:00:00');
  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(diffDays, cycle.totalDays));
}

/**
 * Get the end date string for a cycle
 */
export function getEndDate(cycle: Cycle): string {
  const startDate = new Date(cycle.startDate + 'T00:00:00');
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + cycle.totalDays - 1);
  return formatDate(endDate);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a date string for display (e.g., "9月10日")
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * Get the date for a specific day in a cycle
 */
export function getDayDate(cycle: Cycle, dayNumber: number): string {
  const startDate = new Date(cycle.startDate + 'T00:00:00');
  const targetDate = new Date(startDate);
  targetDate.setDate(targetDate.getDate() + dayNumber - 1);
  return formatDate(targetDate);
}

/**
 * Get day status relative to today
 */
export function getDayStatus(cycle: Cycle, dayNumber: number): 'completed' | 'today' | 'future' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayDateStr = getDayDate(cycle, dayNumber);
  const dayDate = new Date(dayDateStr + 'T00:00:00');

  if (dayDate < today) return 'completed';
  if (dayDate.getTime() === today.getTime()) return 'today';
  return 'future';
}

// ─── Task Storage ───────────────────────────────────────────────

/**
 * Load all tasks from AsyncStorage
 */
export async function loadTasks(): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

/**
 * Save all tasks to AsyncStorage
 */
export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Get tasks for a specific cycle and day, sorted by time
 */
export function getTasksForDay(tasks: Task[], cycleId: string, dayNumber: number): Task[] {
  return tasks
    .filter((t) => t.cycleId === cycleId && t.dayNumber === dayNumber)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Get tasks for today from the active cycle
 */
export function getTodayTasks(tasks: Task[], cycle: Cycle): Task[] {
  const currentDay = getCurrentDay(cycle);
  return getTasksForDay(tasks, cycle.id, currentDay);
}

/**
 * Check if a time slot already has a task on a given day
 */
export function hasTimeConflict(
  tasks: Task[],
  cycleId: string,
  dayNumber: number,
  time: string,
  excludeTaskId?: string,
): boolean {
  return tasks.some(
    (t) =>
      t.cycleId === cycleId &&
      t.dayNumber === dayNumber &&
      t.time === time &&
      t.id !== excludeTaskId,
  );
}

/**
 * Get the next upcoming enabled task from today's tasks
 */
export function getNextTask(tasks: Task[], cycle: Cycle): Task | null {
  const todayTasks = getTodayTasks(tasks, cycle);
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    todayTasks.find((t) => t.isEnabled && t.time > currentTime) ?? null
  );
}

/**
 * Get tomorrow's first enabled task from the active cycle
 */
export function getTomorrowFirstTask(tasks: Task[], cycle: Cycle): { task: Task; dayNumber: number } | null {
  const currentDay = getCurrentDay(cycle);
  const tomorrowDay = currentDay + 1;
  if (tomorrowDay > cycle.totalDays) return null;

  const tomorrowTasks = getTasksForDay(tasks, cycle.id, tomorrowDay);
  const firstEnabled = tomorrowTasks.find((t) => t.isEnabled);
  if (!firstEnabled) return null;

  return { task: firstEnabled, dayNumber: tomorrowDay };
}

// ─── Task Copy Utilities ─────────────────────────────────────────

/**
 * Deep copy a single task to a new day with a fresh ID.
 * Returns a brand-new Task object — no shared references.
 */
export function deepCopyTask(task: Task, cycleId: string, dayNumber: number): Task {
  return {
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    cycleId,
    dayNumber,
    time: task.time,
    name: task.name,
    musicFileName: task.musicFileName,
    musicPath: task.musicPath,
    isEnabled: task.isEnabled,
    isCompleted: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Deep copy an array of tasks to a target day.
 * Each task gets a unique new ID and the target cycleId/dayNumber.
 */
export function deepCopyTasks(sourceTasks: Task[], cycleId: string, dayNumber: number): Task[] {
  return sourceTasks.map((t) => deepCopyTask(t, cycleId, dayNumber));
}
