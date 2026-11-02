import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Sparkles, Sliders } from 'lucide-react';
import { GALLERY_IMAGES } from '../data';
import EditableImage from './EditableImage';

export default function FloatingPhotoGrid() {
  const [currentSet, setCurrentSet] = useState(0); // 0 = First 6 images, 1 = Next 6 images
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const imagesPerSet = 6;
  const totalSets = Math.ceil(GALLERY_IMAGES.length / imagesPerSet);

  // Divide images into sets of 6 dynamically
  const sets = Array.from({ length: totalSets }, (_, i) => 
    GALLERY_IMAGES.slice(i * imagesPerSet, (i + 1) * imagesPerSet)
  );

  const currentImages = sets[currentSet] || [];

  // Changing subtitles to match the current narrative
  const setTitles = [
    "Residential Architecture & Botanical Serenity",
    "Elite Clubhouse Living & Wellness Pathways"
  ];

  // Auto-play interval with progress tracker
  useEffect(() => {
    if (!isAutoPlaying) return;

    setProgress(0);
    const duration = 8000; // 8 seconds per cinematic rotation
    const intervalTime = 100;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const nextProgress = (currentStep / steps) * 100;
      setProgress(nextProgress);

      if (currentStep >= steps) {
        setCurrentSet((prev) => (prev + 1) % totalSets);
        currentStep = 0;
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentSet, isAutoPlaying, totalSets]);

  const handleNext = () => {
    setCurrentSet((prev) => (prev + 1) % totalSets);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentSet((prev) => (prev - 1 + totalSets) % totalSets);
    setProgress(0);
  };

  return (
    <section 
      className="py-24 md:py-32 bg-estate-secondary text-white px-6 md:px-12 relative overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background Soft Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-estate-primary/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-estate-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header with Changing Title animation */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <div className="flex items-center gap-2 text-estate-accent mb-3">
              <Sparkles className="w-5 h-5 animate-spin-slow text-estate-accent" strokeWidth={3} />
              <span className="text-sm font-mono font-black uppercase tracking-[0.3em] text-estate-accent">Landmark Area of the Estate</span>
            </div>
            
            {/* Dynamic Animated Set Title */}
            <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mb-3 text-estate-cream">
              Scenic Landmarks
            </h2>
            
            <AnimatePresence mode="wait">
              <motion.p
                key={currentSet}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="text-estate-clay font-bold tracking-wide text-sm md:text-base font-sans uppercase"
              >
                Set {currentSet + 1} of {totalSets} • {setTitles[currentSet]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Controls & Mini Progress Indicator */}
          <div className="flex items-center gap-6 self-start md:self-end">
            {/* Custom Circular Progress or Line Progress */}
            <div className="flex flex-col items-end gap-1.5 font-black">
              <span className="text-xs font-mono uppercase tracking-widest text-estate-accent font-black">
                {isAutoPlaying ? 'Cinematic Flow Active' : 'Flow Paused'}
              </span>
              <div className="w-32 h-[4px] bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-estate-accent transition-all duration-100 ease-linear rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Float arrows */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="p-3.5 rounded-full border-2 border-white/20 hover:border-estate-accent text-white hover:text-estate-accent bg-white/5 hover:bg-white/10 transition-all duration-300 transform hover:scale-110 active:scale-95"
                id="btn-prev-photo-set"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={3} />
              </button>
              <button
                onClick={handleNext}
                className="p-3.5 rounded-full border-2 border-white/20 hover:border-estate-accent text-white hover:text-estate-accent bg-white/5 hover:bg-white/10 transition-all duration-300 transform hover:scale-110 active:scale-95"
                id="btn-next-photo-set"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Floating 2 Rows x 3 Columns Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSet}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 col-span-3"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08 }
                },
                exit: {
                  opacity: 0,
                  transition: { staggerChildren: 0.05, staggerDirection: -1 }
                }
              }}
            >
              {currentImages.map((image, idx) => {
                // Alternating float timing & delays for suspended space effect
                const floatDuration = idx % 3 === 0 ? 6 : idx % 3 === 1 ? 8 : 7;
                const floatDelay = idx * 0.4;

                return (
                  <motion.div
                    key={image.id}
                    variants={{
                      hidden: { opacity: 0, y: 40, scale: 0.94 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 60, damping: 15 } },
                      exit: { opacity: 0, y: -40, scale: 0.94, transition: { duration: 0.4 } }
                    }}
                    animate={{
                      y: [0, -8, 0],
                    }}
                    transition={{
                      y: {
                        duration: floatDuration,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: floatDelay
                      }
                    }}
                    className="relative group cursor-pointer"
                  >
                    {/* Floating Luxury frame shadow wrapper */}
                    <div className="absolute inset-0 bg-estate-secondary/90 group-hover:bg-estate-accent/10 rounded-2xl transform scale-98 blur-md -z-10 group-hover:blur-xl transition-all duration-500 shadow-2xl" />

                    <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-estate-charcoal border border-white/10 group-hover:border-estate-accent/40 transition-all duration-500 shadow-2xl group-hover:scale-103 transform">
                      <EditableImage
                        src={image.url}
                        alt={image.caption}
                        imageKey={`gallery-${image.id}`}
                        className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                        loading="lazy"
                      />

                      {/* Cinematic Hover card overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-estate-secondary via-estate-secondary/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none" />
                      
                      <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col justify-end translate-y-3 group-hover:translate-y-0 transition-transform duration-500 z-10 pointer-events-none">
                        <span className="text-xs uppercase tracking-[0.15em] text-estate-accent font-mono font-black mb-2 block">
                          {image.category}
                        </span>
                        <h4 className="text-base font-display font-black tracking-wide text-estate-cream leading-snug">
                          {image.caption}
                        </h4>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Interactive Scroll hint indicator */}
        <div className="flex justify-center mt-12">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="inline-flex items-center gap-2 text-xs text-estate-sage/60 font-mono tracking-widest uppercase border border-white/5 px-4 py-2 rounded-full"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-estate-accent animate-ping" />
            Hover images to freeze flow
          </motion.div>
        </div>

      </div>
    </section>
  );
}
