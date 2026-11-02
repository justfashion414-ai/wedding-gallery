import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Key, ShieldAlert, CheckCircle, Smartphone, LogIn, Activity, Settings, 
  Eye, EyeOff, ShieldCheck, LogOut, Send, AlertTriangle, Radio, PhoneCall, 
  Plus, Trash2, MapPin, Sparkles, Building, UserCheck, Users, Briefcase, Award,
  ShoppingBag, Check, CreditCard, Shield, Bolt, Landmark, Calendar, Search,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { LoginType } from '../types';
import EditableImage from './EditableImage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: LoginType;
}

// Interfaces for our stateful elements
interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  leaseStart: string;
}

interface Report {
  id: string;
  title: string;
  category: string;
  date: string;
  status: 'Pending' | 'Investigating' | 'Resolved';
}

interface StoreItem {
  id: string;
  name: string;
  price: string;
  description: string;
  icon: any;
  category: string;
}

export default function LoginModal({ isOpen, onClose, initialType = 'resident' }: LoginModalProps) {
  const [loginStep, setLoginStep] = useState<'options' | 'form' | 'dashboard'>('options');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<LoginType>(initialType);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Zone (if logged in as Resident)
  const [residentZone, setResidentZone] = useState<string>('Zone Three');

  // --- LOCAL EDITABLE STATE ENGINES (PROFILES) ---
  const [profileName, setProfileName] = useState('Emeka Obi');
  const [profilePhone, setProfilePhone] = useState('+234 803 111 2222');
  const [profileUnit, setProfileUnit] = useState('Block B2, Flat 4');
  const [profileVehicle, setProfileVehicle] = useState('LA-234-IKJ');

  const [landlordName, setLandlordName] = useState('Chief Mrs. Florence Balogun');
  const [landlordPhone, setLandlordPhone] = useState('+234 805 333 4444');
  const [landlordUnit, setLandlordUnit] = useState('Sunset Grove, Plot 4');
  const [landlordCompany, setLandlordCompany] = useState('Balogun Holdings Ltd');

  // Super Admin / President State
  const [adminName, setAdminName] = useState('Alhaji Kazeem Alarape');
  const [adminPhone, setAdminPhone] = useState('+234 802 777 8888');
  const [adminDesignation, setAdminDesignation] = useState('President, Ire-Akari Association');
  const [gateLocked, setGateLocked] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- STORE / UTILITIES MARKETPLACE STATE ---
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const storeItems: StoreItem[] = [
    { 
      id: 'ST-01', 
      name: 'RFID Vehicle Access Tag', 
      price: '₦15,000', 
      description: 'Hands-free automated gate opening tag for main entrance & zone barriers.',
      icon: Shield,
      category: 'Security'
    },
    { 
      id: 'ST-02', 
      name: '150 kWh Solar Utility Token', 
      price: '₦22,500', 
      description: 'Instant prepaid power units for the Ire-Akari smart green solar grid.',
      icon: Bolt,
      category: 'Utilities'
    },
    { 
      id: 'ST-03', 
      name: '30th Anniversary Car Plaque', 
      price: '₦10,000', 
      description: 'Polished brass embossed vehicle emblem celebrating 30 years of legacy (1996-2026).',
      icon: Award,
      category: 'Anniversary Merch'
    },
    { 
      id: 'ST-04', 
      name: 'Jubilee Gala Dinner Ticket', 
      price: '₦45,000', 
      description: 'VVIP admission to the Grand Anniversary Banquet on August 22nd at the Botanical Preserve.',
      icon: Calendar,
      category: 'Events'
    }
  ];

  // --- DYNAMIC DATA COLLECTIONS ---
  // Tenants (Landlord Only)
  const [tenants, setTenants] = useState<Tenant[]>([
    { id: '1', name: 'Dr. John Kayode', email: 'j.kayode@gmail.com', phone: '+234 812 555 1234', unit: 'Plot 4, Villa A', leaseStart: 'Jan 2025' },
    { id: '2', name: 'Amina Bello', email: 'amina.b@yahoo.com', phone: '+234 905 444 9876', unit: 'Plot 4, Villa B', leaseStart: 'Jun 2024' },
  ]);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantUnit, setNewTenantUnit] = useState('Plot 4, Villa C');
  const [newTenantLease, setNewTenantLease] = useState('Aug 2026');

  // Reports (Shared)
  const [reports, setReports] = useState<Report[]>([
    { id: 'IA-412', title: 'Street light repair request on Solar Ave', category: 'Infrastructure', date: 'July 15, 2026', status: 'Resolved' },
    { id: 'IA-419', title: 'Guest parking clearance for Saturday event', category: 'Security', date: 'July 18, 2026', status: 'Pending' },
  ]);
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState('Security');

  // Resident Database (Admin Only)
  const [residentsDb, setResidentsDb] = useState([
    { id: 'R001', name: 'Emeka Obi', zone: 'Parakoyi/Oloya Zone', unit: 'Block B2, Flat 4', status: 'Active', securityCheck: 'Passed' },
    { id: 'R002', name: 'Alhaji Idris Usman', zone: 'Pace Setter Zone', unit: 'Broad St, Plot 12', status: 'Active', securityCheck: 'Passed' },
    { id: 'R003', name: 'Chief Mrs. Florence Balogun', zone: 'Ogun/Osun/NUT Zone', unit: 'Plot 4 Villa', status: 'Active', securityCheck: 'Passed' },
    { id: 'R004', name: 'Kemi Adesina', zone: 'Unity & Peace Zone', unit: 'Orchard Dr, Block 3', status: 'Active', securityCheck: 'Passed' },
    { id: 'R005', name: 'Obinna Okafor', zone: 'Parakoyi/Oloya Zone', unit: 'Coexistence Blvd, Pl 5', status: 'Active', securityCheck: 'Passed' },
  ]);

  // Zone Chairmen Info (Admin Only)
  const chairmen = [
    { zone: "Pace Setter Zone", name: "Chief Alao Ojo", phone: "+234 803 777 1111", activity: "Broad Street RFID gates calibration" },
    { zone: "Unity & Peace Zone", name: "Pastor Kolawole Alabi", phone: "+234 802 888 2222", activity: "Botanical garden layout expansion" },
    { zone: "Parakoyi/Oloya Zone", name: "Engr. Mustapha Yusuf", phone: "+234 805 999 3333", activity: "Coordinating smart microgrid check" },
    { zone: "Ogun/Osun/NUT Zone", name: "Chief (Mrs) Toyin Adeyemi", phone: "+234 809 111 4444", activity: "Sunset heights road asphalt repair" },
  ];

  // Committees Info (Admin Only)
  const committees = [
    { name: "Security & Patrol Board", head: "Retired Col. S. Balogun", role: "Dynamic coordinate patrol lines & gate authorization encryption" },
    { name: "Power & Energy Nexus Panel", head: "Engr. Mustapha Yusuf", role: "Load balancing & 24h solar grid maintenance" },
    { name: "Environmental & Botanical Committee", head: "Mrs. Bunmi Alao", role: "Botanical preserve curation, waste sorting, and park maintenance" },
    { name: "Resident Welfare & Integration Association", head: "Pastor Kolawole Alabi", role: "Conflict resolution, community integration, and welfare distribution" },
  ];

  // Escorts (Admin Only)
  const escorts = [
    { name: "Commander Kelechi", status: "Patrolling Zone One", icon: Shield },
    { name: "Sergeant Yusuf", status: "Main Entrance Gatehouse Security", icon: ShieldCheck },
    { name: "Officer Adebayo", status: "On-Call Emergency Dispatch", icon: Radio },
  ];

  // ACTIVE SIDEBAR TAB SELECTION
  const [activeTab, setActiveTab] = useState<string>('profile');

  // Quick Zone login handler
  const handleZoneLogin = (zoneName: string) => {
    setSelectedType('resident');
    setResidentZone(zoneName);
    
    // Set matching profile properties
    if (zoneName === 'Zone One') {
      setProfileName('Kola Olumide');
      setProfilePhone('+234 806 222 3333');
      setProfileUnit('Broad Street, Villa 10');
    } else if (zoneName === 'Zone Two') {
      setProfileName('Abiodun Alao');
      setProfilePhone('+234 809 444 5555');
      setProfileUnit('Orchard Drive, Block D');
    } else if (zoneName === 'Zone Three') {
      setProfileName('Emeka Obi');
      setProfilePhone('+234 803 111 2222');
      setProfileUnit('Block B2, Flat 4');
    } else {
      setProfileName('Chinedu Egwu');
      setProfilePhone('+234 812 777 9999');
      setProfileUnit('Sunset Heights, Block H');
    }
    
    setActiveTab('profile');
    setLoginStep('dashboard');
  };

  const handleSelectOption = (type: LoginType) => {
    setSelectedType(type);
    setLoginStep('form');
    // Pre-fill demo data
    setEmail(`${type}@ireakariestate.com`);
    setPassword('demopass123');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setActiveTab('profile');
      setLoginStep('dashboard');
    }, 1200);
  };

  const handleReset = () => {
    setLoginStep('options');
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  // Add Tenant (Landlord Only)
  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantEmail) return;
    const newT: Tenant = {
      id: String(tenants.length + 1),
      name: newTenantName,
      email: newTenantEmail,
      phone: newTenantPhone || '+234 800 000 0000',
      unit: newTenantUnit,
      leaseStart: newTenantLease
    };
    setTenants([...tenants, newT]);
    setNewTenantName('');
    setNewTenantEmail('');
    setNewTenantPhone('');
    // Mock update main directory too
    const newRes = {
      id: `R00${residentsDb.length + 1}`,
      name: newTenantName,
      zone: 'Zone Four',
      unit: newTenantUnit,
      status: 'Active',
      securityCheck: 'Passed'
    };
    setResidentsDb([...residentsDb, newRes]);
  };

  // Delete Tenant (Landlord Only)
  const handleDeleteTenant = (id: string) => {
    setTenants(tenants.filter(t => t.id !== id));
  };

  // Submit Report (Resident & Landlord)
  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle) return;
    const newRep: Report = {
      id: `IA-${Math.floor(100 + Math.random() * 900)}`,
      title: reportTitle,
      category: reportCategory,
      date: 'Today, July 2026',
      status: 'Pending'
    };
    setReports([newRep, ...reports]);
    setReportTitle('');
  };

  // Buy item trigger
  const handleBuyItem = (item: StoreItem) => {
    setCartMessage(`Successfully Ordered! Code: IA-PAY-${Math.floor(1000 + Math.random() * 9000)}. Present this to the Administrative Gatehouse to collect your ${item.name}.`);
    setTimeout(() => {
      setCartMessage(null);
    }, 6000);
  };

  if (!isOpen) return null;

  // Render Portal theme variations based on selected credential type
  const getPortalTheme = () => {
    switch (selectedType) {
      case 'admin':
        return {
          title: "Super Admin Workspace",
          bg: "bg-slate-950",
          cardBg: "bg-slate-900 border-amber-500/40",
          sidebarBg: "bg-slate-900 border-r-4 border-amber-500/30",
          accentColor: "text-amber-400",
          accentBg: "bg-amber-500/15 border-amber-500/40",
          accentBtn: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black",
          accentBadge: "bg-amber-500/35 text-amber-300 border-2 border-amber-500/60",
          navBg: "bg-slate-900 border-b-4 border-amber-500",
          label: "ADMIN SECURITY PORTAL",
          primaryText: "text-amber-400",
          sidebarActiveTab: "bg-amber-500 text-slate-950 border-r-8 border-white"
        };
      case 'landlord':
        return {
          title: "Landlord Asset Console",
          bg: "bg-red-950",
          cardBg: "bg-stone-900 border-amber-600/40",
          sidebarBg: "bg-stone-900 border-r-4 border-amber-600/30",
          accentColor: "text-amber-300",
          accentBg: "bg-amber-600/15 border-amber-600/40",
          accentBtn: "bg-amber-600 hover:bg-amber-700 text-white font-black",
          accentBadge: "bg-amber-600/30 text-amber-300 border-2 border-amber-600/50",
          navBg: "bg-stone-950 border-b-4 border-amber-600",
          label: "LANDLORD ASSET SYSTEM",
          primaryText: "text-amber-300",
          sidebarActiveTab: "bg-amber-600 text-white border-r-8 border-white"
        };
      default: // resident
        return {
          title: "Resident Smart Hub",
          bg: "bg-estate-secondary",
          cardBg: "bg-slate-900 border-estate-accent/40",
          sidebarBg: "bg-slate-900 border-r-4 border-estate-accent/30",
          accentColor: "text-estate-accent",
          accentBg: "bg-estate-accent/15 border-estate-accent/40",
          accentBtn: "bg-estate-accent hover:bg-white text-estate-secondary font-black",
          accentBadge: "bg-estate-accent/35 text-estate-accent border-2 border-estate-accent/60",
          navBg: "bg-slate-900 border-b-4 border-estate-accent",
          label: "RESIDENT CONSOLE",
          primaryText: "text-estate-accent",
          sidebarActiveTab: "bg-estate-accent text-estate-secondary border-r-8 border-white"
        };
    }
  };

  const theme = getPortalTheme();

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col overflow-hidden">
      
      <div className="w-full h-full bg-estate-cream flex flex-col overflow-hidden">
        
        {/* TOP STATUS BAR (PERSISTENT & ACTIONABLE) */}
        <div className={`p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 ${theme.navBg} shrink-0 relative z-50 shadow-md`}>
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl border border-white/20 shrink-0">
              <ShieldCheck className={`w-6 h-6 sm:w-8 sm:h-8 ${theme.primaryText}`} strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-black text-xl sm:text-2xl md:text-3xl tracking-wider text-estate-cream uppercase leading-tight truncate">
                  IRE-AKARI ESTATE
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs uppercase font-mono font-black ${theme.accentBadge} whitespace-nowrap`}>
                  {theme.label}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-mono text-estate-sage font-bold uppercase tracking-widest block mt-1 truncate">
                SECURED ENCRYPTED GATEWAY • IA-30-JUBILEE
              </span>
            </div>
          </div>

          {/* Quick exit bar */}
          <div className="flex items-center gap-2 sm:gap-3 justify-between md:justify-end w-full md:w-auto">
            {loginStep === 'dashboard' && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 transition-all cursor-pointer flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                title="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="w-4.5 h-4.5 text-estate-accent" strokeWidth={3} /> : <Menu className="w-4.5 h-4.5 text-estate-accent" strokeWidth={3} />}
                <span>Menu</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2.5 sm:px-6 sm:py-3 bg-white/10 hover:bg-white/20 border-2 border-white/20 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer text-white"
              id="dashboard-btn-exit"
            >
              <LogOut className="w-4 h-4 sm:w-5 h-5" strokeWidth={3} />
              Exit Portal
            </button>
            <button
              onClick={onClose}
              className="p-2.5 sm:p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 transition-all cursor-pointer"
              title="Close Portal"
            >
              <X className="w-5 h-5 sm:w-6 h-6" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            1. PRE-AUTHENTICATION INTERFACES
            ========================================================================= */}
        {loginStep !== 'dashboard' && (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Brand Panel */}
            <div className="order-2 lg:order-1 lg:col-span-4 bg-estate-primary text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%" fill="none" stroke="currentColor">
                  <circle cx="50%" cy="50%" r="90" strokeWidth="2.5" />
                  <circle cx="50%" cy="50%" r="180" strokeWidth="1.5" strokeDasharray="8 4" />
                  <line x1="0" y1="0" x2="100%" y2="100%" strokeWidth="2" />
                </svg>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2 text-estate-accent">
                  <Award className="w-8 h-8 animate-pulse text-estate-accent" strokeWidth={3} />
                  <span className="text-sm font-mono font-black uppercase tracking-[0.25em]">Ire-Akari Sec</span>
                </div>
                <h3 className="text-4xl md:text-5xl font-display font-black leading-tight text-estate-cream tracking-tight">
                  Secure Member Portal
                </h3>
                <p className="text-lg text-estate-accent font-bold">
                  Established 1996 • 30 Years of Golden Legacy
                </p>
              </div>

              <div className="relative z-10 space-y-6 pt-12">
                <p className="text-base text-estate-cream/80 leading-relaxed font-medium">
                  Welcome to the secured member hub. Log in to manage community settings, purchase clean energy tokens, register tenants, or oversee committee logs.
                </p>
                <div className="flex items-center gap-3 bg-estate-secondary/80 border-2 border-white/20 p-4 rounded-xl text-xs font-mono text-estate-accent font-black">
                  <Activity className="w-6 h-6 animate-pulse text-estate-accent" strokeWidth={3} />
                  <span className="text-sm">24/7 ENCRYPTED NODE VERIFIED</span>
                </div>
              </div>
            </div>

            {/* Right Form/Selection Content */}
            <div className="order-1 lg:order-2 lg:col-span-8 p-6 sm:p-10 md:p-12 lg:p-16 bg-white flex flex-col justify-center">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: CHOOSE CONSOLE ROLE */}
                {loginStep === 'options' && (
                  <motion.div
                    key="options"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-10"
                  >
                    <div className="text-left">
                      <h4 className="text-4xl md:text-5xl font-display font-black text-estate-primary tracking-tight">
                        Select Member Console
                      </h4>
                      <p className="text-lg text-estate-secondary/80 mt-2 font-semibold">
                        Access specialized tools and features depending on your credential group.
                      </p>
                    </div>

                    {/* Role Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Resident */}
                      <button
                        onClick={() => handleSelectOption('resident')}
                        className="group p-6 rounded-3xl bg-estate-clay/30 hover:bg-estate-primary hover:text-white border-2 border-estate-primary/10 hover:border-estate-accent text-left transition-all duration-300 shadow-md hover:shadow-xl flex flex-col justify-between min-h-[180px] cursor-pointer"
                        id="role-btn-resident"
                      >
                        <User className="w-10 h-10 text-estate-accent group-hover:text-white" strokeWidth={3} />
                        <div>
                          <h5 className="font-display font-black text-lg group-hover:text-white">Resident Portal</h5>
                          <p className="text-sm text-estate-secondary/80 group-hover:text-estate-accent/90 mt-1 font-bold">Electricity units, gate passes, active reports.</p>
                        </div>
                      </button>

                      {/* Landlord */}
                      <button
                        onClick={() => handleSelectOption('landlord')}
                        className="group p-6 rounded-3xl bg-estate-clay/30 hover:bg-estate-primary hover:text-white border-2 border-estate-primary/10 hover:border-estate-accent text-left transition-all duration-300 shadow-md hover:shadow-xl flex flex-col justify-between min-h-[180px] cursor-pointer"
                        id="role-btn-landlord"
                      >
                        <Building className="w-10 h-10 text-estate-accent group-hover:text-white" strokeWidth={3} />
                        <div>
                          <h5 className="font-display font-black text-lg group-hover:text-white">Landlord Portal</h5>
                          <p className="text-sm text-estate-secondary/80 group-hover:text-estate-accent/90 mt-1 font-bold">Asset holdings, tenant registry, levy statements.</p>
                        </div>
                      </button>

                      {/* Admin */}
                      <button
                        onClick={() => handleSelectOption('admin')}
                        className="group p-6 rounded-3xl bg-estate-clay/30 hover:bg-estate-primary hover:text-white border-2 border-estate-primary/10 hover:border-estate-accent text-left transition-all duration-300 shadow-md hover:shadow-xl flex flex-col justify-between min-h-[180px] cursor-pointer"
                        id="role-btn-admin"
                      >
                        <ShieldAlert className="w-10 h-10 text-estate-accent group-hover:text-white" strokeWidth={3} />
                        <div>
                          <h5 className="font-display font-black text-lg group-hover:text-white">Super Admin</h5>
                          <p className="text-sm text-estate-secondary/80 group-hover:text-estate-accent/90 mt-1 font-bold">Gate automation control, chairman oversight.</p>
                        </div>
                      </button>
                    </div>

                    {/* QUICK NEIGHBORHOOD LOGIN */}
                    <div className="pt-8 border-t-4 border-estate-clay text-left">
                      <span className="text-sm uppercase font-mono tracking-widest text-estate-accent font-black block mb-4">
                        ⚡ Quick Resident Access By District (Neighborhood)
                      </span>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <button
                          onClick={() => handleZoneLogin('Zone One')}
                          className="p-4 rounded-2xl border-2 border-estate-primary/15 hover:border-estate-accent hover:bg-estate-primary/5 text-left transition-colors cursor-pointer group"
                        >
                          <span className="text-xs font-mono text-estate-accent font-black block group-hover:scale-105 transition-transform">ZONE 01</span>
                          <span className="text-sm font-black text-estate-primary block truncate mt-0.5">Pace Setter</span>
                          <span className="text-[10px] font-bold text-estate-secondary/70 block truncate">Broad Street</span>
                        </button>

                        <button
                          onClick={() => handleZoneLogin('Zone Two')}
                          className="p-4 rounded-2xl border-2 border-estate-primary/15 hover:border-estate-accent hover:bg-estate-primary/5 text-left transition-colors cursor-pointer group"
                        >
                          <span className="text-xs font-mono text-estate-accent font-black block group-hover:scale-105 transition-transform">ZONE 02</span>
                          <span className="text-sm font-black text-estate-primary block truncate mt-0.5">Unity & Peace</span>
                          <span className="text-[10px] font-bold text-estate-secondary/70 block truncate">Orchard Drive</span>
                        </button>

                        <button
                          onClick={() => handleZoneLogin('Zone Three')}
                          className="p-4 rounded-2xl border-2 border-estate-primary/15 hover:border-estate-accent hover:bg-estate-primary/5 text-left transition-colors cursor-pointer group"
                        >
                          <span className="text-xs font-mono text-estate-accent font-black block group-hover:scale-105 transition-transform">ZONE 03</span>
                          <span className="text-sm font-black text-estate-primary block truncate mt-0.5">Parakoyi/Oloya</span>
                          <span className="text-[10px] font-bold text-estate-secondary/70 block truncate">Solar Avenue</span>
                        </button>

                        <button
                          onClick={() => handleZoneLogin('Zone Four')}
                          className="p-4 rounded-2xl border-2 border-estate-primary/15 hover:border-estate-accent hover:bg-estate-primary/5 text-left transition-colors cursor-pointer group"
                        >
                          <span className="text-xs font-mono text-estate-accent font-black block group-hover:scale-105 transition-transform">ZONE 04</span>
                          <span className="text-sm font-black text-estate-primary block truncate mt-0.5">Ogun/Osun/NUT</span>
                          <span className="text-[10px] font-bold text-estate-secondary/70 block truncate">Sunset Heights</span>
                        </button>
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* STEP 2: CREDENTIALS SUBMISSION */}
                {loginStep === 'form' && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-8"
                  >
                    <div className="text-left flex items-center justify-between border-b-2 border-estate-clay pb-4">
                      <div>
                        <h4 className="text-4xl font-display font-black text-estate-primary capitalize">
                          {selectedType} Security Login
                        </h4>
                        <p className="text-sm text-estate-secondary/80 mt-1 font-semibold">
                          Authorized accounts enter your secure passwords. Demo passwords are pre-filled.
                        </p>
                      </div>
                      <button
                        onClick={handleReset}
                        className="text-sm text-estate-accent hover:underline font-mono font-black"
                      >
                        ← Change Portal
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 text-left font-sans text-base">
                      {/* Email */}
                      <div className="space-y-2">
                        <label className="text-sm uppercase font-mono tracking-wider text-estate-sage font-black block">
                          MEMBER ID / SECURE EMAIL
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-estate-primary" strokeWidth={3} />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 border-2 border-estate-primary/10 rounded-2xl focus:border-estate-accent focus:outline-none transition-colors text-lg font-bold text-estate-secondary"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <label className="text-sm uppercase font-mono tracking-wider text-estate-sage font-black block">
                          SECRET PASSWORD ACCESS PIN
                        </label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-estate-primary" strokeWidth={3} />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 border-2 border-estate-primary/10 rounded-2xl focus:border-estate-accent focus:outline-none transition-colors text-lg font-bold text-estate-secondary"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-estate-sage hover:text-estate-primary cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-8 py-5 bg-estate-primary text-estate-accent hover:bg-estate-secondary font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-estate-accent border-t-transparent rounded-full animate-spin" />
                            VERIFYING CREDENTIAL ENCRYPTION...
                          </>
                        ) : (
                          <>
                            <LogIn className="w-5 h-5" strokeWidth={3} />
                            AUTHENTICATE ACCESS TO CONSOLE
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        )}

        {/* =========================================================================
            2. SECURE PORTAL MEMBER DASHBOARD WITH SIDEBAR NAVIGATION
            ========================================================================= */}
        {loginStep === 'dashboard' && (
          <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${theme.bg}`}>
            
            {/* LEFT SIDEBAR NAVIGATION DESK / MOBILE OVERLAY */}
            <div className={`
              ${isMobileMenuOpen ? 'flex fixed inset-0 pt-24 z-40 bg-slate-950/98 backdrop-blur-lg' : 'hidden'}
              md:flex md:relative md:inset-auto md:z-0 md:pt-0
              w-full md:w-auto flex-col shrink-0 text-left transition-all duration-300 ${
                isSidebarCollapsed ? 'md:w-24' : 'md:w-85'
              } ${theme.sidebarBg}
            `}>
              
              {/* Active Session Info Panel */}
              <div className="p-6 border-b border-white/10 bg-black/25 flex items-center justify-between">
                {!isSidebarCollapsed ? (
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-mono font-black tracking-widest text-estate-accent uppercase block">
                      Logged in as:
                    </span>
                    <span className="text-xl font-display font-black text-white block truncate mt-1">
                      {selectedType === 'admin' ? adminName : selectedType === 'landlord' ? landlordName : profileName}
                    </span>
                    <span className={`inline-block mt-2 px-2.5 py-1 rounded-md text-xs uppercase font-mono font-black ${theme.accentBadge}`}>
                      {selectedType.toUpperCase()} USER
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full gap-1 py-1">
                    <User className="w-8 h-8 text-estate-accent" strokeWidth={3} />
                    <span className="text-[10px] uppercase font-mono font-black text-estate-accent">
                      {selectedType.toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* Collapse Trigger Button */}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="hidden md:flex p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                  title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
              </div>

              {/* Sidebar Menu Items */}
              <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                
                {/* 1. Profile Tab (All roles) */}
                <button
                  onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                  className={`w-full p-4 rounded-xl text-left font-black uppercase text-base tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'profile' ? theme.sidebarActiveTab : 'hover:bg-white/10 text-slate-300'
                  } ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}
                  title="Profile & ID Card"
                >
                  <User className="w-6 h-6 shrink-0" strokeWidth={3} />
                  {!isSidebarCollapsed && <span>Profile & ID Card</span>}
                </button>

                {/* 2. Tenant Directory (Landlord Only) */}
                {selectedType === 'landlord' && (
                  <button
                    onClick={() => { setActiveTab('tenants'); setIsMobileMenuOpen(false); }}
                    className={`w-full p-4 rounded-xl text-left font-black uppercase text-base tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === 'tenants' ? theme.sidebarActiveTab : 'hover:bg-white/10 text-slate-300'
                    } ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}
                    title="Tenant Registry"
                  >
                    <Building className="w-6 h-6 shrink-0" strokeWidth={3} />
                    {!isSidebarCollapsed && <span>Tenant Registry</span>}
                  </button>
                )}

                {/* 3. Resident Database & Gates (Super Admin Only) */}
                {selectedType === 'admin' && (
                  <button
                    onClick={() => { setActiveTab('database'); setIsMobileMenuOpen(false); }}
                    className={`w-full p-4 rounded-xl text-left font-black uppercase text-base tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === 'database' ? theme.sidebarActiveTab : 'hover:bg-white/10 text-slate-300'
                    } ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}
                    title="Database & Gates"
                  >
                    <Users className="w-6 h-6 shrink-0" strokeWidth={3} />
                    {!isSidebarCollapsed && <span>Database & Gates</span>}
                  </button>
                )}

                {/* 4. Chairmen Board (Super Admin Only) */}
                {selectedType === 'admin' && (
                  <button
                    onClick={() => { setActiveTab('chairmen'); setIsMobileMenuOpen(false); }}
                    className={`w-full p-4 rounded-xl text-left font-black uppercase text-base tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === 'chairmen' ? theme.sidebarActiveTab : 'hover:bg-white/10 text-slate-300'
                    } ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}
                    title="Zone Chairmen"
                  >
                    <UserCheck className="w-6 h-6 shrink-0" strokeWidth={3} />
                    {!isSidebarCollapsed && <span>Zone Chairmen</span>}
                  </button>
                )}

                {/* 5. Committees & Escorts (Super Admin Only) */}
                {selectedType === 'admin' && (
                  <button
                    onClick={() => { setActiveTab('committees'); setIsMobileMenuOpen(false); }}
                    className={`w-full p-4 rounded-xl text-left font-black uppercase text-base tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === 'committees' ? theme.sidebarActiveTab : 'hover:bg-white/10 text-slate-300'
                    } ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}
                    title="Committees & Patrol"
                  >
                    <Briefcase className="w-6 h-6 shrink-0" strokeWidth={3} />
                    {!isSidebarCollapsed && <span>Committees & Patrol</span>}
                  </button>
                )}

                {/* 6. Broadcasts (All roles) */}
                <button
                  onClick={() => { setActiveTab('announcements'); setIsMobileMenuOpen(false); }}
                  className={`w-full p-4 rounded-xl text-left font-black uppercase text-base tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'announcements' ? theme.sidebarActiveTab : 'hover:bg-white/10 text-slate-300'
                  } ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}
                  title="Estate Broadcasts"
                >
                  <Radio className="w-6 h-6 shrink-0 animate-pulse" strokeWidth={3} />
                  {!isSidebarCollapsed && <span>Estate Broadcasts</span>}
                </button>

                {/* 7. Complaint Desk (All roles) */}
                <button
                  onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
                  className={`w-full p-4 rounded-xl text-left font-black uppercase text-base tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'reports' ? theme.sidebarActiveTab : 'hover:bg-white/10 text-slate-300'
                  } ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}
                  title="Complaint Filing"
                >
                  <AlertTriangle className="w-6 h-6 shrink-0" strokeWidth={3} />
                  {!isSidebarCollapsed && <span>Complaint Filing</span>}
                </button>

                {/* 8. Purchase / Store (All roles) */}
                <button
                  onClick={() => { setActiveTab('store'); setIsMobileMenuOpen(false); }}
                  className={`w-full p-4 rounded-xl text-left font-black uppercase text-base tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'store' ? theme.sidebarActiveTab : 'hover:bg-white/10 text-slate-300'
                  } ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}
                  title="Order Utilities / Merch"
                >
                  <ShoppingBag className="w-6 h-6 shrink-0" strokeWidth={3} />
                  {!isSidebarCollapsed && <span>Order Utilities / Merch</span>}
                </button>

              </div>

              {/* Dedicated Help Line in sidebar footer */}
              <div className="p-6 border-t border-white/10 text-xs bg-black/10">
                {!isSidebarCollapsed ? (
                  <>
                    <span className="font-mono text-estate-accent font-black block uppercase tracking-widest text-sm">
                      EMERGENCY COMMAND:
                    </span>
                    <span className="text-white block mt-1 text-base font-black">
                      +234 812 555 9000
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-estate-accent" title="Emergency: +234 812 555 9000">
                    <PhoneCall className="w-6 h-6 animate-pulse" strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>

            {/* MAIN DASHBOARD CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-950/20 text-left">
              
              {/* CART AND ACTION NOTIFICATIONS */}
              {cartMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-5 bg-green-500 text-slate-950 rounded-2xl font-black text-base flex items-start gap-3 border-2 border-white shadow-lg"
                >
                  <CheckCircle className="w-6 h-6 shrink-0 mt-0.5" strokeWidth={3} />
                  <div>
                    <span className="block uppercase tracking-wider text-sm font-mono text-green-900">SYSTEM NOTIFICATION</span>
                    <p className="mt-1">{cartMessage}</p>
                  </div>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                
                {/* TAB 1: PROFILE & MEMBER ID CARD */}
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    {/* Left block: ID CARD GRAPHIC */}
                    <div className="lg:col-span-5 space-y-4">
                      <span className="text-base font-mono text-estate-accent font-black uppercase tracking-widest block">
                        Official Membership Identification
                      </span>
                      <h4 className="text-4xl md:text-5xl font-display font-black text-white">
                        Secure Member ID
                      </h4>
                      <p className="text-xl text-slate-200 font-medium">
                        Present this scan-less holographic card at checking posts and zone gate houses.
                      </p>

                      {/* Front-End ID Card (NO QR CODE as requested) */}
                      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 via-stone-950 to-black p-8 border-4 border-estate-accent">
                        
                        <div className="absolute inset-0 opacity-5 pointer-events-none">
                          <svg width="100%" height="100%" fill="none" stroke="currentColor">
                            <circle cx="50%" cy="50%" r="100" strokeWidth="2" />
                            <circle cx="50%" cy="50%" r="180" strokeWidth="1" strokeDasharray="4 2" />
                          </svg>
                        </div>

                        {/* ID HEADER */}
                        <div className="flex items-center justify-between border-b-2 border-estate-accent/30 pb-4 mb-6">
                          <div className="flex items-center gap-2">
                            <Award className="w-6 h-6 text-estate-accent" strokeWidth={3} />
                            <span className="text-base font-mono font-black uppercase tracking-[0.25em] text-estate-accent">
                              IRE-AKARI MEMBER
                            </span>
                          </div>
                          <span className="text-sm font-mono text-slate-300 font-bold">
                            SINCE 1996
                          </span>
                        </div>

                        {/* ID Info block */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                          {/* Photo */}
                          <div className="w-28 h-36 rounded-2xl overflow-hidden bg-slate-800 border-2 border-estate-accent/50 shrink-0 relative self-start sm:self-auto pointer-events-auto">
                            <EditableImage 
                              src={
                                selectedType === 'admin' 
                                  ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80"
                                  : selectedType === 'landlord'
                                  ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
                                  : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
                              } 
                              imageKey={`member-id-${selectedType}`}
                              alt="ID Portrait" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 right-2 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-slate-900 animate-pulse z-40 pointer-events-none" />
                          </div>

                          {/* Detail text */}
                          <div className="flex-1 space-y-3 text-slate-200 text-left min-w-0">
                            <div>
                              <span className="text-xs uppercase font-mono text-slate-400 font-black block tracking-wider">FULL NAME</span>
                              <span className="text-2xl font-black text-white block mt-0.5">
                                {selectedType === 'admin' ? adminName : selectedType === 'landlord' ? landlordName : profileName}
                              </span>
                            </div>

                            <div>
                              <span className="text-xs uppercase font-mono text-slate-400 font-black block tracking-wider">STATUS ROLE</span>
                              <span className="text-lg font-black text-estate-accent block uppercase tracking-wider mt-0.5">
                                {selectedType === 'admin' ? adminDesignation : selectedType === 'landlord' ? 'REGISTERED LANDLORD' : `RESIDENT (${residentZone})`}
                              </span>
                            </div>

                            <div>
                              <span className="text-xs uppercase font-mono text-slate-400 font-black block tracking-wider">ADDRESS & LOCATION</span>
                              <span className="text-lg font-bold block text-white mt-0.5">
                                {selectedType === 'admin' ? 'MAIN SECRETARIAT, ZONE ONE' : selectedType === 'landlord' ? landlordUnit : profileUnit}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ID Footer row */}
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800 text-sm font-mono text-slate-300">
                          <div>
                            <span className="block text-slate-400 font-black uppercase text-xs tracking-wider">MEMBER ID</span>
                            <span className="font-bold text-white uppercase text-base">
                              {selectedType === 'admin' ? 'IA-96-PREZ' : selectedType === 'landlord' ? 'IA-02-LAND' : 'IA-41-RESD'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-slate-400 font-black uppercase text-xs tracking-wider">VERIFICATION LEVEL</span>
                            <span className="font-bold text-estate-accent text-base">
                              {selectedType === 'admin' ? 'LEVEL 5 (SUPER)' : selectedType === 'landlord' ? 'LEVEL 3 (ASSET)' : 'LEVEL 1 (BASIC)'}
                            </span>
                          </div>
                        </div>

                        {/* Holographic stripe */}
                        <div className="mt-6 h-2 bg-gradient-to-r from-estate-accent via-amber-500 to-yellow-300 rounded-full" />
                      </div>
                    </div>

                    {/* Right block: EDIT PROFILE SETTINGS */}
                    <div className="lg:col-span-7">
                      <div className={`p-8 rounded-[28px] ${theme.cardBg} border text-left space-y-6`}>
                        <div>
                          <h5 className="font-display font-black text-2xl text-white flex items-center gap-2">
                            <Settings className="w-6 h-6 text-estate-accent" />
                            Update Profile Details
                          </h5>
                          <p className="text-base text-slate-300 mt-1">
                            Adjust your personal contact and holding information recorded in the database.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm font-sans">
                          {selectedType === 'resident' && (
                            <>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Resident Name</label>
                                <input 
                                  type="text" 
                                  value={profileName} 
                                  onChange={(e) => setProfileName(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Phone Contact</label>
                                <input 
                                  type="text" 
                                  value={profilePhone} 
                                  onChange={(e) => setProfilePhone(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Unit Coordinates</label>
                                <input 
                                  type="text" 
                                  value={profileUnit} 
                                  onChange={(e) => setProfileUnit(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Registered Vehicle Tag</label>
                                <input 
                                  type="text" 
                                  value={profileVehicle} 
                                  onChange={(e) => setProfileVehicle(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                            </>
                          )}

                          {selectedType === 'landlord' && (
                            <>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Landlord Name</label>
                                <input 
                                  type="text" 
                                  value={landlordName} 
                                  onChange={(e) => setLandlordName(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Phone Contact</label>
                                <input 
                                  type="text" 
                                  value={landlordPhone} 
                                  onChange={(e) => setLandlordPhone(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Primary Asset Unit</label>
                                <input 
                                  type="text" 
                                  value={landlordUnit} 
                                  onChange={(e) => setLandlordUnit(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Holding Corporation</label>
                                <input 
                                  type="text" 
                                  value={landlordCompany} 
                                  onChange={(e) => setLandlordCompany(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                            </>
                          )}

                          {selectedType === 'admin' && (
                            <>
                              <div className="space-y-2 sm:col-span-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">President Name</label>
                                <input 
                                  type="text" 
                                  value={adminName} 
                                  onChange={(e) => setAdminName(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Direct Contact Line</label>
                                <input 
                                  type="text" 
                                  value={adminPhone} 
                                  onChange={(e) => setAdminPhone(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block font-black text-xs uppercase font-mono text-estate-accent">Designation Title</label>
                                <input 
                                  type="text" 
                                  value={adminDesignation} 
                                  onChange={(e) => setAdminDesignation(e.target.value)}
                                  className="w-full bg-slate-900 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-estate-accent focus:outline-none"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="pt-4 border-t border-white/10">
                          <span className="text-sm font-black text-estate-accent flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            All edits automatically update across the official database system instantly.
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: TENANTS REGISTRY (LANDLORD ONLY) */}
                {activeTab === 'tenants' && selectedType === 'landlord' && (
                  <motion.div
                    key="tenants"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-8"
                  >
                    <div>
                      <span className="text-base font-mono text-amber-400 font-black uppercase tracking-widest block">
                        Landlord Dedicated Tools
                      </span>
                      <h4 className="text-4xl md:text-5xl font-display font-black text-white">
                        Tenant Directory & Onboarding
                      </h4>
                      <p className="text-xl text-slate-200 mt-2 font-medium">
                        Register new tenants into the Ire-Akari directory to authorize RFID gate pass allocations.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Register form */}
                      <div className="lg:col-span-5">
                        <form onSubmit={handleAddTenant} className="p-8 rounded-[24px] bg-black/40 border border-white/10 space-y-6 text-sm font-sans text-slate-100">
                          <h5 className="font-display font-black text-2xl text-white mb-2 flex items-center gap-2">
                            <Plus className="w-6 h-6 text-amber-400" />
                            Register Tenant Lease
                          </h5>

                          <div className="space-y-2">
                            <label className="block text-sm font-mono font-black uppercase tracking-wider text-amber-400">Tenant Full Name</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Alhaji Ibrahim Lawal"
                              value={newTenantName}
                              onChange={(e) => setNewTenantName(e.target.value)}
                              className="w-full bg-slate-900 border-2 border-white/15 rounded-xl px-4 py-3 text-white text-base font-bold focus:border-amber-400 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-mono font-black uppercase tracking-wider text-amber-400">Email Address</label>
                            <input 
                              type="email" 
                              required
                              placeholder="ibrahim@yahoo.com"
                              value={newTenantEmail}
                              onChange={(e) => setNewTenantEmail(e.target.value)}
                              className="w-full bg-slate-900 border-2 border-white/15 rounded-xl px-4 py-3 text-white text-base font-bold focus:border-amber-400 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-mono font-black uppercase tracking-wider text-amber-400">Phone Contact</label>
                            <input 
                              type="text" 
                              placeholder="+234 812 000 0000"
                              value={newTenantPhone}
                              onChange={(e) => setNewTenantPhone(e.target.value)}
                              className="w-full bg-slate-900 border-2 border-white/15 rounded-xl px-4 py-3 text-white text-base font-bold focus:border-amber-400 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-mono font-black uppercase tracking-wider text-amber-400">Holding Villa</label>
                              <input 
                                type="text" 
                                value={newTenantUnit}
                                onChange={(e) => setNewTenantUnit(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-white/15 rounded-xl px-4 py-3 text-white text-base font-bold focus:border-amber-400 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-mono font-black uppercase tracking-wider text-amber-400">Lease Start</label>
                              <input 
                                type="text" 
                                value={newTenantLease}
                                onChange={(e) => setNewTenantLease(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-white/15 rounded-xl px-4 py-3 text-white text-base font-bold focus:border-amber-400 focus:outline-none"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-sm tracking-widest rounded-xl transition-all cursor-pointer mt-4 shadow-lg"
                          >
                            Add & Update Security
                          </button>
                        </form>
                      </div>

                      {/* Directory list */}
                      <div className="lg:col-span-7">
                        <div className="p-8 bg-black/25 rounded-[28px] border border-white/10 text-sm text-left space-y-6">
                          <h5 className="font-display font-black text-2xl text-white">
                            Current Registered Tenants ({tenants.length})
                          </h5>

                          <div className="space-y-4">
                            {tenants.map(t => (
                              <div key={t.id} className="p-6 bg-white/5 rounded-2xl border-2 border-white/5 flex items-center justify-between text-lg">
                                <div className="space-y-1">
                                  <h6 className="font-black text-2xl text-white">{t.name}</h6>
                                  <p className="text-base text-slate-200 font-bold">{t.unit} • {t.phone}</p>
                                  <p className="text-sm font-mono text-amber-400 font-black uppercase tracking-wider">Lease Date: {t.leaseStart}</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteTenant(t.id)}
                                  className="p-3 bg-red-500/15 hover:bg-red-500 hover:text-white text-red-400 rounded-xl transition-colors cursor-pointer"
                                  title="Revoke Tenant Security clearance"
                                >
                                  <Trash2 className="w-6 h-6" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: RESIDENT DATABASE & GATE SYSTEMS (ADMIN ONLY) */}
                {activeTab === 'database' && selectedType === 'admin' && (
                  <motion.div
                    key="database"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-8"
                  >
                    <div>
                      <span className="text-base font-mono text-amber-400 font-black uppercase tracking-widest block">
                        Super Admin Access level 5
                      </span>
                      <h4 className="text-4xl md:text-5xl font-display font-black text-white">
                        Resident Database & Gates control
                      </h4>
                      <p className="text-xl text-slate-200 mt-2 font-medium">
                        Search global member directories and coordinate automated gate locking protocols.
                      </p>
                    </div>

                    {/* GATE AUTOMATION COMMANDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 rounded-[24px] bg-slate-900 border-2 border-red-500/50 flex items-center justify-between shadow-xl">
                        <div>
                          <span className="text-sm font-mono font-black text-red-400 uppercase tracking-widest">GATE AUTOMATION</span>
                          <h5 className="font-display font-black text-3xl text-white mt-1">Main Entrance Lock</h5>
                        </div>
                        <button
                          onClick={() => setGateLocked(!gateLocked)}
                          className={`px-6 py-4 rounded-xl font-mono text-base font-black uppercase transition-all cursor-pointer shadow-md ${
                            gateLocked ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'
                          }`}
                        >
                          {gateLocked ? '🔐 GATES LOCKED' : '🔓 GATES SECURED'}
                        </button>
                      </div>

                      <div className="p-8 rounded-[24px] bg-slate-900 border-2 border-amber-500/50 flex items-center justify-between shadow-xl">
                        <div>
                          <span className="text-sm font-mono font-black text-amber-400 uppercase tracking-widest">ALARM HUB</span>
                          <h5 className="font-display font-black text-3xl text-white mt-1">Siren & Security Alert</h5>
                        </div>
                        <button
                          onClick={() => setAlarmActive(!alarmActive)}
                          className={`px-6 py-4 rounded-xl font-mono text-base font-black uppercase transition-all cursor-pointer shadow-md ${
                            alarmActive ? 'bg-red-500 text-white animate-bounce' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {alarmActive ? '🔔 SIREN ACTIVE' : '🔕 SIREN STANDBY'}
                        </button>
                      </div>
                    </div>

                    {/* RESIDENT SEARCH ENGINE */}
                    <div className="p-8 bg-slate-900/60 rounded-[28px] border border-white/10 space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-4">
                        <h5 className="font-display font-black text-2xl text-white">
                          Resident Database Directories
                        </h5>
                        <div className="relative w-full md:w-96">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Search Name or Unit..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border-2 border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-amber-400 font-mono text-sm uppercase font-black">
                              <th className="py-4 px-4">Resident ID</th>
                              <th className="py-4 px-4">Full Name</th>
                              <th className="py-4 px-4">District (Zone)</th>
                              <th className="py-4 px-4">Unit Address</th>
                              <th className="py-4 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {residentsDb
                              .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.unit.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map(r => (
                                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors font-sans text-lg text-slate-200">
                                  <td className="py-4 px-4 font-mono font-black text-amber-400">{r.id}</td>
                                  <td className="py-4 px-4 font-black text-white">{r.name}</td>
                                  <td className="py-4 px-4 font-bold">{r.zone}</td>
                                  <td className="py-4 px-4 font-bold text-slate-300">{r.unit}</td>
                                  <td className="py-4 px-4 text-center">
                                    <span className="px-3 py-1 bg-green-500/25 text-green-300 font-mono font-black text-sm uppercase rounded">
                                      {r.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* TAB 4: ZONE CHAIRMEN OVERSIGHT (ADMIN ONLY) */}
                {activeTab === 'chairmen' && selectedType === 'admin' && (
                  <motion.div
                    key="chairmen"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-8"
                  >
                    <div>
                      <span className="text-base font-mono text-amber-400 font-black uppercase tracking-widest block">
                        Ire-Akari Federated Zones
                      </span>
                      <h4 className="text-4xl md:text-5xl font-display font-black text-white">
                        District Chairmen Oversight Board
                      </h4>
                      <p className="text-xl text-slate-200 mt-2 font-medium">
                        The four district chairmen report directly to the President (Super Admin). Review details and active zone tasks.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {chairmen.map((c, idx) => (
                        <div key={idx} className="p-8 bg-slate-900 border-2 border-white/10 rounded-3xl text-left space-y-6">
                           <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="text-xl font-display font-black text-amber-400 uppercase tracking-wider">{c.zone}</span>
                            <span className="text-xs font-mono text-slate-400 font-black tracking-wider">CHAIRMAN ELECT</span>
                          </div>

                          <div className="space-y-2">
                            <h5 className="text-2xl font-black text-white">{c.name}</h5>
                            <p className="text-base font-bold text-slate-300">Direct Line: <span className="text-white">{c.phone}</span></p>
                          </div>

                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="text-xs font-mono text-slate-400 font-black block uppercase tracking-widest">ACTIVE ZONE FOCUS</span>
                            <p className="text-base text-slate-200 mt-1 font-semibold">{c.activity}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                  </motion.div>
                )}

                {/* TAB 5: COMMITTEES BOARD & ESCORTS (ADMIN ONLY) */}
                {activeTab === 'committees' && selectedType === 'admin' && (
                  <motion.div
                    key="committees"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-8"
                  >
                    <div>
                      <span className="text-base font-mono text-amber-400 font-black uppercase tracking-widest block">
                        Security & Administration Nexus
                      </span>
                      <h4 className="text-4xl md:text-5xl font-display font-black text-white">
                        Ire-Akari Committees & Escorts Board
                      </h4>
                      <p className="text-xl text-slate-200 mt-2 font-medium">
                        Overview of community leadership bodies and on-patrol escort personnel.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Committees column */}
                      <div className="lg:col-span-7 space-y-6">
                        <h5 className="font-display font-black text-3xl text-white border-b border-white/10 pb-2">
                          Administrative Committees
                        </h5>

                        <div className="space-y-6">
                          {committees.map((com, idx) => (
                            <div key={idx} className="p-6 bg-slate-900 border border-white/10 rounded-2xl space-y-3">
                              <h6 className="text-2xl font-black text-amber-400">{com.name}</h6>
                              <p className="text-base font-bold text-slate-200">Board Chairperson: <span className="text-white">{com.head}</span></p>
                              <p className="text-base text-slate-300 font-medium leading-relaxed">{com.role}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Escorts column */}
                      <div className="lg:col-span-5 space-y-6">
                        <h5 className="font-display font-black text-3xl text-white border-b border-white/10 pb-2">
                          Active Security Escorts
                        </h5>

                        <div className="space-y-4">
                          {escorts.map((esc, idx) => {
                            const EscIcon = esc.icon;
                            return (
                              <div key={idx} className="p-6 bg-slate-900 border-2 border-green-500/30 rounded-2xl flex items-center gap-4 shadow-lg">
                                <div className="p-4 bg-green-500/10 rounded-xl text-green-400 border border-green-500/20">
                                  <EscIcon className="w-8 h-8" strokeWidth={3} />
                                </div>
                                <div>
                                  <h6 className="text-xl font-black text-white">{esc.name}</h6>
                                  <span className="text-base font-mono text-green-400 font-black block uppercase tracking-wider mt-1">
                                    ● {esc.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* TAB 6: ESTATE ANNOUNCEMENTS (ALL ROLES) */}
                {activeTab === 'announcements' && (
                  <motion.div
                    key="announcements"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-8"
                  >
                    <div>
                      <span className="text-base font-mono text-estate-accent font-black uppercase tracking-widest block">
                        Communications Channel
                      </span>
                      <h4 className="text-4xl md:text-5xl font-display font-black text-white">
                        Active Broadcasts & Notices
                      </h4>
                      <p className="text-xl text-slate-200 mt-2 font-medium">
                        Stay informed of current administrative resolutions, solar power grids updates, and 30th Anniversary preparations.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="p-8 bg-slate-900 border-2 border-red-500/50 rounded-[24px] shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-red-400 font-black text-sm uppercase tracking-widest">URGENT SECURITY ADVISORY</span>
                          <span className="px-3 py-1 bg-red-500/20 text-red-300 font-bold rounded-md text-xs uppercase tracking-wider">ACTION REQUIRED</span>
                        </div>
                        <h5 className="font-black text-2xl text-white mb-2">
                          Anniversary Operations Checkpoints Setup
                        </h5>
                        <p className="text-lg text-slate-200 font-medium leading-relaxed">
                          To support next month's monumental celebrations, the Security patrol board is launching augmented checking lines across the four designated zones. Residents are requested to update vehicle RFID tags and keep official Member ID cards close for seamless verification.
                        </p>
                      </div>

                      <div className="p-8 bg-slate-900 border-2 border-estate-accent/50 rounded-[24px] shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-estate-accent font-black text-sm uppercase tracking-widest">COMMUNITY PLANNING</span>
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-md text-xs uppercase tracking-wider">UPCOMING EVENT</span>
                        </div>
                        <h5 className="font-black text-2xl text-white mb-2">
                          Annual General Assembly - Solar Grid Expansion Agenda
                        </h5>
                        <p className="text-lg text-slate-200 font-medium leading-relaxed">
                          We will hold the general assembly on July 28th to review Phase 2 of the Solar microgrid integration. This expansion will extend twenty four hours electricity coverage to all commercial sectors.
                        </p>
                      </div>

                      <div className="p-8 bg-slate-900 border-2 border-white/20 rounded-[24px] shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-slate-300 font-black text-sm uppercase tracking-widest">BOTANICAL BOARD</span>
                          <span className="px-3 py-1 bg-white/10 text-white font-bold rounded-md text-xs uppercase tracking-wider">INFO</span>
                        </div>
                        <h5 className="font-black text-2xl text-white mb-2">
                          Green Preserve Cleanup Drive
                        </h5>
                        <p className="text-lg text-slate-200 font-medium leading-relaxed">
                          The Environmental committee is leading a tree-planting picnic next Saturday at 10:00 AM. Free botanical seeds and sorting waste bags will be distributed.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 7: COMPLAINT DESK (ALL ROLES) */}
                {activeTab === 'reports' && (
                  <motion.div
                    key="reports"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-8"
                  >
                    <div>
                      <span className="text-base font-mono text-estate-accent font-black uppercase tracking-widest block">
                        Feedback & Assistance
                      </span>
                      <h4 className="text-4xl md:text-5xl font-display font-black text-white">
                        Filing & Report Desk
                      </h4>
                      <p className="text-xl text-slate-200 mt-2 font-medium">
                        Submit immediate maintenance, secure patrol, or infrastructure complaints directly to the board.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Filing form */}
                      <div className="lg:col-span-5">
                        <form onSubmit={handleAddReport} className="p-8 rounded-[24px] bg-slate-900 border border-white/10 space-y-6 text-sm font-sans text-slate-100 shadow-xl">
                          <h5 className="font-display font-black text-2xl text-white mb-2 flex items-center gap-2">
                            <Send className="w-6 h-6 text-estate-accent" />
                            Submit a New Complaint
                          </h5>

                          <div className="space-y-2">
                            <label className="block text-sm font-mono font-black uppercase tracking-wider text-estate-accent">Category</label>
                            <select 
                              value={reportCategory}
                              onChange={(e) => setReportCategory(e.target.value)}
                              className="w-full bg-slate-850 border-2 border-white/15 rounded-xl px-4 py-3 text-white font-bold text-base focus:border-estate-accent focus:outline-none"
                            >
                              <option value="Security">Security & Escorts</option>
                              <option value="Infrastructure">Infrastructure (Paving / Solar)</option>
                              <option value="Power">Solar Microgrid Utility</option>
                              <option value="Welfare">Welfare & Logistics</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-mono font-black uppercase tracking-wider text-estate-accent">Complaint Description</label>
                            <textarea 
                              required
                              rows={4}
                              placeholder="Describe the issue in detail..."
                              value={reportTitle}
                              onChange={(e) => setReportTitle(e.target.value)}
                              className="w-full bg-slate-850 border-2 border-white/15 rounded-xl px-4 py-3 text-white text-base focus:border-estate-accent focus:outline-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-4 bg-estate-accent hover:bg-white text-estate-secondary font-black uppercase text-sm tracking-widest rounded-xl transition-all cursor-pointer mt-4 shadow-lg"
                          >
                            Submit Complaint
                          </button>
                        </form>
                      </div>

                      {/* Report lists */}
                      <div className="lg:col-span-7">
                        <div className="p-8 bg-slate-900 border border-white/10 rounded-[28px] text-sm text-left space-y-6 shadow-xl">
                          <h5 className="font-display font-black text-2xl text-white">
                            Current Active Complaints ({reports.length})
                          </h5>

                          <div className="space-y-4">
                            {reports.map(rep => (
                              <div key={rep.id} className="p-6 bg-white/5 rounded-2xl border-2 border-white/5 flex items-start justify-between text-lg gap-4 shadow">
                                <div className="space-y-1">
                                  <h6 className="font-black text-xl text-white">{rep.title}</h6>
                                  <p className="text-base text-slate-200 font-medium">Category: {rep.category} • Date: {rep.date}</p>
                                  <span className="font-mono text-estate-accent font-black block mt-2 text-sm">TICKET ID: {rep.id}</span>
                                </div>
                                <span className={`px-3 py-1 rounded font-mono font-black text-sm uppercase shrink-0 ${
                                  rep.status === 'Resolved' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                                }`}>
                                  {rep.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 8: MARKETPLACE / BUY UTILITIES & MERCH */}
                {activeTab === 'store' && (
                  <motion.div
                    key="store"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-8"
                  >
                    <div>
                      <span className="text-base font-mono text-estate-accent font-black uppercase tracking-widest block">
                        Estate Store & Utility Desk
                      </span>
                      <h4 className="text-4xl md:text-5xl font-display font-black text-white">
                        Order Utilities & Anniversary Merchandise
                      </h4>
                      <p className="text-xl text-slate-200 mt-2 font-medium">
                        Procure high-priority items directly. Order RFID vehicle tags, solar utility tokens, or 30th Anniversary jubilee merchandise.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {storeItems.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <div 
                            key={item.id} 
                            className="p-8 bg-slate-900 border-2 border-white/10 rounded-3xl flex flex-col justify-between space-y-6 hover:border-estate-accent transition-colors text-left shadow-xl"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-4 bg-estate-accent/15 border border-estate-accent/20 text-estate-accent rounded-xl shrink-0">
                                  <ItemIcon className="w-8 h-8" strokeWidth={3} />
                                </div>
                                <div>
                                  <span className="text-sm font-mono font-black text-estate-accent uppercase tracking-wider block">
                                    {item.category}
                                  </span>
                                  <h5 className="font-display font-black text-2xl text-white mt-1">
                                    {item.name}
                                  </h5>
                                </div>
                              </div>
                              <span className="text-3xl font-display font-black text-white">
                                {item.price}
                              </span>
                            </div>

                            <p className="text-base text-slate-200 font-medium leading-relaxed">
                              {item.description}
                            </p>

                            <button
                              onClick={() => handleBuyItem(item)}
                              className="w-full py-4 bg-estate-accent hover:bg-white text-estate-secondary font-black uppercase text-sm tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                            >
                              <CreditCard className="w-5 h-5" strokeWidth={3} />
                              Place Secure Order
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Store guidelines info */}
                    <div className="p-6 bg-white/5 border-2 border-white/10 rounded-2xl flex items-start gap-4 shadow-lg">
                      <Sparkles className="w-8 h-8 text-estate-accent shrink-0 mt-0.5" />
                      <div className="text-base">
                        <span className="font-black text-white uppercase block tracking-wider text-lg">SECURE PICKUP PROTOCOL</span>
                        <p className="text-slate-200 mt-2 leading-relaxed">
                          Transactions will be processed locally and billed via your annual property levies. For security, tags and physical badges must be collected in-person from the Secretariat by showing your member ID card.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
