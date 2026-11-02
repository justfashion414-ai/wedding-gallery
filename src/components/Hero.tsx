import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield, Palmtree, ChevronDown, User, Compass } from 'lucide-react';
import { ESTATE_DETAILS } from '../data';
import EditableImage from './EditableImage';

interface HeroProps {
  onExploreClick: () => void;
}

export default function Hero({ onExploreClick }: HeroProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play video safely on mount and handle state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked by some browsers initially
      });
    }
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-estate-secondary text-white">
      {/* Full-Screen Background Video */}
      <video
        ref={videoRef}
        src="/hero-video.mp4"
        autoPlay
        muted
        loop
        playsInline
        onCanPlayThrough={() => setVideoLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 z-10 opacity-100"
      />

      {/* Floating Header */}
      <header className="absolute top-0 left-0 w-full p-6 md:p-10 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden pointer-events-auto">
            <EditableImage imageKey="estate-header-logo" className="w-full h-full object-cover flex items-center justify-center">
              <div className="p-3 bg-estate-accent/20 border-2 border-estate-accent rounded-xl shadow-lg flex items-center justify-center w-full h-full">
                <Palmtree className="w-8 h-8 text-estate-accent" strokeWidth={3} />
              </div>
            </EditableImage>
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-wider block leading-tight text-estate-cream uppercase">
              IRE-AKARI ESTATE
            </span>
            <span className="text-xs uppercase tracking-[0.25em] text-estate-accent font-mono font-extrabold block">
              Soka, Ibadan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
        </div>
      </header>

      {/* Hero Content Superimposed Directly Over Background Video */}
      <div className="relative z-20 text-center px-6 max-w-4xl mx-auto mt-16 flex flex-col items-center">
        {/* Animated Estate Logo Emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="rounded-full overflow-hidden w-24 h-24 mb-8 border-2 border-estate-accent shadow-2xl bg-estate-cream/10 backdrop-blur-md flex items-center justify-center pointer-events-auto"
        >
          <EditableImage imageKey="estate-center-logo" className="w-full h-full object-cover">
            <div className="relative p-4 flex items-center justify-center w-full h-full">
              <Shield className="w-12 h-12 text-estate-accent animate-pulse" strokeWidth={3} />
              <Palmtree className="w-6 h-6 text-estate-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={3} />
            </div>
          </EditableImage>
        </motion.div>

        {/* Animated Estate Name */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-5xl sm:text-6xl md:text-8xl font-display font-extrabold tracking-tight text-estate-cream mb-6 drop-shadow-xl"
        >
          {ESTATE_DETAILS.name}
        </motion.h1>

        {/* Animated Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-lg sm:text-xl md:text-2xl text-estate-clay font-medium max-w-2xl mx-auto mb-10 tracking-wide font-sans leading-relaxed drop-shadow-md"
        >
          Serene Environments <span className="text-estate-accent text-xl font-extrabold">•</span> Good Security <span className="text-estate-accent text-xl font-extrabold">•</span> Twenty Four Hours Electricity
        </motion.p>

        {/* Animated Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto"
        >
          <button
            onClick={onExploreClick}
            className="w-full sm:w-auto px-10 py-5 bg-estate-accent text-estate-secondary font-black rounded-full tracking-wider text-sm hover:bg-white hover:text-estate-secondary transition-all duration-300 shadow-2xl flex items-center justify-center gap-3 transform hover:-translate-y-1 active:scale-95 border-2 border-estate-accent"
            id="hero-explore-btn"
          >
            <Compass className="w-5 h-5" strokeWidth={3} />
            <span className="font-black tracking-wider uppercase">Explore Estate</span>
          </button>
        </motion.div>
      </div>

      {/* Floating bottom indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-estate-accent font-mono font-black drop-shadow-sm">
          Scroll to discover
        </span>
        <motion.button
          onClick={onExploreClick}
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="p-3 rounded-full bg-estate-cream/10 border-2 border-estate-accent/40 text-estate-accent hover:bg-estate-cream/20 transition-colors duration-300"
          id="btn-scroll-indicator"
        >
          <ChevronDown className="w-5 h-5" strokeWidth={3} />
        </motion.button>
      </div>
    </section>
  );
}
