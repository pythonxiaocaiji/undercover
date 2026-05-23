import imageCompression from 'browser-image-compression';

/**
 * 图片压缩配置
 */
interface CompressionOptions {
  maxSizeMB?: number;        // 最大文件大小（MB）
  maxWidthOrHeight?: number; // 最大宽度或高度
  useWebWorker?: boolean;    // 是否使用 Web Worker
  quality?: number;          // 图片质量 (0-1)
}

/**
 * 默认压缩配置
 */
const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,              // 压缩到 1MB 以内
  maxWidthOrHeight: 1920,    // 最大尺寸 1920px
  useWebWorker: true,        // 使用 Web Worker 避免阻塞主线程
  quality: 0.8,              // 80% 质量
};

/**
 * 压缩图片文件
 * @param file 原始图片文件
 * @param options 压缩配置
 * @returns 压缩后的文件
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  try {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // 如果文件已经很小，直接返回
    if (file.size <= (mergedOptions.maxSizeMB || 1) * 1024 * 1024) {
      console.log('Image is already small enough, skipping compression');
      return file;
    }

    console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    // 压缩图片
    const compressedFile = await imageCompression(file, mergedOptions);
    
    console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Compression ratio:', ((1 - compressedFile.size / file.size) * 100).toFixed(2), '%');
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // 压缩失败时返回原文件
    return file;
  }
}

/**
 * 验证图片文件
 * @param file 文件对象
 * @returns 验证结果
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 检查文件类型
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '不支持的图片格式，仅支持 PNG/JPG/WebP',
    };
  }

  // 检查文件大小（最大 10MB，压缩前的限制）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: '图片过大，请选择小于 10MB 的图片',
    };
  }

  return { valid: true };
}

/**
 * 获取图片预览 URL
 * @param file 图片文件
 * @returns 预览 URL
 */
export function getImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * 释放预览 URL
 * @param url 预览 URL
 */
export function revokeImagePreviewUrl(url: string) {
  URL.revokeObjectURL(url);
}

/**
 * 获取图片尺寸
 * @param file 图片文件
 * @returns 图片尺寸
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}
