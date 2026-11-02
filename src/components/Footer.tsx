import React from 'react';
import { Palmtree, Mail, Phone, MapPin, Shield, Camera, Share2, Globe, MessageSquare, ArrowUp } from 'lucide-react';
import { ESTATE_DETAILS } from '../data';

interface FooterProps {
  onLinkClick: (sectionId: string) => void;
}

export default function Footer({ onLinkClick }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-estate-secondary text-white py-16 md:py-20 border-t-2 border-estate-accent/30 relative overflow-hidden">
      {/* Decorative vector ring */}
      <div className="absolute -bottom-1/2 right-0 w-[400px] h-[400px] rounded-full border border-estate-accent/5 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start pb-16 border-b border-white/10">
          
          {/* Column 1: Brand details */}
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-estate-accent/20 border-2 border-estate-accent rounded-xl shadow-lg">
                <Palmtree className="w-8 h-8 text-estate-accent" strokeWidth={3} />
              </div>
              <div>
                <span className="font-display font-black text-xl tracking-wider block text-estate-cream uppercase leading-tight">
                  IRE-AKARI ESTATE
                </span>
                <span className="text-xs uppercase tracking-[0.25em] text-estate-accent font-mono font-black block">
                  Soka, Ibadan
                </span>
              </div>
            </div>

            <p className="text-sm text-estate-clay leading-relaxed font-semibold">
              Ibadan's most premier private residential sanctuary. Redefining modern sustainable living, absolute security, thriving businesses, and family-first neighborhood culture.
            </p>

            {/* Social handles */}
            <div className="flex items-center gap-3">
              {[
                { icon: Globe, url: "#" },
                { icon: Camera, url: "#" },
                { icon: Share2, url: "#" },
                { icon: MessageSquare, url: "#" }
              ].map((social, i) => {
                const IconComp = social.icon;
                return (
                  <a
                    key={i}
                    href={social.url}
                    className="p-3 rounded-full bg-white/10 border-2 border-white/20 text-estate-accent hover:text-white hover:border-estate-accent transition-all duration-300 transform hover:scale-110 shadow-md"
                    id={`social-icon-${i}`}
                  >
                    <IconComp className="w-5 h-5" strokeWidth={3} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Column 2: Quick links */}
          <div className="md:col-span-4 grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <span className="font-display font-black text-sm uppercase tracking-widest text-estate-accent block">
                Discover
              </span>
              <ul className="space-y-2 text-xs text-estate-clay font-sans font-bold">
                <li>
                  <button
                    onClick={() => onLinkClick('estate-story-section')}
                    className="hover:text-estate-accent transition-colors cursor-pointer text-left text-sm uppercase tracking-wider"
                  >
                    Our Story
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onLinkClick('estate-communities-section')}
                    className="hover:text-estate-accent transition-colors cursor-pointer text-left text-sm uppercase tracking-wider"
                  >
                    Master Plan
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onLinkClick('estate-gallery-section')}
                    className="hover:text-estate-accent transition-colors cursor-pointer text-left text-sm uppercase tracking-wider"
                  >
                    Photo Gallery
                  </button>
                </li>
                <li className="pt-3 border-t border-white/10 mt-2">
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-estate-accent hover:text-white transition-all duration-300 cursor-pointer text-left text-xs uppercase tracking-widest font-black flex items-center gap-2 group bg-white/5 hover:bg-white/10 px-3.5 py-2.5 rounded-xl border border-estate-accent/30 hover:border-estate-accent"
                  >
                    <span>Back To Top</span>
                    <ArrowUp className="w-4 h-4 transform group-hover:-translate-y-1 transition-transform" strokeWidth={3} />
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <span className="font-display font-black text-sm uppercase tracking-widest text-estate-accent block">
                Resources
              </span>
              <ul className="space-y-2 text-xs text-estate-clay font-sans font-bold">
                <li>
                  <a href="#" className="hover:text-estate-accent transition-colors cursor-pointer text-left text-sm uppercase tracking-wider block">
                    Facility Helpdesk
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-estate-accent transition-colors cursor-pointer text-left text-sm uppercase tracking-wider block">
                    Security Hotline
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 3: Contact info */}
          <div className="md:col-span-4 space-y-4">
            <span className="font-display font-black text-sm uppercase tracking-widest text-estate-accent block">
              Contact Estate Office
            </span>
            
            <ul className="space-y-3.5 text-sm text-estate-clay font-bold leading-relaxed">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-estate-accent mt-0.5 flex-shrink-0" strokeWidth={3} />
                <span>
                  Admin Block, Zone One, {ESTATE_DETAILS.location}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-estate-accent flex-shrink-0" strokeWidth={3} />
                <span>+234 (0) 803 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-estate-accent flex-shrink-0" strokeWidth={3} />
                <span>office@ireakariestate.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright info row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-estate-sage font-black font-mono">
          <p>© {currentYear} {ESTATE_DETAILS.name} Residents Association. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-estate-accent transition-colors">Privacy Charter</a>
            <span className="text-white/10">•</span>
            <a href="#" className="hover:text-estate-accent transition-colors">Security Manual</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
