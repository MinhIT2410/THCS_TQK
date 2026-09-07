import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { Save, Check, RefreshCw, AlertCircle, Layout, Phone, Mail, MapPin, Heart, List, HelpCircle, FileText } from 'lucide-react';

export const FooterBlockEditor: React.FC = () => {
  const { siteSettings, updateSettings, loading } = useSiteSettings();
  const [formData, setFormData] = useState(siteSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (siteSettings) {
      setFormData(siteSettings);
    }
  }, [siteSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const success = await updateSettings({
        footer_unit_name: formData.footer_unit_name,
        footer_slogan: formData.footer_slogan,
        address: formData.address,
        phone: formData.phone,
        phone_2: formData.phone_2,
        email: formData.email,
        footer_nav_title: formData.footer_nav_title,
        footer_feedback_title: formData.footer_feedback_title,
        footer_feedback_desc: formData.footer_feedback_desc,
        footer_text: formData.footer_text,
      });

      if (success) {
        setMessage({ type: 'success', text: 'Cập nhật cấu hình Chân trang (Footer) thành công!' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu cấu hình Footer. Vui lòng thử lại.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span>Quản lý Khối Chân trang (Footer)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chỉnh sửa thông tin liên hệ, tiêu đề các cột và nội dung hiển thị ở chân trang website
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu cấu hình Footer</span>
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Cột 1: Thông tin Đơn vị & Liên hệ */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <MapPin className="w-4 h-4 text-red-500" />
          <span>Cột 1: Thông tin Đơn vị & Liên hệ Footer</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên đơn vị Footer
            </label>
            <input
              type="text"
              name="footer_unit_name"
              value={formData.footer_unit_name || ''}
              onChange={handleChange}
              placeholder="LIÊN ĐỘI THCS TRẦN QUANG KHẢI"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Slogan Footer
            </label>
            <input
              type="text"
              name="footer_slogan"
              value={formData.footer_slogan || ''}
              onChange={handleChange}
              placeholder="Thiếu nhi Trần Quang Khải - Chăm ngoan, học tốt, tiếp bước cha anh."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Địa chỉ
            </label>
            <input
              type="text"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Số 01 Đường Trần Quang Khải, Phường Tân Định, Quận 1, TP. Hồ Chí Minh"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Số điện thoại 1
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              placeholder="028 3820 1234"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Số điện thoại 2 / Hotline
            </label>
            <input
              type="text"
              name="phone_2"
              value={formData.phone_2 || ''}
              onChange={handleChange}
              placeholder="Hotline BGH: 0903 123 456"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email liên hệ
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="liendoi.thcstranquangkhai@edu.vn"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Cột 2: Cấu hình Tiêu đề Danh mục */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <List className="w-4 h-4 text-red-500" />
          <span>Cột 2: Danh mục chính</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tiêu đề cột Danh mục
          </label>
          <input
            type="text"
            name="footer_nav_title"
            value={formData.footer_nav_title || ''}
            onChange={handleChange}
            placeholder="Danh mục chính"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            Các đường dẫn liên kết danh mục được tự động duy trì từ hệ thống router hiện tại để đảm bảo điều hướng luôn hoạt động chính xác.
          </p>
        </div>
      </div>

      {/* Cột 3: Tiêu đề & Mô tả Hộp thư */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <Heart className="w-4 h-4 text-red-500" />
          <span>Cột 3: Hộp thư "Điều em muốn nói"</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tiêu đề Hộp thư
            </label>
            <input
              type="text"
              name="footer_feedback_title"
              value={formData.footer_feedback_title || ''}
              onChange={handleChange}
              placeholder='Hộp thư "Điều em muốn nói"'
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nội dung mô tả hộp thư
            </label>
            <textarea
              rows={3}
              name="footer_feedback_desc"
              value={formData.footer_feedback_desc || ''}
              onChange={handleChange}
              placeholder="Nơi học sinh gửi gắm tâm tư, nguyện vọng, góp ý hoặc nhờ sự hỗ trợ từ Thầy Cô..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Dòng Copyright */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <FileText className="w-4 h-4 text-red-500" />
          <span>Thông tin Bản quyền (Copyright)</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nội dung Copyright cuối trang
          </label>
          <input
            type="text"
            name="footer_text"
            value={formData.footer_text || ''}
            onChange={handleChange}
            placeholder="© 2026 Liên đội THCS Trần Quang Khải. Tất cả quyền được bảo lưu."
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>
      </div>
    </form>
  );
};
