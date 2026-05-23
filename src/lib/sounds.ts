/**
 * 音效管理系统
 * 支持预加载、音量控制、静音等功能
 */

type SoundType = 
  | 'phase_change'      // 阶段切换
  | 'game_start'        // 游戏开始
  | 'vote'              // 投票
  | 'eliminated'        // 玩家淘汰
  | 'victory'           // 胜利
  | 'defeat'            // 失败
  | 'player_join'       // 玩家加入
  | 'player_leave'      // 玩家离开
  | 'ready'             // 准备
  | 'notification';     // 通知

// 音效文件映射（使用免费的音效库或自己录制）
const SOUND_FILES: Record<SoundType, string> = {
  phase_change: '/sounds/phase_change.mp3',
  game_start: '/sounds/game_start.mp3',
  vote: '/sounds/notification.mp3',
  eliminated: '/sounds/eliminated.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
  player_join: '/sounds/player_join.mp3',
  player_leave: '/sounds/player_leave.mp3',
  ready: '/sounds/player_join.mp3',
  notification: '/sounds/notification.mp3',
};

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private volume: number = 0.5;
  private muted: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // 从 localStorage 读取用户设置
    const savedVolume = localStorage.getItem('sound_volume');
    const savedMuted = localStorage.getItem('sound_muted');
    
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
    if (savedMuted) {
      this.muted = savedMuted === 'true';
    }
  }

  /**
   * 初始化音效系统（预加载音效文件）
   */
  async init() {
    if (this.initialized) return;

    try {
      // 预加载所有音效
      const loadPromises = Object.entries(SOUND_FILES).map(([type, url]) => {
        return new Promise<void>((resolve) => {
          const audio = new Audio(url);
          audio.loop = false;
          audio.volume = this.volume;
          audio.preload = 'auto';
          
          // 音效加载完成或失败都继续
          audio.addEventListener('canplaythrough', () => {
            this.sounds.set(type as SoundType, audio);
            resolve();
          });
          
          audio.addEventListener('error', () => {
            console.warn(`Failed to load sound: ${type}`);
            resolve();
          });
        });
      });

      await Promise.all(loadPromises);
      this.initialized = true;
      console.log('Sound system initialized');
    } catch (error) {
      console.error('Failed to initialize sound system:', error);
    }
  }

  /**
   * 播放音效
   */
  play(type: SoundType) {
    if (this.muted) return;

    const sound = this.sounds.get(type);
    if (!sound) {
      console.warn(`Sound not found: ${type}`);
      return;
    }

    try {
      // 重置播放位置
      sound.currentTime = 0;
      sound.volume = this.volume;
      
      // 播放音效
      const playPromise = sound.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn(`Failed to play sound: ${type}`, error);
        });
      }
    } catch (error) {
      console.warn(`Error playing sound: ${type}`, error);
    }
  }

  /**
   * 设置音量 (0-1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('sound_volume', this.volume.toString());
    
    // 更新所有音效的音量
    this.sounds.forEach((sound) => {
      sound.volume = this.volume;
    });
  }

  /**
   * 获取当前音量
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * 切换静音
   */
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('sound_muted', this.muted.toString());
    return this.muted;
  }

  /**
   * 设置静音状态
   */
  setMuted(muted: boolean) {
    this.muted = muted;
    localStorage.setItem('sound_muted', this.muted.toString());
  }

  /**
   * 获取静音状态
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * 停止所有音效
   */
  stopAll() {
    this.sounds.forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
  }
}

// 导出单例
export const soundManager = new SoundManager();

// 导出类型
export type { SoundType };
