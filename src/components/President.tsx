import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, Sparkles, X, HeartHandshake } from 'lucide-react';
import { ESTATE_DETAILS } from '../data';
import EditableImage from './EditableImage';

export default function President() {
  const [showFullAddress, setShowFullAddress] = useState(false);

  return (
    <section className="py-24 md:py-32 bg-estate-clay px-6 md:px-12 relative overflow-hidden">
      {/* Decorative luxury lines */}
      <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-estate-accent/35 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-estate-accent/35 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Professional Portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative group mx-auto max-w-sm lg:max-w-none"
          >
            {/* Elegant double border framing */}
            <div className="absolute -inset-4 border-2 border-estate-accent rounded-2xl transform rotate-2 pointer-events-none group-hover:rotate-0 transition-transform duration-700" />
            <div className="absolute -inset-2 bg-gradient-to-b from-estate-accent to-estate-primary opacity-20 blur-sm rounded-2xl" />

            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-2xl bg-estate-primary border-2 border-estate-accent/40">
              <EditableImage
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=800&q=80"
                alt="Estate President - Alhaji Kazeem Alarape"
                className="w-full h-full object-cover grayscale-10 group-hover:grayscale-0 transition-all duration-1000"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-estate-secondary via-estate-secondary/20 to-transparent opacity-85 pointer-events-none" />
              
              {/* President Title Tag inside Portrait */}
              <div className="absolute bottom-6 left-6 right-6 text-white z-20 pointer-events-none">
                <span className="text-xs uppercase font-mono tracking-widest text-estate-accent font-black block mb-1">Estate President</span>
                <h4 className="text-xl font-display font-extrabold text-estate-cream">{ESTATE_DETAILS.presidentName}</h4>
              </div>
            </div>
          </motion.div>

          {/* Right: Welcome Address */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-center text-left"
          >
            <div className="flex items-center gap-3 text-estate-accent mb-4">
              <Quote className="w-10 h-10 opacity-100" strokeWidth={3} />
              <span className="text-sm font-mono font-black uppercase tracking-[0.3em] text-estate-accent">President's Address</span>
            </div>

            <div className="overflow-hidden py-1 mb-6">
              <motion.h3
                animate={{
                  y: ["100%", "0%", "0%", "100%"]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: [0.16, 1, 0.3, 1],
                  times: [0, 0.16, 0.84, 1]
                }}
                className="text-3xl md:text-4xl font-display font-extrabold text-estate-primary tracking-tight leading-tight"
              >
                Leading with Vision, Serving our Community
              </motion.h3>
            </div>

            <div className="text-estate-secondary/95 text-base md:text-lg font-medium leading-relaxed mb-8 space-y-4">
              <p>
                "Welcome to Ire-Akari Estate, a premier residential sanctuary in Soka, Ibadan. Our estate is built on the pillars of serene environments, twenty four hours electricity, and robust security."
              </p>
              <p>
                "We take great pride in our peaceful coexistence, thriving businesses, and the exceptionally high return on investment on our premium properties."
              </p>
            </div>

            {/* Signature Area */}
            <div className="border-t-2 border-estate-primary/10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <span className="text-2xl font-serif italic text-estate-accent font-extrabold block">
                  {ESTATE_DETAILS.presidentSignature}
                </span>
                <span className="text-xs uppercase font-mono tracking-wider text-estate-accent font-black block mt-1.5">
                  {ESTATE_DETAILS.presidentTitle}
                </span>
              </div>

              <button
                onClick={() => setShowFullAddress(true)}
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-estate-primary hover:border-estate-accent rounded-full text-xs font-black tracking-wider uppercase text-estate-primary bg-white hover:bg-estate-primary hover:text-estate-accent transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md"
                id="btn-president-read-more"
              >
                Read Message
              </button>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Full Address Address Modal Overlay */}
      <AnimatePresence>
        {showFullAddress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullAddress(false)}
              className="absolute inset-0 bg-estate-secondary/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-estate-cream rounded-3xl overflow-hidden shadow-2xl border-2 border-estate-accent z-10 flex flex-col max-h-[85vh]"
            >
              <div className="p-6 md:p-8 border-b-2 border-estate-primary/5 flex items-center justify-between bg-estate-primary text-white">
                <div className="flex items-center gap-3">
                  <HeartHandshake className="w-6 h-6 text-estate-accent" strokeWidth={3} />
                  <span className="font-display font-extrabold tracking-wider text-sm md:text-base">Presidential Welcome Address</span>
                </div>
                <button
                  onClick={() => setShowFullAddress(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-estate-sage hover:text-white"
                  id="close-president-modal"
                >
                  <X className="w-6 h-6" strokeWidth={3} />
                </button>
              </div>

              {/* Scrollable contents */}
              <div className="p-8 md:p-10 overflow-y-auto space-y-6 text-estate-secondary font-medium leading-relaxed text-sm md:text-base">
                <p className="font-extrabold text-lg text-estate-primary font-display border-l-4 border-estate-accent pl-4 italic">
                  "Leadership is not a title; it is an unyielding commitment to security, stewardship, and modern progress."
                </p>
                <p>
                  As we steer {ESTATE_DETAILS.name} into a more technologically integrated future, our focal point remains the absolute integrity of our perimeter, the complete automation of our utilities, and the active enrichment of our community relations.
                </p>
                <p>
                  Our resident-first administration is actively deploying redundant solar micro-grids, multi-node fiber backbones, automated guest permission frameworks, and a responsive facility team to guarantee uninterrupted comfort.
                </p>
                <p>
                  We encourage every resident to actively participate in our governance models and collaborative boards, as the beauty of Ire-Akari Estate lies in the collective strength of our wonderful families. Let us continue to build a modern, peaceful, and connected haven together.
                </p>

                <div className="pt-6 border-t-2 border-estate-primary/5">
                  <p className="text-xl font-serif italic text-estate-accent font-extrabold">{ESTATE_DETAILS.presidentSignature}</p>
                  <span className="text-xs uppercase font-mono tracking-wider text-estate-accent font-black block mt-1.5">Association President</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
