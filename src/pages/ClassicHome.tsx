import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, Phone, MapPin, X, CheckCircle, Send, Award, ShieldAlert, ArrowUp } from 'lucide-react';

import Hero from '../components/Hero';
import Story from '../components/Story';
import AnniversarySection from '../components/AnniversarySection';
import Communities from '../components/Communities';
import Announcements from '../components/Announcements';
import President from '../components/President';
import FloatingPhotoGrid from '../components/FloatingPhotoGrid';
import Gallery from '../components/Gallery';
import CallToAction from '../components/CallToAction';
import Footer from '../components/Footer';

export default function ClassicHome() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Scroll tracking state
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll helper
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    // Simulate SMTP delivery
    setTimeout(() => {
      setIsSending(false);
      setContactSuccess(true);
      // Reset after a short delay
      setTimeout(() => {
        setContactSuccess(false);
        setIsContactOpen(false);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      }, 2500);
    }, 1500);
  };

  return (
    <div className="relative font-sans text-estate-secondary antialiased bg-estate-cream selection:bg-estate-accent selection:text-estate-secondary">
      
      {/* 1. HERO SECTION */}
      <Hero
        onExploreClick={() => scrollToSection('estate-story-section')}
      />

      {/* 2. ESTATE STORY SECTION */}
      <div id="estate-story-section">
        <Story />
      </div>

      {/* 30TH ANNIVERSARY SPECIAL SECTION */}
      <AnniversarySection />

      {/* 5. ESTATE PRESIDENT SECTION */}
      <div id="estate-president-section">
        <President />
      </div>

      {/* 3. ESTATE COMMUNITIES SECTION */}
      <div id="estate-communities-section">
        <Communities />
      </div>

      {/* 4. ESTATE ANNOUNCEMENT SECTION */}
      <div id="estate-announcements-section">
        <Announcements />
      </div>

      {/* 6. FLOATING PHOTO GRID EXPERIENCE */}
      <div id="estate-photogrid-section">
        <FloatingPhotoGrid />
      </div>

      {/* 7. ESTATE GALLERY SECTION */}
      <div id="estate-gallery-section">
        <Gallery />
      </div>

      {/* 9. CALL TO ACTION */}
      <CallToAction
        onContactClick={() => setIsContactOpen(true)}
      />

      {/* 10. REFINED MINIMALIST FOOTER */}
      <Footer
        onLinkClick={(sectionId) => scrollToSection(sectionId)}
      />



      {/* 12. CONTACT OFFICE MODAL */}
      <AnimatePresence>
        {isContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsContactOpen(false)}
              className="absolute inset-0 bg-estate-secondary/85 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-lg bg-estate-cream rounded-3xl overflow-hidden shadow-2xl border border-estate-accent/30 z-10 flex flex-col"
            >
              <div className="p-6 border-b border-estate-primary/10 flex items-center justify-between bg-estate-primary text-white">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-estate-accent" />
                  <span className="font-display font-semibold tracking-wider text-sm">Contact Estate Secretariat</span>
                </div>
                <button
                  onClick={() => setIsContactOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-estate-sage hover:text-white transition-colors"
                  id="close-contact-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content panel */}
              <div className="p-8 bg-white text-left text-sm font-sans">
                <AnimatePresence mode="wait">
                  {!contactSuccess ? (
                    <motion.form
                      key="contact-form"
                      onSubmit={handleContactSubmit}
                      className="space-y-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <p className="text-xs text-estate-secondary/70 leading-relaxed mb-4">
                        Send an official message to our secretariat desk. All queries are logged, categorized, and assigned to the relevant department within 2 hours.
                      </p>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase font-mono tracking-wider text-estate-sage">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Your Name"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full px-4 py-3 border border-estate-primary/10 rounded-xl focus:border-estate-accent focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase font-mono tracking-wider text-estate-sage">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="your.email@example.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-4 py-3 border border-estate-primary/10 rounded-xl focus:border-estate-accent focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase font-mono tracking-wider text-estate-sage">Message / Inquiry</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Enter your query details..."
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          className="w-full px-4 py-3 border border-estate-primary/10 rounded-xl focus:border-estate-accent focus:outline-none transition-colors resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSending}
                        className="w-full py-4 bg-estate-primary text-estate-accent hover:bg-estate-secondary font-bold uppercase text-xs tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
                        id="submit-contact-form-btn"
                      >
                        {isSending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-estate-accent border-t-transparent rounded-full animate-spin" />
                            Sending Dispatch...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Dispatch Message
                          </>
                        )}
                      </button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="contact-success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-12 text-center space-y-4"
                    >
                      <div className="inline-flex p-4 bg-emerald-50 text-emerald-500 rounded-full border border-emerald-100 mb-2 animate-bounce">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-display font-bold text-estate-primary">Dispatch Transmitted</h4>
                      <p className="text-xs text-estate-sage max-w-sm mx-auto">
                        Your message has been successfully routed to the Meridian Crest Residents Association Secretariat. We will respond via email shortly.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scroll Progress Tracker Line close to the edge of the screen */}
      <div className="fixed right-1 md:right-1.5 top-1/2 -translate-y-1/2 z-40 hidden sm:block pointer-events-none">
        <div className="w-1 md:w-1.5 h-32 bg-estate-primary/15 rounded-full relative overflow-hidden border border-estate-primary/5">
          <motion.div 
            className="absolute top-0 left-0 w-full bg-estate-accent rounded-full"
            style={{ height: `${scrollProgress}%` }}
          />
        </div>
      </div>

    </div>
  );
}
