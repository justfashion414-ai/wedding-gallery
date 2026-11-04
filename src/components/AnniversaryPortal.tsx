import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimationFrame, useMotionValue } from 'motion/react';
import { 
  Home, 
  Plus, 
  Settings, 
  X, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  ThumbsUp,
  Heart, 
  Share2, 
  Trash2, 
  Flag, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone,
  Film,
  PartyPopper,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Send,
  User,
  Camera,
  Check,
  Users,
  Trash,
  Megaphone,
  Edit3,
  Download
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { get, set, del } from 'idb-keyval';
import { signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';



import { 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  KeyRound,
  MessageCircle,
} from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't necessarily want to crash the whole app for a user, 
  // but we want this info in the logs for debugging.
  return errInfo;
}

interface AnniversaryPortalProps {
  onBackToMain: () => void;
}

export interface AdItem {
  id: string;
  sponsorName: string;
  headline: string;
  description?: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: ('image' | 'video')[];
  ctaText?: string;
  ctaUrl?: string;
  createdAt?: number;
}

interface WeddingEvent {
  id: string;
  name: string;
  type: string;
  date: string; // YYYY-MM-DD
  time?: string; // 24h HH:MM
  desc: string;
}

const WEDDING_DATE = '2026-12-12';
const WEDDING_TIME = '11:00';

const EVENTS_DATA: WeddingEvent[] = [
  { id: 'intro', name: 'Introduction', type: 'Traditional introduction', date: '2026-06-20', desc: 'Both families meet, gifts are exchanged and the journey becomes official.' },
  { id: 'engage', name: 'Engagement', type: 'Engagement ceremony', date: '2026-07-18', desc: 'The ring, the yes and the first big celebration together.' },
  { id: 'court', name: 'Court Wedding', type: 'Registry', date: '2026-08-28', desc: 'Signing the register with our closest people.' },
  { id: 'shower', name: 'Bridal Shower', type: "Dara's party", date: '2026-11-21', desc: 'An afternoon of games, gifts and girls with the bride.' },
  { id: 'stag', name: "Groom's Party", type: "Femi's party", date: '2026-11-28', desc: 'The groomsmen send Femi off in style.' },
  { id: 'church', name: 'Church Wedding', type: 'Holy matrimony', date: '2026-12-12', time: '11:00', desc: 'Vows before God, family and friends.' },
  { id: 'reception', name: 'Reception', type: 'Hall celebration', date: '2026-12-12', time: '15:00', desc: 'Food, music, aso-ebi and the first dance.' },
  { id: 'thanks', name: 'Thanksgiving', type: 'Thanksgiving service', date: '2026-12-13', desc: 'We close the weekend giving thanks together.' },
];

const JOURNEY_STATES: string[] = (() => {
  const now = Date.now();
  let nextFound = false;
  return EVENTS_DATA.map((e) => {
    const t = new Date(`${e.date}T${e.time || '12:00'}:00`).getTime();
    if (t < now) return 'done';
    if (!nextFound) { nextFound = true; return 'next'; }
    return 'todo';
  });
})();

const JOURNEY_DATES: string[] = EVENTS_DATA.map((e) =>
  new Date(`${e.date}T${e.time || '12:00'}:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
);

// Local placeholder photos used until real ones are uploaded (hero + footer grid)
const PLACEHOLDER_IMAGES = [
  '/placeholder-1.svg',
  '/placeholder-2.svg',
  '/placeholder-3.svg',
  '/placeholder-4.svg',
  '/placeholder-5.svg',
  '/placeholder-6.svg',
];

const normalizeCode = (v: string) => v.trim().toUpperCase();

// Helper to convert small image files to compressed data URLs if cloud upload is unavailable
const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
};

// Helper for centralized file uploads (Direct signed Cloudinary upload + Server proxy + Fallback)
const uploadToCloudinary = async (file: Blob, folder: string): Promise<string> => {
  const fileName = (file as File).name || (file.type?.startsWith('video/') ? 'upload.mp4' : 'upload.jpg');
  const isVideo = Boolean(file.type && file.type.startsWith('video/')) || /\.(mp4|mov|webm|mkv)$/i.test(fileName);

  // Attach the caller's Firebase ID token so the signature endpoint can verify them.
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null);

  console.log(`Starting upload to Cloudinary: ${file.size} bytes (${fileName}) to folder ${folder}`);

  // Strategy 1: Direct signed upload to Cloudinary API (works on both Express /api/upload-signature and Netlify /.netlify/functions/upload-signature)
  const signatureEndpoints = [
    `/api/upload-signature?folder=${encodeURIComponent(folder)}`,
    `/.netlify/functions/upload-signature?folder=${encodeURIComponent(folder)}`
  ];

  for (const sigEndpoint of signatureEndpoints) {
    try {
      const sigRes = await fetch(sigEndpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        }
      });

      if (sigRes.ok) {
        const sigText = await sigRes.text();
        let sigData: any = null;
        try {
          sigData = JSON.parse(sigText);
        } catch {
          sigData = null;
        }

        if (sigData && sigData.signature && sigData.cloudName && sigData.apiKey) {
          const directForm = new FormData();
          directForm.append('file', file, fileName);
          directForm.append('api_key', sigData.apiKey);
          directForm.append('timestamp', String(sigData.timestamp));
          directForm.append('signature', sigData.signature);
          directForm.append('folder', sigData.folder || folder);

          const resourceType = isVideo ? 'video' : 'auto';
          const directRes = await fetch(
            `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`,
            {
              method: 'POST',
              body: directForm
            }
          );

          const directJson = await directRes.json().catch(() => null);
          if (directRes.ok && directJson?.secure_url) {
            return directJson.secure_url;
          }
          console.warn('Direct Cloudinary upload returned non-OK, falling back:', directJson);
          break;
        }
      }
    } catch (directErr) {
      console.warn(`Signature check via ${sigEndpoint} failed:`, directErr);
    }
  }

  // Strategy 2: Server-side / Netlify Function proxy upload (/api/upload or /.netlify/functions/upload)
  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('folder', folder);

  let res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
    },
    body: formData
  });

  if (res.status === 404) {
    res = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      },
      body: formData
    });
  }

  const responseText = await res.text();
  let responseData: any = null;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    // Not JSON (e.g., proxy cookie_check HTML or 413 HTML page)
  }

  if (res.ok && responseData?.url) {
    return responseData.url;
  }

  // Strategy 3: If the proxy intercepted the request with an HTML page (like cookie_check.html)
  // or if the file is an image that can be embedded as a compact Data URL (< 700KB), fallback gracefully
  if (!isVideo && file.size <= 700 * 1024) {
    try {
      const dataUrl = await blobToDataUrl(file);
      return dataUrl;
    } catch {
      // Ignore fallback error and throw descriptive error below
    }
  }

  if (responseText.trim().toLowerCase().startsWith('<!doctype html') || responseText.trim().toLowerCase().startsWith('<html')) {
    if (res.status === 413 || file.size > 30 * 1024 * 1024) {
      throw new Error('File is too large (max 30MB). Please choose a smaller file.');
    }
    throw new Error('Session cookie check intercepted upload. Please refresh the page and try again.');
  }

  const errorInfo = responseData?.details || responseData?.error || responseData?.message || responseText.substring(0, 160) || `Status ${res.status}`;
  throw new Error(`Upload failed: ${errorInfo}`);
};

export default function AnniversaryPortal({ onBackToMain }: AnniversaryPortalProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [feedSubTab, setFeedSubTab] = useState<'post' | 'reels'>('post');
  const [videoOrientations, setVideoOrientations] = useState<Record<string, 'portrait' | 'landscape'>>({});
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [fontSize, setFontSize] = useState<'m' | 'l' | 'xl'>('m');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [footerImages, setFooterImages] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ann-footer-images');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [footerLightbox, setFooterLightbox] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{url: string, id: string, type?: 'image' | 'video', orientation?: 'portrait' | 'landscape'}[]>([]);

  // Email/password admin auth state
  const [authScreen, setAuthScreen] = useState<null | 'signin' | 'forgot' | 'sent'>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [setPasswordBusy, setSetPasswordBusy] = useState(false);

  
  // Firebase & Profile State
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState(localStorage.getItem('ann-profile-name') || '');
  const [avatar, setAvatar] = useState(localStorage.getItem('ann-profile-avatar') || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdminModalOpen, setIsAdminDashboardOpen] = useState(false);
  const [activeAccessCode, setActiveAccessCode] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isAdminSessionValid, setIsAdminSessionValid] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [adminPermissions, setAdminPermissions] = useState<any>(null);
  const [deletedPosts, setDeletedPosts] = useState<any[]>([]);
  const [allAdmins, setAllAdmins] = useState<any[]>([]);
  const [heroImages, setHeroImages] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('ann-hero-images');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore parse error
    }
    return [];
  });
  const [postAds, setPostAds] = useState<AdItem[]>([]);
  const [reelAds, setReelAds] = useState<AdItem[]>([]);
  const [shuffledPostAds, setShuffledPostAds] = useState<AdItem[]>([]);
  const [shuffledReelAds, setShuffledReelAds] = useState<AdItem[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [aboutClickCount, setAboutClickCount] = useState(0);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ann-bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const sessionWarningRef = useRef(false);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userLoves, setUserLoves] = useState<Record<string, boolean>>({});
  const [reactionsLoading, setReactionsLoading] = useState(true);
  const [sharingPost, setSharingPost] = useState<any>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<{postId: string, index: number} | null>(null);

  // PWA Install, Launch Follow-up Splash & Offline State
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(() => (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt || null : null));
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [pendingAndroidInstall, setPendingAndroidInstall] = useState(false);
  const [showIOSInstallModal, setShowIOSInstallModal] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowLaunchSplash(false);
    }, 5000);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsPWAInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOSDevice(isIOS);

    if ((window as any).__deferredPwaPrompt) {
      setDeferredInstallPrompt((window as any).__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredInstallPrompt(e);
    };

    const handlePwaPromptReady = (e: Event) => {
      const promptEvent = (e as CustomEvent).detail || (window as any).__deferredPwaPrompt;
      if (promptEvent) {
        setDeferredInstallPrompt(promptEvent);
      }
    };

    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setDeferredInstallPrompt(null);
      setPendingAndroidInstall(false);
      (window as any).__deferredPwaPrompt = null;
      showToast('App downloaded and installed successfully!');
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('autoinstall') === '1' && !isIOS) {
      setPendingAndroidInstall(true);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePwaPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePwaPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Automatically trigger native Android install if user tapped Install while service worker was still registering
  useEffect(() => {
    if (pendingAndroidInstall && deferredInstallPrompt) {
      setPendingAndroidInstall(false);
      (async () => {
        try {
          await deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            setIsPWAInstalled(true);
            setDeferredInstallPrompt(null);
            (window as any).__deferredPwaPrompt = null;
          }
        } catch (err) {
          console.error('Deferred install prompt error:', err);
        }
      })();
    }
  }, [pendingAndroidInstall, deferredInstallPrompt]);

  const handleInstallClick = async () => {
    // Only iOS devices should ever see the 2-step Add to Home Screen modal
    if (isIOSDevice) {
      setShowIOSInstallModal(true);
      return;
    }

    const promptEvent = deferredInstallPrompt || (window as any).__deferredPwaPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsPWAInstalled(true);
          setDeferredInstallPrompt(null);
          (window as any).__deferredPwaPrompt = null;
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
      return;
    }

    // If Android/Chromium user is inside an iframe where top-level window is required for native WebAPK download:
    if (window.self !== window.top) {
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('autoinstall', '1');
      const a = document.createElement('a');
      a.href = targetUrl.toString();
      a.target = '_top';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setPendingAndroidInstall(true);
    showToast('Downloading app...', 'info');
  };

  // 1. Handle Auth & Session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        setUser(currUser);
        
        // Admin Session Management
        if (!currUser.isAnonymous) {
          const idToken = await currUser.getIdTokenResult();
          const authTime = (idToken.claims.auth_time as any) || Math.floor(new Date(currUser.metadata.lastSignInTime || Date.now()).getTime() / 1000);
          const expiresAt = (Number(authTime) + 1800) * 1000; // 30 minutes
          const now = Date.now();
          
          if (now >= expiresAt) {
            signOut(auth);
            setIsAdminSessionValid(false);
            showToast("Your admin session expired. Please sign in again.", "info");
          } else {
            setSessionExpiry(expiresAt);
            setIsAdminSessionValid(true);
            sessionWarningRef.current = false;
          }
        } else {
          setSessionExpiry(null);
          setIsAdminSessionValid(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setAdminPermissions(null);
        setSessionExpiry(null);
        signInAnonymously(auth).catch(err => console.error("Anonymous auth error:", err));
      }
    });
    return () => unsub();
  }, []);

  // 1b. Session Expiry Timers & Visibility Checks
  useEffect(() => {
    if (!sessionExpiry || !user) return;

    const checkExpiry = () => {
      const now = Date.now();
      const timeLeft = sessionExpiry - now;

      if (timeLeft <= 0) {
        signOut(auth);
        setIsAdminDashboardOpen(false);
        setIsAdminSessionValid(false);
        showToast("Your admin session expired. Please sign in again.", "error");
      } else if (timeLeft < 120000 && !sessionWarningRef.current) {
        showToast("Admin session expiring in 2 minutes.", "error");
        sessionWarningRef.current = true;
      }
    };

    const timer = setInterval(checkExpiry, 10000);
    window.addEventListener('visibilitychange', checkExpiry);
    window.addEventListener('focus', checkExpiry);

    return () => {
      clearInterval(timer);
      window.removeEventListener('visibilitychange', checkExpiry);
      window.removeEventListener('focus', checkExpiry);
    };
  }, [sessionExpiry, user]);

  // 1c. Live Profile, Admin & Reactions Sync
  useEffect(() => {
    if (!user) return;

    const isSuper = user.email === "justfashion414@gmail.com";

    // Sync profile
    const profileUnsub = onSnapshot(doc(db, 'residents', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.displayName) setDisplayName(data.displayName);
        if (data.photoUrl) setAvatar(data.photoUrl);
      } else {
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `residents/${user.uid}`);
    });

    // Sync admin status
    const adminUnsub = onSnapshot(doc(db, 'admins', user.email || 'anonymous'), (snap) => {
      if (snap.exists()) {
        setIsAdmin(true);
        setAdminPermissions(snap.data().permissions);
        setMustSetPassword(!!snap.data().mustSetPassword);
      } else if (isSuper) {
        setMustSetPassword(false);
        setIsAdmin(true);
        setAdminPermissions({ 
          canDeletePosts: true, 
          canUploadImages: true, 
          canSetAccessCode: true 
        });
      } else {
        setIsAdmin(false);
        setAdminPermissions(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `admins/${user.email}`);
    });

    return () => {
      profileUnsub();
      adminUnsub();
    };
  }, [user]);

  // Handle Reactions Logic
  const handleToggleReaction = async (postId: string, type: 'like' | 'love') => {
    if (!user) {
      showToast("Please wait while we connect you...", "error");
      return;
    }
    
    const isActive = type === 'like' ? !!userLikes[postId] : !!userLoves[postId];
    const otherTypeActive = type === 'like' ? !!userLoves[postId] : !!userLikes[postId];
    
    const batch = writeBatch(db);
    const reactionRef = doc(db, 'posts', postId, 'reactions', user.uid);
    const postRef = doc(db, 'posts', postId);

    try {
      // 1. Update the reaction document (merge)
      batch.set(reactionRef, { 
        [type]: !isActive,
        updatedAt: serverTimestamp() 
      }, { merge: true });

      // 2. Update the post counter
      batch.update(postRef, { 
        [`${type}Count`]: increment(isActive ? -1 : 1) 
      });
      
      // Optimistic UI Update
      if (type === 'like') {
        setUserLikes(prev => ({ ...prev, [postId]: !isActive }));
      } else {
        setUserLoves(prev => ({ ...prev, [postId]: !isActive }));
      }
      
      await batch.commit();
    } catch (err) {
      console.error("Reaction error:", err);
      showToast("Reaction failed. Please try again.", "error");
      // Revert optimistic
      if (type === 'like') setUserLikes(prev => ({ ...prev, [postId]: isActive }));
      else setUserLoves(prev => ({ ...prev, [postId]: isActive }));
    }
  };

  // 1d. Deep Linking for Sharing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    if (postId && activeTab === 'feed') {
      setTimeout(() => {
        const el = document.getElementById(`post-${postId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-[#0E6B75]', 'ring-offset-4', 'rounded-2xl');
          setTimeout(() => el.classList.remove('ring-2', 'ring-[#0E6B75]', 'ring-offset-4'), 3000);
        }
      }, 1000);
    }
  }, [activeTab, posts]);

  // 2. Sync Global Config (Access Code)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_config', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.activeAccessCode) {
          setActiveAccessCode(normalizeCode(data.activeAccessCode));
        }
        if (Array.isArray(data.heroImages)) {
          setHeroImages(data.heroImages);
          try {
            localStorage.setItem('ann-hero-images', JSON.stringify(data.heroImages));
          } catch {
            // Ignore storage quota error
          }
        }
        if (Array.isArray(data.footerImages)) {
          setFooterImages(data.footerImages);
          try {
            localStorage.setItem('ann-footer-images', JSON.stringify(data.footerImages));
          } catch {
            // Ignore storage quota error
          }
        }
        if (Array.isArray(data.postAds)) {
          setPostAds(data.postAds);
          const copy = [...data.postAds];
          for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          setShuffledPostAds(copy);
        }
        if (Array.isArray(data.reelAds)) {
          setReelAds(data.reelAds);
          const copy = [...data.reelAds];
          for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          setShuffledReelAds(copy);
        }
      }
      setConfigLoaded(true);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'app_config/main');
      console.error("Config sync error:", err);
      setConfigLoaded(true); // Still set loaded to stop spinners, but activeAccessCode will remain null
    });
    return () => unsub();
  }, []);

  // 2b. Initialize Config (Admin only)
  useEffect(() => {
    if (!isAdmin || !isAdminSessionValid) return;
    
    const initConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'app_config', 'main'));
        if (!snap.exists()) {
          await setDoc(doc(db, 'app_config', 'main'), { 
            activeAccessCode: 'DARAFEMI26',
            createdAt: serverTimestamp()
          });
        }

      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'app_config/main');
        console.error("Config initialization error:", err);
      }
    };
    
    initConfig();

    // Also sync all admins if super admin
    if (user?.email === "justfashion414@gmail.com") {
      const unsubAdmins = onSnapshot(collection(db, 'admins'), (snap) => {
        setAllAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      const unsubDeleted = onSnapshot(collection(db, 'deleted_posts'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDeletedPosts(docs);
        
        // Auto-purge posts older than 3 days
        const now = Date.now();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        docs.forEach(async (dp: any) => {
          const deletedAt = dp.deletedAt?.toDate?.() || new Date(dp.deletedAt);
          if (now - deletedAt.getTime() > threeDaysMs) {
            try {
              await deleteDoc(doc(db, 'deleted_posts', dp.id));
              console.log("Auto-purged old deleted post:", dp.id);
            } catch (err) {
              console.error("Purge error:", err);
            }
          }
        });
      });

      return () => {
        unsubAdmins();
        unsubDeleted();
      };
    } else if (isAdmin) {
      // Just sync deleted posts for regular admins with permission
      const unsubDeleted = onSnapshot(collection(db, 'deleted_posts'), (snap) => {
        setDeletedPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubDeleted();
    }
  }, [isAdmin, isAdminSessionValid, user]);

  // Handle Admin Login (email & password)
  const handleAdminLogin = async (email: string, password: string) => {
    setAuthError('');
    setAuthBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setAuthScreen(null);
      setAuthPassword('');
      setAuthEmail('');
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-credential')) {
        setAuthError('Email or password is incorrect.');
      } else if (code.includes('too-many-requests')) {
        setAuthError('Too many attempts. Try again in a moment.');
      } else {
        setAuthError('Could not sign in. Please try again.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminSignup = async (email: string, password: string) => {
    setAuthError('');
    setAuthBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setAuthScreen(null);
      setAuthPassword('');
      setAuthEmail('');
      showToast('Admin account created.', 'success');
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('email-already-in-use')) {
        setAuthError('That email already has an account. Sign in instead.');
      } else if (code.includes('weak-password')) {
        setAuthError('Password is too weak. Use at least 6 characters.');
      } else {
        setAuthError('Could not create the account. Please try again.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setAuthError('');
    setAuthBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAuthScreen('sent');
    } catch (err: any) {
      const code = err?.code || '';
      setAuthError(code.includes('user-not-found') ? 'No account found for that email.' : 'Could not send the reset email. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSetPermanentPassword = async () => {
    if (newPassword.length < 6) { setAuthError('Use at least 6 characters.'); return; }
    if (newPassword !== confirmNewPassword) { setAuthError('The two passwords do not match.'); return; }
    setAuthError('');
    setSetPasswordBusy(true);
    try {
      if (user) await updatePassword(user, newPassword);
      if (user?.email) await setDoc(doc(db, 'admins', user.email), { mustSetPassword: false }, { merge: true });
      setMustSetPassword(false);
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Permanent password saved. Welcome in!', 'success');
    } catch (err) {
      console.error('Set password error:', err);
      setAuthError('Could not update the password. Sign out, sign in again, then try.');
    } finally {
      setSetPasswordBusy(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const updateAccessCode = async (newCode: string) => {
    if (!isAdmin || !adminPermissions?.canSetAccessCode) return;
    const normalized = normalizeCode(newCode);
    if (!normalized || normalized.length < 4) return;

    try {
      await setDoc(doc(db, 'app_config', 'main'), {
        activeAccessCode: normalized,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      showToast('Access code updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'app_config/main');
      console.error("Update code error:", err);
      showToast('Failed to update access code.', 'error');
    }
  };

  // Delete Post (Move to Recycle Bin)
  const handleDeletePost = async (postId: string) => {
    if (!isAdmin || !adminPermissions?.canDeletePosts) {
      showToast("Permission denied for deletion.", "error");
      return;
    }
    
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const postData = postSnap.data();
        
        // 1. Move to deleted_posts
        await setDoc(doc(db, 'deleted_posts', postId), {
          originalId: postId,
          postData: postData,
          deletedAt: serverTimestamp(),
          deletedBy: user.email
        });
        
        // 2. Delete from main feed
        await deleteDoc(postRef);
        
        showToast('Post moved to recycle bin');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
      console.error("Delete error:", err);
      showToast("Failed to move post to bin.", "error");
    }
  };

  // Restore Post
  const handleRestorePost = async (postId: string) => {
    if (!isAdmin || !adminPermissions?.canDeletePosts) return;

    try {
      const delRef = doc(db, 'deleted_posts', postId);
      const delSnap = await getDoc(delRef);

      if (delSnap.exists()) {
        const { postData } = delSnap.data();
        
        // 1. Move back to posts
        await setDoc(doc(db, 'posts', postId), postData);
        
        // 2. Remove from bin
        await deleteDoc(delRef);

        showToast('Post restored to feed');
      }
    } catch (err) {
      console.error("Restore error:", err);
      showToast("Failed to restore post.", "error");
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (postId: string) => {
    if (!isAdmin || !adminPermissions?.canDeletePosts) return;
    try {
      await deleteDoc(doc(db, 'deleted_posts', postId));
      showToast('Post permanently erased');
    } catch (err) {
      console.error("Erase error:", err);
      showToast("Failed to erase post.", "error");
    }
  };

  // 3. Handle Posts Sync
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(p);
      setIsPostsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'posts');
      setIsPostsLoading(false);
    });
    return () => unsub();
  }, []);

  // 3b. Detect video orientation for existing posts without explicit orientation metadata
  useEffect(() => {
    posts.forEach((p) => {
      if (p.id === 'jubilee_documentary') return;
      if (p.videoOrientation) {
        setVideoOrientations((prev) => (prev[p.id] === p.videoOrientation ? prev : { ...prev, [p.id]: p.videoOrientation }));
        return;
      }
      if (videoOrientations[p.id]) return;

      const media: string[] = p.mediaUrls || (p.mediaUrl ? [p.mediaUrl] : []);
      const videoUrl = media.find((u, idx) =>
        p.mediaTypes?.[idx] === 'video' ||
        u.toLowerCase().includes('.mp4') ||
        u.toLowerCase().includes('.webm') ||
        u.toLowerCase().includes('.mov') ||
        u.includes('/video/')
      );

      if (videoUrl) {
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          const isPortrait = vid.videoHeight > vid.videoWidth;
          setVideoOrientations((prev) => ({
            ...prev,
            [p.id]: isPortrait ? 'portrait' : 'landscape'
          }));
        };
        vid.onerror = () => {
          setVideoOrientations((prev) => ({
            ...prev,
            [p.id]: 'landscape'
          }));
        };
        vid.src = videoUrl;
      }
    });
  }, [posts, videoOrientations]);

  // 3. Handle Local Persistence
  useEffect(() => {
    localStorage.setItem('ann-profile-name', displayName);
  }, [displayName]);

  useEffect(() => {
    localStorage.setItem('ann-profile-avatar', avatar);
  }, [avatar]);

  // Handle profile save to Firestore
  const saveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      let finalAvatarUrl = avatar;

      // Check if we have a temporary file to upload
      const tempFile = await get('temp_profile_avatar');
      if (tempFile && avatar?.startsWith('blob:')) {
        const url = await uploadToCloudinary(tempFile, 'residents');
        finalAvatarUrl = url;
      }

      await setDoc(doc(db, 'residents', user.uid), {
        displayName,
        photoUrl: finalAvatarUrl,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await del('temp_profile_avatar');
      showToast('Profile saved successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `residents/${user.uid}`);
      console.error("Error saving profile:", err);
      showToast('Error saving profile. Try again.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle theme
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (t: string) => {
      const isDark = t === 'dark' || (t === 'system' && mediaQuery.matches);
      setIsDarkMode(isDark);
      if (isDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };

    applyTheme(theme);
    const listener = () => { if (theme === 'system') applyTheme('system'); };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Handle font size
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-size', fontSize);
    if (fontSize === 'l') {
      root.style.fontSize = '112.5%';
    } else if (fontSize === 'xl') {
      root.style.fontSize = '125%';
    } else {
      root.style.fontSize = '100%';
    }
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('ann-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const getDayPhase = () => {
    const now = new Date();
    const start = new Date(`${WEDDING_DATE}T${WEDDING_TIME}:00`);
    const end = new Date('2026-12-14T00:00:00');
    if (now < start) return 'before';
    if (now > end) return 'after';
    return 'during';
  };

  const phase = getDayPhase();
  const daysToGo = Math.max(0, Math.ceil((new Date(`${WEDDING_DATE}T${WEDDING_TIME}:00`).getTime() - Date.now()) / 86400000));

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0B171C] text-[#E8EEF0]' : 'bg-[#EEEDF3] text-[#14262D]'} font-sans pb-32`}>
      {/* FOLLOW-UP LAUNCH SPLASH SCREEN AFTER PWA ICON SPLASH */}
      <AnimatePresence>
        {showLaunchSplash && (
          <motion.section
            key="launch-followup-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setShowLaunchSplash(false)}
            className="fixed inset-0 z-[500] overflow-hidden flex items-center justify-center bg-[#0B3A41] cursor-pointer select-none"
          >
            {/* SPLASH: DARA & FEMI */}
            <div className="relative z-10 flex flex-col items-center max-w-full px-6 text-center pointer-events-none">
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 14 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease: "circOut" }}
              >
                <p className="text-[0.95rem] font-medium tracking-wide text-[#BCD4D8] m-0 mb-4">Together with their families</p>
                <h1 className="font-serif-display text-white text-[clamp(3.4rem,17vw,5.6rem)] leading-[0.95] m-0">
                  Dara
                  <span className="block italic text-[clamp(1.5rem,7.5vw,2.1rem)] text-[#C8932A] my-3">and</span>
                  Femi
                </h1>
                <p className="text-[#BCD4D8] text-[1rem] mt-6 mb-0">Wedding memories, kept for life.</p>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                transition={{ delay: 0.9, duration: 0.8 }}
                className="mt-10 text-[0.8rem] text-white"
              >
                Tap to enter
              </motion.p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Simplified Header - CLEAN DESIGN (Hidden when viewing full-portrait Reels) */}
      {!(activeTab === 'feed' && feedSubTab === 'reels') && (
        <header className={`sticky top-0 z-[60] backdrop-blur-md px-5 py-3.5 border-b transition-colors ${isDarkMode ? 'bg-[#0B171C]/80 border-[#22363E]' : 'bg-[#EEEDF3]/80 border-[#DAD8E3]'}`}>
          <div className="max-w-[520px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-[1.25rem] font-serif-display italic font-medium tracking-[0] leading-none text-[#0E6B75]">Dara &amp; Femi</h1>
              {!isOnline && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                  Offline
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {!isPWAInstalled && (
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E6B75] text-white text-[0.72rem] font-black uppercase tracking-wider shadow-sm hover:scale-105 active:scale-95 transition-all"
                  title="Install App"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Install</span>
                </button>
              )}
              <div className={`w-8 h-8 rounded-full overflow-hidden border ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'} bg-[#0E6B75] flex items-center justify-center text-[0.65rem] text-white font-black`}>
                {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <span>{displayName ? displayName[0].toUpperCase() : 'Y'}</span>}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-[520px] mx-auto px-4 pt-1.5">
        {/* PERSISTENT HERO SECTION - Kept laid out in the background even when on other tabs so offsetHeight is never 0 and pairs continue scrolling seamlessly */}
        <div
          className={
            activeTab === 'home'
              ? 'block'
              : 'fixed top-0 left-0 w-full opacity-0 pointer-events-none -z-50 overflow-hidden'
          }
          aria-hidden={activeTab !== 'home'}
        >
           <FloatingHeroSection isDarkMode={isDarkMode} images={heroImages} />
        </div>

        {/* TOAST NOTIFICATION */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ y: -100, x: '-50%', opacity: 0 }}
              animate={{ y: 20, x: '-50%', opacity: 1 }}
              exit={{ y: -100, x: '-50%', opacity: 0 }}
              className="fixed top-0 left-1/2 z-[200] w-full max-w-[320px] pointer-events-none"
            >
              <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 pointer-events-auto ${
                toast.type === 'success' 
                  ? 'bg-green-500 border-green-600 text-white' 
                  : toast.type === 'info'
                    ? 'bg-[#0E6B75] border-[#0A535C] text-white'
                    : 'bg-red-500 border-red-600 text-white'
              }`}>
                {toast.type === 'success' && <Check className="w-5 h-5" />}
                {toast.type === 'info' && <ShieldCheck className="w-5 h-5" />}
                {toast.type === 'error' && <X className="w-5 h-5" />}
                <p className="text-sm font-bold">{toast.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROFILE SETUP MODAL */}
        <ProfilePromptModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onGoToSettings={() => {
            setActiveTab('settings');
            setShowProfileModal(false);
          }}
          isDarkMode={isDarkMode}
        />

        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key={`home-tab-${activeTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-0"
            >
              {/* COUPLE BANNER - DARA & FEMI */}
              <div className="rounded-[28px] p-[26px_22px_26px] text-[#F2F7F8] relative overflow-hidden shadow-xl" style={{
                background: 'linear-gradient(135deg, #0B3A41 0%, #3A2F63 100%)'
              }}>
                <p className="m-0 text-center text-[0.92rem] font-medium text-[#C8932A]">Together with their families</p>
                <h2 className="text-center font-serif-display text-white text-[clamp(2.7rem,13vw,3.6rem)] leading-[1] mt-3 mb-0">
                  Dara
                  <span className="block italic text-[clamp(1.3rem,6vw,1.6rem)] text-[#C8932A] my-2">and</span>
                  Femi
                </h2>
                <p className="text-center text-[0.95rem] opacity-[0.85] mt-4 mb-0 max-w-[34ch] mx-auto leading-snug">are getting married. Share every moment with us, from the first introduction to the last dance.</p>

                {phase === 'before' && (
                  <div className="mt-5 mx-auto flex items-stretch justify-center bg-white/10 border border-white/25 rounded-[18px] py-3.5 backdrop-blur-md divide-x divide-white/25">
                    <div className="px-5 text-center">
                      <b className="block text-[1.5rem] font-serif-display leading-none">{daysToGo}</b>
                      <span className="block text-[0.68rem] uppercase tracking-wider opacity-75 mt-1.5">days to go</span>
                    </div>
                    <div className="px-5 text-center">
                      <b className="block text-[1.5rem] font-serif-display leading-none">12 Dec</b>
                      <span className="block text-[0.68rem] uppercase tracking-wider opacity-75 mt-1.5">2026</span>
                    </div>
                    <div className="px-5 text-center">
                      <b className="block text-[1.5rem] font-serif-display leading-none">Lagos</b>
                      <span className="block text-[0.68rem] uppercase tracking-wider opacity-75 mt-1.5">Nigeria</span>
                    </div>
                  </div>
                )}

                {phase === 'during' && (
                  <div className="mt-5 bg-white/10 border border-white/14 rounded-[18px] p-[14px_16px]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#7CF2B0]" />
                      <b className="text-[1.05rem] font-serif-display">It&apos;s the wedding day</b>
                    </div>
                    <p className="text-[0.9rem] opacity-[0.9] m-0">Share what you are seeing. We are keeping it all.</p>
                  </div>
                )}

                {phase === 'after' && (
                  <div className="mt-5 bg-white/10 border border-white/14 rounded-[18px] p-[14px_16px]">
                    <b className="text-[1.05rem] font-serif-display">The memories are here to stay</b>
                    <p className="text-[0.9rem] opacity-[0.9] m-0">Every moment from the weekend, kept for life.</p>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('feed')}
                  className="mt-5 inline-flex items-center justify-center gap-2 border-0 rounded-full p-[10px_18px] font-bold bg-white text-[#0B3A41] text-sm hover:scale-105 transition-all"
                >
                  See what guests are posting
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="flex items-center"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[3]" />
                  </motion.span>
                </button>
              </div>

              {/* OUR STORY */}
              <section className="mt-8">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">Our story</h2>
                <p className={`text-[0.95rem] leading-relaxed m-[0_4px_14px] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
                  Dara and Femi met at a friend&apos;s book launch in 2022. Four years, two families and one very patient pastor later, here we are. This page keeps every moment of it in one place, for life.
                </p>
                <div className={`p-[16px_18px] rounded-[20px] border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                  <strong className="block mb-0.5 text-[0.93rem]">How to share</strong>
                  <p className={`m-0 text-[0.93rem] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
                    Tap Feed to browse, then tap Send to post a photo, video, reel or written wish. No email or password needed.
                  </p>
                </div>
              </section>

              {/* THE JOURNEY */}
              <section className="mt-8">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_4px] leading-[1.25]">The journey</h2>
                <p className={`text-[0.9rem] m-[0_4px_14px] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Tap any event to see its memories.</p>
                <div className="ml-[10px] pl-[20px] border-l-[3px] border-[#DAD8E3] dark:border-[#22363E] space-y-3">
                  {EVENTS_DATA.map((e, i) => {
                    const st = JOURNEY_STATES[i];
                    const cnt = posts.filter((p: any) => p?.eventId === e.id).length;
                    const tagCls = st === 'done'
                      ? 'bg-[#0E6B75]/10 text-[#0E6B75] border-[#0E6B75]/30'
                      : st === 'next'
                        ? 'bg-[#C8932A]/15 text-[#C8932A] border-[#C8932A]/40'
                        : (isDarkMode ? 'bg-white/5 text-[#93A4AB] border-[#22363E]' : 'bg-[#EEEDF3] text-[#5A6970] border-[#DAD8E3]');
                    const dotCls = st === 'done'
                      ? 'bg-[#0E6B75] border-[#0E6B75]'
                      : st === 'next'
                        ? 'bg-[#C8932A] border-[#C8932A] shadow-[0_0_0_5px_rgba(200,147,42,0.18)]'
                        : (isDarkMode ? 'bg-[#0B171C] border-[#93A4AB]' : 'bg-[#EEEDF3] border-[#5A6970]');
                    return (
                      <button key={e.id} onClick={() => setActiveTab('feed')} className="relative block w-full text-left border-0 bg-transparent p-0 group">
                        <span className={`absolute -left-[30px] top-[20px] w-[14px] h-[14px] rounded-full border-[3px] ${dotCls}`} />
                        <div className={`rounded-[18px] border p-[14px_16px] transition-colors ${isDarkMode ? 'bg-[#13232A] border-[#22363E] group-hover:border-[#2FB3BF]/50' : 'bg-white border-[#DAD8E3] group-hover:border-[#0E6B75]/40'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <b className="text-[1rem] font-serif-display leading-tight">{e.name}</b>
                            <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${tagCls}`}>
                              {st === 'done' ? 'Done' : st === 'next' ? 'Next up' : 'Upcoming'}
                            </span>
                          </div>
                          <small className={`block text-[0.78rem] mt-0.5 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>{e.type} · {JOURNEY_DATES[i]}</small>
                          <p className={`text-[0.9rem] m-0 mt-1.5 leading-snug ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>{e.desc}</p>
                          <small className={`block text-[0.72rem] font-bold uppercase tracking-wider mt-2 ${st === 'next' ? 'text-[#C8932A]' : 'text-[#0E6B75]'}`}>
                            {cnt > 0 ? `${cnt} ${cnt === 1 ? 'memory' : 'memories'} shared` : 'Be the first to share'}
                          </small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* WEDDING DAY DETAILS */}
              <section className="mt-8">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">Wedding day</h2>
                <p className={`text-[0.9rem] m-[0_4px_14px] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Saturday, 12 December 2026</p>
                <div className={`p-[16px_18px] rounded-[20px] border space-y-3.5 ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                  <div>
                    <strong className="block text-[0.93rem]">Church wedding · 11:00 am</strong>
                    <p className={`m-0 text-[0.9rem] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Redeemed Chapel, Ikeja, Lagos</p>
                  </div>
                  <div className={`border-t ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'}`} />
                  <div>
                    <strong className="block text-[0.93rem]">Reception · 3:00 pm</strong>
                    <p className={`m-0 text-[0.9rem] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>The Grand Hall, Victoria Island, Lagos</p>
                  </div>
                  <div className={`border-t ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'}`} />
                  <div>
                    <strong className="block text-[0.93rem]">Aso-ebi: emerald green and gold</strong>
                    <p className={`m-0 text-[0.9rem] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Share your looks with <span className="font-bold text-[#0E6B75] dark:text-[#2FB3BF]">#DaraAndFemi2026</span></p>
                  </div>
                </div>
              </section>

              {/* OUR VENDORS */}
              <section className="mt-8">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_4px] leading-[1.25]">Our vendors</h2>
                <p className={`text-[0.9rem] m-[0_4px_14px] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Official media partners. They upload full albums here.</p>
                <div className="flex gap-3">
                  <div className={`flex-1 p-[14px_16px] rounded-[18px] border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                    <b className="block text-[0.95rem] font-serif-display">Lens &amp; Light Studio</b>
                    <span className={`block text-[0.78rem] mt-0.5 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Photographer</span>
                  </div>
                  <div className={`flex-1 p-[14px_16px] rounded-[18px] border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                    <b className="block text-[0.95rem] font-serif-display">Kiln Films</b>
                    <span className={`block text-[0.78rem] mt-0.5 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Videographer</span>
                  </div>
                </div>
              </section>

              {/* CTA */}
              <section className="mt-8 mb-2">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">Say something to the couple</h2>
                <button
                  onClick={() => setActiveTab('feed')}
                  className="w-full border-0 rounded-[16px] py-3.5 font-bold bg-[#0E6B75] text-white text-[0.95rem] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Open the feed
                </button>
              </section>

              {/* GIANT FOOTER WITH INTERACTIVE PHOTO GRID (placeholders until photos arrive) */}
              <section className="relative overflow-hidden w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-[700px] sm:min-h-[850px] flex items-center justify-center bg-[#EEEDF3] dark:bg-[#0B171C] mt-12">
                <div className="absolute inset-0 z-0 grid grid-cols-10 auto-rows-fr opacity-60">
                  <GridScanner isDarkMode={isDarkMode} images={footerImages} onTap={(src: string) => setFooterLightbox(src)} />
                </div>

                <motion.div
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: false, amount: 0.4 }}
                  className="relative z-10 flex flex-col items-center max-w-full px-4 text-center pointer-events-none"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                  >
                    <h2 className="text-[clamp(4rem,18vw,12rem)] font-black font-display tracking-[-0.08em] leading-[0.75] uppercase mb-0 text-[#0E6B75] drop-shadow-sm">
                      Dara
                    </h2>
                    <h2 className="text-[clamp(4rem,18vw,12rem)] font-black font-display tracking-[-0.08em] leading-[0.75] uppercase flex items-center justify-center gap-[0.05em] text-[#0E6B75] drop-shadow-sm">
                      <span>&amp; Femi</span>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 12, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="w-[0.3em] h-[0.3em] rounded-full bg-[#C8932A] opacity-80"
                      />
                    </h2>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    whileInView={{ opacity: 1, width: '100%' }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="flex items-center gap-4 mt-12 w-full max-w-md mx-auto"
                  >
                    <div className="h-[2px] flex-1 bg-[#0E6B75] opacity-20" />
                    <p className="text-[clamp(0.8rem,3vw,1.5rem)] font-display font-black tracking-[0.4em] uppercase whitespace-nowrap opacity-60 text-[#0E6B75]">
                      12.12.2026, Lagos
                    </p>
                    <div className="h-[2px] flex-1 bg-[#0E6B75] opacity-20" />
                  </motion.div>
                </motion.div>
              </section>

              <footer className="py-10 text-center border-t border-[#DAD8E3] dark:border-[#22363E] mt-12 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-[32px] mx-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center">
                    <h4 className="text-[1.1rem] font-serif-display italic text-[#0E6B75] mb-1">Dara &amp; Femi</h4>
                    <p className={`text-xs ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Happy Wedding · 12 December 2026</p>
                  </div>
                  <div className="pt-2 opacity-40">
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest">Wedding memories, kept for life</p>
                  </div>
                </div>
              </footer>

            </motion.div>
          )}

          {activeTab === 'feed' && (
            <motion.div
              key={`feed-tab-${activeTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-0 pt-3"
            >
              {/* Segmented Control: Post vs Reels (pinned at the top of the Feed on both tabs so users can always switch back) */}
              {(
                <div className={`flex items-center p-1.5 rounded-2xl mb-4 border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                  <button
                    onClick={() => setFeedSubTab('post')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      feedSubTab === 'post'
                        ? 'bg-[#0E6B75] text-white shadow-md'
                        : isDarkMode ? 'text-[#93A4AB] hover:text-white' : 'text-[#5A6970] hover:text-[#14262D]'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Post</span>
                  </button>
                  <button
                    onClick={() => setFeedSubTab('reels')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      feedSubTab === 'reels'
                        ? 'bg-[#0E6B75] text-white shadow-md'
                        : isDarkMode ? 'text-[#93A4AB] hover:text-white' : 'text-[#5A6970] hover:text-[#14262D]'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                    <span>Reels</span>
                  </button>
                </div>
              )}

              {isPostsLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 border-t border-[#DAD8E3] dark:border-[#22363E]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0E6B75] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-3 h-3 rounded-full bg-[#0E6B75] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-3 h-3 rounded-full bg-[#0E6B75] animate-bounce" />
                  </div>
                </div>
              ) : feedSubTab === 'post' ? (
                <div className="border-t-[6px] border-[#D0CEDB] dark:border-[#1E323A]">
                  {(() => {
                    const regularPosts = posts.filter((p) => {
                      if (p.id === 'jubilee_documentary') return false;
                      const media: string[] = p.mediaUrls || (p.mediaUrl ? [p.mediaUrl] : []);
                      const hasVideo = media.some((u, idx) =>
                        p.mediaTypes?.[idx] === 'video' ||
                        u.toLowerCase().includes('.mp4') ||
                        u.toLowerCase().includes('.webm') ||
                        u.toLowerCase().includes('.mov') ||
                        u.includes('/video/')
                      );
                      const orientation = p.videoOrientation || videoOrientations[p.id];
                      const hasImage = media.some((u, idx) =>
                        !(p.mediaTypes?.[idx] === 'video' ||
                          u.toLowerCase().includes('.mp4') ||
                          u.toLowerCase().includes('.webm') ||
                          u.toLowerCase().includes('.mov') ||
                          u.includes('/video/'))
                      );
                      const isPortraitReel = hasVideo && orientation === 'portrait' && !hasImage;
                      return !isPortraitReel;
                    });

                    if (regularPosts.length === 0) {
                      return (
                        <>
                          <p className={`py-6 text-center text-[0.7rem] font-black uppercase tracking-widest ${isDarkMode ? 'text-[#5A6970]' : 'text-[#93A4AB]'}`}>Sample memories · real guest posts appear here</p>
                          {SAMPLE_POSTS.filter((sp) => sp.mediaType !== 'reel' && sp.mediaType !== 'video').map((sp) => (
                            <SamplePostCard key={sp.id} post={sp} isDarkMode={isDarkMode} />
                          ))}
                        </>
                      );
                    }

                    const activePostAds = shuffledPostAds.length > 0 ? shuffledPostAds : postAds;
                    const feedElements: React.ReactNode[] = [];

                    regularPosts.forEach((p, idx) => {
                      const formattedDate = p.timestamp?.toDate
                        ? new Intl.DateTimeFormat('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(p.timestamp.toDate())
                        : 'Just now';

                      feedElements.push(
                        <Post 
                          key={p.id}
                          id={p.id}
                          isDarkMode={isDarkMode}
                          name={p.authorName || 'Guest'}
                          text={p.text}
                          time={formattedDate}
                          mediaUrls={p.mediaUrls}
                          mediaTypes={p.mediaTypes}
                          likeCount={p.likeCount}
                          loveCount={p.loveCount}
                          avatar={p.authorPhoto}
                          isAdmin={isAdmin}
                          user={user}
                          onDelete={() => setPostToDelete(p.id)}
                          onLike={() => handleToggleReaction(p.id, 'like')}
                          onLove={() => handleToggleReaction(p.id, 'love')}
                          onShare={() => setSharingPost(p)}
                          onOpenMedia={(mIdx: number) => setActiveMediaIndex({ postId: p.id, index: mIdx })}
                        />
                      );

                      // Place a shuffled Post Ad after every 5 posts
                      if ((idx + 1) % 5 === 0 && activePostAds.length > 0) {
                        const adSlotIndex = Math.floor((idx + 1) / 5) - 1;
                        const ad = activePostAds[adSlotIndex % activePostAds.length];
                        feedElements.push(
                          <PostAdCard
                            key={`post-ad-${ad.id}-${idx}`}
                            ad={ad}
                            isDarkMode={isDarkMode}
                          />
                        );
                      }
                    });

                    return feedElements;
                  })()}
                </div>
              ) : !posts.some((p) => {
                  const media: string[] = p.mediaUrls || (p.mediaUrl ? [p.mediaUrl] : []);
                  const hasVideo = media.some((u: string, idx: number) =>
                    p.mediaTypes?.[idx] === 'video' ||
                    u.toLowerCase().includes('.mp4') ||
                    u.toLowerCase().includes('.webm') ||
                    u.toLowerCase().includes('.mov') ||
                    u.includes('/video/')
                  );
                  const orientation = p.videoOrientation || videoOrientations[p.id];
                  return hasVideo && media.length === 1 && orientation === 'portrait';
                }) ? (
                <div className="border-t-[6px] border-[#D0CEDB] dark:border-[#1E323A]">
                  <p className={`py-6 text-center text-[0.7rem] font-black uppercase tracking-widest ${isDarkMode ? 'text-[#5A6970]' : 'text-[#93A4AB]'}`}>Sample reels · guest videos appear here</p>
                  <div className="grid grid-cols-2 gap-2 p-4">
                    {SAMPLE_POSTS.filter((sp) => sp.mediaType === 'reel').concat(SAMPLE_POSTS.filter((sp) => sp.mediaType === 'video')).slice(0, 4).map((sp, idx) => {
                      const [c1, c2] = (SAMPLE_TILE_COLORS[sp.tileColor] || SAMPLE_TILE_COLORS[0]).split(',');
                      return (
                        <div key={idx} className="relative aspect-[9/16] rounded-2xl overflow-hidden" style={{ background: `linear-gradient(160deg, ${c1}, ${c2})` }}>
                          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,0.35), transparent 60%)' }} />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/25 border border-white/50 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-6 h-6 text-white ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                            <p className="text-white font-bold text-[0.8rem] truncate">{sp.authorName}</p>
                            <p className="text-white/80 text-[0.68rem] truncate">{sp.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <ReelsFeed
                  reels={(() => {
                    const filteredReels = posts.filter((p) => {
                      if (p.id === 'jubilee_documentary') return false;
                      const media: string[] = p.mediaUrls || (p.mediaUrl ? [p.mediaUrl] : []);
                      const hasVideo = media.some((u, idx) =>
                        p.mediaTypes?.[idx] === 'video' ||
                        u.toLowerCase().includes('.mp4') ||
                        u.toLowerCase().includes('.webm') ||
                        u.toLowerCase().includes('.mov') ||
                        u.includes('/video/')
                      );
                      const orientation = p.videoOrientation || videoOrientations[p.id];
                      const hasImage = media.some((u, idx) =>
                        !(p.mediaTypes?.[idx] === 'video' ||
                          u.toLowerCase().includes('.mp4') ||
                          u.toLowerCase().includes('.webm') ||
                          u.toLowerCase().includes('.mov') ||
                          u.includes('/video/'))
                      );
                      return hasVideo && orientation === 'portrait' && !hasImage;
                    });

                    const activeReelAds = shuffledReelAds.length > 0 ? shuffledReelAds : reelAds;
                    if (activeReelAds.length === 0) return filteredReels;

                    const combinedReels: any[] = [];
                    filteredReels.forEach((r, idx) => {
                      combinedReels.push(r);
                      // Place a video ad after every 3 reels
                      if ((idx + 1) % 3 === 0) {
                        const adIdx = Math.floor((idx + 1) / 3) - 1;
                        const ad = activeReelAds[adIdx % activeReelAds.length];
                        combinedReels.push({
                          ...ad,
                          id: `reel-ad-${ad.id}-${idx}`,
                          isAd: true
                        });
                      }
                    });
                    return combinedReels;
                  })()}
                  isDarkMode={isDarkMode}
                  isAdmin={isAdmin}
                  user={user}
                  onSwitchToPost={() => setFeedSubTab('post')}
                  onDelete={(id: string) => setPostToDelete(id)}
                  onLike={(id: string) => handleToggleReaction(id, 'like')}
                  onLove={(id: string) => handleToggleReaction(id, 'love')}
                  onShare={(p: any) => setSharingPost(p)}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-0"
            >
              <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[14px_4px_12px] leading-[1.25]">Guest Profile</h2>
              <div className={`p-[24px_18px] rounded-[24px] border mb-6 flex flex-col items-center gap-6 ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                <div className="relative group">
                  <div className={`w-28 h-24 rounded-full overflow-hidden border-4 ${isDarkMode ? 'border-[#0B171C]' : 'border-[#EEEDF3]'} bg-[#0E6B75] flex items-center justify-center text-white text-3xl font-black`}>
                    {avatar ? (
                      <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <User className="w-10 h-10" />
                    )}
                    {isUploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Sparkles className="w-6 h-6 animate-spin" /></div>}
                  </div>
                  <input 
                    type="file" 
                    id="profile-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && user) {
                        setIsUploading(true);
                        try {
                          // Store in IndexedDB
                          await set('temp_profile_avatar', file);
                          
                          // Create local preview URL
                          const localUrl = URL.createObjectURL(file as any);
                          setAvatar(localUrl);
                        } catch (err) {
                          console.error("Local storage error:", err);
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                  <label 
                    htmlFor="profile-upload"
                    className="absolute bottom-0 right-0 p-2.5 bg-[#0E6B75] text-white rounded-full shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                  </label>
                </div>
                
                <div className="w-full space-y-4">
                  <div>
                    <label className={`block text-[0.7rem] uppercase tracking-widest font-black mb-2 opacity-50 ${isDarkMode ? 'text-white' : 'text-[#14262D]'}`}>Display Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Mr. Akari (Block B)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={`w-full p-4 rounded-xl border-none outline-none font-bold transition-colors ${isDarkMode ? 'bg-[#0B171C] text-white placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#14262D] placeholder-[#93A4AB]'}`}
                    />
                  </div>
                  
                  <button 
                    onClick={saveProfile}
                    disabled={isSavingProfile}
                    className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                      isSavingProfile ? 'bg-slate-200 text-slate-400' : 'bg-[#0E6B75] text-white shadow-lg shadow-[#0E6B75]/20 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isSavingProfile ? 'Saving...' : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </div>

              <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[14px_4px_12px] leading-[1.25]">Appearance</h2>
              <div className={`p-[4px_0] rounded-[20px] border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                <div className="p-[14px_18px] flex items-center justify-between gap-4">
                  <div>
                    <strong className="block text-[1rem]">Theme</strong>
                    <small className={`block text-[0.85rem] leading-[1.35] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Light, dark, or follow your phone</small>
                  </div>
                  <div className={`inline-flex p-[3px] rounded-full border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-[#EEEDF3] border-[#DAD8E3]'}`}>
                    {['light', 'dark', 'system'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setTheme(t as any)}
                        className={`p-[6px_12px] rounded-full text-[0.88rem] transition-all ${theme === t ? 'bg-[#0E6B75] text-white font-bold' : ''}`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-[14px_18px] flex items-center justify-between gap-4 border-t border-[#DAD8E3] dark:border-[#22363E]">
                  <div>
                    <strong className="block text-[1rem]">Text size</strong>
                    <small className={`block text-[0.85rem] leading-[1.35] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Make reading easier</small>
                  </div>
                  <div className={`inline-flex p-[3px] rounded-full border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-[#EEEDF3] border-[#DAD8E3]'}`}>
                    {['m', 'l', 'xl'].map(s => (
                      <button 
                        key={s}
                        onClick={() => setFontSize(s as any)}
                        className={`p-[6px_12px] rounded-full text-[0.88rem] transition-all ${fontSize === s ? 'bg-[#0E6B75] text-white font-bold' : ''}`}
                      >
                        {s === 'm' ? 'A' : (s === 'l' ? 'A+' : 'A++')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">About</h2>
              <div className={`p-[4px_0] rounded-[20px] border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                <div className="p-[14px_18px]">
                  <strong className="block text-[1rem]">Dara &amp; Femi 2026</strong>
                  <small className={`block text-[0.85rem] leading-[1.35] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Wedding Memories Portal. Made with love.</small>
                </div>
                <div className="p-[14px_18px] flex items-center justify-between gap-4 border-t border-[#DAD8E3] dark:border-[#22363E]">
                  <div>
                    <strong className="block text-[1rem]">Report a problem</strong>
                    <small className={`block text-[0.85rem] leading-[1.35] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Tell the couple if something looks wrong</small>
                  </div>
                  <button className="inline-flex items-center justify-center gap-2 border-0 rounded-full p-[10px_18px] font-bold bg-[#E1EFF0] dark:bg-[#173039] text-[#0E6B75] dark:text-[#4FC3CF] text-sm">Report</button>
                </div>
                <div className="p-[14px_18px] border-t border-[#DAD8E3] dark:border-[#22363E] text-center">
                  <span
                    onClick={() => {
                      const newCount = aboutClickCount + 1;
                      if (newCount >= 3) {
                        setAuthScreen('signin');
                        setAboutClickCount(0);
                      } else {
                        setAboutClickCount(newCount);
                      }
                    }}
                    className={`text-xs font-bold tracking-wide select-none cursor-pointer ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}
                  >
                    Happy Wedding, Dara &amp; Femi
                  </span>
                </div>
              </div>

              {isAdmin && (
                <>
                  <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">Administration</h2>
                  <div className={`p-[4px_0] rounded-[20px] border border-[#0E6B75]/30 ${isDarkMode ? 'bg-[#0E6B75]/5' : 'bg-[#0E6B75]/5'}`}>
                    <div className="p-[18px] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0E6B75]/20 flex items-center justify-center text-[#0E6B75]">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <strong className="block text-[1rem]">Couple Control</strong>
                          <small className={`block text-[0.85rem] leading-[1.35] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Manage access codes and settings</small>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsAdminDashboardOpen(true)}
                        className="inline-flex items-center justify-center gap-2 border-0 rounded-full p-[10px_20px] font-black bg-[#0E6B75] text-white text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-[#0E6B75]/20"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Admin Dashboard Modal */}
      <AdminDashboardModal 
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        activeCode={activeAccessCode}
        onUpdateCode={updateAccessCode}
        posts={posts}
        onDeletePost={(id: string) => {
          setIsAdminDashboardOpen(false);
          setPostToDelete(id);
        }}
        isDarkMode={isDarkMode}
        heroImages={heroImages}
        onUpdateHeroImages={async (urls: string[]) => {
          const capped = urls.slice(0, 14);
          setHeroImages(capped);
          try {
            localStorage.setItem('ann-hero-images', JSON.stringify(capped));
          } catch {
            // Ignore quota error
          }
          try {
            await setDoc(doc(db, 'app_config', 'main'), {
              heroImages: capped,
              lastUpdated: serverTimestamp()
            }, { merge: true });
            showToast("Hero images updated!");
          } catch (err) {
            console.error("Update hero images error:", err);
            showToast("Failed to update hero images.", "error");
          }
        }}
        footerImages={footerImages}
        onUpdateFooterImages={async (urls: string[]) => {
          const capped = urls.slice(0, 24);
          setFooterImages(capped);
          try {
            localStorage.setItem('ann-footer-images', JSON.stringify(capped));
          } catch {
            // Ignore quota error
          }
          try {
            await setDoc(doc(db, 'app_config', 'main'), {
              footerImages: capped,
              lastUpdated: serverTimestamp()
            }, { merge: true });
            showToast("Footer images updated!");
          } catch (err) {
            console.error("Update footer images error:", err);
            showToast("Failed to update footer images.", "error");
          }
        }}
        allAdmins={allAdmins}
        deletedPosts={deletedPosts}
        onRestorePost={handleRestorePost}
        onPermanentDelete={handlePermanentDelete}
        currentUserEmail={user?.email}
        adminPermissions={adminPermissions}
        showToast={showToast}
        onBackToMain={onBackToMain}
        postAds={postAds}
        reelAds={reelAds}
        onUpdatePostAds={async (ads: AdItem[]) => {
          try {
            await setDoc(doc(db, 'app_config', 'main'), {
              postAds: ads,
              lastUpdated: serverTimestamp()
            }, { merge: true });
            showToast("Post feed ads updated!");
          } catch (err) {
            console.error("Update post ads error:", err);
            showToast("Failed to update post ads.", "error");
          }
        }}
        onUpdateReelAds={async (ads: AdItem[]) => {
          try {
            await setDoc(doc(db, 'app_config', 'main'), {
              reelAds: ads,
              lastUpdated: serverTimestamp()
            }, { merge: true });
            showToast("Reels video ads updated!");
          } catch (err) {
            console.error("Update reel ads error:", err);
            showToast("Failed to update reel ads.", "error");
          }
        }}
      />

      <DeleteConfirmationModal 
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={() => {
          if (postToDelete) {
            handleDeletePost(postToDelete);
            setPostToDelete(null);
          }
        }}
        isDarkMode={isDarkMode}
      />

      {/* Post Composition Modal - BOTTOM SPLASH */}
      <AnimatePresence>
        {isComposeOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposeOpen(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-[101] rounded-t-[32px] p-6 shadow-2xl border-t ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}
            >
              <div className="w-12 h-1.5 bg-[#DAD8E3] dark:bg-[#22363E] rounded-full mx-auto mb-6" />
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black font-display tracking-tight">Share a Memory</h3>
                <button 
                  onClick={() => setIsComposeOpen(false)}
                  className="p-2 rounded-full hover:bg-[#EEEDF3] dark:hover:bg-[#0B171C] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <textarea 
                placeholder="What's happening at the celebration?"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className={`w-full min-h-[140px] p-4 rounded-2xl border-none outline-none resize-none text-[1.05rem] font-medium transition-colors ${isDarkMode ? 'bg-[#0B171C] text-white placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#14262D] placeholder-[#93A4AB]'}`}
              />

              <div className="mt-4">
                <input 
                  type="password"
                  placeholder={!configLoaded ? "Checking access code..." : "Enter Access Code"}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  disabled={!configLoaded || !activeAccessCode}
                  className={`w-full p-4 rounded-xl border-none outline-none font-black tracking-widest text-center transition-colors uppercase ${isDarkMode ? 'bg-[#0B171C] text-[#0E6B75] placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#0E6B75] placeholder-[#93A4AB]'} ${(!configLoaded || !activeAccessCode) ? 'opacity-50' : ''}`}
                />
                {!configLoaded && (
                  <p className="text-[0.7rem] text-center mt-2 opacity-50 font-bold uppercase tracking-wider">Checking access code, please wait...</p>
                )}
                {configLoaded && !activeAccessCode && (
                  <p className="text-[0.7rem] text-center mt-2 text-red-500 font-bold uppercase tracking-wider">Posting is temporarily unavailable</p>
                )}
              </div>

              {attachedMedia.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {attachedMedia.map((item, idx) => (
                    <div key={item.id} className={`relative rounded-xl overflow-hidden border border-[#DAD8E3] dark:border-[#22363E] bg-black ${item.orientation === 'portrait' ? 'aspect-[9/16] max-h-[200px]' : 'aspect-video'}`}>
                      {item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={item.url} className="w-full h-full object-cover" alt="Attachment" />
                      )}
                      <button 
                        onClick={() => {
                          setAttachedMedia(prev => prev.filter((_, i) => i !== idx));
                          del(item.id); // Cleanup IDB
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full backdrop-blur-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    id="media-upload" 
                    className="hidden" 
                    accept="image/*,video/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      
                      const remaining = 5 - attachedMedia.length;
                      const filesToAdd = files.slice(0, remaining);
                      
                      if (filesToAdd.length === 0) {
                        showToast("Maximum 5 media files allowed per post.", "error");
                        return;
                      }

                      setIsUploading(true);
                      try {
                        const newMedia: {url: string, id: string, type: 'image' | 'video', orientation?: 'portrait' | 'landscape'}[] = [];
                        for (let i = 0; i < filesToAdd.length; i++) {
                          const file = filesToAdd[i] as File;
                          const fileId = `post_${Date.now()}_${i}`;
                          await set(fileId, file);
                          
                          const localUrl = URL.createObjectURL(file);
                          const isVid = Boolean(file.type && file.type.startsWith('video/'));
                          let orientation: 'portrait' | 'landscape' | undefined = undefined;

                          if (isVid) {
                            orientation = await new Promise<'portrait' | 'landscape'>((resolve) => {
                              const v = document.createElement('video');
                              v.preload = 'metadata';
                              v.onloadedmetadata = () => {
                                resolve(v.videoHeight > v.videoWidth ? 'portrait' : 'landscape');
                              };
                              v.onerror = () => resolve('landscape');
                              v.src = localUrl;
                            });
                          }

                          newMedia.push({
                            url: localUrl,
                            id: fileId,
                            type: isVid ? 'video' : 'image',
                            orientation
                          });
                        }
                        setAttachedMedia(prev => [...prev, ...newMedia]);
                      } catch (err) {
                        console.error("Local storage error:", err);
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                  />
                  <label 
                    htmlFor="media-upload"
                    className={`p-3 rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${isDarkMode ? 'bg-[#0B171C] text-[#4FC3CF]' : 'bg-[#E1EFF0] text-[#0E6B75]'}`}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <VideoIcon className="w-6 h-6" />
                  </label>
                </div>
                
                <button 
                  disabled={(!newPostText.trim() && attachedMedia.length === 0) || !accessCode.trim() || isPosting || !configLoaded || !activeAccessCode}
                  onClick={async () => {
                    if (normalizeCode(accessCode) === normalizeCode(activeAccessCode ?? '')) {
                      setIsPosting(true);
                      try {
                        let finalMediaUrls: string[] = [];
                        let finalMediaTypes: ('image' | 'video')[] = [];
                        let postVideoOrientation: 'portrait' | 'landscape' | null = null;
                        let finalAvatarUrl = avatar;

                        // 1. Check if profile needs uploading/saving
                        const tempAvatar = await get('temp_profile_avatar');
                        if (tempAvatar && avatar?.startsWith('blob:')) {
                          const url = await uploadToCloudinary(tempAvatar, 'residents');
                          finalAvatarUrl = url;
                          // Update residents collection too
                          await setDoc(doc(db, 'residents', user.uid), {
                            displayName,
                            photoUrl: finalAvatarUrl,
                            updatedAt: serverTimestamp()
                          }, { merge: true });
                          await del('temp_profile_avatar');
                          setAvatar(finalAvatarUrl);
                        }

                        // 2. Upload all temporary post files
                        for (const item of attachedMedia) {
                          const tempFile = await get(item.id);
                          if (tempFile) {
                            const url = await uploadToCloudinary(tempFile, 'posts');
                            finalMediaUrls.push(url);
                            finalMediaTypes.push(item.type || 'image');
                            if (item.type === 'video' && item.orientation) {
                              postVideoOrientation = item.orientation;
                            }
                            // Cleanup IndexedDB
                            await del(item.id);
                          }
                        }

                        await addDoc(collection(db, 'posts'), {
                          authorUid: user.uid,
                          authorName: displayName || 'Guest',
                          authorPhoto: finalAvatarUrl || null,
                          text: newPostText,
                          mediaUrls: finalMediaUrls,
                          mediaTypes: finalMediaTypes,
                          ...(postVideoOrientation ? { videoOrientation: postVideoOrientation } : {}),
                          likeCount: 0,
                          loveCount: 0,
                          timestamp: serverTimestamp()
                        });

                        setIsComposeOpen(false);
                        setNewPostText('');
                        setAccessCode('');
                        setAttachedMedia([]);
                        if (postVideoOrientation === 'portrait' && finalMediaUrls.length === 1) {
                          setFeedSubTab('reels');
                        } else {
                          setFeedSubTab('post');
                        }
                        
                        showToast('Memory shared successfully!');

                      } catch (err) {
                        console.error("Post error:", err);
                        showToast('Failed to share memory.', 'error');
                      } finally {
                        setIsPosting(false);
                      }
                    } else {
                      showToast('Invalid access code. Check with the couple.', 'error');
                    }
                  }}
                  className={`px-8 py-3.5 rounded-full font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    ((newPostText.trim() || attachedMedia.length > 0) && accessCode.trim() && !isPosting)
                      ? 'bg-[#0E6B75] text-white shadow-lg hover:scale-105 active:scale-95' 
                      : 'bg-[#DAD8E3] dark:bg-[#22363E] text-[#5A6970] opacity-50'
                  }`}
                >
                  {isPosting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : 'Post'}
                </button>
              </div>
              
              <div className="h-[env(safe-area-inset-bottom,20px)]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer image lightbox */}
      <AnimatePresence>
        {footerLightbox && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFooterLightbox(null)}
              className="fixed inset-0 z-[140] bg-black/90 backdrop-blur-sm"
            />
            <motion.img
              src={footerLightbox}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={() => setFooterLightbox(null)}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[141] max-w-[86vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl cursor-pointer"
              alt="Memory"
            />
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFooterLightbox(null)}
              className="fixed top-5 right-5 z-[142] flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 text-white border border-white/40 backdrop-blur-md text-xs font-black uppercase tracking-widest hover:bg-white/25 transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Admin email/password auth screens */}
      {authScreen && (
        <AuthScreen
          screen={authScreen}
          setScreen={setAuthScreen}
          onClose={() => { setAuthScreen(null); setAuthError(''); }}
          onSignIn={handleAdminLogin}
          onSignup={handleAdminSignup}
          onForgot={handleForgotPassword}
          busy={authBusy}
          error={authError}
          clearError={() => setAuthError('')}
          isDarkMode={isDarkMode}
        />
      )}
      {user && !user.isAnonymous && mustSetPassword && !authScreen && (
        <ForceSetPasswordScreen
          isDarkMode={isDarkMode}
          busy={setPasswordBusy}
          error={authError}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmNewPassword}
          setConfirmPassword={setConfirmNewPassword}
          onSubmit={handleSetPermanentPassword}
          onSignOut={() => { signOut(auth); setMustSetPassword(false); setAuthError(''); }}
        />
      )}

      {/* Bottom Nav - DYNAMIC FEED/SEND BUTTON (hidden while viewing full-portrait Reels) */}
      {!(activeTab === 'feed' && feedSubTab === 'reels') && (
      <nav className={`fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-[520px] z-[90] grid grid-cols-3 items-end p-[8px_12px_calc(8px+env(safe-area-inset-bottom,0px))] border-t transition-colors ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
        <button 
          onClick={() => setActiveTab('home')}
          className={`border-0 bg-transparent flex flex-col items-center gap-[3px] p-[6px_0] min-h-[52px] text-[0.74rem] ${activeTab === 'home' ? 'text-[#0E6B75] font-bold' : 'text-[#5A6970]'}`}
        >
          <HomeIcon active={activeTab === 'home'} />
          <span>Home</span>
        </button>
        <button 
          onClick={() => {
            if (activeTab === 'feed') {
              // Robust check for profile completion
              const isProfileComplete = displayName.trim() !== '' && avatar && !avatar.startsWith('blob:');
              const hasUnsavedAvatar = avatar && avatar.startsWith('blob:');
              
              if (!displayName.trim() || (!avatar && !hasUnsavedAvatar)) {
                setShowProfileModal(true);
              } else {
                setIsComposeOpen(true);
              }
            } else {
              setActiveTab('feed');
            }
          }}
          className="relative -top-[18px] flex flex-col items-center gap-[5px] border-0 bg-transparent text-[0.74rem]"
        >
          <div className={`grid place-items-center w-[58px] h-[58px] rounded-full bg-[#0E6B75] text-white shadow-[0_6px_18px_rgba(14,107,117,0.38)] border-4 transition-all duration-300 ${isDarkMode ? 'border-[#13232A]' : 'border-white'} ${activeTab === 'feed' ? 'scale-110 shadow-[0_8px_24px_rgba(14,107,117,0.5)]' : ''}`}>
            {activeTab === 'feed' ? (
              <Send className="w-[26px] h-[26px] stroke-[2.4]" />
            ) : (
              <Plus className="w-[26px] h-[26px] stroke-[2.4]" />
            )}
          </div>
          <span className={activeTab === 'feed' ? 'text-[#0E6B75] font-bold' : 'text-[#5A6970]'}>
            {activeTab === 'feed' ? 'Send' : 'Feed'}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`border-0 bg-transparent flex flex-col items-center gap-[3px] p-[6px_0] min-h-[52px] text-[0.74rem] ${activeTab === 'settings' ? 'text-[#0E6B75] font-bold' : 'text-[#5A6970]'}`}
        >
          <SettingsIcon active={activeTab === 'settings'} />
          <span>Settings</span>
        </button>
      </nav>
      )}

      {/* iOS / Add to Home Screen Bottom Splash Pop Up (2 Steps - iOS only) */}
      <AnimatePresence>
        {showIOSInstallModal && isIOSDevice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSInstallModal(false)}
              className="fixed inset-0 bg-black/60 z-[210] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-[211] rounded-t-[32px] p-6 pb-8 shadow-2xl border-t ${
                isDarkMode ? 'bg-[#13232A] border-[#22363E] text-[#E8EEF0]' : 'bg-white border-[#DAD8E3] text-[#14262D]'
              }`}
            >
              <div className="w-12 h-1.5 bg-[#DAD8E3] dark:bg-[#22363E] rounded-full mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#0E6B75] text-white flex items-center justify-center font-black font-display text-base shadow-md">
                    30
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-display leading-tight">Install Dara &amp; Femi</h3>
                    <p className={`text-xs ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
                      Add to your Home Screen for quick &amp; offline access
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSInstallModal(false)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  aria-label="Close install guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {/* Step 1 */}
                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
                  isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-[#F6F5FA] border-[#DAD8E3]'
                }`}>
                  <div className="w-9 h-9 rounded-xl bg-[#0E6B75] text-white font-black text-sm flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="flex-1 text-sm leading-snug">
                    Tap the <strong>Share</strong> button in your browser&apos;s menu bar
                  </div>
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    isDarkMode ? 'bg-[#13232A] border-[#22363E] text-[#4FC3CF]' : 'bg-white border-[#DAD8E3] text-[#0E6B75]'
                  }`}>
                    <Share2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Step 2 */}
                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
                  isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-[#F6F5FA] border-[#DAD8E3]'
                }`}>
                  <div className="w-9 h-9 rounded-xl bg-[#0E6B75] text-white font-black text-sm flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="flex-1 text-sm leading-snug">
                    Scroll down and tap <strong>Add to Home Screen</strong>
                  </div>
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    isDarkMode ? 'bg-[#13232A] border-[#22363E] text-[#4FC3CF]' : 'bg-white border-[#DAD8E3] text-[#0E6B75]'
                  }`}>
                    <Plus className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSInstallModal(false)}
                className="w-full py-3.5 rounded-2xl bg-[#0E6B75] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0E6B75]/25 hover:opacity-95 transition-opacity"
              >
                Got It
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sharing and Media Overlays */}
      {sharingPost && (
        <ShareSheet 
          post={sharingPost} 
          isDarkMode={isDarkMode} 
          onClose={() => setSharingPost(null)} 
          showToast={showToast}
        />
      )}
      
      {activeMediaIndex && (
        <MediaLightbox 
          post={posts.find(p => p.id === activeMediaIndex.postId) || null}
          initialIndex={activeMediaIndex.index}
          isDarkMode={isDarkMode}
          onClose={() => setActiveMediaIndex(null)}
        />
      )}
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[22px] h-[22px] fill-none stroke-current stroke-[1.8] ${active ? 'text-[#0E6B75]' : ''}`} viewBox="0 0 24 24">
      <path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[22px] h-[22px] fill-none stroke-current stroke-[1.8] ${active ? 'text-[#0E6B75]' : ''}`} viewBox="0 0 24 24">
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>
    </svg>
  );
}

function WhatsAppIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.758.459 3.473 1.332 4.988L2 22l5.182-1.359c1.466.799 3.111 1.221 4.849 1.221 5.516 0 9.969-4.453 9.969-9.969 0-2.663-1.037-5.167-2.92-7.049C17.197 3.037 14.693 2 12.031 2zm5.819 14.281c-.242.681-1.404 1.304-1.958 1.387-.511.077-1.158.11-1.872-.116-.434-.138-.992-.323-1.707-.632-3.003-1.297-4.962-4.324-5.112-4.525-.15-.201-1.221-1.624-1.221-3.098 0-1.474.772-2.198 1.047-2.499.275-.301.6-.376.8-.376.2 0 .4.002.575.01.184.009.431-.07.674.515.25.603.85 2.076.925 2.227.075.151.125.327.025.528-.1.201-.15.327-.3.503-.15.176-.315.393-.45.528-.15.15-.306.313-.131.614.175.301.778 1.284 1.67 2.079 1.148 1.023 2.115 1.34 2.415 1.49.3.151.475.126.65-.075.175-.201.75-.879.95-1.18.2-.301.4-.251.675-.151.275.1 1.75.826 2.05.976.3.151.5.226.575.352.075.125.075.728-.167 1.409z"/>
    </svg>
  );
}

function ShareSheet({ post, isDarkMode, onClose, showToast }: any) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?post=${post.id || post.uid}`;
  const title = post.text || "Check out this memory from Dara & Femi's wedding!";

  const shareOptions = [
    { 
      name: 'WhatsApp', 
      icon: <WhatsAppIcon className="w-7 h-7 text-white" />, 
      color: 'bg-[#25D366]', 
      url: `https://wa.me/?text=${encodeURIComponent(title + ' ' + shareUrl)}` 
    },
    { 
      name: 'Copy Link', 
      icon: <ExternalLink className="w-6 h-6 text-white" />, 
      color: 'bg-[#0E6B75]', 
      action: () => {
        navigator.clipboard.writeText(shareUrl);
        if (showToast) showToast('Link copied to clipboard!');
      }
    },
    { 
      name: 'Twitter / X', 
      icon: <span className="text-white font-bold text-xl">𝕏</span>, 
      color: 'bg-black', 
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}` 
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        />
        <motion.div 
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          className={`relative w-full max-w-[500px] p-6 rounded-t-[32px] sm:rounded-[32px] shadow-2xl ${isDarkMode ? 'bg-[#13232A]' : 'bg-white'}`}
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 sm:hidden" />
          <h3 className="text-xl font-black font-display text-center mb-8">Share Memory</h3>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {shareOptions.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => { 
                  if (opt.action) {
                    opt.action();
                  } else if (opt.url) {
                    const a = document.createElement('a');
                    a.href = opt.url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                  onClose(); 
                }}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 ${opt.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  {opt.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{opt.name}</span>
              </button>
            ))}
          </div>
          <button 
            onClick={onClose}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-white/40' : 'bg-gray-100 text-gray-500'}`}
          >
            Cancel
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function MediaLightbox({ post, initialIndex, isDarkMode, onClose }: any) {
  const [index, setIndex] = useState(initialIndex);
  const media = post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : []);
  const current = media[index];
  const isVideo = current?.toLowerCase().includes('.mp4') || current?.includes('/video/');

  const handleDownload = async () => {
    if (isVideo) return;
    try {
      const response = await fetch(current);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ire-akari-memory-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black flex flex-col items-center justify-center">
      <div className="absolute top-0 w-full p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          <span className="text-white text-sm font-bold">{index + 1} / {media.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isVideo && (
            <button
              onClick={handleDownload}
              className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-full transition-colors flex items-center justify-center"
              title="Download Image"
              aria-label="Download Image"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="w-full flex-1 relative flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={current}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full h-full flex items-center justify-center p-4"
          >
            {isVideo ? (
              <video
                src={current}
                controls
                autoPlay
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                className="max-w-full max-h-full rounded-lg"
              />
            ) : (
              <img src={current} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
            )}
          </motion.div>
        </AnimatePresence>

        {media.length > 1 && (
          <>
            <button 
              onClick={() => setIndex((index - 1 + media.length) % media.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIndex((index + 1) % media.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      <div className="w-full p-6 pb-12 bg-gradient-to-t from-black to-transparent text-white">
        <p className="text-sm line-clamp-3">{post.text}</p>
        <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mt-2">By {post.authorName}</p>
      </div>
    </div>
  );
}

function Post({ 
  id, 
  name, 
  avatar, 
  text, 
  time, 
  mediaUrls, 
  mediaTypes,
  likeCount = 0, 
  loveCount = 0, 
  isDarkMode, 
  isAdmin, 
  user,
  onDelete,
  onLike,
  onLove,
  onShare,
  onOpenMedia
}: any) {
  const [localLiked, setLocalLiked] = useState(false);
  const [localLoved, setLocalLoved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isLongText = Boolean(text && (text.length > 180 || text.split('\n').length > 4));
  const displayedText = isLongText && !isExpanded
    ? text.slice(0, 180).trimEnd() + '...'
    : text;

  useEffect(() => {
    if (!user || !id) return;
    const reactionRef = doc(db, 'posts', id, 'reactions', user.uid);
    const unsub = onSnapshot(reactionRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLocalLiked(!!data.like);
        setLocalLoved(!!data.love);
      } else {
        setLocalLiked(false);
        setLocalLoved(false);
      }
    });
    return () => unsub();
  }, [user, id]);

  const displayLiked = localLiked;
  const displayLoved = localLoved;
  return (
    <article id={`post-${id}`} className="flex gap-3 p-[20px_4px] border-b-[6px] border-[#D0CEDB] dark:border-[#1E323A] transition-all">
      <div className={`flex-shrink-0 w-[42px] h-[42px] rounded-full overflow-hidden border ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'} bg-[#0E6B75] flex items-center justify-center text-white font-bold text-[0.9rem]`}>
        {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : <span>{name?.[0]?.toUpperCase() || 'R'}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <strong className="text-[1rem] leading-tight">{name}</strong>
            <span className="text-[0.8rem] text-[#5A6970] dark:text-[#93A4AB] flex items-center gap-1">
              <span aria-hidden="true">·</span>
              <span>{time}</span>
            </span>
          </div>
          {isAdmin && (
            <button 
              onClick={onDelete}
              className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {text && (
          <div className="m-[4px_0_0]">
            <p className="text-[1rem] leading-normal whitespace-pre-wrap inline">
              {displayedText}
            </p>
            {isLongText && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-1.5 text-[0.9rem] font-extrabold text-[#0E6B75] dark:text-[#4FC3CF] hover:underline focus:outline-none inline-flex items-center"
              >
                {isExpanded ? 'See less' : 'See more'}
              </button>
            )}
          </div>
        )}
        
        {mediaUrls && mediaUrls.length > 0 && (
          <div className={`mt-[10px] rounded-[18px] overflow-hidden border border-[#DAD8E3] dark:border-[#22363E] bg-black shadow-md ${mediaUrls.length > 1 ? 'grid grid-cols-2 gap-1' : ''}`}>
            {mediaUrls.map((url: string, i: number) => {
              const isVideo = mediaTypes?.[i] === 'video' || url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.webm') || url.toLowerCase().includes('.mov') || url.includes('/video/');
              return (
                <div 
                  key={i} 
                  className={`relative cursor-pointer group ${mediaUrls.length === 1 ? 'max-h-[420px]' : 'aspect-square'}`}
                  onClick={() => onOpenMedia(i)}
                >
                  {isVideo ? (
                    <video src={url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={url} className="w-full h-full object-cover" alt="" />
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="w-8 h-8 text-white fill-current" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 w-full mt-3 pt-2 border-t border-[#DAD8E3]/40 dark:border-[#22363E]/60">
          <button 
            onClick={onLike}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[0.85rem] font-bold transition-all ${displayLiked ? 'text-[#0E6B75] bg-[#0E6B75]/10' : 'text-[#5A6970] dark:text-[#93A4AB] hover:bg-[#0E6B75]/5'}`}
          >
            <ThumbsUp className={`w-[18px] h-[18px] ${displayLiked ? 'fill-current' : ''}`} />
            <span>{likeCount > 0 ? (likeCount > 999 ? (likeCount/1000).toFixed(1) + 'K' : likeCount) : 'Like'}</span>
          </button>
          <button 
            onClick={onLove}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[0.85rem] font-bold transition-all ${displayLoved ? 'text-red-500 bg-red-500/10' : 'text-[#5A6970] dark:text-[#93A4AB] hover:bg-red-500/5'}`}
          >
            <Heart className={`w-[18px] h-[18px] ${displayLoved ? 'fill-current' : ''}`} />
            <span>{loveCount > 0 ? (loveCount > 999 ? (loveCount/1000).toFixed(1) + 'K' : loveCount) : 'Love'}</span>
          </button>
          <button 
            onClick={onShare}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[0.85rem] font-bold text-[#5A6970] dark:text-[#93A4AB] hover:bg-[#0E6B75]/5 transition-all"
          >
            <Share2 className="w-[18px] h-[18px]" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </article>
  );
}

const formatExternalUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

function PostAdCard({ ad, isDarkMode }: { ad: AdItem; isDarkMode: boolean; [key: string]: any }) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaList = ad.mediaUrls && ad.mediaUrls.length > 0
    ? ad.mediaUrls
    : (ad.mediaUrl ? [ad.mediaUrl] : []);

  const isLongDesc = Boolean(ad.description && (ad.description.length > 180 || ad.description.split('\n').length > 4));
  const displayedDesc = isLongDesc && !isDescExpanded
    ? ad.description!.slice(0, 180).trimEnd() + '...'
    : ad.description;
  const formattedCtaUrl = formatExternalUrl(ad.ctaUrl);

  const handleHorizontalScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      if (idx !== activeSlide) {
        setActiveSlide(idx);
      }
    }
  };

  const scrollToSlide = (idx: number) => {
    if (!scrollRef.current) return;
    const target = Math.max(0, Math.min(idx, mediaList.length - 1));
    scrollRef.current.scrollTo({
      left: target * scrollRef.current.clientWidth,
      behavior: 'smooth'
    });
    setActiveSlide(target);
  };

  return (
    <article className="flex gap-3 p-[20px_4px] border-b-[6px] border-[#D0CEDB] dark:border-[#1E323A] transition-all">
      <div className={`flex-shrink-0 w-[42px] h-[42px] rounded-full overflow-hidden border ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'} bg-[#C9A24B] flex items-center justify-center text-[#14262D] font-black text-[0.9rem]`}>
        <Megaphone className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <strong className="text-[1rem] leading-tight">{ad.sponsorName || 'Featured Partner'}</strong>
            <span className="text-[0.75rem] font-bold text-[#C9A24B] flex items-center gap-1">
              <span aria-hidden="true">·</span>
              <span>Sponsored</span>
            </span>
          </div>
        </div>
        {ad.headline && (
          <p className="text-[1rem] font-bold m-[4px_0_0] leading-snug">
            {ad.headline}
          </p>
        )}
        {ad.description && (
          <div className="m-[4px_0_0]">
            <p className={`text-[0.92rem] leading-normal whitespace-pre-wrap inline ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
              {displayedDesc}
            </p>
            {isLongDesc && (
              <button
                type="button"
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="ml-1.5 text-[0.85rem] font-extrabold text-[#0E6B75] dark:text-[#4FC3CF] hover:underline focus:outline-none inline-flex items-center"
              >
                {isDescExpanded ? 'See less' : 'See more'}
              </button>
            )}
          </div>
        )}
        {mediaList.length > 0 && (
          <div className="mt-[10px] rounded-[18px] overflow-hidden border border-[#DAD8E3] dark:border-[#22363E] bg-black shadow-md relative">
            {mediaList.length === 1 ? (
              (() => {
                const url = mediaList[0];
                const isVideo = ad.mediaTypes?.[0] === 'video' || ad.mediaType === 'video' || url?.toLowerCase().includes('.mp4') || url?.includes('/video/');
                return isVideo ? (
                  <video
                    src={url}
                    className="w-full max-h-[420px] object-cover"
                    controls
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    muted
                    playsInline
                    loop
                  />
                ) : (
                  <img src={url} className="w-full max-h-[420px] object-cover" alt={ad.headline || 'Sponsored'} />
                );
              })()
            ) : (
              <div className="relative group/adcarousel">
                <div
                  ref={scrollRef}
                  onScroll={handleHorizontalScroll}
                  className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                >
                  {mediaList.map((url, idx) => {
                    const isVideo = ad.mediaTypes?.[idx] === 'video' || url?.toLowerCase().includes('.mp4') || url?.includes('/video/');
                    return (
                      <div
                        key={idx}
                        className="w-full flex-shrink-0 snap-center snap-always relative aspect-[4/3] max-h-[420px] overflow-hidden bg-black"
                      >
                        {isVideo ? (
                          <video
                            src={url}
                            className="w-full h-full object-cover"
                            controls
                            controlsList="nodownload noplaybackrate"
                            disablePictureInPicture
                            onContextMenu={(e) => e.preventDefault()}
                            muted
                            playsInline
                            loop
                          />
                        ) : (
                          <img src={url} className="w-full h-full object-cover" alt={`${ad.headline || 'Sponsored'} ${idx + 1}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {activeSlide > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToSlide(activeSlide - 1)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-md"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {activeSlide < mediaList.length - 1 && (
                  <button
                    type="button"
                    onClick={() => scrollToSlide(activeSlide + 1)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-md"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                  {activeSlide + 1} / {mediaList.length}
                </span>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md">
                  {mediaList.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => scrollToSlide(idx)}
                      className={`h-1.5 rounded-full transition-all ${idx === activeSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {formattedCtaUrl && (
          <div className="mt-3 pt-2">
            <a
              href={formattedCtaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-[#0E6B75] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-sm"
            >
              <span>{ad.ctaText || 'Learn More'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

function ReelsFeed({ reels, isDarkMode, isAdmin, user, onSwitchToPost, onDelete, onLike, onLove, onShare }: any) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Snap-locked reels: the next video is only seen when swiping up.
  // The Post/Reels toggle is pinned above this container, outside the scroll.
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    if (clientHeight > 0) {
      const idx = Math.min(
        Math.max(0, reels.length - 1),
        Math.round(scrollTop / clientHeight)
      );
      if (idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  };

  if (!reels || reels.length === 0) {
    return (
      <div>
        <div className="py-24 text-center opacity-30 border-t border-[#DAD8E3] dark:border-[#22363E]">
          <Film className="w-12 h-12 mx-auto mb-4" />
          <p className="font-black uppercase tracking-widest text-xs">No portrait reels yet</p>
          <p className="text-[0.75rem] mt-2">Upload a vertical portrait video to feature it in Reels!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100dvh-150px)] min-h-[420px] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative rounded-[28px]"
    >
      {reels.map((reel: any, idx: number) => (
        <ReelCard
          key={reel.id}
          reel={reel}
          isActive={idx === activeIndex}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          isAdmin={isAdmin}
          user={user}
          onDelete={() => onDelete(reel.id)}
          onLike={() => onLike(reel.id)}
          onLove={() => onLove(reel.id)}
          onShare={() => onShare(reel)}
          hasNext={idx < reels.length - 1}
        />
      ))}
    </div>
  );
}

function ReelCard({
  reel,
  isActive,
  isMuted,
  onToggleMute,
  isAdmin,
  user,
  onDelete,
  onLike,
  onLove,
  onShare,
  hasNext
}: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [localLiked, setLocalLiked] = useState(false);
  const [localLoved, setLocalLoved] = useState(false);

  const media: string[] = reel.mediaUrls || (reel.mediaUrl ? [reel.mediaUrl] : []);
  const videoUrl = media.find((u: string, idx: number) =>
    reel.mediaTypes?.[idx] === 'video' ||
    u.toLowerCase().includes('.mp4') ||
    u.toLowerCase().includes('.webm') ||
    u.toLowerCase().includes('.mov') ||
    u.includes('/video/')
  ) || media[0];

  useEffect(() => {
    if (!user || !reel.id) return;
    const reactionRef = doc(db, 'posts', reel.id, 'reactions', user.uid);
    const unsub = onSnapshot(reactionRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLocalLiked(!!data.like);
        setLocalLoved(!!data.love);
      } else {
        setLocalLiked(false);
        setLocalLoved(false);
      }
    });
    return () => unsub();
  }, [user, reel.id]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isActive) {
      vid.currentTime = 0;
      vid.play().then(() => setIsPlaying(true)).catch(() => {
        // Fallback if unmuted autoplay is blocked
        vid.muted = true;
        vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const formattedDate = reel.timestamp?.toDate
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(reel.timestamp.toDate())
    : 'Just now';

  return (
    <div
      className="snap-start snap-always w-full h-full rounded-[28px] relative bg-black flex items-center justify-center overflow-hidden select-none shadow-2xl border border-[#DAD8E3] dark:border-[#22363E]"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover cursor-pointer"
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />

      {/* Play/Pause Center Indicator */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white">
            <Play className="w-8 h-8 fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Top Controls: Mute & Admin Delete */}
      <div className="absolute top-4 right-4 left-4 flex items-center justify-between z-20 pointer-events-none">
        <div>
          {reel.isAd && (
            <div className="px-3 py-1 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest pointer-events-auto bg-[#C9A24B] text-[#14262D]">
              Sponsored Ad
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          {isAdmin && !reel.isAd && (
            <button
              onClick={onDelete}
              className="p-2.5 rounded-full bg-black/50 text-red-400 hover:bg-red-500 hover:text-white backdrop-blur-md transition-colors"
              title="Delete Reel"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Scrim & Author Info + Spread Action Bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-5 pt-16 text-white z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center font-bold text-sm shrink-0 ${
            reel.isAd ? 'border-[#C9A24B] bg-[#C9A24B] text-[#14262D]' : 'border-[#0E6B75] bg-[#0E6B75] text-white'
          }`}>
            {reel.isAd ? (
              <Megaphone className="w-5 h-5" />
            ) : reel.authorPhoto ? (
              <img src={reel.authorPhoto} className="w-full h-full object-cover" alt="" />
            ) : (
              <span>{(reel.authorName || 'R')[0].toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-bold leading-tight truncate">
              {reel.isAd ? (reel.sponsorName || 'Featured Partner') : (reel.authorName || 'Guest')}
            </strong>
            <span className="text-[0.75rem] text-white/70">
              {reel.isAd ? 'Sponsored Video' : formattedDate}
            </span>
          </div>
        </div>

        {(reel.headline || reel.text || reel.description) && (
          <div className="mb-3">
            {reel.headline && (
              <p className="text-sm font-bold text-white leading-snug">{reel.headline}</p>
            )}
            {(reel.text || reel.description) && (
              <p className="text-sm text-white/95 line-clamp-2 leading-snug">
                {reel.text || reel.description}
              </p>
            )}
          </div>
        )}

        {/* Full-Width 3-Button Bar: Like, Love, Share (or Sponsored CTA for Reel Ads) */}
        {reel.isAd ? (
          <div className="w-full pt-2.5 border-t border-white/15">
            {formatExternalUrl(reel.ctaUrl) ? (
              <a
                href={formatExternalUrl(reel.ctaUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#C9A24B] text-[#14262D] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-lg"
              >
                <span>{reel.ctaText || 'Learn More'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="w-full py-2.5 px-4 rounded-xl bg-white/10 text-white/90 text-xs font-bold text-center">
                Sponsored Reel · {reel.sponsorName || 'Featured Partner'}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 w-full pt-2.5 border-t border-white/15">
            <button
              onClick={onLike}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                localLiked ? 'bg-[#0E6B75] text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${localLiked ? 'fill-current' : ''}`} />
              <span>{reel.likeCount > 0 ? reel.likeCount : 'Like'}</span>
            </button>
            <button
              onClick={onLove}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                localLoved ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Heart className={`w-4 h-4 ${localLoved ? 'fill-current' : ''}`} />
              <span>{reel.loveCount > 0 ? reel.loveCount : 'Love'}</span>
            </button>
            <button
              onClick={onShare}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Sample placeholder palette matching the prototype feed (gradient tiles, no stock imagery)
const SAMPLE_TILE_COLORS = [
  '#d98e3c,#8a3b1d', '#3d8fb3,#1c3f6e', '#7bb36b,#2c6b45', '#c46bb0,#5b2a7a',
  '#0e6b75,#073d31', '#c8932a,#7a4a14', '#d23b5e,#7a1730', '#2b5fb3,#173769',
];

const SAMPLE_POSTS = [
  { id: 'sample-1', authorName: 'Aunty Ronke', eventName: 'Introduction', text: 'Dara walking in with her aunties.', tileColor: 0, mediaType: 'image', likeCount: 14, commentCount: 0, timeAgo: '4 months ago' },
  { id: 'sample-2', authorName: 'Tolu', eventName: 'Engagement', text: 'The moment Femi went down on one knee!', tileColor: 1, mediaType: 'video', likeCount: 42, commentCount: 2, timeAgo: '3 months ago' },
  { id: 'sample-3', authorName: 'Kiln Films', eventName: 'Engagement', text: 'Engagement highlight reel.', tileColor: 2, mediaType: 'reel', likeCount: 27, commentCount: 1, timeAgo: '3 months ago' },
  { id: 'sample-4', authorName: 'Chidi', eventName: 'Court Wedding', text: 'Femi, my guy. Cheers to forever.', tileColor: 3, mediaType: 'wish', likeCount: 9, commentCount: 0, timeAgo: '2 months ago' },
  { id: 'sample-5', authorName: 'Lens & Light Studio', eventName: 'Introduction', text: 'Full introduction album, 212 photos.', tileColor: 4, mediaType: 'image', likeCount: 31, commentCount: 1, timeAgo: '4 months ago' },
];

function SamplePostCard({ post, isDarkMode }: { post: any; isDarkMode: boolean }) {
  const [c1, c2] = (SAMPLE_TILE_COLORS[post.tileColor] || SAMPLE_TILE_COLORS[0]).split(',');
  const isWish = post.mediaType === 'wish';
  const isMotion = post.mediaType === 'video' || post.mediaType === 'reel';
  return (
    <article className={`p-4 border-b ${isDarkMode ? 'border-[#1E323A]' : 'border-[#DAD8E3]/70'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shrink-0 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          {isWish ? '\u275D' : '\u2600'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-[0.95rem] truncate">{post.authorName}</p>
          <p className={`text-[0.7rem] font-bold ${isDarkMode ? 'text-[#5A6970]' : 'text-[#93A4AB]'}`}>
            {post.eventName} · {post.timeAgo}
          </p>
        </div>
      </div>
      {!isWish && <p className="text-[0.95rem] leading-relaxed mb-3">{post.text}</p>}
      {isWish ? (
        <div className={`rounded-2xl border p-5 text-center ${isDarkMode ? 'border-[#22363E] bg-[#0B171C]' : 'border-[#DAD8E3] bg-[#F6F5FA]'}`}>
          <p className="font-display text-[1.15rem] italic leading-relaxed">{post.text}</p>
        </div>
      ) : (
        <div
          className="relative rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,0.35), transparent 60%)' }} />
          {isMotion ? (
            <div className="w-14 h-14 rounded-full bg-white/25 border border-white/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-7 h-7 text-white ml-0.5" />
            </div>
          ) : (
            <span className="text-white/70 text-3xl">⚘</span>
          )}
          {isMotion && (
            <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/40 text-white text-[0.62rem] font-black uppercase tracking-widest">Reel</span>
          )}
        </div>
      )}
      <div className={`flex items-center gap-6 mt-3 text-[0.82rem] ${isDarkMode ? 'text-[#5A6970]' : 'text-[#93A4AB]'}`}>
        <span className="flex items-center gap-1.5">
          <Heart className="w-4 h-4" /> {post.likeCount}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" /> {post.commentCount}
        </span>
        <span className="flex items-center gap-1.5">
          <Share2 className="w-4 h-4" /> Share
        </span>
      </div>
    </article>
  );
}

function GridScanner({ isDarkMode, images = [], onTap }: { isDarkMode: boolean; images?: string[]; onTap?: (src: string) => void }) {
  const [activeRow, setActiveRow] = useState(0);
  const [direction, setDirection] = useState(1);
  const rowCount = 10;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveRow(prev => {
        let next = prev + direction;
        if (next >= rowCount - 1) {
          setDirection(-1);
          return rowCount - 1;
        }
        if (next <= 0) {
          setDirection(1);
          return 0;
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [direction, rowCount]);

  return (
    <>
      {Array.from({ length: 80 }).map((_, i) => {
        const colCount = 10;
        const rowIdx = Math.floor(i / colCount);
        const isCurrentlyScanning = rowIdx === activeRow;
        return (
          <GridImage
            key={i}
            index={i}
            isDarkMode={isDarkMode}
            isCleared={isCurrentlyScanning}
            images={images}
            onTap={onTap}
          />
        );
      })}
    </>
  );
}

function GridImage({ index, isDarkMode, isCleared: autoCleared, images = [], onTap }: any) {
  const isCleared = autoCleared;
  const pool = images.length > 0 ? images : PLACEHOLDER_IMAGES;
  const imgSrc = pool[index % pool.length];

  return (
    <div
      className="relative w-full aspect-square cursor-pointer group pointer-events-auto"
      onClick={() => onTap && onTap(imgSrc)}
    >
      <motion.img
        src={imgSrc}
        animate={{
          filter: isCleared ? 'grayscale(0%) brightness(1.1)' : 'grayscale(100%) brightness(0.8)',
          scale: isCleared ? 1.05 : 1
        }}
        className="w-full h-full object-cover transition-all duration-700"
        alt=""
      />
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: isCleared ? 0 : 1 }}
        transition={{ duration: 0.4 }}
        className={`absolute inset-0 ${isDarkMode ? 'bg-[#0B171C]/70' : 'bg-[#EEEDF3]/70'}`}
      />
    </div>
  );
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDarkMode }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[120] backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[340px] z-[121] rounded-[28px] p-6 shadow-2xl text-center ${isDarkMode ? 'bg-[#13232A] border border-[#22363E]' : 'bg-white border border-[#DAD8E3]'}`}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black font-display tracking-tight mb-2">Delete Post?</h3>
            <p className="text-sm opacity-60 mb-6">This action cannot be undone. This memory will be removed from the community wall.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className={`flex-1 py-3 rounded-full font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'bg-[#0B171C] text-white' : 'bg-[#EEEDF3] text-[#14262D]'}`}
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                className="flex-1 py-3 rounded-full bg-red-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


function AuthScreen({ screen, setScreen, onClose, onSignIn, onSignup, onForgot, busy, error, clearError, isDarkMode }: {
  screen: 'signin' | 'forgot' | 'sent';
  setScreen: (s: 'signin' | 'forgot' | 'sent') => void;
  onClose: () => void;
  onSignIn: (email: string, password: string) => void;
  onSignup: (email: string, password: string) => void;
  onForgot: (email: string) => void;
  busy: boolean;
  error: string;
  clearError: () => void;
  isDarkMode: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  const submit = () => {
    if (!email.trim() || !password) { return; }
    if (isFirstTime) { onSignup(email, password); } else { onSignIn(email, password); }
  };

  return (
    <div className={`fixed inset-0 z-[300] flex items-center justify-center p-5 overflow-y-auto ${isDarkMode ? 'bg-[#0B171C]' : 'bg-[#F6F5FA]'}`}>
      <div className={`w-full max-w-[430px] my-auto rounded-[28px] p-8 shadow-2xl ${isDarkMode ? 'bg-[#13232A] border border-[#22363E]' : 'bg-white border border-[#DAD8E3]'}`}>
        <button onClick={onClose} className={`mb-5 p-2 -ml-2 rounded-full hover:bg-black/5 ${isDarkMode ? 'text-[#5A6970]' : 'text-[#5A6970]'}`} aria-label="Close">
          <X className="w-6 h-6" />
        </button>

        {screen === 'sent' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[#0E6B75]/10 text-[#0E6B75] flex items-center justify-center mx-auto mb-5">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-center text-[1.6rem] font-black font-display tracking-tight mb-2">Check your email</h2>
            <p className={`text-center text-[0.95rem] leading-relaxed mb-8 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
              We sent a password reset link. Follow it to set a new password, then come back and sign in.
            </p>
            <button
              onClick={() => setScreen('signin')}
              className="w-full py-4 rounded-full bg-[#0E6B75] text-white font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Back to sign in
            </button>
          </>
        ) : screen === 'forgot' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[#0E6B75]/10 text-[#0E6B75] flex items-center justify-center mx-auto mb-5">
              <KeyRound className="w-8 h-8" />
            </div>
            <h2 className="text-center text-[1.6rem] font-black font-display tracking-tight mb-2">Forgot password?</h2>
            <p className={`text-center text-[0.95rem] leading-relaxed mb-8 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
              Enter the email on your admin account and we will send a reset link.
            </p>
            <label className={`block text-[0.7rem] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`w-full p-4 rounded-xl border-none outline-none font-bold mb-4 ${isDarkMode ? 'bg-[#0B171C] text-white placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#14262D] placeholder-[#93A4AB]'}`}
            />
            {error && <p className="text-[0.85rem] font-bold text-[#C4453B] mb-4">{error}</p>}
            <button
              onClick={() => onForgot(email)}
              disabled={busy || !email.trim()}
              className="w-full py-4 rounded-full bg-[#0E6B75] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0E6B75]/20 disabled:opacity-50 hover:brightness-110 transition-all"
            >
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <button onClick={() => setScreen('signin')} className={`w-full py-4 font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'text-white/40' : 'text-[#5A6970]'}`}>
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <p className="font-display text-[#0E6B75] text-[0.85rem] font-medium mb-1">Dara &amp; Femi 2026</p>
              <h2 className="text-[1.9rem] font-black font-display tracking-tight leading-tight">
                {isFirstTime ? 'Create admin account' : 'Welcome back'}
              </h2>
              <p className={`text-[0.92rem] mt-1 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
                {isFirstTime ? 'Set up the couple dashboard sign-in.' : 'Sign in to the couple dashboard.'}
              </p>
            </div>
            <label className={`block text-[0.7rem] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`w-full p-4 rounded-xl border-none outline-none font-bold mb-4 ${isDarkMode ? 'bg-[#0B171C] text-white placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#14262D] placeholder-[#93A4AB]'}`}
            />
            <label className={`block text-[0.7rem] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Password</label>
            <div className="relative mb-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="Your password"
                autoComplete={isFirstTime ? 'new-password' : 'current-password'}
                className={`w-full p-4 pr-12 rounded-xl border-none outline-none font-bold ${isDarkMode ? 'bg-[#0B171C] text-white placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#14262D] placeholder-[#93A4AB]'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#5A6970]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {!isFirstTime && (
              <button onClick={() => setScreen('forgot')} className="text-[0.85rem] font-bold text-[#0E6B75] mb-2">
                Forgot password?
              </button>
            )}
            {error && <p className="text-[0.85rem] font-bold text-[#C4453B] my-3">{error}</p>}
            <button
              onClick={submit}
              disabled={busy || !email.trim() || !password}
              className="w-full py-4 rounded-full bg-[#0E6B75] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0E6B75]/20 disabled:opacity-50 hover:brightness-110 transition-all mt-3"
            >
              {busy ? 'Please wait…' : isFirstTime ? 'Create account' : 'Sign in'}
            </button>
            <button
              onClick={() => { setIsFirstTime(!isFirstTime); clearError(); }}
              className={`w-full py-3 text-[0.85rem] font-bold ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}
            >
              {isFirstTime ? 'Already have an account? Sign in' : 'First time? Create an admin account'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ForceSetPasswordScreen({ isDarkMode, busy, error, newPassword, setNewPassword, confirmPassword, setConfirmPassword, onSubmit, onSignOut }: {
  isDarkMode: boolean;
  busy: boolean;
  error: string;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  onSubmit: () => void;
  onSignOut: () => void;
}) {
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const strength = newPassword.length >= 10 ? 'Strong' : newPassword.length >= 6 ? 'Okay' : 'Too short';
  return (
    <div className={`fixed inset-0 z-[310] flex items-center justify-center p-5 overflow-y-auto ${isDarkMode ? 'bg-[#0B171C]' : 'bg-[#F6F5FA]'}`}>
      <div className={`w-full max-w-[430px] my-auto rounded-[28px] p-8 shadow-2xl ${isDarkMode ? 'bg-[#13232A] border border-[#22363E]' : 'bg-white border border-[#DAD8E3]'}`}>
        <div className="w-16 h-16 rounded-full bg-[#C8932A]/15 text-[#C8932A] flex items-center justify-center mx-auto mb-5">
          <KeyRound className="w-8 h-8" />
        </div>
        <h2 className="text-center text-[1.7rem] font-black font-display tracking-tight mb-2">Set your permanent password</h2>
        <p className={`text-center text-[0.95rem] leading-relaxed mb-8 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
          You signed in with a temporary password. Choose a permanent one before you continue.
        </p>
        <label className={`block text-[0.7rem] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>New password</label>
        <div className="relative mb-4">
          <input
            type={show1 ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            className={`w-full p-4 pr-12 rounded-xl border-none outline-none font-bold ${isDarkMode ? 'bg-[#0B171C] text-white placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#14262D] placeholder-[#93A4AB]'}`}
          />
          <button type="button" onClick={() => setShow1(!show1)} aria-label={show1 ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#5A6970]">
            {show1 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <label className={`block text-[0.7rem] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Confirm new password</label>
        <div className="relative mb-4">
          <input
            type={show2 ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newPassword && confirmPassword) onSubmit(); }}
            placeholder="Type it once more"
            autoComplete="new-password"
            className={`w-full p-4 pr-12 rounded-xl border-none outline-none font-bold ${isDarkMode ? 'bg-[#0B171C] text-white placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#14262D] placeholder-[#93A4AB]'}`}
          />
          <button type="button" onClick={() => setShow2(!show2)} aria-label={show2 ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#5A6970]">
            {show2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {newPassword && (
          <p className={`text-[0.8rem] font-bold mb-3 ${newPassword.length >= 6 ? 'text-[#0E6B75]' : 'text-[#C4453B]'}`}>
            Password strength: {strength}
          </p>
        )}
        {error && <p className="text-[0.85rem] font-bold text-[#C4453B] mb-3">{error}</p>}
        <button
          onClick={onSubmit}
          disabled={busy || !newPassword || !confirmPassword}
          className="w-full py-4 rounded-full bg-[#0E6B75] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0E6B75]/20 disabled:opacity-50 hover:brightness-110 transition-all"
        >
          {busy ? 'Saving…' : 'Save password & continue'}
        </button>
        <button onClick={onSignOut} className={`w-full py-4 font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'text-white/40' : 'text-[#5A6970]'}`}>
          Sign out
        </button>
      </div>
    </div>
  );
}

function AdminDashboardModal({ 
  isOpen, 
  onClose, 
  activeCode, 
  onUpdateCode, 
  isDarkMode, 
  heroImages, 
  onUpdateHeroImages,
  footerImages,
  onUpdateFooterImages,
  allAdmins,
  deletedPosts,
  onRestorePost,
  onPermanentDelete,
  currentUserEmail,
  adminPermissions,
  showToast,
  onBackToMain,
  postAds = [],
  reelAds = [],
  onUpdatePostAds,
  onUpdateReelAds,
  posts = [],
  onDeletePost
}: any) {
  const [newCode, setNewCode] = useState(activeCode ?? '');
  const [isDirty, setIsDirty] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState('overview');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('vendor');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string } | null>(null);

  // Super Admin Ad Creation & Editing State
  const [adTypeTab, setAdTypeTab] = useState<'post' | 'reel'>('post');
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adSponsor, setAdSponsor] = useState('');
  const [adHeadline, setAdHeadline] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adCtaText, setAdCtaText] = useState('Learn More');
  const [adCtaUrl, setAdCtaUrl] = useState('');
  const [adMediaUrls, setAdMediaUrls] = useState<string[]>([]);
  const [adMediaTypes, setAdMediaTypes] = useState<('image' | 'video')[]>([]);
  const [isAdUploading, setIsAdUploading] = useState(false);

  const resetAdForm = (type: 'post' | 'reel' = adTypeTab) => {
    setEditingAdId(null);
    setAdSponsor('');
    setAdHeadline('');
    setAdDescription('');
    setAdCtaText('Learn More');
    setAdCtaUrl('');
    setAdMediaUrls([]);
    setAdMediaTypes(type === 'reel' ? ['video'] : []);
  };

  const daysToWedding = Math.max(0, Math.ceil((new Date(`${WEDDING_DATE}T11:00:00`).getTime() - Date.now()) / 86400000));

  const inviteDashboardAccess = async () => {
    const email = inviteEmail.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      showToast('Enter a valid email address.', 'error');
      return;
    }
    setInviteBusy(true);
    try {
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : '';
      const tempPassword = 'DF' + Math.random().toString(36).slice(2, 10);
      const res = await fetch('/api/auth-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'invite', email, password: tempPassword, role: inviteRole })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setInviteResult({ email, tempPassword });
        setInviteEmail('');
        showToast('Dashboard access created. Share the temporary password now.', 'success');
      } else {
        showToast(data.error || 'Could not create the account. Try again.', 'error');
      }
    } catch (err) {
      console.error('Invite error:', err);
      showToast('Could not reach the invite service.', 'error');
    } finally {
      setInviteBusy(false);
    }
  };

  // Sync newCode with live value
  useEffect(() => {
    if (isOpen && !isDirty) {
      setNewCode(activeCode ?? '');
    }
  }, [activeCode, isOpen, isDirty]);

  // Reset dirty flag when closing/opening
  useEffect(() => {
    if (!isOpen) setIsDirty(false);
  }, [isOpen]);

  const isSuper = currentUserEmail === "justfashion414@gmail.com";

  const normalizedNewCode = normalizeCode(newCode);
  const normalizedActiveCode = normalizeCode(activeCode ?? '');
  const isCodeValid = normalizedNewCode.length >= 4;
  const isCodeChanged = normalizedNewCode !== normalizedActiveCode;
  const canSaveCode = isCodeValid && isCodeChanged;

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) return;
    try {
      await setDoc(doc(db, 'admins', newAdminEmail.toLowerCase().trim()), {
        email: newAdminEmail.toLowerCase().trim(),
        permissions: {
          canDeletePosts: true,
          canUploadImages: true,
          canSetAccessCode: true
        },
        addedAt: serverTimestamp(),
        addedBy: currentUserEmail
      });
      setNewAdminEmail('');
      alert("Admin added successfully!");
    } catch (err) {
      console.error("Add admin error:", err);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (confirm(`Remove ${email} from administrators?`)) {
      try {
        await deleteDoc(doc(db, 'admins', email));
      } catch (err) {
        console.error("Remove admin error:", err);
      }
    }
  };

  const togglePermission = async (email: string, perm: string, currentVal: boolean) => {
    try {
      const adminRef = doc(db, 'admins', email);
      await setDoc(adminRef, {
        permissions: {
          [perm]: !currentVal
        }
      }, { merge: true });
    } catch (err) {
      console.error("Toggle permission error:", err);
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={`fixed inset-0 z-[111] p-0 shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#13232A]' : 'bg-white'}`}
          >
            {/* Couple dashboard shell */}
            <div className="flex flex-1 min-h-0 w-full flex-col md:flex-row">
              {/* Mobile top nav */}
              <div className="md:hidden flex items-center gap-2 overflow-x-auto px-4 py-3 bg-[#0B171C] shrink-0">
                <p className="font-display text-white text-base font-medium mr-1 shrink-0">Dara &amp; Femi</p>
                {[
                  { id: 'overview', label: 'Overview', icon: Home },
                  { id: 'moderation', label: 'Moderation', icon: ShieldCheck },
                  { id: 'posts', label: 'Posts', icon: Film },
                  { id: 'events', label: 'Events', icon: Calendar },
                  { id: 'hero', label: 'Hero photos', icon: ImageIcon },
                  { id: 'guests', label: 'Guests', icon: Users },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'ads', label: 'Ads', icon: Megaphone },
                  { id: 'admins', label: 'Admins', icon: Users },
                  { id: 'recycle', label: 'Bin', icon: Trash },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAdminTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[0.7rem] font-black uppercase tracking-widest whitespace-nowrap shrink-0 ${activeAdminTab === tab.id ? 'bg-[#0E6B75] text-white' : 'bg-white/10 text-white/70'}`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
                <button onClick={onClose} className="ml-auto shrink-0 p-2 rounded-full bg-white/10 text-white" aria-label="Close dashboard"><X className="w-4 h-4" /></button>
              </div>

              {/* Sidebar (desktop) */}
              <aside className="hidden md:flex flex-col w-[250px] shrink-0 bg-[#0B171C] text-white p-5 overflow-y-auto">
                <div className="mb-6">
                  <p className="font-display text-[1.25rem] font-medium">Dara &amp; Femi</p>
                  <p className="text-[0.66rem] uppercase tracking-widest text-white/40 font-black mt-0.5">Couple dashboard</p>
                </div>
                <nav className="flex flex-col gap-1">
                  {[
                    { id: 'overview', label: 'Overview', icon: Home },
                    { id: 'moderation', label: 'Moderation', icon: ShieldCheck },
                    { id: 'posts', label: 'All posts', icon: Film },
                    { id: 'events', label: 'Events & details', icon: Calendar },
                    { id: 'hero', label: 'Hero photos', icon: ImageIcon },
                    { id: 'guests', label: 'Guests & vendors', icon: Users },
                    { id: 'settings', label: 'Settings', icon: Settings },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveAdminTab(tab.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-bold text-left transition-all ${activeAdminTab === tab.id ? 'bg-[#0E6B75] text-white shadow-lg' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                      <tab.icon className="w-[18px] h-[18px] shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
                <p className="mt-5 mb-1 px-3 text-[0.62rem] uppercase tracking-widest text-white/30 font-black">More</p>
                <nav className="flex flex-col gap-1">
                  {[
                    { id: 'ads', label: 'Ads', icon: Megaphone, show: isSuper },
                    { id: 'admins', label: 'Admins', icon: Users, show: isSuper },
                    { id: 'recycle', label: 'Bin', icon: Trash, show: adminPermissions?.canDeletePosts },
                  ].filter((t) => t.show).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveAdminTab(tab.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-bold text-left transition-all ${activeAdminTab === tab.id ? 'bg-[#0E6B75] text-white shadow-lg' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                      <tab.icon className="w-[18px] h-[18px] shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
                <button onClick={onClose} className="mt-auto pt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-bold text-white/60 hover:bg-white/10 hover:text-white text-left">
                  <X className="w-[18px] h-[18px] shrink-0" />
                  <span>Close dashboard</span>
                </button>
              </aside>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-6">
              {activeAdminTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black font-display tracking-tight">Good day, Dara &amp; Femi</h2>
                    <p className="text-sm opacity-60 mt-0.5">{daysToWedding} days to the wedding. Here is what needs you.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(() => {
                      const totalLikes = posts.reduce((s: number, p: any) => s + (p.likeCount || 0) + (p.loveCount || 0), 0);
                      const videoCount = posts.filter((p: any) => (p.mediaTypes || []).some((t: string) => t === 'video') || (p.mediaUrls || []).some((u: string) => /\.(mp4|webm|mov)$/i.test(u))).length;
                      const authors = new Set(posts.map((p: any) => (p.authorName || '').trim()).filter(Boolean));
                      const stats: [string, number, string][] = [
                        ['Posts', posts.length, 'shared so far'],
                        ['Videos & reels', videoCount, 'in the feed'],
                        ['Reactions', totalLikes, 'likes and loves'],
                        ['Guests', authors.size, 'have posted'],
                      ];
                      return stats.map(([label, value, sub]) => (
                        <div key={label} className={`rounded-[20px] p-4 border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                          <b className="block text-2xl font-black font-display">{value}</b>
                          <span className="block text-[0.68rem] font-black uppercase tracking-widest opacity-60 mt-1">{label}</span>
                          <small className="block text-[0.7rem] opacity-50 mt-0.5">{sub}</small>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className={`rounded-[20px] p-5 border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                    <h3 className="font-black font-display text-lg mb-3">Needs your attention</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div><b>{posts.length}</b> {posts.length === 1 ? 'memory' : 'memories'} in the feed</div>
                        <button onClick={() => setActiveAdminTab('moderation')} className="px-4 py-2 rounded-full bg-[#0E6B75] text-white text-[0.7rem] font-black uppercase tracking-widest">Review</button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div><b>0</b> reported items</div>
                        <span className="px-4 py-2 rounded-full text-[0.7rem] font-black uppercase tracking-widest opacity-40">All clear</span>
                      </div>
                    </div>
                  </div>
                  <div className={`rounded-[20px] p-5 border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                    <h3 className="font-black font-display text-lg mb-3">Posts in the last 14 days</h3>
                    <div className="flex items-end gap-1 h-28">
                      {(() => {
                        const buckets = new Array(14).fill(0);
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        posts.forEach((p: any) => {
                          const t = p.timestamp?.toDate ? p.timestamp.toDate() : (p.createdAt?.toDate ? p.createdAt.toDate() : null);
                          if (!t) return;
                          const d = new Date(t); d.setHours(0, 0, 0, 0);
                          const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
                          if (diff >= 0 && diff < 14) buckets[13 - diff]++;
                        });
                        const max = Math.max(1, ...buckets);
                        return buckets.map((v, i) => (
                          <div key={i} className="flex-1 bg-[#0E6B75]/25 rounded-t-md" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} title={`${v} ${v === 1 ? 'post' : 'posts'}`} />
                        ));
                      })()}
                    </div>
                    <small className="block mt-2 opacity-50">Activity picks up as the wedding gets closer.</small>
                  </div>
                  <div className={`rounded-[20px] p-5 border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                    <h3 className="font-black font-display text-lg mb-3">Latest activity</h3>
                    <div className="space-y-3">
                      {posts.slice(0, 4).map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#0E6B75]/15 text-[#0E6B75] flex items-center justify-center font-black shrink-0">{(p.authorName || 'G').charAt(0).toUpperCase()}</div>
                          <div className="min-w-0">
                            <p className="font-bold text-[0.92rem] truncate">{p.authorName || 'A guest'} shared a memory</p>
                            <small className="block opacity-50 truncate">{p.text || p.caption || ''}</small>
                          </div>
                        </div>
                      ))}
                      {posts.length === 0 && <p className="opacity-50 text-sm">No memories yet. Guest posts will show up here the moment they land.</p>}
                    </div>
                  </div>
                </div>
              )}

              {activeAdminTab === 'moderation' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black font-display tracking-tight">Moderation</h2>
                    <p className="text-sm opacity-60 mt-0.5">Guest posts appear in the feed the moment they are shared. Remove anything that should not be there.</p>
                  </div>
                  <div className={`rounded-[20px] border divide-y ${isDarkMode ? 'bg-[#0B171C] border-[#22363E] divide-[#22363E]' : 'bg-white border-[#DAD8E3] divide-[#DAD8E3]/70'}`}>
                    {posts.slice(0, 12).map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 p-4">
                        <div className="w-11 h-11 rounded-2xl bg-[#0E6B75]/15 text-[#0E6B75] flex items-center justify-center font-black shrink-0">{(p.authorName || 'G').charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[0.92rem] truncate">{p.authorName || 'A guest'}</p>
                          <small className="block opacity-50 truncate">{p.text || p.caption || 'Shared a memory'}</small>
                        </div>
                        {adminPermissions?.canDeletePosts && (
                          <button onClick={() => onDeletePost(p.id)} className="px-4 py-2 rounded-full border border-red-500/30 text-red-500 text-[0.7rem] font-black uppercase tracking-widest shrink-0">Remove</button>
                        )}
                      </div>
                    ))}
                    {posts.length === 0 && <p className="p-5 opacity-50 text-sm">Nothing to moderate yet.</p>}
                  </div>
                </div>
              )}

              {activeAdminTab === 'posts' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black font-display tracking-tight">All posts</h2>
                    <p className="text-sm opacity-60 mt-0.5">{posts.length} {posts.length === 1 ? 'memory' : 'memories'} shared by your people.</p>
                  </div>
                  <div className={`rounded-[20px] border divide-y ${isDarkMode ? 'bg-[#0B171C] border-[#22363E] divide-[#22363E]' : 'bg-white border-[#DAD8E3] divide-[#DAD8E3]/70'}`}>
                    {posts.map((p: any) => (
                      <div key={p.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-[#0E6B75]/15 text-[#0E6B75] flex items-center justify-center font-black shrink-0">{(p.authorName || 'G').charAt(0).toUpperCase()}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[0.92rem] truncate">{p.authorName || 'A guest'}</p>
                            <small className="block opacity-50 truncate">{p.text || p.caption || 'Shared a memory'} · ♥ {(p.likeCount || 0) + (p.loveCount || 0)}</small>
                          </div>
                          {adminPermissions?.canDeletePosts && (
                            <button onClick={() => onDeletePost(p.id)} className="px-4 py-2 rounded-full border border-red-500/30 text-red-500 text-[0.7rem] font-black uppercase tracking-widest shrink-0">Remove</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {posts.length === 0 && <p className="p-5 opacity-50 text-sm">No posts match. Memories your guests share will show up here.</p>}
                  </div>
                </div>
              )}

              {activeAdminTab === 'events' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black font-display tracking-tight">Events &amp; details</h2>
                    <p className="text-sm opacity-60 mt-0.5">The journey your guests see on the Home timeline.</p>
                  </div>
                  <div className="space-y-3">
                    {EVENTS_DATA.map((e, i) => {
                      const st = JOURNEY_STATES[i];
                      const label = st === 'done' ? 'Done' : st === 'next' ? 'Next up' : 'Upcoming';
                      return (
                        <div key={e.id} className={`rounded-[20px] p-5 border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <b className="font-display text-lg">{e.name}</b>
                              <small className="block opacity-50">{e.type}</small>
                            </div>
                            <span className={`px-3 py-1.5 rounded-full text-[0.65rem] font-black uppercase tracking-widest ${st === 'done' ? 'bg-[#0E6B75]/15 text-[#0E6B75]' : st === 'next' ? 'bg-[#C8932A]/20 text-[#C8932A]' : 'opacity-40 bg-black/5'}`}>
                              {label}
                            </span>
                          </div>
                          <p className="text-sm opacity-70 mt-2">{new Date(`${e.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{e.time ? ` · ${e.time}` : ''} · {e.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm opacity-50">Event editing arrives with the next update. The countdown and statuses on the Home screen follow these dates.</p>
                </div>
              )}

              {activeAdminTab === 'hero' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-black font-display tracking-tight">Hero photos</h2>
                    <p className="text-sm opacity-60 mt-0.5">Photos that float across the top of the Home screen, and the giant footer grid.</p>
                  </div>
                  <div className="space-y-6">
                  {adminPermissions?.canUploadImages && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-[0.7rem] uppercase tracking-widest font-black opacity-50">
                          Hero Section Images ({heroImages.length} / 14)
                        </label>
                        {heroImages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onUpdateHeroImages([])}
                            className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:underline"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {heroImages.slice(0, 14).map((img: string, idx: number) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border dark:border-[#22363E] group">
                            <img src={img} className="w-full h-full object-cover" alt="" />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = heroImages.filter((_: string, i: number) => i !== idx);
                                onUpdateHeroImages(updated);
                              }}
                              className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {heroImages.length < 14 && (
                          <label className="aspect-square rounded-lg border-2 border-dashed border-[#0E6B75]/30 flex flex-col items-center justify-center cursor-pointer hover:bg-[#0E6B75]/5 transition-colors">
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              className="hidden" 
                              disabled={isBulkUploading}
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;

                                const remainingSlots = 14 - heroImages.length;
                                const filesToUpload = files.slice(0, remainingSlots);
                                if (files.length > remainingSlots) {
                                  showToast(`Maximum 14 hero images allowed. Uploading first ${remainingSlots}.`, 'info');
                                }
                                
                                setIsBulkUploading(true);
                                const uploadedUrls: string[] = [];
                                
                                try {
                                  for (const file of filesToUpload) {
                                    const url = await uploadToCloudinary(file as any, 'hero');
                                    uploadedUrls.push(url);
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                  }
                                  
                                  if (uploadedUrls.length > 0) {
                                    onUpdateHeroImages([...heroImages, ...uploadedUrls].slice(0, 14));
                                  }
                                } catch (err: any) {
                                  console.error("Bulk upload error:", err);
                                  showToast(err?.message || "Failed to upload hero images.", "error");
                                } finally {
                                  setIsBulkUploading(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                            {isBulkUploading ? (
                              <RefreshCw className="w-5 h-5 text-[#0E6B75] animate-spin" />
                            ) : (
                              <>
                                <ImageIcon className="w-5 h-5 text-[#0E6B75]" />
                                <span className="text-[10px] font-bold mt-1 uppercase">Add ({14 - heroImages.length})</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                      <p className="text-[0.75rem] opacity-60 italic">Upload up to 14 images for the hero banner (scrolls 2 images at a time).</p>
                    </div>
                  )}

                  {adminPermissions?.canUploadImages && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-[0.7rem] uppercase tracking-widest font-black opacity-50">
                          Giant Footer Images ({footerImages.length} / 24)
                        </label>
                        {footerImages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onUpdateFooterImages([])}
                            className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:underline"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {footerImages.slice(0, 24).map((img: string, idx: number) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border dark:border-[#22363E] group">
                            <img src={img} className="w-full h-full object-cover" alt="" />
                            <button
                              type="button"
                              onClick={() => onUpdateFooterImages(footerImages.filter((_: string, i: number) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {footerImages.length < 24 && (
                          <label className="aspect-square rounded-lg border-2 border-dashed border-[#0E6B75]/30 flex flex-col items-center justify-center cursor-pointer hover:bg-[#0E6B75]/5 transition-colors">
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              className="hidden" 
                              disabled={isBulkUploading}
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;

                                const remainingSlots = 24 - footerImages.length;
                                const filesToUpload = files.slice(0, remainingSlots);
                                if (files.length > remainingSlots) {
                                  showToast(`Maximum 24 footer images allowed. Uploading first ${remainingSlots}.`, 'info');
                                }
                                
                                setIsBulkUploading(true);
                                const uploadedUrls: string[] = [];
                                
                                try {
                                  for (const file of filesToUpload) {
                                    const url = await uploadToCloudinary(file as any, 'programme');
                                    uploadedUrls.push(url);
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                  }
                                  
                                  if (uploadedUrls.length > 0) {
                                    onUpdateFooterImages([...footerImages, ...uploadedUrls].slice(0, 24));
                                  }
                                } catch (err: any) {
                                  console.error("Bulk upload error:", err);
                                  showToast(err?.message || "Failed to upload footer images.", "error");
                                } finally {
                                  setIsBulkUploading(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                            {isBulkUploading ? (
                              <RefreshCw className="w-5 h-5 text-[#0E6B75] animate-spin" />
                            ) : (
                              <>
                                <ImageIcon className="w-5 h-5 text-[#0E6B75]" />
                                <span className="text-[10px] font-bold mt-1 uppercase">Add ({24 - footerImages.length})</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                      <p className="text-[0.75rem] opacity-60 italic">Upload up to 24 images for the giant footer photo grid (tapping a tile opens it full-screen).</p>
                    </div>
                  )}
                  </div>
                </div>
              )}

              {activeAdminTab === 'guests' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-black font-display tracking-tight">Guests &amp; vendors</h2>
                    <p className="text-sm opacity-60 mt-0.5">People join without an account. This list shows everyone who has posted.</p>
                  </div>
                  <div className={`rounded-[20px] p-5 border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                    <h3 className="font-black font-display text-lg mb-2">Invite dashboard access</h3>
                    <p className="text-sm opacity-60 mb-4">Creates an account with a temporary password. The person must set a permanent password the first time they sign in.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="name@email.com"
                        className={`flex-1 p-4 rounded-xl border-none outline-none font-bold ${isDarkMode ? 'bg-[#0B171C] text-white placeholder-[#5A6970]' : 'bg-[#EEEDF3] text-[#14262D] placeholder-[#93A4AB]'}`}
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className={`p-4 rounded-xl border-none outline-none font-bold ${isDarkMode ? 'bg-[#0B171C] text-white' : 'bg-[#EEEDF3] text-[#14262D]'}`}
                      >
                        <option value="vendor">Vendor</option>
                        <option value="guest">Guest</option>
                      </select>
                      <button onClick={inviteDashboardAccess} disabled={inviteBusy} className="px-6 py-4 rounded-xl bg-[#0E6B75] text-white text-[0.7rem] font-black uppercase tracking-widest disabled:opacity-50">
                        {inviteBusy ? 'Creating…' : 'Create access'}
                      </button>
                    </div>
                    {inviteResult && (
                      <div className="mt-4 p-4 rounded-xl bg-[#C8932A]/10 border border-[#C8932A]/30">
                        <p className="text-sm font-bold">Share this temporary password now. It shows only once.</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <code className="px-3 py-2 rounded-lg bg-black/10 font-black tracking-widest">{inviteResult.tempPassword}</code>
                          <span className="text-sm opacity-70">for {inviteResult.email}</span>
                          <button
                            onClick={() => { navigator.clipboard?.writeText(inviteResult.tempPassword); showToast('Temporary password copied'); }}
                            className="px-4 py-2 rounded-full bg-[#0E6B75] text-white text-[0.65rem] font-black uppercase tracking-widest"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`rounded-[20px] p-5 border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                    <h3 className="font-black font-display text-lg mb-3">People who have posted</h3>
                    <div className="space-y-3">
                      {(() => {
                        const counts: Record<string, number> = {};
                        posts.forEach((p: any) => {
                          const name = (p.authorName || '').trim();
                          if (name) counts[name] = (counts[name] || 0) + 1;
                        });
                        const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                        if (rows.length === 0) return <p className="opacity-50 text-sm">No posts yet, so nobody has shown up here.</p>;
                        return rows.map(([name, count]) => (
                          <div key={name} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#0E6B75]/15 text-[#0E6B75] flex items-center justify-center font-black text-sm">{name.charAt(0).toUpperCase()}</div>
                              <b className="text-[0.95rem]">{name}</b>
                            </div>
                            <span className="opacity-60 text-sm font-bold">{count} {count === 1 ? 'post' : 'posts'}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  <div className={`rounded-[20px] p-5 border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                    <h3 className="font-black font-display text-lg mb-3">Our vendors</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className={`rounded-2xl p-4 border ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'}`}>
                        <b>Lens &amp; Light Studio</b>
                        <span className="block text-sm opacity-50">Photographer</span>
                      </div>
                      <div className={`rounded-2xl p-4 border ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'}`}>
                        <b>Kiln Films</b>
                        <span className="block text-sm opacity-50">Videographer</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm opacity-50">The guest access code lives under Settings, further down.</p>
                </div>
              )}

              {activeAdminTab === 'settings' && (
                <div className="space-y-8">
                  {adminPermissions?.canSetAccessCode && (
                    <div>
                      <label className="block text-[0.7rem] uppercase tracking-widest font-black mb-2 opacity-50">Active Access Code</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newCode}
                          maxLength={20}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
                            setNewCode(val);
                            setIsDirty(true);
                          }}
                          className={`flex-1 p-4 rounded-xl border-none outline-none font-black tracking-widest transition-colors ${isDarkMode ? 'bg-[#0B171C] text-[#0E6B75]' : 'bg-[#EEEDF3] text-[#0E6B75]'}`}
                        />
                        <button 
                          onClick={async () => {
                            await onUpdateCode(newCode);
                            setIsDirty(false);
                          }}
                          disabled={!canSaveCode}
                          className={`px-6 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${canSaveCode ? 'bg-[#0E6B75] text-white hover:scale-105 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                          <Save className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Save</span>
                        </button>
                      </div>
                      <div className="mt-2 px-1">
                        {!isCodeValid && newCode.length > 0 && (
                          <p className="text-[0.65rem] text-red-500 font-bold uppercase tracking-tight">Code must be at least 4 characters</p>
                        )}
                        {isCodeValid && !isCodeChanged && isDirty && (
                          <p className="text-[0.65rem] text-[#0E6B75] font-bold uppercase tracking-tight">Current code is already {normalizedActiveCode}</p>
                        )}
                      </div>
                    </div>
                  )}


                  <p className="text-sm opacity-50">Hero and footer images now live under "Hero photos" in the sidebar.</p>

                  {isSuper && (
                    <div className="space-y-6 pt-4 border-t border-black/5 dark:border-white/5">
                      <div className="bg-[#0E6B75]/5 p-4 rounded-[20px] border border-[#0E6B75]/10">
                        <div className="flex items-center gap-2 mb-4">
                          < ShieldCheck className="w-4 h-4 text-[#0E6B75]" />
                          <h4 className="text-[0.7rem] uppercase tracking-widest font-black text-[#0E6B75]">Super Admin Controls</h4>
                        </div>
                        
                        <div className="space-y-6">
                          
                                                  </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeAdminTab === 'ads' && isSuper && (
                <div className="space-y-6">
                  {/* Segmented selector for Post Ads vs Reel Video Ads */}
                  <div className={`flex p-1 rounded-2xl border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-[#EEEDF3] border-[#DAD8E3]'}`}>
                    <button
                      onClick={() => {
                        setAdTypeTab('post');
                        resetAdForm('post');
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        adTypeTab === 'post' ? 'bg-[#0E6B75] text-white shadow-sm' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      Post Feed Ads ({postAds.length})
                    </button>
                    <button
                      onClick={() => {
                        setAdTypeTab('reel');
                        resetAdForm('reel');
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        adTypeTab === 'reel' ? 'bg-[#0E6B75] text-white shadow-sm' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      Reels Video Ads ({reelAds.length})
                    </button>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-[#F8F8FA] border-[#DAD8E3]'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#0E6B75]">
                        {editingAdId
                          ? `Edit ${adTypeTab === 'post' ? 'Post Ad' : 'Reel Video Ad'}`
                          : (adTypeTab === 'post' ? 'Create Post Ad (Every 5 Posts · Shuffled)' : 'Create Reel Video Ad (Every 3 Reels)')}
                      </h4>
                      {editingAdId && (
                        <button
                          type="button"
                          onClick={() => resetAdForm(adTypeTab)}
                          className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:underline"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Sponsor / Business Name *"
                        value={adSponsor}
                        onChange={(e) => setAdSponsor(e.target.value)}
                        className={`w-full p-3 rounded-xl border-none outline-none text-sm font-bold ${isDarkMode ? 'bg-[#13232A] text-white' : 'bg-white text-[#14262D]'}`}
                      />
                      <input
                        type="text"
                        placeholder="Ad Headline *"
                        value={adHeadline}
                        onChange={(e) => setAdHeadline(e.target.value)}
                        className={`w-full p-3 rounded-xl border-none outline-none text-sm font-medium ${isDarkMode ? 'bg-[#13232A] text-white' : 'bg-white text-[#14262D]'}`}
                      />
                      <textarea
                        placeholder="Short description (optional)"
                        rows={2}
                        value={adDescription}
                        onChange={(e) => setAdDescription(e.target.value)}
                        className={`w-full p-3 rounded-xl border-none outline-none text-sm resize-none ${isDarkMode ? 'bg-[#13232A] text-white' : 'bg-white text-[#14262D]'}`}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Button Text (e.g. Learn More)"
                          value={adCtaText}
                          onChange={(e) => setAdCtaText(e.target.value)}
                          className={`w-full p-3 rounded-xl border-none outline-none text-xs font-bold ${isDarkMode ? 'bg-[#13232A] text-white' : 'bg-white text-[#14262D]'}`}
                        />
                        <input
                          type="url"
                          placeholder="Link URL (https://...)"
                          value={adCtaUrl}
                          onChange={(e) => setAdCtaUrl(e.target.value)}
                          className={`w-full p-3 rounded-xl border-none outline-none text-xs font-medium ${isDarkMode ? 'bg-[#13232A] text-white' : 'bg-white text-[#14262D]'}`}
                        />
                      </div>

                      {/* Media Upload (Multiple images supported for Post Ads) */}
                      <div className="pt-1">
                        <label className={`w-full py-3 px-4 rounded-xl border-2 border-dashed border-[#0E6B75]/40 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#0E6B75]/5 transition-colors text-xs font-bold text-[#0E6B75]`}>
                          <input
                            type="file"
                            multiple={adTypeTab === 'post'}
                            accept={adTypeTab === 'reel' ? 'video/*' : 'image/*,video/*'}
                            className="hidden"
                            disabled={isAdUploading}
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []) as File[];
                              if (files.length === 0) return;
                              setIsAdUploading(true);
                              try {
                                if (adTypeTab === 'reel') {
                                  const file = files[0];
                                  const isVid = Boolean(file.type && file.type.startsWith('video/'));
                                  if (!isVid) {
                                    showToast('Reels ads require a video file.', 'error');
                                    setIsAdUploading(false);
                                    return;
                                  }
                                  const uploadedUrl = await uploadToCloudinary(file as any, 'ads');
                                  setAdMediaUrls([uploadedUrl]);
                                  setAdMediaTypes(['video']);
                                  showToast('Reel video ad uploaded!');
                                } else {
                                  const newUrls: string[] = [];
                                  const newTypes: ('image' | 'video')[] = [];
                                  for (const file of files) {
                                    const isVid = Boolean(file.type && file.type.startsWith('video/'));
                                    const uploadedUrl = await uploadToCloudinary(file as any, 'ads');
                                    newUrls.push(uploadedUrl);
                                    newTypes.push(isVid ? 'video' : 'image');
                                  }
                                  setAdMediaUrls(prev => [...prev, ...newUrls]);
                                  setAdMediaTypes(prev => [...prev, ...newTypes]);
                                  showToast(`${newUrls.length} media file${newUrls.length > 1 ? 's' : ''} uploaded!`);
                                }
                              } catch (err: any) {
                                console.error('Ad upload error:', err);
                                showToast(err?.message || 'Failed to upload ad media.', 'error');
                              } finally {
                                setIsAdUploading(false);
                                e.target.value = '';
                              }
                            }}
                          />
                          {isAdUploading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Uploading Media...</span>
                            </>
                          ) : (
                            <>
                              {adTypeTab === 'reel' ? <VideoIcon className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                              <span>
                                {adTypeTab === 'reel'
                                  ? (adMediaUrls.length > 0 ? 'Replace Portrait Video Ad' : 'Upload Portrait Video Ad *')
                                  : (adMediaUrls.length > 0 ? `Add More Images / Media (${adMediaUrls.length} attached)` : 'Upload Ad Images (Multiple) or Video *')}
                              </span>
                            </>
                          )}
                        </label>

                        {adMediaUrls.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {adMediaUrls.map((url, i) => {
                              const type = adMediaTypes[i] || (url.toLowerCase().includes('.mp4') || url.includes('/video/') ? 'video' : 'image');
                              return (
                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#DAD8E3] dark:border-[#22363E] bg-black flex items-center justify-center group">
                                  {type === 'video' ? (
                                    <video src={url} className="w-full h-full object-cover" muted playsInline />
                                  ) : (
                                    <img src={url} className="w-full h-full object-cover" alt={`Ad media ${i + 1}`} />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdMediaUrls(prev => prev.filter((_, idx) => idx !== i));
                                      setAdMediaTypes(prev => prev.filter((_, idx) => idx !== i));
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-red-500 transition-colors"
                                    title="Remove media"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        disabled={!adSponsor.trim() || !adHeadline.trim() || adMediaUrls.length === 0 || isAdUploading}
                        onClick={async () => {
                          const primaryType = adTypeTab === 'reel'
                            ? 'video'
                            : (adMediaTypes[0] || 'image');

                          const adPayload: AdItem = {
                            id: editingAdId || `ad_${Date.now()}`,
                            sponsorName: adSponsor.trim(),
                            headline: adHeadline.trim(),
                            description: adDescription.trim(),
                            mediaUrl: adMediaUrls[0],
                            mediaUrls: adMediaUrls,
                            mediaType: primaryType,
                            mediaTypes: adMediaTypes,
                            ctaText: adCtaText.trim() || 'Learn More',
                            ctaUrl: formatExternalUrl(adCtaUrl),
                            createdAt: Date.now()
                          };

                          if (adTypeTab === 'post') {
                            const updatedList = editingAdId
                              ? postAds.map((a: AdItem) => a.id === editingAdId ? adPayload : a)
                              : [...postAds, adPayload];
                            await onUpdatePostAds(updatedList);
                          } else {
                            const updatedList = editingAdId
                              ? reelAds.map((a: AdItem) => a.id === editingAdId ? adPayload : a)
                              : [...reelAds, adPayload];
                            await onUpdateReelAds(updatedList);
                          }

                          resetAdForm(adTypeTab);
                        }}
                        className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          adSponsor.trim() && adHeadline.trim() && adMediaUrls.length > 0 && !isAdUploading
                            ? 'bg-[#0E6B75] text-white shadow-lg hover:opacity-95'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {editingAdId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span>
                          {editingAdId
                            ? `Save Changes to ${adTypeTab === 'post' ? 'Post Ad' : 'Reel Video Ad'}`
                            : `Publish ${adTypeTab === 'post' ? 'Post Ad' : 'Reel Video Ad'}`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Active Ads List */}
                  <div className="space-y-3">
                    <h4 className="text-[0.7rem] uppercase tracking-widest font-black opacity-50">
                      Active {adTypeTab === 'post' ? 'Post Feed Ads (Shuffled every 5 posts)' : 'Reels Video Ads (Placed every 3 reels)'}
                    </h4>

                    {(adTypeTab === 'post' ? postAds : reelAds).length === 0 ? (
                      <div className="py-8 text-center opacity-40 text-xs font-bold">
                        No {adTypeTab === 'post' ? 'post ads' : 'reel video ads'} active yet.
                      </div>
                    ) : (
                      (adTypeTab === 'post' ? postAds : reelAds).map((ad: AdItem) => {
                        const adUrls = ad.mediaUrls && ad.mediaUrls.length > 0 ? ad.mediaUrls : (ad.mediaUrl ? [ad.mediaUrl] : []);
                        const isBeingEdited = editingAdId === ad.id;
                        return (
                          <div
                            key={ad.id}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                              isBeingEdited
                                ? 'border-[#0E6B75] ring-2 ring-[#0E6B75]/20 bg-[#0E6B75]/5'
                                : (isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-white border-[#DAD8E3]')
                            }`}
                          >
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                              {ad.mediaType === 'video' ? (
                                <video src={adUrls[0]} className="w-full h-full object-cover" muted playsInline />
                              ) : (
                                <img src={adUrls[0]} className="w-full h-full object-cover" alt="" />
                              )}
                              {adUrls.length > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 px-1.5 py-0.2 rounded bg-black/80 text-white text-[9px] font-black">
                                  +{adUrls.length - 1}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#C9A24B] block">
                                {ad.sponsorName}
                              </span>
                              <strong className="text-sm block truncate">{ad.headline}</strong>
                              {ad.ctaUrl && (
                                <span className="text-[11px] opacity-50 block truncate">{ad.ctaUrl}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdId(ad.id);
                                  setAdSponsor(ad.sponsorName || '');
                                  setAdHeadline(ad.headline || '');
                                  setAdDescription(ad.description || '');
                                  setAdCtaText(ad.ctaText || 'Learn More');
                                  setAdCtaUrl(ad.ctaUrl || '');
                                  const urls = ad.mediaUrls && ad.mediaUrls.length > 0 ? ad.mediaUrls : (ad.mediaUrl ? [ad.mediaUrl] : []);
                                  setAdMediaUrls(urls);
                                  setAdMediaTypes(
                                    ad.mediaTypes && ad.mediaTypes.length === urls.length
                                      ? ad.mediaTypes
                                      : urls.map((u) => (ad.mediaType === 'video' || u.toLowerCase().includes('.mp4') || u.includes('/video/') ? 'video' : 'image'))
                                  );
                                }}
                                className="p-2 text-[#0E6B75] hover:bg-[#0E6B75]/10 rounded-xl transition-colors"
                                title="Edit Ad"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (editingAdId === ad.id) {
                                    resetAdForm(adTypeTab);
                                  }
                                  if (adTypeTab === 'post') {
                                    await onUpdatePostAds(postAds.filter((a: AdItem) => a.id !== ad.id));
                                  } else {
                                    await onUpdateReelAds(reelAds.filter((a: AdItem) => a.id !== ad.id));
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                                title="Remove Ad"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeAdminTab === 'admins' && isSuper && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[0.7rem] uppercase tracking-widest font-black mb-2 opacity-50">Add New Admin (Gmail)</label>
                    <div className="flex gap-2">
                      <input 
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="resident@gmail.com"
                        className={`flex-1 p-4 rounded-xl border-none outline-none font-bold transition-colors ${isDarkMode ? 'bg-[#0B171C] text-white' : 'bg-[#EEEDF3] text-[#14262D]'}`}
                      />
                      <button 
                        onClick={handleAddAdmin}
                        className="px-6 bg-[#0E6B75] text-white rounded-xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[0.7rem] uppercase tracking-widest font-black opacity-50">Current Administrators</h4>
                    {allAdmins.map((adm) => (
                      <div key={adm.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-[#F8F8FA] border-[#DAD8E3]'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-sm">{adm.email}</span>
                          <button onClick={() => handleRemoveAdmin(adm.email)} className="text-red-500 p-1 hover:bg-red-500/10 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'canDeletePosts', label: 'Delete Posts' },
                            { id: 'canUploadImages', label: 'Upload Images' },
                            { id: 'canSetAccessCode', label: 'Access Code' }
                          ].map(p => (
                            <button
                              key={p.id}
                              onClick={() => togglePermission(adm.email, p.id, adm.permissions[p.id])}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${adm.permissions[p.id] ? 'bg-[#0E6B75] border-[#0E6B75] text-white shadow-md' : 'opacity-40 border-current'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeAdminTab === 'recycle' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[0.7rem] uppercase tracking-widest font-black opacity-50">Recycle Bin (3 Day Retention)</h4>
                    <span className="text-[10px] font-bold opacity-30">{deletedPosts.length} items</span>
                  </div>
                  
                  {deletedPosts.length === 0 && (
                    <div className="py-12 text-center opacity-20">
                      <Trash className="w-12 h-12 mx-auto mb-3" />
                      <p className="text-xs font-black uppercase tracking-widest">Bin is empty</p>
                    </div>
                  )}

                  {deletedPosts.map((dp) => (
                    <div key={dp.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0B171C] border-[#22363E]' : 'bg-[#F8F8FA] border-[#DAD8E3]'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate mb-1">By {dp.postData.authorName}</p>
                          <p className="text-[10px] opacity-40 line-clamp-2">{dp.postData.text}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onRestorePost(dp.id)}
                            className="p-2 bg-[#0E6B75] text-white rounded-lg shadow-sm"
                            title="Restore"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onPermanentDelete(dp.id)}
                            className="p-2 bg-red-500 text-white rounded-lg shadow-sm"
                            title="Erase"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-30 text-[9px] font-black uppercase tracking-widest pt-2 border-t border-black/5">
                        <span>Deleted {new Date(dp.deletedAt?.toDate?.() || Date.now()).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>By {dp.deletedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            </div>

            {/* Modal Footer */}
            <div className={`p-6 border-t ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'}`}>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    signOut(auth);
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl border-2 border-red-500/20 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 transition-all text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out Admin
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-[#0E6B75] text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#0E6B75]/20"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface FloatingPhotoCardProps {
  images: string[];
  imgOffset: number;
  slot: number;
  column: number;
  paused: boolean;
  onPauseDelta: (delta: number) => void;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
}

// Hero runs as a 2x2 grid: two cards in the upper half, two in the lower half, at all times.
// Each column is a conveyor of four slots spaced half a screen apart; as the top card of a
// column clears the banner it wraps to the bottom, so the grid never empties.
const HERO_TRAVERSE_SECONDS = 11; // Time for one card to travel one screen height

const FloatingPhotoCard: React.FC<FloatingPhotoCardProps> = ({ images, imgOffset, slot, column, paused, onPauseDelta, constraintsRef }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(1000);
  const isHovered = useRef(false);
  const isDragging = useRef(false);
  const isTouching = useRef(false);
  const initialized = useRef(false);
  const pxPerSecond = useRef(0);
  const [imgIdx, setImgIdx] = useState(slot + imgOffset);
  const prefersReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  const anyPaused = () => isHovered.current || isDragging.current || isTouching.current;

  useAnimationFrame((_, delta) => {
    if (!constraintsRef.current || !cardRef.current) return;

    const containerHeight = constraintsRef.current.offsetHeight;
    const cardHeight = cardRef.current.offsetHeight || 220;
    const margin = 60;
    const halfStep = containerHeight / 2;
    const cycleLength = halfStep * 4;

    if (containerHeight === 0) return;

    if (!initialized.current) {
      pxPerSecond.current = (containerHeight + cardHeight) / HERO_TRAVERSE_SECONDS;
      // Slot 0 sits in the upper half, slot 1 in the lower half; slots 2 and 3 wait below the fold
      y.set(containerHeight * 0.12 + slot * halfStep);
      initialized.current = true;
    }

    const dt = Math.min(delta, 100) / 1000;

    let speedMultiplier = 1.0;
    if (prefersReducedMotion) speedMultiplier *= 0.05;
    if (paused) speedMultiplier = 0;

    let nextY = y.get() - (pxPerSecond.current * dt * speedMultiplier);

    if (nextY < -(cardHeight + margin)) {
      nextY += cycleLength;
      x.set(0);
      setImgIdx((prev) => (prev + 4) % Math.max(1, images.length));
    }

    if (!isDragging.current) {
      y.set(nextY);
    }
  });

  const currentImage = images.length > 0 ? images[imgIdx % images.length] : PLACEHOLDER_IMAGES[imgIdx % PLACEHOLDER_IMAGES.length];
  const caption = EVENTS_DATA.length > 0 ? EVENTS_DATA[(imgIdx + imgOffset) % EVENTS_DATA.length].name : undefined;
  const isPausedState = isHovered.current || isDragging.current || isTouching.current;

  return (
    <motion.div
      ref={cardRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={constraintsRef}
      onDragStart={() => { isDragging.current = true; onPauseDelta(1); }}
      onDragEnd={() => { isDragging.current = false; if (!anyPaused()) onPauseDelta(-1); }}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') {
          isHovered.current = true;
          onPauseDelta(1);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') {
          isHovered.current = false;
          if (!anyPaused()) onPauseDelta(-1);
        }
      }}
      onPointerDown={() => { isTouching.current = true; onPauseDelta(1); }}
      onPointerUp={() => { isTouching.current = false; if (!anyPaused()) onPauseDelta(-1); }}
      onPointerCancel={() => { isTouching.current = false; if (!anyPaused()) onPauseDelta(-1); }}
      initial={{ rotate: column === 0 ? (slot % 2 === 0 ? -4 : 3) : (slot % 2 === 0 ? 3 : -4) }}
      style={{
        left: column === 0 ? '6%' : '54%',
        width: 'clamp(150px, 42vw, 280px)',
        position: 'absolute',
        x,
        y,
        zIndex: isPausedState ? 100 : 10,
        touchAction: 'none'
      }}
      className="cursor-grab active:cursor-grabbing select-none"
      whileHover={{ scale: 1.05, zIndex: 110 }}
    >
      <div className={`bg-white p-2 pb-2 shadow-2xl rounded-sm ${isPausedState ? 'scale-110 shadow-black/40' : 'shadow-black/20'}`}>
        <img
          src={currentImage}
          className="w-full h-auto object-cover pointer-events-none"
          alt=""
          draggable={false}
        />
        {caption && (
          <p className="text-center text-[0.78rem] font-bold font-display text-[#14262D] pt-2 pb-1 leading-tight">{caption}</p>
        )}
      </div>
    </motion.div>
  );
}

function FloatingHeroSection({ isDarkMode, images }: { isDarkMode: boolean, images: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pauseCount = useRef(0);
  const [heroPaused, setHeroPaused] = useState(false);

  const handlePauseDelta = (delta: number) => {
    pauseCount.current = Math.max(0, pauseCount.current + delta);
    setHeroPaused(pauseCount.current > 0);
  };

  const baseImages = images.length > 0 ? images : PLACEHOLDER_IMAGES;

  return (
    <section
      ref={containerRef}
      className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-[65vh] sm:h-[80vh] overflow-hidden bg-[#0E6B75] mb-12 shadow-inner"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent)]" />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {[0, 1].map((column) =>
          [0, 1, 2, 3].map((slot) => (
            <FloatingPhotoCard
              key={`hero-${column}-${slot}`}
              images={baseImages}
              imgOffset={column * 2}
              slot={slot}
              column={column}
              paused={heroPaused}
              onPauseDelta={handlePauseDelta}
              constraintsRef={containerRef}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ProfilePromptModal({ isOpen, onClose, onGoToSettings, isDarkMode }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[150] backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-[151] rounded-t-[32px] p-6 pt-4 pb-10 shadow-2xl text-center ${isDarkMode ? 'bg-[#13232A] border-t border-[#22363E]' : 'bg-white border-t border-[#DAD8E3]'}`}
          >
            <div className="w-12 h-1.5 bg-[#DAD8E3] dark:bg-[#22363E] rounded-full mx-auto mb-6" />
            <div className="w-20 h-20 rounded-full bg-[#0E6B75]/10 text-[#0E6B75] flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black font-display tracking-tight mb-2">Set up your profile</h3>
            <p className="text-sm opacity-60 mb-8">Please add your name and a profile picture before sharing memories with the community.</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={onGoToSettings}
                className="w-full py-4 rounded-full bg-[#0E6B75] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0E6B75]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Go to Profile Setup
              </button>
              <button 
                onClick={onClose}
                className={`w-full py-4 rounded-full font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'text-white/40' : 'text-[#5A6970]'}`}
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
