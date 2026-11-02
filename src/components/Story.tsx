import React from 'react';
import { motion } from 'motion/react';
import { Landmark, Compass, Award } from 'lucide-react';
import { ESTATE_DETAILS } from '../data';
import regeneratedImage from '../assets/images/regenerated_image_1784388308442.png';
import EditableImage from './EditableImage';

export default function Story() {
  return (
    <section className="py-24 md:py-32 bg-estate-cream px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        
        {/* Left Side: Premium Image Container */}
        <motion.div
          initial={{ opacity: 0, x: -60, scale: 0.95 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 relative group"
        >
          {/* Accent Gold Frame behind image */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-estate-accent/15 to-estate-primary/10 rounded-3xl -rotate-1 pointer-events-none group-hover:rotate-0 transition-transform duration-700" />
          
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/5] shadow-2xl bg-estate-clay border-2 border-estate-primary/15">
            <EditableImage
              src={regeneratedImage}
              alt="Luxury Estate Sanctuary Landscape"
              className="w-full h-full object-cover transform scale-102 group-hover:scale-105 transition-transform duration-1000 ease-out"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            {/* Soft dark overlay at bottom for rich aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-t from-estate-secondary/50 via-transparent to-transparent opacity-80" />
            
            {/* Floating Info card */}
            <div className="absolute bottom-6 left-6 right-6 p-6 bg-estate-secondary/95 backdrop-blur-md rounded-2xl border-2 border-estate-accent text-white flex items-center gap-4 shadow-2xl">
              <div className="p-3.5 rounded-xl bg-estate-accent/20 text-estate-accent border border-estate-accent/30">
                <Landmark className="w-8 h-8" strokeWidth={3} />
              </div>
              <div>
                <span className="text-sm uppercase font-mono tracking-widest text-estate-accent font-black block mb-1">Established</span>
                <span className="text-xl font-display font-extrabold text-estate-cream block">Soka, Ibadan, 1996</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Text & Story */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 flex flex-col justify-center"
        >
          <span className="text-sm font-mono font-black uppercase tracking-[0.3em] text-estate-accent mb-4 block">
            Our Legacy
          </span>
          <div className="overflow-hidden mb-8">
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
              A Sanctuary Crafted for Peaceful Coexistence
            </motion.h2>
          </div>

          <div className="space-y-6 text-estate-secondary/90 text-base md:text-lg font-medium leading-relaxed">
            <p>
              Founded in 1996 in the historic city of Ibadan, specifically Soka, {ESTATE_DETAILS.name} was envisioned as a master-planned haven where modern world-class infrastructure meets absolute tranquility. Over the years, it has matured into Ibadan's most secure and peaceful residential estate.
            </p>
            <p>
              Every zone has been precisely structured to foster thriving businesses and serene environments. Broad, secure tree-lined avenues and custom ecological green pathways provide an exceptional living standard with high return on investment on properties.
            </p>
            <p className="border-l-4 border-estate-accent pl-5 italic text-estate-primary/95 font-extrabold text-lg md:text-xl leading-relaxed">
              We did not merely build structures. We designed an organized community that guarantees twenty four hours electricity, robust modern protection, and a model for prosperous growth.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t-2 border-estate-primary/10">
            <div className="flex gap-4 items-center">
              <Compass className="w-8 h-8 text-estate-accent flex-shrink-0" strokeWidth={3} />
              <div>
                <span className="font-display font-extrabold text-estate-primary text-2xl block leading-tight">45+ Acres</span>
                <span className="text-xs text-estate-accent font-black uppercase tracking-wider block">Serene Landscapes</span>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <Award className="w-8 h-8 text-estate-accent flex-shrink-0" strokeWidth={3} />
              <div>
                <span className="font-display font-extrabold text-estate-primary text-2xl block leading-tight">Gold Certified</span>
                <span className="text-xs text-estate-accent font-black uppercase tracking-wider block">Peaceful Living</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
