import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, MapPin, Navigation, Info, Eye, Compass, X, CheckCircle } from 'lucide-react';
import { MAP_LOCATIONS } from '../data';
import { MapLocation } from '../types';

export default function InteractiveMap() {
  const [activeLocation, setActiveLocation] = useState<MapLocation>(MAP_LOCATIONS[0]);
  const [showFullMapModal, setShowFullMapModal] = useState(false);

  // Helper to get location color / marker style
  const getMarkerColor = (type: MapLocation['type']) => {
    switch (type) {
      case 'gate':
        return 'bg-emerald-500 border-emerald-300';
      case 'emergency':
        return 'bg-red-500 border-red-300';
      case 'park':
        return 'bg-green-600 border-green-300';
      case 'shopping':
        return 'bg-amber-500 border-amber-300';
      default:
        return 'bg-estate-accent border-yellow-200';
    }
  };

  return (
    <section className="py-24 md:py-32 bg-estate-clay px-6 md:px-12 relative overflow-hidden" id="estate-map-section">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-mono font-black uppercase tracking-[0.3em] text-estate-accent mb-4 block">
            Digital Survey
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
              Estate Layout & Infrastructure
            </motion.h2>
          </div>
          <p className="mt-4 text-estate-secondary/80 font-medium text-base md:text-lg">
            Interact with our birds-eye architectural schematic to locate administrative security hubs, premium amenities, ecological parks, and spiritual centers.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Left Panel: The Vector Map */}
          <div className="lg:col-span-8 bg-estate-secondary border border-white/10 rounded-3xl p-6 md:p-8 relative min-h-[400px] lg:min-h-[500px] shadow-2xl flex flex-col justify-between overflow-hidden group">
            {/* SVG Abstract Background Map Grid representing modern avenues */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                {/* Lakes */}
                <circle cx="70%" cy="35%" r="100" fill="#4299e1" />
                <ellipse cx="20%" cy="20%" rx="150" ry="60" fill="#4299e1" />
                
                {/* Main Boulevard Grid */}
                <line x1="15%" y1="0%" x2="15%" y2="100%" stroke="white" strokeWidth="6" />
                <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="white" strokeWidth="4" />
                <line x1="80%" y1="0%" x2="80%" y2="100%" stroke="white" strokeWidth="4" />
                
                {/* Avenues cross-connectors */}
                <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="white" strokeWidth="4" />
                <line x1="0%" y1="60%" x2="100%" y2="60%" stroke="white" strokeWidth="4" />
                <line x1="0%" y1="85%" x2="100%" y2="85%" stroke="white" strokeWidth="6" />
                
                {/* Botanical green grids */}
                <rect x="58%" y="10%" width="120" height="150" fill="#48bb78" rx="20" />
                <rect x="2%" y="45%" width="100" height="80" fill="#48bb78" rx="10" />
              </svg>
            </div>

            {/* Map title overlay */}
            <div className="relative z-10 flex items-center justify-between text-white mb-6">
              <div className="flex items-center gap-2 bg-black/45 border-2 border-estate-accent/30 px-5 py-3 rounded-xl backdrop-blur-md shadow-lg">
                <Compass className="w-5 h-5 text-estate-accent animate-spin-slow" strokeWidth={3} />
                <span className="text-xs uppercase tracking-[0.2em] font-mono font-black text-estate-cream">Interactive Plan View</span>
              </div>
            </div>

            {/* Glowing Coordinate Pins */}
            <div className="relative w-full h-full flex-grow min-h-[300px]">
              {MAP_LOCATIONS.map((loc: MapLocation) => {
                const isActive = activeLocation.id === loc.id;
                const markerStyle = getMarkerColor(loc.type);

                return (
                  <button
                    key={loc.id}
                    onClick={() => setActiveLocation(loc)}
                    className="absolute group/pin cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 animate-fade-in"
                    style={{ left: `${loc.coordinates.x}%`, top: `${loc.coordinates.y}%` }}
                    id={`map-pin-${loc.id}`}
                  >
                    {/* Ring Pulse for active location */}
                    {isActive ? (
                      <span className="absolute -inset-5 rounded-full bg-estate-accent/40 animate-ping" />
                    ) : (
                      <span className="absolute -inset-4 rounded-full bg-white/20 scale-75 group-hover/pin:scale-110 group-hover/pin:animate-pulse transition-all" />
                    )}

                    {/* Pin Marker */}
                    <div className={`relative p-3 rounded-full border-2 shadow-2xl transition-all duration-300 ${
                      isActive ? 'bg-estate-accent text-estate-secondary scale-125 border-white' : 'text-white border-white/50 hover:scale-120 ' + markerStyle
                    }`}>
                      <MapPin className="w-5 h-5" strokeWidth={3} />
                    </div>

                    {/* Tooltip Hover Overlay */}
                    <span className="absolute top-12 left-1/2 -translate-x-1/2 bg-estate-secondary border-2 border-estate-accent text-xs text-estate-cream font-mono font-black py-1.5 px-4 rounded-xl whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity duration-300 pointer-events-none shadow-2xl z-20">
                      {loc.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Map footer overlay */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-4 border-t-2 border-white/10 text-white/85 text-xs font-black">
              <span className="font-mono text-sm tracking-wider uppercase text-estate-accent">Compass Orientation: North High Ridge</span>
              <button
                onClick={() => setShowFullMapModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-estate-accent text-estate-secondary font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white hover:text-estate-secondary transition-all duration-300 shadow-2xl"
                id="btn-open-full-map"
              >
                <Eye className="w-5 h-5" strokeWidth={3} />
                Open Full Map
              </button>
            </div>
          </div>

          {/* Right Panel: Location Details Card */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-white border-2 border-estate-primary/10 rounded-3xl p-8 shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeLocation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-4 bg-estate-primary/5 border-2 border-estate-primary/15 rounded-2xl text-estate-primary shadow-md">
                    <Navigation className="w-6 h-6 text-estate-accent" strokeWidth={3} />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono tracking-widest text-estate-accent font-black block mb-1">
                      Location Hotspot
                    </span>
                    <h3 className="text-2xl font-display font-black text-estate-primary leading-tight">
                      {activeLocation.name}
                    </h3>
                  </div>
                </div>

                <div className="h-[2px] bg-estate-primary/10 rounded-full" />

                <div className="space-y-4">
                  <span className="inline-flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider px-3.5 py-1.5 bg-estate-primary text-estate-accent rounded-xl border-2 border-estate-accent shadow-md">
                    <CheckCircle className="w-4 h-4 text-estate-accent" strokeWidth={3} />
                    Status: Fully Managed
                  </span>

                  <p className="text-base text-estate-secondary/95 leading-relaxed font-semibold">
                    {activeLocation.description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 pt-6 border-t-2 border-estate-primary/10">
              <div className="bg-estate-clay p-5 rounded-2xl border-2 border-estate-primary/10 flex items-start gap-3 shadow-inner">
                <Info className="w-5 h-5 text-estate-accent mt-0.5 flex-shrink-0" strokeWidth={3} />
                <p className="text-xs text-estate-secondary/90 leading-relaxed font-medium">
                  Select other coordinate pins on the map panel directly to view custom features. All installations are backed by redundant fiber loops and high security patrols.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Full Map Modal */}
      <AnimatePresence>
        {showFullMapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullMapModal(false)}
              className="absolute inset-0 bg-estate-secondary/80 backdrop-blur-md"
            />

            {/* Modal Card Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="relative w-full max-w-5xl bg-estate-cream rounded-3xl overflow-hidden shadow-2xl border border-estate-accent/30 z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-estate-primary/10 flex items-center justify-between bg-estate-primary text-white">
                <div className="flex items-center gap-3">
                  <Map className="w-5 h-5 text-estate-accent" />
                  <span className="font-display font-semibold tracking-wider text-sm md:text-base">Comprehensive Layout Plan</span>
                </div>
                <button
                  onClick={() => setShowFullMapModal(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-estate-sage hover:text-white"
                  id="close-full-map-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Enhanced Full Vector Map Section */}
              <div className="flex-grow overflow-auto p-8 flex items-center justify-center bg-estate-secondary min-h-[400px]">
                <div className="relative w-full max-w-4xl aspect-[16/10] bg-estate-secondary/95 border border-white/5 rounded-2xl overflow-hidden shadow-inner p-4">
                  {/* Absolute SVG lines inside Modal */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <svg width="100%" height="100%">
                      <circle cx="70%" cy="35%" r="140" fill="#4299e1" />
                      <ellipse cx="20%" cy="20%" rx="180" ry="80" fill="#4299e1" />
                      
                      <line x1="15%" y1="0%" x2="15%" y2="100%" stroke="white" strokeWidth="8" />
                      <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="white" strokeWidth="6" />
                      <line x1="80%" y1="0%" x2="80%" y2="100%" stroke="white" strokeWidth="6" />
                      
                      <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="white" strokeWidth="6" />
                      <line x1="0%" y1="60%" x2="100%" y2="60%" stroke="white" strokeWidth="6" />
                      <line x1="0%" y1="85%" x2="100%" y2="85%" stroke="white" strokeWidth="8" />
                    </svg>
                  </div>

                  {/* Pin elements rendered larger */}
                  {MAP_LOCATIONS.map((loc: MapLocation) => {
                    const isActive = activeLocation.id === loc.id;
                    const markerStyle = getMarkerColor(loc.type);

                    return (
                      <button
                        key={`full-${loc.id}`}
                        onClick={() => setActiveLocation(loc)}
                        className="absolute group/pin cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                        style={{ left: `${loc.coordinates.x}%`, top: `${loc.coordinates.y}%` }}
                      >
                        {isActive && <span className="absolute -inset-4 rounded-full bg-estate-accent/30 animate-ping" />}
                        <div className={`relative p-3 rounded-full border-2 shadow-2xl transition-all duration-300 ${
                          isActive ? 'bg-estate-accent text-estate-secondary scale-125 border-white' : 'text-white border-white/40 hover:scale-115 ' + markerStyle
                        }`}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="absolute top-12 left-1/2 -translate-x-1/2 bg-estate-secondary border border-estate-accent/30 text-[10px] text-estate-cream font-mono py-1.5 px-4 rounded-xl whitespace-nowrap opacity-100 transition-opacity shadow-2xl z-20">
                          {loc.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal active detail footer */}
              <div className="p-6 bg-estate-clay border-t border-estate-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-display font-bold text-estate-primary text-base">{activeLocation.name}</h4>
                  <p className="text-xs text-estate-secondary/70 max-w-xl">{activeLocation.description}</p>
                </div>
                <button
                  onClick={() => setShowFullMapModal(false)}
                  className="px-6 py-3 bg-estate-primary text-estate-accent font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-estate-secondary transition-colors self-start md:self-auto"
                >
                  Close Map
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
