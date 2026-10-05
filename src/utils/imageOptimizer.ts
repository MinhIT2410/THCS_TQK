const MB = 1024 * 1024;

export const IMAGE_OPTIMIZE_THRESHOLD_BYTES = 3 * MB;
export const IMAGE_MAX_DIMENSION = 1920;

export interface ImageOptimizationResult {
  file: File;
  optimized: boolean;
  originalSize: number;
  outputSize: number;
  originalType: string;
  outputType: string;
  width?: number;
  height?: number;
}

function replaceExtension(fileName: string, extension: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${baseName}.${extension}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc ảnh để tối ưu dung lượng.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Không thể tạo ảnh đã tối ưu.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

/**
 * Tối ưu ảnh ở phía trình duyệt trước khi upload.
 *
 * Quy tắc an toàn:
 * - Ảnh <= 3MB: giữ nguyên 100%.
 * - GIF: giữ nguyên để không làm mất animation.
 * - Ảnh > 3MB: thu cạnh dài tối đa 1920px và encode WebP.
 * - PNG dùng quality cao hơn để hạn chế ảnh hưởng chữ/đồ họa.
 * - Chỉ dùng file mới nếu giảm được ít nhất 10%; nếu không thì giữ file gốc.
 * - Nếu trình duyệt không hỗ trợ encode WebP hoặc xử lý lỗi, giữ file gốc.
 */
export async function optimizeImageForUpload(file: File): Promise<ImageOptimizationResult> {
  const baseResult: ImageOptimizationResult = {
    file,
    optimized: false,
    originalSize: file.size,
    outputSize: file.size,
    originalType: file.type,
    outputType: file.type,
  };

  if (!file.type.startsWith('image/')) return baseResult;
  if (file.type === 'image/gif') return baseResult;
  if (file.size <= IMAGE_OPTIMIZE_THRESHOLD_BYTES) return baseResult;

  try {
    const image = await loadImage(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (!sourceWidth || !sourceHeight) return baseResult;

    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return baseResult;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const quality = file.type === 'image/png' ? 0.88 : 0.84;
    const blob = await canvasToBlob(canvas, 'image/webp', quality);

    // Một số trình duyệt cũ có thể không encode đúng WebP.
    if (blob.type !== 'image/webp') return baseResult;

    // Không đổi file nếu mức tiết kiệm quá nhỏ; tránh recompress không cần thiết.
    if (blob.size >= file.size * 0.9) return baseResult;

    const optimizedFile = new File(
      [blob],
      replaceExtension(file.name, 'webp'),
      { type: 'image/webp', lastModified: file.lastModified },
    );

    return {
      file: optimizedFile,
      optimized: true,
      originalSize: file.size,
      outputSize: optimizedFile.size,
      originalType: file.type,
      outputType: optimizedFile.type,
      width: targetWidth,
      height: targetHeight,
    };
  } catch (error) {
    console.warn('Không thể tối ưu ảnh, tiếp tục dùng file gốc:', error);
    return baseResult;
  }
}

/** Đổi phần mở rộng của storage path khi file đã được chuyển sang WebP. */
export function syncPathExtensionWithFile(path: string, file: File): string {
  if (file.type !== 'image/webp') return path;
  return path.replace(/\.[^./]+$/, '.webp');
}
