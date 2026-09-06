/**
 * Audio Service - 音频播放服务
 * 负责配置后台音频模式、播放/停止音乐
 */

import { Audio, type AVPlaybackStatus } from 'expo-av';
import { checkMusicFileExists } from './musicStorage';

let currentSound: Audio.Sound | null = null;
let isAudioConfigured = false;

/**
 * 配置后台音频模式
 * 必须在播放任何音频之前调用
 */
export async function configureAudioMode(): Promise<void> {
  if (isAudioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true, // 后台保持活跃
      playsInSilentModeIOS: true, // 静音模式下也播放
      shouldDuckAndroid: true, // 其他音频时降低音量
      interruptionModeIOS: 0, // MixWithOthers
      interruptionModeAndroid: 1, // MixWithOthers
    });
    isAudioConfigured = true;
  } catch (error) {
    console.error('Failed to configure audio mode:', error);
  }
}

/**
 * 播放音乐文件
 * @param musicPath 音乐文件的永久存储路径
 * @param onFinish 播放完成回调
 * @returns 是否成功开始播放
 */
export async function playMusic(
  musicPath: string,
  onFinish?: () => void,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 先配置音频模式
    await configureAudioMode();

    // 停止当前正在播放的音乐
    await stopMusic();

    // 检查文件是否存在
    const exists = await checkMusicFileExists(musicPath);
    if (!exists) {
      return { success: false, error: '音乐文件不可用，请重新选择音乐。' };
    }

    // 加载并播放
    const { sound } = await Audio.Sound.createAsync(
      { uri: musicPath },
      { shouldPlay: true },
      (status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          onFinish?.();
        }
      },
    );

    currentSound = sound;
    return { success: true };
  } catch (error) {
    console.error('Failed to play music:', error);
    return { success: false, error: '播放音乐失败' };
  }
}

/**
 * 停止当前播放的音乐
 */
export async function stopMusic(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (error) {
      console.error('Failed to stop music:', error);
    }
    currentSound = null;
  }
}

/**
 * 检查是否正在播放
 */
export function isPlaying(): boolean {
  return currentSound !== null;
}

/**
 * 获取当前播放的 sound 对象（用于外部监听）
 */
export function getCurrentSound(): Audio.Sound | null {
  return currentSound;
}
