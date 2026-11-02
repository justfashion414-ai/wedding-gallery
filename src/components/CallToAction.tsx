import React from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowRight, ShieldCheck, Phone } from 'lucide-react';

interface CallToActionProps {
  onContactClick: () => void;
}

export default function CallToAction({ onContactClick }: CallToActionProps) {
  return (
    <section className="relative py-28 md:py-36 bg-estate-secondary text-white text-center overflow-hidden">
      {/* Premium organic abstract glow in center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-estate-accent/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Diagonal clean golden lines */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-estate-accent/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-estate-accent/30 to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        
        {/* Sparkle emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center justify-center p-4 bg-estate-accent/25 border-2 border-estate-accent rounded-full mb-6 shadow-xl"
        >
          <ShieldCheck className="w-8 h-8 text-estate-accent" strokeWidth={3} />
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight text-estate-cream mb-6 leading-tight"
        >
          Become Part of Our Community
        </motion.h2>

        {/* Minimal Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base sm:text-lg md:text-xl text-estate-clay font-medium max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Secure a peaceful, modern legacy for your family in Soka, Ibadan's premier private residential estate. Your home awaits.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 max-w-lg mx-auto"
        >
          <button
            onClick={onContactClick}
            className="w-full sm:w-auto px-10 py-5 bg-estate-accent text-estate-secondary font-black rounded-full tracking-wider text-sm hover:bg-white hover:text-estate-secondary transition-all duration-300 shadow-2xl flex items-center justify-center gap-3 transform hover:-translate-y-1 active:scale-95 cursor-pointer border-2 border-estate-accent"
            id="cta-contact-office-btn"
          >
            <Phone className="w-5 h-5 text-estate-secondary" strokeWidth={3} />
            <span className="font-black uppercase tracking-wider">Contact Estate Office</span>
          </button>
        </motion.div>

        {/* Subtle bottom disclaimer */}
        <p className="text-xs uppercase tracking-[0.3em] text-estate-accent font-mono font-black mt-16">
          Strictly Managed Access • 24/7 Monitored Integrity
        </p>

      </div>
    </section>
  );
}
