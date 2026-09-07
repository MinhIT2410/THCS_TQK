/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Paintbrush, 
  Info, 
  ArrowLeft, 
  Home, 
  Save, 
  Mail, 
  Phone, 
  MapPin, 
  Map, 
  MessageSquare, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
  Eye,
  Clock,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  PanelBottom
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { FooterBlockEditor } from '../../features/cms/components/FooterBlockEditor';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export default function AdminCmsPage() {
  const navigate = useNavigate();
  const { siteSettings, updateSettings, loading: settingsLoading } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<'contact' | 'homepage' | 'footer'>('contact');
  
  // Local form states
  const [contactIntro, setContactIntro] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [receptionHours, setReceptionHours] = useState('');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFormInitializedRef = React.useRef(false);

  // Sync local states with loaded site settings once on initial load
  useEffect(() => {
    if (siteSettings && !isFormInitializedRef.current) {
      setContactIntro(siteSettings.contact_intro || '');
      setAddress(siteSettings.address || '');
      setPhone(siteSettings.phone || '');
      setEmail(siteSettings.email || '');
      setMapUrl(siteSettings.map_url || '');
      setReceptionHours(siteSettings.reception_hours || '');
      setFaqs(siteSettings.faqs || []);
      isFormInitializedRef.current = true;
    }
  }, [siteSettings]);

  const handleAddFaq = () => {
    const newFaq: FaqItem = {
      id: `faq-${Date.now()}`,
      question: '',
      answer: ''
    };
    setFaqs(prev => [...prev, newFaq]);
  };

  const handleUpdateFaq = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDeleteFaq = (id: string) => {
    setFaqs(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const ok = await updateSettings({
        contact_intro: contactIntro,
        address: address,
        phone: phone,
        email: email,
        map_url: mapUrl,
        reception_hours: receptionHours,
        faqs: faqs,
      } as any);

      if (ok) {
        setSuccess(true);
        // Automatically hide success alert after 4 seconds
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError('Không thể cập nhật cấu hình. Vui lòng kiểm tra lại quyền hạn hoặc thử lại sau.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Đã xảy ra lỗi không mong muốn khi cập nhật.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-4 font-sans animate-fade-in" id="admin-cms-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Paintbrush className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">CMS & Giao diện</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Chỉnh sửa nội dung thông tin liên hệ và quản trị cấu hình giao diện.</p>
        </div>
        <button
          onClick={() => navigate('/quan-tri')}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </button>
      </div>

      {/* Tabs configuration */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-2 pb-px">
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'contact'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold bg-indigo-50/10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Chỉnh sửa Liên hệ</span>
          </button>
          <button
            onClick={() => setActiveTab('homepage')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'homepage'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold bg-indigo-50/10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <Home className="h-4 w-4" />
            <span>Giao diện trang chủ (Visual Edit)</span>
          </button>
          <button
            onClick={() => setActiveTab('footer')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'footer'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold bg-indigo-50/10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <PanelBottom className="h-4 w-4" />
            <span>Chân trang (Footer)</span>
          </button>
        </div>
      </div>

      {settingsLoading && !contactIntro ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-xs text-slate-500 font-medium">Đang tải cấu hình thông tin...</p>
        </div>
      ) : activeTab === 'contact' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Edit fields */}
          <form onSubmit={handleSaveContact} className="lg:col-span-7 space-y-6">
            
            {/* Status alerts */}
            {success && (
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400 transition-all">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs">Cập nhật thành công!</h4>
                  <p className="text-[10px] leading-relaxed">Thông tin liên hệ mới đã được đồng bộ và cập nhật trên toàn hệ thống trang tin công khai.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 transition-all">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs">Không thể cập nhật!</h4>
                  <p className="text-[10px] leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Basic Info block */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                <Info className="h-4.5 w-4.5 text-indigo-500" />
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Thông tin liên lạc cơ bản</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <Mail className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Hòm thư điện tử (Email)</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ví dụ: liendoitonthattung@gmail.com"
                    className="w-full h-10 px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <Phone className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Số điện thoại bàn / Hotline</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 028.3845.2410"
                    className="w-full h-10 px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Địa chỉ Văn phòng Liên đội</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: Phòng truyền thống Đội - Tầng 1 Nhà A, Trường THCS Trần Quang Khải..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Thời gian tiếp đón / Hoạt động</span>
                </label>
                <input
                  type="text"
                  required
                  value={receptionHours}
                  onChange={(e) => setReceptionHours(e.target.value)}
                  placeholder="Ví dụ: Giờ ra chơi các ngày từ Thứ Hai đến Thứ Bảy"
                  className="w-full h-10 px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Intro & Map block */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                <Map className="h-4.5 w-4.5 text-indigo-500" />
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Lời giới thiệu & Bản đồ nhúng</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Nội dung thư ngỏ / Lời giới thiệu (Contact Intro)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={contactIntro}
                  onChange={(e) => setContactIntro(e.target.value)}
                  placeholder="Lời giới thiệu xuất hiện ở đầu trang Liên hệ..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Mẹo: Viết ngắn gọn từ 2-3 câu thể hiện tinh thần nhiệt huyết, chào đón thắc mắc góp ý.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Map className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Đường dẫn nhúng Google Maps (Embed URL)</span>
                </label>
                <input
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 leading-normal space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Cách lấy link nhúng Google Maps:</p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Truy cập <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">Google Maps</a> và tìm tên trường.</li>
                    <li>Bấm nút <strong className="text-slate-700 dark:text-slate-300">Chia sẻ (Share)</strong>.</li>
                    <li>Chọn tab <strong className="text-slate-700 dark:text-slate-300">Nhúng bản đồ (Embed a map)</strong>.</li>
                    <li>Sao chép chính xác đoạn địa chỉ URL trong thuộc tính <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-[9px]">src="..."</code> (chỉ copy phần text bắt đầu bằng https://www.google.com/maps/embed...).</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* FAQs editor block */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-4.5 w-4.5 text-indigo-500" />
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Góc Giải Đáp Măng Non (FAQs)</h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition-colors border border-indigo-200/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm câu hỏi</span>
                </button>
              </div>

              {faqs.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <HelpCircle className="h-6 w-6 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-[10px] text-slate-400">Chưa có câu hỏi nào trong Góc giải đáp.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {faqs.map((faq, idx) => (
                    <div key={faq.id} className="p-4 border border-slate-100 dark:border-slate-900 rounded-2xl bg-slate-50/40 dark:bg-slate-900/10 space-y-2.5 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Câu hỏi #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFaq(faq.id)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Nội dung câu hỏi</label>
                        <input
                          type="text"
                          required
                          value={faq.question}
                          onChange={(e) => handleUpdateFaq(faq.id, 'question', e.target.value)}
                          placeholder="Ví dụ: Làm sao để đăng ký vào đội tuyển bóng đá?"
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Câu trả lời</label>
                        <textarea
                          required
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => handleUpdateFaq(faq.id, 'answer', e.target.value)}
                          placeholder="Nhập nội dung giải đáp chi tiết..."
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Lưu cấu hình Liên hệ</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Column: Live Card Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
              <Eye className="h-4 w-4 text-indigo-500" />
              <h4 className="text-xs font-bold uppercase tracking-widest">Xem trước trực quan (Live Preview)</h4>
            </div>

            {/* Card preview box */}
            <div className="border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-4 shadow-sm">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl space-y-3.5 shadow-sm">
                <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-200/30 inline-block uppercase tracking-wider">
                  Xem trước thẻ thông tin
                </span>
                
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  Thông tin văn phòng liên đội
                </h3>
                
                <div className="space-y-3 font-sans text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <div className="flex items-start space-x-2.5">
                    <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                    <span className="text-[11px] leading-relaxed">{address || "Chưa nhập địa chỉ cụ thể..."}</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-[11px] font-mono">{phone || "Chưa có hotline..."}</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-[11px] font-mono">{email || "Chưa có hòm thư..."}</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                    <span className="text-[11px]">Giờ tiếp đón: {receptionHours || "Chưa có giờ tiếp đón..."}</span>
                  </div>
                </div>
              </div>

              {/* Text introduction preview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl space-y-2 shadow-sm">
                <h4 className="font-display font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">Lời dẫn trang liên hệ</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                  "{contactIntro || "Mọi ý kiến đóng góp, phản hồi xin vui lòng liên hệ..."}"
                </p>
              </div>

              {/* FAQs list preview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl space-y-2.5 shadow-sm">
                <h4 className="font-display font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center space-x-1">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Xem trước Góc Giải Đáp ({faqs.length})</span>
                </h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {faqs.map((faq, idx) => (
                    <div key={faq.id} className="text-xs p-2.5 border border-slate-50 dark:border-slate-800/80 rounded-xl bg-slate-50/40 dark:bg-slate-950/20">
                      <p className="font-bold text-slate-850 dark:text-slate-200 leading-snug">
                        {idx + 1}. {faq.question || "Câu hỏi trống..."}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-3 border-l-2 border-indigo-200 dark:border-indigo-900">
                        {faq.answer || "Chưa nhập câu trả lời..."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map rendering mock/live preview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-2xl shadow-sm">
                <h4 className="font-display font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest p-2">Khối Bản Đồ Nhúng</h4>
                <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 h-36 relative">
                  {mapUrl ? (
                    <iframe 
                      src={mapUrl} 
                      className="w-full h-full border-0 pointer-events-none opacity-80" 
                      title="Bản đồ xem trước"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                      <Map className="h-6 w-6 text-slate-300 dark:text-slate-700 animate-pulse mb-1" />
                      <p className="text-[10px] text-slate-400">Chưa cấu hình URL bản đồ Google Maps</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'footer' ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <FooterBlockEditor />
        </div>
      ) : (
        /* Home page tab content */
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto shadow-sm border border-indigo-100/40 dark:border-indigo-900/30">
            <Home className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">Visual Edit Mode ở Trang chủ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Phần Banner Hero và các khối nội dung giới thiệu nhanh trên trang chủ hỗ trợ chỉnh sửa trực quan trực tiếp. Chỉ cần đăng nhập bằng tài khoản quản trị và bật Chế độ Chỉnh sửa trực tiếp trên trang chủ.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-md"
            >
              <Home className="h-4 w-4" />
              <span>Quay về trang chủ để chỉnh sửa</span>
            </button>
          </div>

          <div className="flex gap-3 p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl text-left max-w-md mx-auto">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-semibold">
              Khi ở chế độ chỉnh sửa, di chuột qua phần tiêu đề hoặc ảnh Banner trang chủ, bạn sẽ thấy biểu tượng bút chì để sửa nội dung ngay tại chỗ!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

