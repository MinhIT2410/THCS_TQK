/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { AboutItem, AboutItemImage, AboutItemType } from '../types/about';
import { generateSlug } from '../utils/slug';

/**
 * Clean up files in school-media storage that are under the about/ directory
 */
async function cleanupSystemFiles(urls: string[]): Promise<void> {
  const STORAGE_BUCKET = 'school-media';
  const pathsToDelete: string[] = [];

  for (const url of urls) {
    if (!url) continue;
    const bucketMarker = `/${STORAGE_BUCKET}/`;
    const markerIndex = url.indexOf(bucketMarker);
    if (markerIndex !== -1) {
      const path = url.substring(markerIndex + bucketMarker.length);
      if (path.startsWith('about/')) {
        pathsToDelete.push(path);
      }
    }
  }

  if (pathsToDelete.length > 0) {
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(pathsToDelete);
      if (error) {
        console.warn('Thông báo: Dọn dẹp tệp tin Storage thất bại hoặc không hoàn toàn:', error.message);
      } else {
        console.log('Dọn dẹp tệp tin Storage thành công:', pathsToDelete);
      }
    } catch (err) {
      console.warn('Lỗi khi dọn dẹp Storage:', err);
    }
  }
}

/**
 * Check if setting parentId for itemId would create a parent-child cycle
 */
export function wouldCreateCycle(itemId: string, newParentId: string, allItems: AboutItem[]): boolean {
  if (!newParentId || !itemId) return false;
  if (itemId === newParentId) return true;
  let currentId: string | null | undefined = newParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === itemId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const parentItem = allItems.find(item => item.id === currentId);
    currentId = parentItem?.parent_id;
  }
  return false;
}

/**
 * Strict regex validation for slug
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Strict regex validation for accent color
 */
export function isValidAccentColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Local fallback implementation when tables are not found in Supabase schema cache
const FALLBACK_ITEMS_KEY = 'fallback_about_items';
const FALLBACK_IMAGES_KEY = 'fallback_about_item_images';
let useLocalFallback = false;

const defaultFallbackItems: AboutItem[] = [
  {
    id: 'fb-item-1',
    title: 'Ban Giám Hiệu & Tổng Phụ Trách Đội',
    slug: 'ban-giam-hieu-tong-phu-trach',
    short_title: 'Ban Giám Hiệu',
    summary: 'Đơn vị chỉ đạo toàn diện hoạt động học tập, rèn luyện và phong trào thiếu nhi trường THCS Trần Quang Khải.',
    content: 'Ban Giám Hiệu nhà trường cùng Giáo viên Tổng phụ trách Đội luôn sát cánh chỉ đạo, định hướng các hoạt động học tập và phong trào Đội đạt thành tích xuất sắc, xứng danh Liên đội xuất sắc cấp Thành phố.',
    item_type: 'SCHOOL_UNIT',
    display_order: 1,
    is_featured: true,
    is_published: true,
    icon_name: 'Award',
    accent_color: '#EF4444',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fb-item-2',
    title: 'Ban Chỉ Huy Liên Đội',
    slug: 'ban-chi-huy-lien-doi',
    short_title: 'Ban Chỉ Huy Liên Đội',
    summary: 'Ban điều hành tự quản của Liên đội THCS Trần Quang Khải nhiệm kỳ lâm thời.',
    content: 'Ban Chỉ Huy Liên Đội gồm các gương mặt Đội viên tiêu biểu, xuất sắc nhất được đại hội bầu ra, chịu trách nhiệm lãnh đạo các hoạt động thi đua, phong trào tự quản và rèn luyện đạo đức.',
    item_type: 'TEAM',
    display_order: 2,
    is_featured: true,
    is_published: true,
    icon_name: 'Users',
    accent_color: '#3B82F6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fb-item-3',
    title: 'Đội Sao Đỏ & Cờ Đỏ Tự Quản',
    slug: 'doi-co-do-tu-quan',
    short_title: 'Đội Cờ Đỏ',
    summary: 'Bộ phận chuyên trách giám sát kỷ luật, nề nếp thi đua và đạo đức đội viên hàng ngày.',
    content: 'Đội Cờ Đỏ tự quản hoạt động tích cực vào đầu giờ và giữa giờ để đôn đốc các bạn đội viên chấp hành nghiêm túc quy định học đường, bảo vệ môi trường xanh - sạch - đẹp của nhà trường.',
    item_type: 'TEAM',
    display_order: 3,
    is_featured: false,
    is_published: true,
    icon_name: 'Shield',
    accent_color: '#10B981',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fb-item-4',
    title: 'CLB Truyền Thông & Phát Thanh Măng Non',
    slug: 'clb-phat-thanh-mang-non',
    short_title: 'Phát Thanh Măng Non',
    summary: 'Sân chơi sáng tạo dành cho các bạn đội viên yêu thích nghề báo chí, MC và truyền thông kỹ thuật số.',
    content: 'CLB Phát Thanh Măng Non thực hiện các bản tin radio giờ ra chơi định kỳ, tuyên truyền về những gương sáng việc tốt, truyền tải thông điệp phong trào Đội và kết nối thiếu nhi toàn trường.',
    item_type: 'CLUB',
    display_order: 4,
    is_featured: false,
    is_published: true,
    icon_name: 'Radio',
    accent_color: '#8B5CF6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultFallbackImages: AboutItemImage[] = [];

function getLocalItems(): AboutItem[] {
  const data = localStorage.getItem(FALLBACK_ITEMS_KEY);
  if (!data) {
    localStorage.setItem(FALLBACK_ITEMS_KEY, JSON.stringify(defaultFallbackItems));
    return defaultFallbackItems;
  }
  return JSON.parse(data);
}

function saveLocalItems(items: AboutItem[]): void {
  localStorage.setItem(FALLBACK_ITEMS_KEY, JSON.stringify(items));
}

function getLocalImages(): AboutItemImage[] {
  const data = localStorage.getItem(FALLBACK_IMAGES_KEY);
  if (!data) {
    localStorage.setItem(FALLBACK_IMAGES_KEY, JSON.stringify(defaultFallbackImages));
    return defaultFallbackImages;
  }
  return JSON.parse(data);
}

function saveLocalImages(images: AboutItemImage[]): void {
  localStorage.setItem(FALLBACK_IMAGES_KEY, JSON.stringify(images));
}

export const aboutContentService = {
  /**
   * Public: Fetch all published items (only is_published = true)
   */
  async getPublishedItems(options?: { itemType?: AboutItemType }): Promise<AboutItem[]> {
    if (useLocalFallback || !isSupabaseConfigured) {
      return getLocalItems()
        .filter(item => item.is_published && (!options?.itemType || item.item_type === options.itemType))
        .sort((a, b) => {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
    }

    try {
      let query = supabase
        .from('about_items')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (options?.itemType) {
        query = query.eq('item_type', options.itemType);
      }

      const { data, error } = await query;
      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('relation "about_items"')) {
          console.warn('Supabase about_items table is missing, falling back to LocalStorage:', error.message);
          useLocalFallback = true;
          return this.getPublishedItems(options);
        }
        console.error('Supabase getPublishedItems error:', error.message);
        throw new Error(`Không thể tải nội dung giới thiệu: ${error.message}`);
      }
      return (data || []) as AboutItem[];
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation "about_items"')) {
        console.warn('Supabase about_items table is missing, falling back to LocalStorage:', err.message);
        useLocalFallback = true;
        return this.getPublishedItems(options);
      }
      throw err;
    }
  },

  /**
   * Public: Fetch a single published item by slug with its published gallery and published children
   */
  async getPublishedItemBySlug(slug: string): Promise<AboutItem | null> {
    if (useLocalFallback || !isSupabaseConfigured) {
      const allItems = getLocalItems();
      const item = allItems.find(i => i.slug === slug && i.is_published);
      if (!item) return null;

      const aboutItem = { ...item };
      aboutItem.images = getLocalImages().filter(img => img.about_item_id === aboutItem.id)
        .sort((a, b) => a.display_order - b.display_order);

      aboutItem.children = allItems.filter(i => i.parent_id === aboutItem.id && i.is_published)
        .sort((a, b) => a.display_order - b.display_order);

      if (aboutItem.parent_id) {
        const parent = allItems.find(i => i.id === aboutItem.parent_id);
        if (parent && parent.is_published) {
          aboutItem.parent_title = parent.title;
        }
      }
      return aboutItem;
    }

    try {
      const { data: item, error } = await supabase
        .from('about_items')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('relation "about_items"')) {
          useLocalFallback = true;
          return this.getPublishedItemBySlug(slug);
        }
        console.error('Supabase getPublishedItemBySlug error:', error.message);
        throw new Error(`Không thể tải nội dung giới thiệu: ${error.message}`);
      }
      if (!item) return null;

      const aboutItem = item as AboutItem;

      // Fetch published gallery images
      const { data: images, error: imgErr } = await supabase
        .from('about_item_images')
        .select('*')
        .eq('about_item_id', aboutItem.id)
        .order('display_order', { ascending: true });

      aboutItem.images = !imgErr && images ? (images as AboutItemImage[]) : [];

      // Fetch published child items
      const { data: children, error: childErr } = await supabase
        .from('about_items')
        .select('*')
        .eq('parent_id', aboutItem.id)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      aboutItem.children = !childErr && children ? (children as AboutItem[]) : [];

      // Fetch parent title if nested and published
      if (aboutItem.parent_id) {
        const { data: parentData } = await supabase
          .from('about_items')
          .select('title, is_published')
          .eq('id', aboutItem.parent_id)
          .maybeSingle();
        
        if (parentData && parentData.is_published) {
          aboutItem.parent_title = parentData.title;
        }
      }

      return aboutItem;
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation "about_items"')) {
        useLocalFallback = true;
        return this.getPublishedItemBySlug(slug);
      }
      throw err;
    }
  },

  /**
   * Admin: Fetch all items (including drafts)
   */
  async getAdminItems(options?: { itemType?: AboutItemType }): Promise<AboutItem[]> {
    if (useLocalFallback || !isSupabaseConfigured) {
      return getLocalItems()
        .filter(item => !options?.itemType || item.item_type === options.itemType)
        .sort((a, b) => {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
    }

    try {
      let query = supabase
        .from('about_items')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (options?.itemType) {
        query = query.eq('item_type', options.itemType);
      }

      const { data, error } = await query;
      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('relation "about_items"')) {
          useLocalFallback = true;
          return this.getAdminItems(options);
        }
        console.error('Supabase getAdminItems error:', error.message);
        throw new Error(`Không thể kết nối dữ liệu Giới thiệu. Vui lòng kiểm tra Supabase: ${error.message}`);
      }
      return (data || []) as AboutItem[];
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation "about_items"')) {
        useLocalFallback = true;
        return this.getAdminItems(options);
      }
      throw err;
    }
  },

  /**
   * Admin: Fetch a single item by slug with its children and gallery (all states)
   */
  async getAdminItemBySlug(slug: string): Promise<AboutItem | null> {
    if (useLocalFallback || !isSupabaseConfigured) {
      const allItems = getLocalItems();
      const item = allItems.find(i => i.slug === slug);
      if (!item) return null;

      const aboutItem = { ...item };
      aboutItem.images = getLocalImages().filter(img => img.about_item_id === aboutItem.id)
        .sort((a, b) => a.display_order - b.display_order);

      aboutItem.children = allItems.filter(i => i.parent_id === aboutItem.id)
        .sort((a, b) => a.display_order - b.display_order);

      if (aboutItem.parent_id) {
        const parent = allItems.find(i => i.id === aboutItem.parent_id);
        if (parent) {
          aboutItem.parent_title = parent.title;
        }
      }
      return aboutItem;
    }

    try {
      const { data: item, error } = await supabase
        .from('about_items')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('relation "about_items"')) {
          useLocalFallback = true;
          return this.getAdminItemBySlug(slug);
        }
        console.error('Supabase getAdminItemBySlug error:', error.message);
        throw new Error(`Không thể kết nối dữ liệu Giới thiệu. Vui lòng kiểm tra Supabase: ${error.message}`);
      }
      if (!item) return null;

      const aboutItem = item as AboutItem;

      // Fetch gallery images
      const { data: images, error: imgErr } = await supabase
        .from('about_item_images')
        .select('*')
        .eq('about_item_id', aboutItem.id)
        .order('display_order', { ascending: true });

      aboutItem.images = !imgErr && images ? (images as AboutItemImage[]) : [];

      // Fetch child items
      const { data: children, error: childErr } = await supabase
        .from('about_items')
        .select('*')
        .eq('parent_id', aboutItem.id)
        .order('display_order', { ascending: true });

      aboutItem.children = !childErr && children ? (children as AboutItem[]) : [];

      // Fetch parent title
      if (aboutItem.parent_id) {
        const { data: parentData } = await supabase
          .from('about_items')
          .select('title')
          .eq('id', aboutItem.parent_id)
          .maybeSingle();
        
        if (parentData) {
          aboutItem.parent_title = parentData.title;
        }
      }

      return aboutItem;
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation "about_items"')) {
        useLocalFallback = true;
        return this.getAdminItemBySlug(slug);
      }
      throw err;
    }
  },

  /**
   * Compatibility wrapper for backwards compatibility with list load
   */
  async getItems(options?: { onlyPublished?: boolean; itemType?: AboutItemType }): Promise<AboutItem[]> {
    if (options?.onlyPublished) {
      return this.getPublishedItems(options);
    }
    return this.getAdminItems(options);
  },

  /**
   * Compatibility wrapper for single load
   */
  async getItemBySlug(slug: string): Promise<AboutItem | null> {
    return this.getAdminItemBySlug(slug);
  },

  /**
   * Create a new item
   */
  async createItem(item: Omit<AboutItem, 'id' | 'created_at' | 'updated_at'>, userId?: string): Promise<{ data: AboutItem | null; error: Error | null }> {
    const title = item.title?.trim();
    if (!title) {
      return { data: null, error: new Error('Tiêu đề không được để trống.') };
    }
    if (title.length > 150) {
      return { data: null, error: new Error('Tiêu đề không được vượt quá 150 ký tự.') };
    }

    const slug = item.slug?.trim() || generateSlug(title);
    if (!isValidSlug(slug)) {
      return { data: null, error: new Error('Đường dẫn (slug) không đúng định dạng. Chỉ dùng chữ thường không dấu, số và dấu gạch ngang.') };
    }

    if (item.summary && item.summary.length > 500) {
      return { data: null, error: new Error('Tóm tắt không được vượt quá 500 ký tự.') };
    }

    if (item.accent_color && !isValidAccentColor(item.accent_color)) {
      return { data: null, error: new Error('Màu chủ đạo phải đúng định dạng mã HEX (ví dụ: #EF4444).') };
    }

    if (item.display_order !== undefined && item.display_order < 0) {
      return { data: null, error: new Error('Thứ tự hiển thị phải lớn hơn hoặc bằng 0.') };
    }

    if (useLocalFallback || !isSupabaseConfigured) {
      const allItems = getLocalItems();
      if (allItems.some(i => i.slug === slug)) {
        return { data: null, error: new Error('Đường dẫn (slug) này đã tồn tại trong hệ thống.') };
      }

      const newItem: AboutItem = {
        ...item,
        id: `fb-item-${Date.now()}`,
        title,
        slug,
        created_by: userId || null,
        updated_by: userId || null,
        is_published: item.is_published ?? true,
        is_featured: item.is_featured ?? false,
        display_order: item.display_order ?? 0,
        published_at: item.is_published ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      allItems.push(newItem);
      saveLocalItems(allItems);
      return { data: newItem, error: null };
    }

    try {
      const payload = {
        ...item,
        title,
        slug,
        created_by: userId || null,
        updated_by: userId || null,
        published_at: item.is_published ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('about_items')
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('relation "about_items"')) {
          useLocalFallback = true;
          return this.createItem(item, userId);
        }
        return { data: null, error: new Error(error.message) };
      }
      return { data: data as AboutItem, error: null };
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation "about_items"')) {
        useLocalFallback = true;
        return this.createItem(item, userId);
      }
      return { data: null, error: err };
    }
  },

  /**
   * Update an existing item
   */
  async updateItem(id: string, fields: Partial<AboutItem>, userId?: string): Promise<{ data: AboutItem | null; error: Error | null }> {
    if (fields.title !== undefined) {
      const title = fields.title?.trim();
      if (!title) {
        return { data: null, error: new Error('Tiêu đề không được để trống.') };
      }
      if (title.length > 150) {
        return { data: null, error: new Error('Tiêu đề không được vượt quá 150 ký tự.') };
      }
      fields.title = title;
    }

    if (fields.slug !== undefined) {
      const slug = fields.slug?.trim();
      if (!slug) {
        return { data: null, error: new Error('Đường dẫn (slug) không được để trống.') };
      }
      if (!isValidSlug(slug)) {
        return { data: null, error: new Error('Đường dẫn (slug) không đúng định dạng. Chỉ dùng chữ thường không dấu, số và dấu gạch ngang.') };
      }
      fields.slug = slug;
    }

    if (fields.summary !== undefined && fields.summary !== null) {
      if (fields.summary.length > 500) {
        return { data: null, error: new Error('Tóm tắt không được vượt quá 500 ký tự.') };
      }
    }

    if (fields.accent_color !== undefined && fields.accent_color !== null) {
      if (!isValidAccentColor(fields.accent_color)) {
        return { data: null, error: new Error('Màu chủ đạo phải đúng định dạng mã HEX (ví dụ: #EF4444).') };
      }
    }

    if (fields.display_order !== undefined && fields.display_order < 0) {
      return { data: null, error: new Error('Thứ tự hiển thị phải lớn hơn hoặc bằng 0.') };
    }

    if (fields.parent_id !== undefined && fields.parent_id !== null && fields.parent_id !== '') {
      if (fields.parent_id === id) {
        return { data: null, error: new Error('Không thể chọn chính mục này làm mục cha.') };
      }
      
      // Load all items to check cycle
      try {
        const allItems = await this.getAdminItems();
        if (wouldCreateCycle(id, fields.parent_id, allItems)) {
          return { data: null, error: new Error('Không thể liên kết mục cha này vì sẽ tạo thành vòng lặp liên kết cha-con.') };
        }
      } catch (e: any) {
        return { data: null, error: new Error(`Không thể xác thực tính hợp lệ của mục cha: ${e.message}`) };
      }
    }

    if (useLocalFallback || !isSupabaseConfigured) {
      const allItems = getLocalItems();
      const idx = allItems.findIndex(i => i.id === id);
      if (idx === -1) {
        return { data: null, error: new Error('Không tìm thấy mục cần cập nhật.') };
      }

      if (fields.slug !== undefined && allItems.some(i => i.slug === fields.slug && i.id !== id)) {
        return { data: null, error: new Error('Đường dẫn (slug) này đã tồn tại ở mục khác.') };
      }

      const updatedItem: AboutItem = {
        ...allItems[idx],
        ...fields,
        updated_by: userId || null,
        updated_at: new Date().toISOString()
      };

      if (fields.is_published !== undefined) {
        updatedItem.published_at = fields.is_published ? new Date().toISOString() : null;
      }

      allItems[idx] = updatedItem;
      saveLocalItems(allItems);
      return { data: updatedItem, error: null };
    }

    try {
      const payload: any = {
        ...fields,
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      };
      
      if (fields.is_published !== undefined) {
        payload.published_at = fields.is_published ? new Date().toISOString() : null;
      }

      const { data, error } = await supabase
        .from('about_items')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('relation "about_items"')) {
          useLocalFallback = true;
          return this.updateItem(id, fields, userId);
        }
        return { data: null, error: new Error(error.message) };
      }
      return { data: data as AboutItem, error: null };
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation "about_items"')) {
        useLocalFallback = true;
        return this.updateItem(id, fields, userId);
      }
      return { data: null, error: err };
    }
  },

  /**
   * Delete an item. Throws error if children exist. Runs storage cleanup for associated files.
   */
  async deleteItem(id: string): Promise<{ success: boolean; error: Error | null }> {
    if (useLocalFallback || !isSupabaseConfigured) {
      const allItems = getLocalItems();
      
      // Check children first
      const hasChildren = allItems.some(item => item.parent_id === id);
      if (hasChildren) {
        return { success: false, error: new Error('Không thể xóa trực tiếp mục này do đang có các mục con liên kết. Vui lòng chuyển hoặc xóa các mục con trước.') };
      }

      const idx = allItems.findIndex(item => item.id === id);
      if (idx === -1) {
        return { success: false, error: new Error('Không tìm thấy mục cần xóa.') };
      }

      const item = allItems[idx];
      const filesToCleanup: string[] = [];
      if (item.logo_url) filesToCleanup.push(item.logo_url);
      if (item.cover_image_url) filesToCleanup.push(item.cover_image_url);

      const allImages = getLocalImages();
      const itemImages = allImages.filter(img => img.about_item_id === id);
      itemImages.forEach(img => {
        if (img.image_url) filesToCleanup.push(img.image_url);
      });

      // Filter out item images and item
      saveLocalImages(allImages.filter(img => img.about_item_id !== id));
      saveLocalItems(allItems.filter(item => item.id !== id));

      if (filesToCleanup.length > 0 && !useLocalFallback) {
        cleanupSystemFiles(filesToCleanup).catch(err => {
          console.warn('Lỗi khi chạy dọn dẹp Storage ngầm:', err);
        });
      }

      return { success: true, error: null };
    }

    try {
      // 1. Check children first
      const { data: children, error: childErr } = await supabase
        .from('about_items')
        .select('id')
        .eq('parent_id', id);

      if (childErr) {
        if (childErr.message.includes('schema cache') || childErr.message.includes('relation "about_items"')) {
          useLocalFallback = true;
          return this.deleteItem(id);
        }
        return { success: false, error: new Error(`Không thể kiểm tra mục con: ${childErr.message}`) };
      }
      if (children && children.length > 0) {
        return { success: false, error: new Error('Không thể xóa trực tiếp mục này do đang có các mục con liên kết. Vui lòng chuyển hoặc xóa các mục con trước.') };
      }

      // 2. Fetch current details to gather files for deletion
      const { data: item, error: itemErr } = await supabase
        .from('about_items')
        .select('logo_url, cover_image_url')
        .eq('id', id)
        .maybeSingle();

      if (itemErr) {
        return { success: false, error: new Error(`Không thể lấy thông tin để dọn dẹp Storage: ${itemErr.message}`) };
      }

      // 3. Fetch gallery images
      const { data: images } = await supabase
        .from('about_item_images')
        .select('image_url')
        .eq('about_item_id', id);

      const filesToCleanup: string[] = [];
      if (item?.logo_url) filesToCleanup.push(item.logo_url);
      if (item?.cover_image_url) filesToCleanup.push(item.cover_image_url);
      if (images) {
        images.forEach(img => {
          if (img.image_url) filesToCleanup.push(img.image_url);
        });
      }

      // 4. Delete item from database
      const { error } = await supabase
        .from('about_items')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      // 5. If db deletion succeeds, cleanup files in background safely
      if (filesToCleanup.length > 0) {
        cleanupSystemFiles(filesToCleanup).catch(err => {
          console.warn('Lỗi khi chạy dọn dẹp Storage ngầm:', err);
        });
      }

      return { success: true, error: null };
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation "about_items"')) {
        useLocalFallback = true;
        return this.deleteItem(id);
      }
      return { success: false, error: err };
    }
  },

  /**
   * Save gallery images securely using transaction-safe RPC
   */
  async saveItemImages(itemId: string, images: { image_url: string; caption?: string | null; alt_text?: string | null; display_order: number }[]): Promise<{ data: AboutItemImage[]; error: Error | null }> {
    if (useLocalFallback || !isSupabaseConfigured) {
      const allImages = getLocalImages();
      // Remove old images
      const filtered = allImages.filter(img => img.about_item_id !== itemId);
      
      const newImages: AboutItemImage[] = images.map((img, index) => ({
        id: `fb-img-${Date.now()}-${index}`,
        about_item_id: itemId,
        image_url: img.image_url,
        caption: img.caption || null,
        alt_text: img.alt_text || null,
        display_order: img.display_order,
        created_at: new Date().toISOString()
      }));

      filtered.push(...newImages);
      saveLocalImages(filtered);
      return { data: newImages.sort((a, b) => a.display_order - b.display_order), error: null };
    }

    try {
      const payloadImages = images.map(img => ({
        image_url: img.image_url,
        caption: img.caption || null,
        alt_text: img.alt_text || null,
        display_order: img.display_order
      }));

      const { data, error } = await supabase.rpc('replace_about_item_images', {
        p_about_item_id: itemId,
        p_images: payloadImages
      });

      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('relation') || error.message.includes('function')) {
          useLocalFallback = true;
          return this.saveItemImages(itemId, images);
        }
        console.error('Supabase saveItemImages error via RPC:', error.message);
        return { data: [], error: new Error(error.message) };
      }

      return { data: (data || []) as AboutItemImage[], error: null };
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation') || err.message?.includes('function')) {
        useLocalFallback = true;
        return this.saveItemImages(itemId, images);
      }
      console.error('Supabase saveItemImages exception via RPC:', err);
      return { data: [], error: err };
    }
  }
};
