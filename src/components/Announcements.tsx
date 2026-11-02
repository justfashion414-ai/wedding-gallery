import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Calendar, ShieldCheck, Flame, Wrench, ChevronRight, FileText } from 'lucide-react';
import { ANNOUNCEMENTS } from '../data';
import { Announcement } from '../types';

export default function Announcements() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'meeting' | 'maintenance' | 'emergency' | 'general'>('all');

  const filteredNotices = selectedFilter === 'all' 
    ? ANNOUNCEMENTS 
    : ANNOUNCEMENTS.filter(n => n.category === selectedFilter);

  // Helper to render icon & colors for categories
  const getCategoryDetails = (category: Announcement['category']) => {
    switch (category) {
      case 'emergency':
        return {
          icon: Flame,
          color: 'text-red-500 bg-red-500/10 border-red-500/20',
          badge: 'Emergency Alert'
        };
      case 'meeting':
        return {
          icon: Calendar,
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
          badge: 'Official Meeting'
        };
      case 'maintenance':
        return {
          icon: Wrench,
          color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
          badge: 'Maintenance Notice'
        };
      default:
        return {
          icon: ShieldCheck,
          color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
          badge: 'General Update'
        };
    }
  };

  return (
    <section className="py-24 md:py-32 bg-estate-cream px-6 md:px-12 relative overflow-hidden">
      {/* Absolute background visual details */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-estate-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Side: Dynamic Info Board Description */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <span className="text-sm font-mono font-black uppercase tracking-[0.3em] text-estate-accent mb-4 block">
              Bulletin Board
            </span>
            <div className="overflow-hidden py-1">
              <motion.h2
                animate={{
                  y: ["100%", "0%", "0%", "100%"]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: [0.16, 1, 0.3, 1],
                  times: [0, 0.16, 0.84, 1]
                }}
                className="text-3xl md:text-5xl font-display font-extrabold text-estate-primary tracking-tight leading-tight"
              >
                Official Announcements
              </motion.h2>
            </div>
            <p className="mt-4 text-estate-secondary/80 font-medium text-base md:text-lg mb-8 leading-relaxed">
              Stay fully updated with real-time official notices, infrastructure logs, administrative meetings, and security guidelines from the Residents Association.
            </p>

            {/* Category Filter Controls */}
            <div className="flex flex-col gap-2 font-sans text-sm">
              {[
                { id: 'all', label: 'All Notices', count: ANNOUNCEMENTS.length },
                { id: 'meeting', label: 'Meetings', count: ANNOUNCEMENTS.filter(a => a.category === 'meeting').length },
                { id: 'maintenance', label: 'Maintenance', count: ANNOUNCEMENTS.filter(a => a.category === 'maintenance').length },
                { id: 'emergency', label: 'Alerts', count: ANNOUNCEMENTS.filter(a => a.category === 'emergency').length },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSelectedFilter(btn.id as any)}
                  className={`flex items-center justify-between px-5 py-3 rounded-xl transition-all duration-300 font-extrabold ${
                    selectedFilter === btn.id
                      ? 'bg-estate-primary text-estate-accent border-l-4 border-estate-accent shadow-md'
                      : 'bg-estate-clay/50 hover:bg-estate-clay text-estate-secondary/80 hover:text-estate-primary'
                  }`}
                >
                  <span className="font-extrabold text-sm uppercase tracking-wider">{btn.label}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-black ${
                    selectedFilter === btn.id ? 'bg-estate-accent text-estate-primary' : 'bg-estate-primary/10 text-estate-primary'
                  }`}>
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Notice Cards List */}
          <div className="lg:col-span-8">
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {filteredNotices.map((notice: Announcement, index: number) => {
                  const { icon: CategoryIcon, color, badge } = getCategoryDetails(notice.category);

                  return (
                    <motion.div
                      layout
                      key={notice.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
                      className="group bg-white p-6 md:p-8 rounded-2xl border border-estate-primary/5 hover:border-estate-accent/30 hover:shadow-xl transition-all duration-500 relative flex flex-col md:flex-row md:items-start gap-6 cursor-pointer"
                    >
                      {/* Left: Category Icon Marker */}
                      <div className={`p-4 rounded-2xl self-start flex-shrink-0 border-2 ${color} shadow-md`}>
                        <CategoryIcon className="w-8 h-8" strokeWidth={3} />
                      </div>

                      {/* Right: Content details */}
                      <div className="flex-grow">
                        <div className="flex flex-wrap items-center gap-3 mb-3.5">
                          <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full font-black border-2 ${color}`}>
                            {badge}
                          </span>
                          <span className="text-sm text-estate-accent font-mono font-black bg-estate-primary/10 px-2 py-0.5 rounded-md">
                            {notice.date}
                          </span>
                          {notice.urgency === 'high' && (
                            <span className="text-xs uppercase font-black bg-red-100 text-red-600 px-3 py-1 rounded-md animate-pulse border border-red-200">
                              Urgent Alert
                            </span>
                          )}
                        </div>

                        <h3 className="text-2xl font-display font-extrabold text-estate-primary mb-3 group-hover:text-estate-accent transition-colors leading-snug">
                          {notice.title}
                        </h3>
                        
                        <p className="text-base text-estate-secondary/90 leading-relaxed font-medium">
                          {notice.content}
                        </p>
                      </div>

                      {/* Hover action indicator */}
                      <div className="self-end md:self-center text-estate-sage group-hover:text-estate-accent transition-colors">
                        <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredNotices.length === 0 && (
                <div className="text-center py-16 bg-estate-clay/30 rounded-2xl border border-dashed border-estate-primary/10">
                  <Megaphone className="w-8 h-8 text-estate-sage mx-auto mb-3" />
                  <p className="text-estate-sage font-medium text-sm font-sans">No current notices in this category.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
