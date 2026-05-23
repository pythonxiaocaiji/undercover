/**
 * 生成占位音效
 * 使用 Web Audio API 生成简单的音效，用于开发测试
 * 生产环境应该替换为专业音效文件
 */

/**
 * 生成简单的提示音
 */
export function generateBeep(frequency: number = 440, duration: number = 0.2): AudioBuffer | null {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const numSamples = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // 简单的正弦波
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 3);
    }

    return buffer;
  } catch (error) {
    console.error('Failed to generate beep:', error);
    return null;
  }
}

/**
 * 播放音频缓冲区
 */
export function playAudioBuffer(buffer: AudioBuffer, volume: number = 0.5) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start(0);
  } catch (error) {
    console.error('Failed to play audio buffer:', error);
  }
}

/**
 * 生成和弦音效
 */
export function generateChord(frequencies: number[], duration: number = 0.3): AudioBuffer | null {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const numSamples = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      // 叠加多个频率
      frequencies.forEach(freq => {
        sample += Math.sin(2 * Math.PI * freq * t);
      });
      
      // 归一化并添加衰减
      data[i] = (sample / frequencies.length) * Math.exp(-t * 2);
    }

    return buffer;
  } catch (error) {
    console.error('Failed to generate chord:', error);
    return null;
  }
}

/**
 * 预定义的音效
 */
export const PLACEHOLDER_SOUNDS = {
  notification: () => generateBeep(800, 0.15),
  ready: () => generateBeep(600, 0.2),
  vote: () => generateBeep(500, 0.15),
  phase_change: () => generateChord([440, 554, 659], 0.3),
  game_start: () => generateChord([523, 659, 784], 0.5),
  victory: () => generateChord([523, 659, 784, 1047], 0.8),
  defeat: () => generateChord([220, 277, 330], 0.6),
  eliminated: () => generateBeep(200, 0.4),
  player_join: () => generateBeep(700, 0.1),
  player_leave: () => generateBeep(400, 0.1),
};
