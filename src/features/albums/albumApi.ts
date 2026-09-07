/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../services/supabaseClient';
import { isSupabaseConfigured, canUseDemoFallback } from '../../config/env';
import { Album, AlbumImage, CreateAlbumInput, UpdateAlbumInput, AddAlbumImageInput, UpdateAlbumImageInput } from './albumTypes';
import { ApiError, normalizeApiError } from '../../services/apiError';

const MOCK_ALBUMS: Album[] = [
  {
    id: "album-1",
    title: "Đại hội Đội viên THCS Trần Quang Khải năm học 2025 - 2026",
    description: "Hình ảnh ghi lại không khí rộn ràng, nghiêm túc và đoàn kết của Đại hội.",
    cover_image_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800",
    status: "published",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_IMAGES: AlbumImage[] = [
  {
    id: "img-1",
    album_id: "album-1",
    image_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800",
    caption: "Khai mạc Đại hội Liên đội",
    sort_order: 10,
    created_at: new Date().toISOString()
  },
  {
    id: "img-2",
    album_id: "album-1",
    image_url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800",
    caption: "Chúc mừng Ban chỉ huy Liên đội mới",
    sort_order: 20,
    created_at: new Date().toISOString()
  }
];

export const albumApi = {
  /**
   * Get all published albums (Public)
   */
  async getAlbums(): Promise<Album[]> {
    if (!isSupabaseConfigured) {
      return MOCK_ALBUMS;
    }
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.warn('public.albums query failed, using fallback:', error.message);
        return MOCK_ALBUMS;
      }
      return (data && data.length > 0) ? data : MOCK_ALBUMS;
    } catch (err) {
      console.warn('Network error or exception fetching albums:', err);
      return MOCK_ALBUMS;
    }
  },

  /**
   * Get all albums for admin (including draft, published, archived)
   */
  async getAllAlbumsForAdmin(): Promise<Album[]> {
    if (!isSupabaseConfigured) {
      return [...MOCK_ALBUMS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('public.albums query for admin failed, using fallback:', error.message);
        return [...MOCK_ALBUMS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return (data && data.length > 0) ? data : MOCK_ALBUMS;
    } catch (err) {
      console.warn('Network error or exception fetching admin albums:', err);
      return [...MOCK_ALBUMS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  /**
   * Get an album by ID (Public)
   */
  async getAlbumById(id: string): Promise<Album | null> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        return MOCK_ALBUMS.find(a => a.id === id) || null;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' && canUseDemoFallback) {
          return MOCK_ALBUMS.find(a => a.id === id) || null;
        }
        throw normalizeApiError(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (canUseDemoFallback) return MOCK_ALBUMS.find(a => a.id === id) || null;
      throw normalizeApiError(err);
    }
  },

  /**
   * Get an album by ID for admin (any status)
   */
  async getAlbumByIdForAdmin(id: string): Promise<Album | null> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        return MOCK_ALBUMS.find(a => a.id === id) || null;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' && canUseDemoFallback) {
          return MOCK_ALBUMS.find(a => a.id === id) || null;
        }
        throw normalizeApiError(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (canUseDemoFallback) return MOCK_ALBUMS.find(a => a.id === id) || null;
      throw normalizeApiError(err);
    }
  },

  /**
   * Get all images belonging to an album (Public)
   */
  async getAlbumImages(albumId: string): Promise<AlbumImage[]> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        return MOCK_IMAGES.filter(img => img.album_id === albumId);
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('album_images')
        .select('*')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code === '42P01' && canUseDemoFallback) {
          console.warn('public.album_images table is not available yet, falling back to mock data');
          return MOCK_IMAGES.filter(img => img.album_id === albumId);
        }
        throw normalizeApiError(error);
      }
      return data || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (canUseDemoFallback) return MOCK_IMAGES.filter(img => img.album_id === albumId);
      throw normalizeApiError(err);
    }
  },

  /**
   * Get all images belonging to an album for admin
   */
  async getAlbumImagesForAdmin(albumId: string): Promise<AlbumImage[]> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        return MOCK_IMAGES.filter(img => img.album_id === albumId);
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('album_images')
        .select('*')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01' && canUseDemoFallback) {
          console.warn('public.album_images table is not available yet, falling back to mock data');
          return MOCK_IMAGES.filter(img => img.album_id === albumId);
        }
        throw normalizeApiError(error);
      }
      return data || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (canUseDemoFallback) return MOCK_IMAGES.filter(img => img.album_id === albumId);
      throw normalizeApiError(err);
    }
  },

  /**
   * Create a new album
   */
  async createAlbum(input: CreateAlbumInput): Promise<Album> {
    const status = input.status || 'draft';
    const now = new Date().toISOString();
    const published_at = status === 'published' ? now : null;

    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const newAlbum: Album = {
          id: `album-${Date.now()}`,
          title: input.title || 'Untitled Album',
          description: input.description,
          cover_image_url: input.cover_image_url,
          status,
          published_at,
          created_at: now,
          updated_at: now
        };
        MOCK_ALBUMS.push(newAlbum);
        return newAlbum;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('albums')
        .insert({
          title: input.title,
          description: input.description,
          cover_image_url: input.cover_image_url,
          status,
          published_at,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Update an existing album
   */
  async updateAlbum(id: string, input: UpdateAlbumInput): Promise<Album> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const idx = MOCK_ALBUMS.findIndex(a => a.id === id);
        if (idx === -1) {
          throw new ApiError('NOT_FOUND', 'Không tìm thấy album.');
        }
        const updated: Album = {
          ...MOCK_ALBUMS[idx],
          ...input,
          updated_at: new Date().toISOString()
        };
        MOCK_ALBUMS[idx] = updated;
        return updated;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('albums')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Publish an album
   */
  async publishAlbum(id: string): Promise<Album> {
    return this.updateAlbum(id, {
      status: 'published',
      published_at: new Date().toISOString()
    } as UpdateAlbumInput);
  },

  /**
   * Archive an album
   */
  async archiveAlbum(id: string): Promise<Album> {
    return this.updateAlbum(id, {
      status: 'archived'
    } as UpdateAlbumInput);
  },

  /**
   * Delete an album
   */
  async deleteAlbum(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const idx = MOCK_ALBUMS.findIndex(a => a.id === id);
        if (idx !== -1) {
          MOCK_ALBUMS.splice(idx, 1);
        }
        // Also delete associated images
        const remainingImages = MOCK_IMAGES.filter(img => img.album_id !== id);
        MOCK_IMAGES.length = 0;
        MOCK_IMAGES.push(...remainingImages);
        return true;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      // TODO: Delete file artifacts in Storage if needed, but cascade DB delete covers images table
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', id);

      if (error) throw normalizeApiError(error);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Add an image to an album
   */
  async addAlbumImage(albumId: string, input: AddAlbumImageInput): Promise<AlbumImage> {
    const sort_order = input.sort_order ?? 0;
    const now = new Date().toISOString();

    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const newImg: AlbumImage = {
          id: `img-${Date.now()}`,
          album_id: albumId,
          image_url: input.image_url || '',
          caption: input.caption,
          sort_order,
          created_at: now
        };
        MOCK_IMAGES.push(newImg);
        return newImg;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('album_images')
        .insert({
          album_id: albumId,
          image_url: input.image_url,
          caption: input.caption ?? null,
          sort_order,
          created_at: now
        })
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Update an image caption or sort order
   */
  async updateAlbumImage(imageId: string, input: UpdateAlbumImageInput): Promise<AlbumImage> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const idx = MOCK_IMAGES.findIndex(img => img.id === imageId);
        if (idx === -1) {
          throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh.');
        }
        const updated: AlbumImage = {
          ...MOCK_IMAGES[idx],
          ...input,
        };
        MOCK_IMAGES[idx] = updated;
        return updated;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('album_images')
        .update({
          caption: input.caption,
          sort_order: input.sort_order
        })
        .eq('id', imageId)
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Delete an image from an album
   */
  async deleteAlbumImage(imageId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const idx = MOCK_IMAGES.findIndex(img => img.id === imageId);
        if (idx !== -1) {
          MOCK_IMAGES.splice(idx, 1);
        }
        return true;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      // TODO: Delete file from Storage if needed
      const { error } = await supabase
        .from('album_images')
        .delete()
        .eq('id', imageId);

      if (error) throw normalizeApiError(error);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }
};
