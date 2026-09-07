/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Send, HelpCircle, CheckCircle, ChevronDown, ChevronUp, Clock, ShieldAlert, Inbox } from 'lucide-react';
import { ContactSubmission } from '../../types';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

interface ContactProps {
  onSubmitContact: (submission: Omit<ContactSubmission, 'id' | 'date' | 'status'>) => void;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export default function Contact({ onSubmitContact }: ContactProps) {
  const { siteSettings } = useSiteSettings();
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // FAQ state
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  const faqs: FaqItem[] = siteSettings.faqs || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !subject || !message) return;

    onSubmitContact({
      fullName,
      email,
      phone,
      subject,
      message
    });

    // Clear form and show success banner
    setFullName('');
    setEmail('');
    setPhone('');
    setSubject('');
    setMessage('');
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
    }, 4000);
  };

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16 pb-24">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1.5 rounded-full inline-block border border-indigo-200/30">
          Lắng nghe - Thấu hiểu - Đồng hành
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Hộp thư "Điều em muốn nói"
        </h1>
        <p className="font-sans text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          {siteSettings.contact_intro || "Hãy gửi thắc mắc, hiến kế hoạt động Đội hoặc báo cáo sự cố để Liên đội hỗ trợ em nhanh nhất."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Column 1: Contact Form */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Gửi thư liên hệ trực tiếp</h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Gửi thông tin theo biểu mẫu dưới đây, bộ phận quản trị sẽ sớm phản hồi nhé!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Họ và tên của em:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lê Minh Đức"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Địa chỉ Email:</label>
                <input
                  type="email"
                  required
                  placeholder="Viết email của em hoặc của bố mẹ..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Số điện thoại liên lạc:</label>
                <input
                  type="tel"
                  required
                  placeholder="Số điện thoại cá nhân hoặc gia đình..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Chủ đề cần giải quyết:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đăng ký câu lạc bộ, Giải bóng đá..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">Nội dung thư cụ thể:</label>
              <textarea
                required
                rows={4}
                placeholder="Hãy viết câu hỏi, thắc mắc hoặc ý kiến đóng góp chi tiết của em vào đây..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center space-x-1.5 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all duration-200"
            >
              <Send className="h-4 w-4" />
              <span>Gửi liên hệ cho Liên đội</span>
            </button>

            {/* Success Feedback Alert */}
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400 flex items-start space-x-3"
                >
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Gửi thư liên hệ thành công!</h4>
                    <p className="text-[11px] leading-relaxed mt-0.5">Liên đội đã lưu câu hỏi của em. Em có thể vào trang quản lý CMS để kiểm duyệt xem thư liên hệ của chính mình vừa gửi nhé!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </form>
        </div>

        {/* Column 2: Information & Accordion FAQs */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Quick info details */}
          <div className="rounded-3xl bg-slate-50 dark:bg-slate-900/40 p-6 border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Thông tin liên hệ</h3>
            
            <div className="space-y-3 font-sans text-xs text-slate-600 dark:text-slate-400 font-medium">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{siteSettings.address || "Phòng truyền thống Đội - Tầng 1 Nhà A, Trường THCS Trần Quang Khải, số 3 đường D2, phường Tân Sơn Nhì, thành phố Hồ Chí Minh"}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                <span>{siteSettings.phone || "028.3845.2410 (Văn phòng)"}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                <span>{siteSettings.email || "liendoitonthattung.hcm@gmail.com"}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-4.5 w-4.5 text-yellow-500 shrink-0" />
                <span>Giờ tiếp đón: {siteSettings.reception_hours || "Giờ ra chơi các ngày từ Thứ Hai đến Thứ Bảy"}</span>
              </div>
            </div>
          </div>

          {/* FAQ Accordion Section */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center space-x-1.5">
              <HelpCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span>Góc Giải Đáp Măng Non (FAQs)</span>
            </h3>

            <div className="space-y-2.5 font-sans">
              {faqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left font-bold text-slate-900 dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <span className="pr-4 leading-normal">{faq.question}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium"
                        >
                          {faq.answer}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Google Map Section */}
      <section className="space-y-4">
        <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Bản Đồ Chỉ Đường Đến Trường</h3>
        {siteSettings.map_url ? (
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 h-80 relative">
            <iframe 
              src={siteSettings.map_url} 
              className="w-full h-full border-0" 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Bản đồ đường đi"
            />
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 h-80 relative flex items-center justify-center">
            {/* SVG Map Illustration */}
            <svg className="absolute inset-0 w-full h-full opacity-20 dark:opacity-10" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 50h700v300H50z" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
              <path d="M100 0v400M300 0v400M500 0v400M700 0v400M0 100h800M0 250h800" stroke="currentColor" strokeWidth="1" />
              <circle cx="400" cy="200" r="150" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" />
            </svg>

            {/* Mock Map UI details */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 z-10">
              <div className="relative">
                <div className="absolute -top-3 -left-3 h-14 w-14 animate-ping rounded-full bg-red-400 opacity-40" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-red-600 text-white shadow-xl relative">
                  <MapPin className="h-6 w-6" />
                </div>
              </div>
              
              <div className="space-y-1 max-w-sm">
                <h4 className="font-display font-bold text-slate-950 dark:text-white text-sm">{siteSettings.school_name || "Trường THCS Trần Quang Khải"}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{siteSettings.address || "số 3 đường D2, phường Tân Sơn Nhì, thành phố Hồ Chí Minh"}</p>
              </div>

              <a 
                href="https://maps.google.com" 
                target="_blank" 
                rel="noreferrer"
                className="rounded-xl bg-blue-600 text-white px-5 py-2 text-xs font-bold hover:bg-blue-700 shadow-md transition-colors"
              >
                Mở bản đồ Google Maps
              </a>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
