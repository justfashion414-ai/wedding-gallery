import React from 'react';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { COMMUNITIES } from '../data';
import { CommunityZone } from '../types';

export default function Communities() {
  return (
    <section className="py-24 md:py-32 bg-estate-clay px-6 md:px-12 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full border border-estate-primary/5 pointer-events-none" />
      <div className="absolute -bottom-1/4 -left-1/4 w-[800px] h-[800px] rounded-full border border-estate-accent/5 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-sm font-mono font-black uppercase tracking-[0.3em] text-estate-accent mb-4 block">
            The Master Plan
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
              className="text-3xl md:text-5xl font-display font-extrabold text-estate-primary tracking-tight"
            >
              Designed Districts
            </motion.h2>
          </div>
          <p className="mt-4 text-estate-secondary/80 font-medium text-base md:text-lg">
            Discover the four designated zones that comprise the organized, secure, and thriving ecosystem of Ire-Akari Estate.
          </p>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {COMMUNITIES.map((zone: CommunityZone, index: number) => {
            // Dynamically resolve icon
            const IconComponent = (Icons as any)[zone.iconName] || Icons.Home;

            return (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.1, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
                whileHover={{ 
                  y: -12, 
                  scale: 1.03,
                  transition: { duration: 0.4, ease: "easeOut" }
                }}
                className="bg-estate-cream/90 backdrop-blur-md rounded-3xl p-8 border-2 border-estate-primary/5 hover:border-estate-accent transition-all duration-500 shadow-lg hover:shadow-2xl flex flex-col justify-between group h-full cursor-pointer"
              >
                <div>
                  {/* Floating Icon Shield */}
                  <div className="inline-flex p-4 rounded-2xl bg-estate-primary/5 border-2 border-estate-primary/10 text-estate-primary group-hover:bg-estate-primary group-hover:text-estate-accent group-hover:border-estate-accent/20 transition-all duration-500 mb-6 shadow-md">
                    <IconComponent className="w-8 h-8 transition-transform duration-500 group-hover:rotate-6" strokeWidth={3} />
                  </div>

                  {/* Community Details */}
                  <h3 className="text-xl font-display font-extrabold text-estate-primary group-hover:text-estate-accent transition-colors">
                    {zone.name}
                  </h3>
                  {zone.alias && (
                    <div className="text-xs uppercase font-mono font-black tracking-wider text-estate-accent mb-3 block mt-1">
                      {zone.alias}
                    </div>
                  )}
                  <p className="text-sm text-estate-secondary/90 leading-relaxed font-medium font-sans mb-6">
                    {zone.description}
                  </p>
                </div>

                {/* Subtle luxury anchor line */}
                <div className="w-12 h-[3px] bg-estate-accent/25 group-hover:w-full group-hover:bg-estate-accent transition-all duration-500 rounded-full" />
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
