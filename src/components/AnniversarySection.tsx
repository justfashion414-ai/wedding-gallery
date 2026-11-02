import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flower, Flower2, Sparkles, PartyPopper, ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause, Film } from 'lucide-react';
import EditableImage from './EditableImage';

const DEFAULT_ANNIVERSARY_PHOTOS = [
  { id: 'ann-1', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80', caption: '30th Anniversary Dinner Gala & Fundraiser', category: 'Jubilee' },
  { id: 'ann-2', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', caption: 'Ire-Akari Annual Sports Day Carnival', category: 'Community' },
  { id: 'ann-3', url: 'https://images.unsplash.com/photo-1472653425572-fa511b1ea9be?auto=format&fit=crop&w=800&q=80', caption: 'Cultural Heritage & Traditional Dance Festival', category: 'Culture' },
  { id: 'ann-4', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80', caption: 'Zone Two Botanical Tree-Planting Initiative', category: 'Greenery' },
  { id: 'ann-5', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80', caption: 'Grand Lantern Walk & Harmattan Festival', category: 'Festival' },
];

export default function AnniversarySection({ isDarkMode = false }: { isDarkMode?: boolean }) {
  const anniversaryPhotos = DEFAULT_ANNIVERSARY_PHOTOS;
  const N = anniversaryPhotos.length;
  const [centerIndex, setCenterIndex] = useState(0);

  // Video controller states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // Autoplay handler with muted by default
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    setIsMuted(true);
    video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Automatic scrolling for the image section
  useEffect(() => {
    const timer = setInterval(() => {
      setCenterIndex((prev) => (prev + 1) % N);
    }, 5000);
    return () => clearInterval(timer);
  }, [N]);

  return (
    <section 
      className={`relative py-16 transition-colors duration-300 ${isDarkMode ? 'bg-[#0B171C] text-[#E8EEF0]' : 'bg-[#EEEDF3] text-[#14262D]'}`}
      id="estate-anniversary-section"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0E6B75]/10 border-2 border-[#0E6B75] rounded-full text-[#0E6B75] mb-4">
            <PartyPopper className="w-5 h-5" strokeWidth={3} />
            <span className="text-xs font-mono font-black uppercase tracking-[0.2em]">30th Anniversary Jubilee</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-6">
            Three Decades of Legacy
          </h2>

          <p className={`text-base md:text-lg font-medium leading-relaxed ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
            August marks the historic **30th Anniversary** of <span className="text-[#0E6B75] dark:text-[#4FC3CF] font-black">Ire-Akari Estate</span>. Established in <span className="text-[#0E6B75] dark:text-[#4FC3CF] font-black">1996</span>, our premium sanctuary celebrates 30 years of serene environments, good security, steady electricity, and strong return on investment.
          </p>
        </div>

        {/* Video Player */}
        <div className="flex flex-col items-center justify-center mb-24 relative">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-[#0E6B75]/10 border border-[#0E6B75]/30 rounded-full text-[#0E6B75] text-xs font-mono">
            <Film className="w-3.5 h-3.5 animate-pulse" />
            <span>IRE-AKARI MEMORIAL DOCUMENTARY VIDEO</span>
          </div>
          
          <div className="relative w-full max-w-[300px] sm:max-w-[340px] aspect-[9/16] rounded-[32px] overflow-hidden border-4 border-[#0E6B75] shadow-2xl bg-black group/video transition-all duration-300 hover:scale-[1.02] z-10">
            <video
              ref={videoRef}
              src="https://res.cloudinary.com/qgvszym1/video/upload/v1784929959/Untitled_video_3_1_cafnet.mp4"
              className="w-full h-full object-cover cursor-pointer"
              loop
              playsInline
              muted
              onClick={togglePlay}
            />

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
              <button onClick={togglePlay} className="p-5 bg-[#0E6B75] text-white rounded-full pointer-events-auto">
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
              </button>
            </div>

            <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
              <button
                onClick={toggleMute}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black/80 border border-white/10 rounded-full text-white text-[10px] font-mono font-black"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isMuted ? 'UNMUTE' : 'AUDIO ON'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>



      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">

      </div>
    </section>
  );
}
