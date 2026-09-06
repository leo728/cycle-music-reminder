import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Cycle } from '@/types';

const CYCLES_STORAGE_KEY = '@cycle_music_reminder:cycles';

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
