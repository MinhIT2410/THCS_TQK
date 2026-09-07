/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import { SiteSettings, SiteSettingsInput } from '../types/siteSettings';
import { SITE_CONFIG } from '../config/site';

export const fallbackSiteSettings: SiteSettings = {
  id: 1,
  site_name: SITE_CONFIG.websiteName || "Cổng thông tin Liên đội THCS Trần Quang Khải",
  school_name: SITE_CONFIG.schoolName || "Trường THCS Trần Quang Khải",
  slogan: SITE_CONFIG.slogan || "Thiếu nhi Trần Quang Khải - Chăm ngoan, học tốt, tiếp bước cha anh",
  logo_url: SITE_CONFIG.logoUrl || "/logo.png",
  favicon_url: SITE_CONFIG.faviconUrl || "/favicon.ico",
  address: SITE_CONFIG.address || "số 3 đường D2, phường Tân Sơn Nhì, thành phố Hồ Chí Minh",
  phone: SITE_CONFIG.phone || "028.3845.2410 - 098.334.2410",
  email: SITE_CONFIG.email || "liendoitonthattung.hcm@gmail.com",
  facebook_url: "https://facebook.com/liendoitonthattung",
  youtube_url: "https://youtube.com/liendoitonthattung",
  zalo_url: "https://zalo.me/liendoitonthattung",
  map_url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.263884813083!2d106.6346288!3d10.7907577!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752ea2b09088cb%3A0xc66cc05bc6173bc7!2zVHLGsOG7nW5nIFRIQ1MgVMO0biBUaOG6pXQgVMO5bmc!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s",
  footer_title: "LIÊN ĐỘI TRƯỜNG THCS TRẦN QUANG KHẢI",
  footer_description: SITE_CONFIG.description || "Trang tin tức, hoạt động, phong trào thi đua măng non và kho văn bản hướng dẫn nghiệp vụ công tác Đội tại trường THCS Trần Quang Khải.",
  contact_intro: "Mọi ý kiến đóng góp, phản hồi xin vui lòng liên hệ Ban Giám hiệu hoặc Ban Chỉ huy Liên đội qua thông tin bên dưới hoặc gửi tin nhắn trực tiếp.",
  home_hero_slogan: "Tuổi nhỏ làm việc nhỏ, tùy theo sức của mình",
  home_hero_title: "CỔNG THÔNG TIN ĐIỆN TỬ LIÊN ĐỘI",
  home_hero_subtitle: "Nơi rèn luyện, học tập và phát triển tinh thần thiếu nhi tích cực",
  home_hero_description: "Cập nhật nhanh chóng thông tin chỉ đạo, hoạt động Đội tiêu biểu, tài liệu học tập Đội viên hữu ích, phong trào thi đua thiếu nhi và album ảnh sự kiện hấp dẫn.",
  home_hero_background_url: null,
  home_hero_button_text: "Xem hoạt động",
  home_hero_button_url: "/tin-tuc",
  updated_by: null,
  reception_hours: "Giờ ra chơi các ngày từ Thứ Hai đến Thứ Bảy",
  faqs: [
    {
      id: "faq-1",
      question: "Làm thế nào để được kết nạp vào Đội Thiếu niên Tiền phong Hồ Chí Minh?",
      answer: "Để được kết nạp vào Đội, em cần đạt độ tuổi từ 9 đến 15 tuổi, tích cực rèn luyện đạo đức học tập tốt, viết Đơn xin vào Đội tự nguyện, được một Chi đội hoặc Ban chỉ huy Liên đội giới thiệu và thông qua ban đại diện dưới sự đồng ý của Tổng phụ trách."
    },
    {
      id: "faq-2",
      question: "Nghi lễ thắt khăn quàng đỏ đúng chuẩn nghi thức Đội thực hiện như thế nào?",
      answer: "Em gấp chéo khăn từ đỉnh xuống khoảng 1/3, so hai đầu khăn bằng nhau, đặt khăn vào cổ áo đứng, gấp cổ áo lại. Sau đó thắt nút khăn: đặt đuôi khăn phải đè lên đuôi khăn trái, luồn đuôi khăn phải từ dưới lên tạo thành nút lỏng, rồi luồn đuôi khăn phải vào nút thắt đó kéo chặt vừa phải để tạo dáng thắt nơ đỏ vuông vức, cân đối hai dải khăn."
    },
    {
      id: "faq-3",
      question: "Phong trào 'Kế hoạch nhỏ' là gì và được thu gom những nguyên liệu nào?",
      answer: "Đây là phong trào truyền thống lớn của Đội viên nhằm tiết kiệm bảo vệ môi trường và quyên góp quỹ từ thiện. Các em được thu gom: Giấy vụn (sách vở cũ, báo chí, bìa carton) và vỏ lon nhôm sạch. Không thu gom thủy tinh, rác thải nhựa dơ hay rác y tế."
    },
    {
      id: "faq-4",
      question: "Ban Chỉ huy Liên đội hoạt động, tiếp nhận ý kiến của học sinh vào thời gian nào?",
      answer: "Văn phòng Liên đội hoạt động thường trực vào giờ ra chơi các ngày trong tuần (Thứ Hai đến Thứ Bảy). Ngoài ra, các em có thể gửi thư giấy trực tiếp vào Hòm thư măng non đặt tại sảnh chính trường hoặc gửi góp ý trực tiếp qua website này bất cứ lúc nào."
    }
  ]
};

export const siteSettingsService = {
  async getSiteSettings(): Promise<SiteSettings> {
    try {
      const { data, error } = await supabase
        .schema('school')
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error in getSiteSettings:', error.message);
        return fallbackSiteSettings;
      }

      if (!data) {
        // If row 1 doesn't exist, we'll try to insert fallback settings row 1 to initialize it
        try {
          const { data: insertedData, error: insertError } = await supabase
            .schema('school')
            .from('site_settings')
            .insert([{ id: 1, ...fallbackSiteSettings }])
            .select()
            .single();

          if (!insertError && insertedData) {
            return insertedData as SiteSettings;
          }
        } catch (err) {
          console.error('Failed to auto-insert default site settings:', err);
        }
        return fallbackSiteSettings;
      }

      // Fill in fallback values for any missing fields to avoid breaking the UI
      return {
        ...fallbackSiteSettings,
        ...data,
      };
    } catch (err) {
      console.error('Unexpected error in getSiteSettings:', err);
      return fallbackSiteSettings;
    }
  },

  async updateSiteSettings(input: Partial<SiteSettingsInput>, userId: string): Promise<{ data: SiteSettings | null; error: Error | null }> {
    try {
      const updatePayload = {
        ...input,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .schema('school')
        .from('site_settings')
        .update(updatePayload)
        .eq('id', 1)
        .select()
        .single();

      if (error) {
        console.error('Error in updateSiteSettings:', error.message);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as SiteSettings, error: null };
    } catch (err: any) {
      console.error('Unexpected error in updateSiteSettings:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
};
