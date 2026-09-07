/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Users, Award, Shield, Sparkles, BookOpen, Heart, Landmark, Mail } from 'lucide-react';
import { LeaderProfile, AchievementItem } from '../../types';

interface AboutProps {
  leaders: LeaderProfile[];
  achievements: AchievementItem[];
}

export default function About({ leaders, achievements }: AboutProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16 pb-20">
      
      {/* 1. Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3.5 py-1.5 rounded-full inline-block">
          Truyền thống vẻ vang
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Giới Thiệu Về Liên Đội
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Hành trình xây dựng, phát triển và những thành tựu tự hào của Liên đội trường THCS Trần Quang Khải.
        </p>
      </div>

      {/* 2. Overview and Core Values */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Landmark className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Lịch Sử Thành Lập & Sứ Mệnh</span>
          </h2>
          <p className="font-sans text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Liên đội THCS Trần Quang Khải được thành lập cùng thời điểm ra đời của nhà trường. Trải qua nhiều năm cống hiến, Liên đội đã trở thành cái nôi rèn luyện đạo đức, bồi đắp kỹ năng sống cho hàng vạn thế hệ học sinh thành phố Hồ Chí Minh. 
          </p>
          <p className="font-sans text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Với sứ mệnh bồi dưỡng những Đội viên xuất sắc phát triển toàn diện <strong>"Đức - Trí - Thể - Mỹ"</strong>, Liên đội liên tục đổi mới phương thức sinh hoạt Đội, áp dụng công nghệ và chuyển đổi số trong giáo dục truyền thống, bảo đảm 100% học sinh được rèn luyện trong môi trường công bằng, hạnh phúc và đầy thử thách sáng tạo.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <div className="rounded-2xl border border-slate-250 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-md flex space-x-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Phương châm hành động</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Học tập sáng tạo, rèn luyện chăm ngoan, ứng xử văn minh.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-250 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-md flex space-x-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Giá trị cốt lõi</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lòng biết ơn, sự trung thực, tinh thần đoàn kết, ý chí vượt khó.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-[360px] aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
            <img 
              src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80" 
              alt="Youth Pioneers Traditional" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-red-600/70 to-blue-900/30 flex items-center justify-center p-6 text-center">
              <div className="space-y-1">
                <Sparkles className="h-8 w-8 text-yellow-400 mx-auto animate-pulse" />
                <h3 className="text-lg font-extrabold text-white font-display">TỰ HÀO TRUYỀN THỐNG</h3>
                <p className="text-xs text-slate-200">Kế thừa và tiếp bước cha anh xây dựng Tổ quốc</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ban Chỉ Huy Liên Đội */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center space-x-2">
            <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
            <span>Ban Chỉ Huy Liên Đội</span>
          </h2>
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
            Gặp gỡ đội ngũ cán bộ Đội tâm huyết, bản lĩnh và là đầu tàu gương mẫu của các phong trào thiếu nhi.
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {leaders.map((leader) => (
            <motion.div
              key={leader.id}
              id={`leader-${leader.id}`}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="rounded-[2rem] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-md text-center flex flex-col justify-between transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="relative mx-auto h-24 w-24 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-100 shadow-inner">
                  <img 
                    src={leader.avatar} 
                    alt={leader.name} 
                    className="h-full w-full object-cover object-center"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-950 dark:text-white">
                    {leader.name}
                  </h3>
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full inline-block mt-1">
                    {leader.position}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans px-2">
                  {leader.roleDescription}
                </p>
              </div>

              {leader.email && (
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 text-xs transition-colors">
                  <Mail className="h-4 w-4 mr-1.5 text-slate-400" />
                  <a href={`mailto:${leader.email}`} className="font-medium underline truncate max-w-full">
                    {leader.email}
                  </a>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Sơ đồ tổ chức */}
      <section className="bg-slate-50 dark:bg-slate-900/40 p-8 sm:p-10 rounded-[2rem] border border-slate-200 dark:border-slate-800 space-y-8 shadow-sm">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
            Sơ Đồ Tổ Chức Liên Đội
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống tổ chức thống nhất, phối hợp hiệu quả từ cấp Trường xuống các Chi đội thành viên.
          </p>
        </div>

        <div className="flex flex-col items-center space-y-4">
          {/* Box 1: BGH & Hội đồng đội */}
          <div className="bg-slate-900 text-white rounded-2xl py-3 px-6 text-xs font-bold shadow-md border border-slate-800 text-center w-full max-w-[280px]">
            Ban Giám hiệu & Hội đồng Đội cấp trên
          </div>
          <div className="h-4 w-0.5 bg-slate-300 dark:bg-slate-700" />

          {/* Box 2: TPT */}
          <div className="bg-red-600 text-white rounded-2xl py-3 px-6 text-xs font-bold shadow-md text-center w-full max-w-[280px]">
            Giáo viên Tổng phụ trách Đội (TPT)
          </div>
          <div className="h-4 w-0.5 bg-slate-300 dark:bg-slate-700" />

          {/* Box 3: Ban chỉ huy liên đội */}
          <div className="bg-blue-600 text-white rounded-2xl py-3.5 px-6 text-xs font-extrabold shadow-md text-center w-full max-w-[320px]">
            Ban Chỉ Huy Liên Đội (15 Đội viên)
          </div>
          <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-700" />

          {/* Fork line to Chi đội */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
            <div className="border-t-2 border-l-2 border-slate-300 dark:border-slate-700 h-4 rounded-tl-xl" />
            <div className="border-t-2 border-slate-300 dark:border-slate-700 h-4" />
            <div className="border-t-2 border-r-2 border-slate-300 dark:border-slate-700 h-4 rounded-tr-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl text-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-md">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Chi Đội Lớp 9</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">8 Chi đội - 310 Đội viên</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-md">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Chi Đội Lớp 8 & 7</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">16 Chi đội - 620 Đội viên</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-md">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Chi Đội Lớp 6</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">8 Chi đội - 320 Nhi đồng/Đội viên mới</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Thành Tích Nổi Bật */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center space-x-2">
            <Award className="h-6 w-6 text-yellow-500" />
            <span>Thành Tích & Danh Hiệu Đạt Được</span>
          </h2>
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
            Sự nỗ lực, đoàn kết bền bỉ của thầy và trò mang lại những danh hiệu thi đua xuất sắc cao quý nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {achievements.map((ach) => (
            <motion.div
              key={ach.id}
              id={`achievement-${ach.id}`}
              whileHover={{ y: -4 }}
              className="rounded-[2rem] border border-slate-100 bg-white dark:border-slate-800/80 dark:bg-slate-900 p-6 shadow-md flex items-start space-x-4 transition-all"
            >
              <div className="text-3xl bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl shadow-inner select-none">
                {ach.badge}
              </div>
              <div className="space-y-1.5 flex-1">
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">
                  Năm {ach.year}
                </span>
                <h3 className="font-display font-bold text-sm text-slate-950 dark:text-white">
                  {ach.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {ach.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  );
}
