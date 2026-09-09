import { supabase } from '../lib/supabase/client';

const STORAGE_BUCKET = 'school-media';

/**
 * Loại bỏ dấu tiếng Việt và khoảng trắng để tạo tên file an toàn
 */
function getSafeFileName(originalName: string): string {
  const extIndex = originalName.lastIndexOf('.');
  const ext = extIndex !== -1 ? originalName.slice(extIndex).toLowerCase() : '';
  let nameWithoutExt = extIndex !== -1 ? originalName.slice(0, extIndex) : originalName;

  // Loại bỏ dấu tiếng Việt
  nameWithoutExt = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  // Chỉ giữ ký tự chữ, số, gạch ngang, gạch dưới. Thay thế các ký tự khác bằng gạch ngang.
  let safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-') // Gom nhiều gạch ngang liên tiếp thành 1
    .replace(/^-+|-+$/g, ''); // Loại bỏ gạch ngang ở đầu và cuối

  if (!safeName) {
    safeName = 'file';
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${safeName}-${timestamp}-${randomStr}${ext}`;
}

/**
 * Kiểm tra file ảnh hợp lệ: định dạng (jpeg, png, webp, gif) và dung lượng (<10MB)
 */
export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận các file định dạng JPEG, PNG, WEBP, GIF.';
  }

  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeInBytes) {
    return 'Dung lượng ảnh vượt quá giới hạn cho phép (Tối đa 10MB).';
  }

  return null;
}

/**
 * Upload ảnh lên Supabase Storage và trả về public URL
 */
export async function uploadImage(file: File, folder?: string): Promise<string> {
  // Validate file
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const currentYear = new Date().getFullYear();
  const folderPath = folder ? `${folder}/${currentYear}` : `uploads/${currentYear}`;
  const safeName = getSafeFileName(file.name);
  const path = `${folderPath}/${safeName}`;

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Tải ảnh lên Supabase thất bại: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    if (!data || !data.publicUrl) {
      throw new Error('Không thể lấy public URL cho file vừa upload.');
    }

    return data.publicUrl;
  } catch (err: any) {
    console.error('Error during uploadImage:', err);
    throw new Error(err.message || 'Có lỗi xảy ra khi tải ảnh lên hệ thống.');
  }
}

/**
 * Xóa file ảnh dựa trên public URL
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  if (!url) return;
  
  const bucketMarker = `/${STORAGE_BUCKET}/`;
  const markerIndex = url.indexOf(bucketMarker);
  
  if (markerIndex !== -1) {
    const path = url.substring(markerIndex + bucketMarker.length);
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      if (error) {
        console.error('Lỗi khi xóa file cũ từ Storage:', error);
      }
    } catch (err) {
      console.error('Error deleting image by URL:', err);
    }
  }
}


/**
 * Kiểm tra video nghi lễ hợp lệ.
 * Cho phép MP4/WEBM/MOV, tối đa 100MB ở phía trình duyệt.
 * Supabase Storage vẫn có thể áp dụng giới hạn thấp hơn theo cấu hình dự án.
 */
export function validateVideoFile(file: File): string | null {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowedTypes.includes(file.type)) {
    return 'Định dạng video không hợp lệ. Chỉ chấp nhận MP4, WEBM hoặc MOV.';
  }

  const maxSizeInBytes = 100 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return 'Dung lượng video vượt quá 100MB.';
  }

  return null;
}

/** Upload video lên school-media và trả về public URL. */
export async function uploadVideo(file: File, folder: string = 'ceremony-videos'): Promise<string> {
  const validationError = validateVideoFile(file);
  if (validationError) throw new Error(validationError);

  const currentYear = new Date().getFullYear();
  const safeName = getSafeFileName(file.name);
  const path = `${folder}/${currentYear}/${safeName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '86400', upsert: false });

  if (error) {
    throw new Error(`Tải video lên Supabase thất bại: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Không thể lấy public URL cho video vừa tải lên.');
  return data.publicUrl;
}


/**
 * Kiểm tra file âm thanh nghi lễ hợp lệ.
 * Cho phép MP3/M4A/WAV/OGG, tối đa 20MB.
 */
export function validateAudioFile(file: File): string | null {
  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
  ];
  if (!allowedTypes.includes(file.type)) {
    return 'Định dạng âm thanh không hợp lệ. Chỉ chấp nhận MP3, M4A, WAV hoặc OGG.';
  }

  const maxSizeInBytes = 20 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return 'Dung lượng âm thanh vượt quá 20MB.';
  }

  return null;
}

/** Upload âm thanh nghi lễ lên school-media và trả về public URL. */
export async function uploadAudio(file: File, folder: string = 'ceremony-audio'): Promise<string> {
  const validationError = validateAudioFile(file);
  if (validationError) throw new Error(validationError);

  const currentYear = new Date().getFullYear();
  const safeName = getSafeFileName(file.name);
  const path = `${folder}/${currentYear}/${safeName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '86400', upsert: false });

  if (error) {
    throw new Error(`Tải âm thanh lên Supabase thất bại: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Không thể lấy public URL cho âm thanh vừa tải lên.');
  return data.publicUrl;
}

export const DOCUMENT_STORAGE_BUCKET = 'school-document';

/**
 * Kiểm tra file tài liệu hợp lệ: định dạng (pdf, doc, docx, xls, xlsx, ppt, pptx) và dung lượng (<20MB)
 */
export function validateDocumentFile(file: File): string | null {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'Định dạng tệp không hợp lệ. Chỉ chấp nhận các file PDF, Word (DOC/DOCX), Excel (XLS/XLSX), hoặc PowerPoint (PPT/PPTX).';
  }

  const maxSizeInBytes = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSizeInBytes) {
    return 'Dung lượng tệp vượt quá giới hạn cho phép (Tối đa 20MB).';
  }

  return null;
}

/**
 * Upload tài liệu lên Supabase Storage và trả về thông tin file
 */
export async function uploadDocument(file: File, folder: string = 'documents'): Promise<{
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}> {
  const validationError = validateDocumentFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const currentYear = new Date().getFullYear();
  const folderPath = `${folder}/${currentYear}`;
  const safeName = getSafeFileName(file.name);
  const path = `${folderPath}/${safeName}`;

  try {
    const { error } = await supabase.storage
      .from(DOCUMENT_STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase document upload error:', error);
      throw new Error(`Tải tài liệu lên Supabase thất bại: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(DOCUMENT_STORAGE_BUCKET)
      .getPublicUrl(path);

    if (!data || !data.publicUrl) {
      throw new Error('Không thể lấy public URL cho tài liệu vừa upload.');
    }

    return {
      url: data.publicUrl,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    };
  } catch (err: any) {
    console.error('Error during uploadDocument:', err);
    throw new Error(err.message || 'Có lỗi xảy ra khi tải tài liệu lên hệ thống.');
  }
}

/**
 * Upload ảnh album lên Supabase Storage và trả về thông tin file
 */
export async function uploadAlbumImage(file: File, albumId?: string): Promise<{
  url: string;
  path: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const folderPath = `albums/${albumId || 'temp'}`;
  const safeName = getSafeFileName(file.name);
  const path = `${folderPath}/${safeName}`;

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase album image upload error:', error);
      throw new Error(`Tải ảnh album lên Supabase thất bại: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    if (!data || !data.publicUrl) {
      throw new Error('Không thể lấy public URL cho ảnh vừa upload.');
    }

    return {
      url: data.publicUrl,
      path,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'image/jpeg',
    };
  } catch (err: any) {
    console.error('Error during uploadAlbumImage:', err);
    throw new Error(err.message || 'Có lỗi xảy ra khi tải ảnh album lên hệ thống.');
  }
}

/**
 * Upload an image to an exact path under school-media bucket
 */
export async function uploadImageToExactPath(file: File, exactPath: string, options?: { upsert?: boolean }): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(exactPath, file, {
        cacheControl: '3600',
        upsert: options?.upsert ?? true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Tải ảnh lên Supabase thất bại: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(exactPath);

    if (!data || !data.publicUrl) {
      throw new Error('Không thể lấy public URL cho file vừa upload.');
    }

    return data.publicUrl;
  } catch (err: any) {
    console.error('Error during uploadImageToExactPath:', err);
    throw new Error(err.message || 'Có lỗi xảy ra khi tải ảnh lên hệ thống.');
  }
}

export const storageService = {
  validateImageFile,
  uploadImage,
  validateVideoFile,
  uploadVideo,
  uploadAudio,
  deleteImageByUrl,
  validateDocumentFile,
  uploadDocument,
  uploadAlbumImage,
  uploadImageToExactPath,
  generateSafeAboutImagePath,
  generateUUID,
};

export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    if (typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    if (typeof window.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // set version to 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // set variant to RFC4122
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }
  throw new Error('Web Crypto API is not available');
}

export function getSafeExtension(file: File): string {
  const mimeType = file.type;
  if (mimeType === 'image/jpeg') return 'jpeg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  
  const parts = file.name.split('.');
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
    return ext!;
  }
  return 'jpg';
}

export function generateSafeAboutImagePath(
  tempId: string,
  type: 'logo' | 'cover' | 'gallery',
  file: File
): string {
  const uuid = generateUUID();
  const ext = getSafeExtension(file);
  return `about/${tempId}/${type}/${uuid}.${ext}`;
}
