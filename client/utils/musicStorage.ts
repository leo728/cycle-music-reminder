// Music file storage utility
// Handles copying files from temporary cache to permanent app storage

import * as FileSystem from 'expo-file-system/legacy';

const MUSIC_DIR_NAME = 'music';

/**
 * Get the permanent music storage directory path.
 * Creates the directory if it doesn't exist.
 */
async function getMusicDir(): Promise<string> {
  const docDir = (FileSystem as any).documentDirectory;
  if (!docDir) {
    throw new Error('Document directory not available');
  }
  const musicDir = `${docDir}${MUSIC_DIR_NAME}/`;

  const dirInfo = await (FileSystem as any).getInfoAsync(musicDir);
  if (!dirInfo.exists) {
    await (FileSystem as any).makeDirectoryAsync(musicDir, { intermediates: true });
  }

  return musicDir;
}

/**
 * Generate a unique filename to avoid conflicts.
 * If "morning.mp3" exists, try "morning_1.mp3", "morning_2.mp3", etc.
 */
async function getUniqueFilePath(musicDir: string, fileName: string): Promise<string> {
  const targetPath = `${musicDir}${fileName}`;
  const info = await (FileSystem as any).getInfoAsync(targetPath);

  if (!info.exists) {
    return targetPath;
  }

  // File exists, generate unique name with timestamp
  const dotIndex = fileName.lastIndexOf('.');
  const nameWithoutExt = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
  const ext = dotIndex > 0 ? fileName.substring(dotIndex) : '';
  const timestamp = Date.now();
  const uniqueName = `${nameWithoutExt}_${timestamp}${ext}`;

  return `${musicDir}${uniqueName}`;
}

/**
 * Copy a music file from a temporary URI to permanent storage.
 * Returns the permanent path and the filename used.
 */
export async function saveMusicFile(
  sourceUri: string,
  originalName: string
): Promise<{ permanentPath: string; fileName: string }> {
  const musicDir = await getMusicDir();
  const permanentPath = await getUniqueFilePath(musicDir, originalName);

  await (FileSystem as any).copyAsync({
    from: sourceUri,
    to: permanentPath,
  });

  // Extract just the filename from the permanent path
  const fileName = permanentPath.split('/').pop() || originalName;

  return { permanentPath, fileName };
}

/**
 * Check if a music file exists at the given permanent path.
 */
export async function checkMusicFileExists(path: string): Promise<boolean> {
  if (!path) return false;

  try {
    const info = await (FileSystem as any).getInfoAsync(path);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Delete a music file from permanent storage.
 * Only deletes if no other tasks reference the same file.
 */
export async function deleteMusicFile(path: string): Promise<void> {
  if (!path) return;

  try {
    const info = await (FileSystem as any).getInfoAsync(path);
    if (info.exists) {
      await (FileSystem as any).deleteAsync(path, { idempotent: true });
    }
  } catch {
    // Silently ignore deletion errors
  }
}

/**
 * Get the count of music files in the permanent storage directory.
 */
export async function getMusicFileCount(): Promise<number> {
  try {
    const dir = await getMusicDir();
    const files = await (FileSystem as any).readDirectoryAsync(dir);
    return files.filter((f: string) => !f.startsWith('.')).length;
  } catch {
    return 0;
  }
}

/**
 * Get the music storage directory path.
 */
export async function getMusicStoragePath(): Promise<string> {
  try {
    const docDir = (FileSystem as any).documentDirectory;
    if (!docDir) return '(document directory not available)';
    return `${docDir}${MUSIC_DIR_NAME}/`;
  } catch {
    return '(unable to determine)';
  }
}
