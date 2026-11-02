import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, X, Play, Film, Image as ImageIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import EditableImage from './EditableImage';

// Highly curated lists of past events for Ire-Akari Estate
export const PAST_EVENT_IMAGES = [
  { id: 'ev-img-1', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', caption: 'Ire-Akari Annual Sports Day Carnival', category: 'Community' },
  { id: 'ev-img-2', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80', caption: '30th Anniversary Dinner Gala & Fundraiser', category: 'Jubilee' },
  { id: 'ev-img-3', url: 'https://images.unsplash.com/photo-1472653425572-fa511b1ea9be?auto=format&fit=crop&w=800&q=80', caption: 'Cultural Heritage & Traditional Dance festival', category: 'Culture' },
  { id: 'ev-img-4', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80', caption: 'Zone Two Botanical Tree-Planting Initiative', category: 'Greenery' },
  { id: 'ev-img-5', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80', caption: 'Grand Lantern Walk & Harmattan Festival', category: 'Festival' },
  { id: 'ev-img-6', url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80', caption: 'Youth Football League Finals & Trophy Presentation', category: 'Sports' },
  { id: 'ev-img-7', url: 'https://images.unsplash.com/photo-1505232458627-a72726f5b712?auto=format&fit=crop&w=800&q=80', caption: 'Bi-Annual General Health Checkup Seminar', category: 'Wellness' },
  { id: 'ev-img-8', url: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=800&q=80', caption: 'Zone One Children Playground Grand Launch', category: 'Family' },
];

const PAST_EVENT_VIDEOS = [
  { id: 'ev-vid-1', url: 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054363d6e3d3b76251b54a72d73315a&profile_id=165', caption: 'Highlights of the 30th Anniversary Jubilee Launch', category: 'Celebration', duration: '2:15', thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80' },
  { id: 'ev-vid-2', url: 'https://player.vimeo.com/external/454516104.sd.mp4?s=d00ca41f71a93b2a2656e9e4362a269f886f4cf9&profile_id=165', caption: 'Annual Sports Tournament Cup Highlights', category: 'Sports', duration: '1:45', thumbnail: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80' },
  { id: 'ev-vid-3', url: 'https://player.vimeo.com/external/435674703.sd.mp4?s=7fdb18aa312b236162235c6f371a6e74b322f254&profile_id=165', caption: 'Community Award Banquet & Dinner Speech', category: 'Banquets', duration: '3:10', thumbnail: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80' },
  { id: 'ev-vid-4', url: 'https://player.vimeo.com/external/403816518.sd.mp4?s=71fa882a1fc832669bc906d482cc23a232f01fbe&profile_id=165', caption: 'Security Patrol Force Commissioning Ceremony', category: 'Security', duration: '1:20', thumbnail: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80' },
  { id: 'ev-vid-5', url: 'https://player.vimeo.com/external/392270562.sd.mp4?s=91024345d0ca6da64c7f0785f2690d7f3dc6b1c1&profile_id=165', caption: '24 Hours Power Substation Expansion Project', category: 'Development', duration: '2:30', thumbnail: 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=800&q=80' },
  { id: 'ev-vid-6', url: 'https://player.vimeo.com/external/510850877.sd.mp4?s=c9bc5b340edb0e5d1678be8d5d41f391c01e67bb&profile_id=165', caption: 'Waterfront Botanical Park Ribbon-Cutting', category: 'Parklands', duration: '1:55', thumbnail: 'https://images.unsplash.com/photo-1473116763269-255ea742f5f6?auto=format&fit=crop&w=800&q=80' },
];

export default function Gallery() {
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [isScrollingPaused, setIsScrollingPaused] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentMediaList = activeTab === 'images' ? PAST_EVENT_IMAGES : PAST_EVENT_VIDEOS;

  // Seamless horizontal auto-scroll effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 75; // Pixels per second

    const scroll = (time: number) => {
      if (isScrollingPaused) {
        lastTime = time;
        animationFrameId = requestAnimationFrame(scroll);
        return;
      }

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      container.scrollLeft += speed * delta;

      // Since we duplicated 3 times, once we've scrolled past 2/3rds, loop back by 1/3rd smoothly
      const singleSetWidth = container.scrollWidth / 3;
      if (container.scrollLeft >= singleSetWidth * 2) {
        container.scrollLeft -= singleSetWidth;
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isScrollingPaused, activeTab]);

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setZoomScale(1);
  };

  const handleCloseLightbox = () => {
    setLightboxIndex(null);
    setZoomScale(1);
  };

  const handleNextLightbox = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((prev) => (prev! + 1) % currentMediaList.length);
      setZoomScale(1);
    }
  };

  const handlePrevLightbox = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((prev) => (prev! - 1 + currentMediaList.length) % currentMediaList.length);
      setZoomScale(1);
    }
  };

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => (prev === 1 ? 1.5 : 1));
  };

  const activeMediaItem = lightboxIndex !== null ? currentMediaList[lightboxIndex] : null;

  return (
    <section 
      className="py-24 md:py-32 bg-estate-cream px-0 relative overflow-hidden" 
      id="estate-gallery-section"
    >
      {/* Decorative background grids */}
      <div className="absolute top-1/3 -right-64 w-96 h-96 rounded-full border-4 border-estate-primary/5 pointer-events-none" />
      <div className="absolute bottom-1/4 -left-64 w-96 h-96 rounded-full border-4 border-estate-accent/10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-estate-accent mb-3">
              <Sparkles className="w-5 h-5 animate-spin-slow text-estate-accent" strokeWidth={3} />
              <span className="text-sm font-mono font-black uppercase tracking-[0.3em] text-estate-accent">
                Event Memory
              </span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-display font-extrabold text-estate-primary tracking-tight leading-tight">
              A Living History of Ire-Akari
            </h2>
          </div>

          {/* Subtitle text */}
          <div className="max-w-md">
            <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
              Relive the vibrant cultural celebrations, athletic tournaments, and anniversary milestones that weave the social fabric of our secure sanctuary.
            </p>
          </div>
        </div>

        {/* Interactive Segmented Selector Buttons with Sliding Underlay Animation */}
        <div className="flex items-center gap-4 border-b border-estate-clay/30 pb-4 mb-8 relative z-10">
          <button
            onClick={() => {
              setActiveTab('images');
              if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
            }}
            className="relative px-6 py-3 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition-all duration-300 z-10 flex items-center gap-2"
            style={{ color: activeTab === 'images' ? '#ffffff' : '#4B5563' }}
          >
            {activeTab === 'images' && (
              <motion.div
                layoutId="activeMediaTabBG"
                className="absolute inset-0 bg-estate-secondary rounded-full -z-10 shadow-lg"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <ImageIcon className="w-4 h-4" />
            Past Event Images
          </button>

          <button
            onClick={() => {
              setActiveTab('videos');
              if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
            }}
            className="relative px-6 py-3 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition-all duration-300 z-10 flex items-center gap-2"
            style={{ color: activeTab === 'videos' ? '#ffffff' : '#4B5563' }}
          >
            {activeTab === 'videos' && (
              <motion.div
                layoutId="activeMediaTabBG"
                className="absolute inset-0 bg-estate-secondary rounded-full -z-10 shadow-lg"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <Film className="w-4 h-4" />
            Past Event Videos
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Canvas - Loops Seamlessly */}
      <div 
        className="relative w-full overflow-hidden py-4 cursor-grab active:cursor-grabbing group"
        onMouseEnter={() => setIsScrollingPaused(true)}
        onMouseLeave={() => setIsScrollingPaused(false)}
      >
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-none px-6 md:px-12 select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* We repeat the currentMediaList array to construct a seamless scrolling marquee */}
          {[...currentMediaList, ...currentMediaList, ...currentMediaList].map((item, idx) => {
            const isVideo = activeTab === 'videos';
            const uniqueKey = `scroll-item-${item.id}-${idx}`;

            return (
              <div
                key={uniqueKey}
                className="relative flex-shrink-0 w-[300px] sm:w-[350px] md:w-[380px] aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200/60 group/card transition-all duration-500 hover:shadow-2xl hover:border-estate-accent/40"
              >
                {/* Media Presentation Layer */}
                <div className="absolute inset-0 overflow-hidden bg-slate-100">
                  {isVideo ? (
                    // Video Card display
                    <div className="relative w-full h-full">
                      <img
                        src={(item as any).thumbnail}
                        alt={item.caption}
                        className="w-full h-full object-cover transform scale-100 group-hover/card:scale-105 transition-all duration-700"
                        referrerPolicy="no-referrer"
                      />
                      {/* Dark Overlay with Play icon */}
                      <div className="absolute inset-0 bg-black/40 group-hover/card:bg-black/50 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-estate-accent text-estate-secondary flex items-center justify-center shadow-2xl transform scale-90 group-hover/card:scale-100 transition-transform duration-300">
                          <Play className="w-8 h-8 fill-estate-secondary translate-x-0.5" />
                        </div>
                      </div>
                      
                      {/* Video Duration Badge */}
                      <div className="absolute top-4 right-4 bg-black/75 text-white font-mono text-[10px] font-black uppercase px-2.5 py-1 rounded-full pointer-events-none">
                        {(item as any).duration}
                      </div>
                    </div>
                  ) : (
                    // Image Card display - using EditableImage so any past event image can be re-uploaded/edited!
                    <EditableImage
                      src={item.url}
                      alt={item.caption}
                      imageKey={`event-memory-${item.id}`}
                      className="w-full h-full object-cover transform scale-100 group-hover/card:scale-105 transition-all duration-700 pointer-events-auto"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* Info and Trigger overlays */}
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none"
                >
                  <span className="text-[10px] uppercase tracking-widest text-estate-accent font-mono font-black mb-1.5 block">
                    {item.category}
                  </span>
                  <h4 className="text-sm md:text-base font-display font-black text-white leading-snug line-clamp-2">
                    {item.caption}
                  </h4>
                </div>

                {/* Clickable Fullscreen / Play Handler layer */}
                <button
                  onClick={() => handleOpenLightbox(idx % currentMediaList.length)}
                  className="absolute inset-0 bg-transparent cursor-pointer z-20 pointer-events-auto"
                  title={isVideo ? "Play Video" : "View Image"}
                />
              </div>
            );
          })}
        </div>

        {/* Elegant Floating Interaction Tip */}
        <div className="flex justify-center mt-6">
          <div className="inline-flex items-center gap-2 text-[11px] text-slate-400 font-mono tracking-widest uppercase bg-slate-100 px-4 py-2 rounded-full pointer-events-none select-none">
            <div className="w-1.5 h-1.5 rounded-full bg-estate-accent animate-ping" />
            Hover to Freeze scrolling • Drag or scroll manually
          </div>
        </div>
      </div>

      {/* Media Lightbox Viewer Modal */}
      <AnimatePresence>
        {activeMediaItem && (
          <div className="fixed inset-0 bg-black/95 z-99 flex flex-col items-center justify-center p-4">
            
            {/* Header controls */}
            <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-20">
              <div>
                <span className="text-xs uppercase tracking-widest text-estate-accent font-mono font-black block mb-1">
                  Event Memory Showcase
                </span>
                <span className="text-sm uppercase font-mono tracking-widest text-estate-cream font-black">
                  {activeTab === 'images' ? 'Photo' : 'Video'} {lightboxIndex! + 1} of {currentMediaList.length} • {activeMediaItem.category}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {activeTab === 'images' && (
                  <button
                    onClick={toggleZoom}
                    className="p-3 rounded-full bg-white/5 border-2 border-white/20 hover:border-estate-accent text-white hover:text-estate-accent transition-all duration-300 flex items-center justify-center cursor-pointer"
                    title="Toggle Zoom"
                  >
                    <ZoomIn className="w-5 h-5" strokeWidth={3} />
                  </button>
                )}
                <button
                  onClick={handleCloseLightbox}
                  className="p-3 rounded-full bg-white/5 border-2 border-white/20 hover:border-estate-accent text-white hover:text-estate-accent transition-all duration-300 flex items-center justify-center cursor-pointer"
                  id="close-lightbox-btn"
                >
                  <X className="w-5 h-5" strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* Left Control Arrow */}
            <button
              onClick={handlePrevLightbox}
              className="absolute left-6 p-4 rounded-full border-2 border-white/20 hover:border-estate-accent text-white hover:text-estate-accent bg-white/5 hover:bg-white/10 transition-all duration-300 z-10 transform hover:scale-110 cursor-pointer"
              id="lightbox-prev-btn"
            >
              <ChevronLeft className="w-8 h-8" strokeWidth={3} />
            </button>

            {/* Main Player Canvas */}
            <div className="relative max-w-5xl max-h-[75vh] px-16 flex items-center justify-center z-0 overflow-hidden">
              {activeTab === 'videos' ? (
                // Play authentic MP4 video in lightbox
                <video
                  key={activeMediaItem.id}
                  src={activeMediaItem.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-xl shadow-2xl border border-white/10"
                />
              ) : (
                // View and support live upload/editing directly in image lightbox
                <div style={{ transform: `scale(${zoomScale})` }} className="transition-transform duration-300">
                  <EditableImage
                    src={activeMediaItem.url}
                    alt={activeMediaItem.caption}
                    imageKey={`event-memory-${activeMediaItem.id}`}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl transition-all duration-500 pointer-events-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Right Control Arrow */}
            <button
              onClick={handleNextLightbox}
              className="absolute right-6 p-4 rounded-full border-2 border-white/20 hover:border-estate-accent text-white hover:text-estate-accent bg-white/5 hover:bg-white/10 transition-all duration-300 z-10 transform hover:scale-110 cursor-pointer"
              id="lightbox-next-btn"
            >
              <ChevronRight className="w-8 h-8" strokeWidth={3} />
            </button>

            {/* Footer Caption */}
            <div className="absolute bottom-0 left-0 w-full p-8 text-center text-white z-10 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-lg font-bold tracking-wide max-w-xl mx-auto text-estate-cream leading-relaxed">
                {activeMediaItem.caption}
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
