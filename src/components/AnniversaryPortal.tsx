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
import AnniversarySection from './AnniversarySection';
import { db, auth } from '../lib/firebase';
import { get, set, del } from 'idb-keyval';
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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
  Save
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

const DAYS_DATA = [
  { l: "Mon", n: "30", events: [{ h: 9, t: "9:00am", title: "Road Show", v: "Estate Road & Surroundings" }] },
  { l: "Tue", n: "1", events: [{ h: 10, t: "10:00am", title: "Health Talk / Medical Outreach", v: "Clubhouse Hall" }] },
  { l: "Wed", n: "2", events: [{ h: 16, t: "4:00pm", title: "Novelty Match", v: "Estate Field" }] },
  { l: "Thu", n: "3", events: [{ h: 16, t: "4:00pm", title: "Novelty Match Final", v: "Estate Field" }] },
  { l: "Fri", n: "4", events: [{ h: 13, t: "1:00pm", title: "Jumat Prayer", v: "Central Mosque" }, { h: 16, t: "4:00pm", title: "Indoor Games", v: "Clubhouse" }] },
  { l: "Sat", n: "5", events: [{ h: 7, t: "7:00am", title: "Health Walk", v: "Estate Road" }, { h: 11, t: "11:00am", title: "Interdenominational Prayer", v: "Clubhouse" }, { h: 17, t: "5:00pm", title: "Grand Finale", v: "Clubhouse Lawn" }] },
  { l: "Sun", n: "6", events: [{ h: 9, t: "9:00am", title: "Thanksgiving Service", v: "Clubhouse Hall" }] }
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
        headers: { 'Accept': 'application/json' }
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
      'Accept': 'application/json'
    },
    body: formData
  });

  if (res.status === 404) {
    res = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
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
  const [activeDay, setActiveDay] = useState(0);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{url: string, id: string, type?: 'image' | 'video', orientation?: 'portrait' | 'landscape'}[]>([]);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  
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
  const [dayImages, setDayImages] = useState<string[]>(new Array(7).fill(''));
  const [estateWebsiteUrl, setEstateWebsiteUrl] = useState('https://ire-akari.estate');
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
        setShowProfilePrompt(!data.displayName || !data.photoUrl);
      } else {
        setShowProfilePrompt(true);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `residents/${user.uid}`);
    });

    // Sync admin status
    const adminUnsub = onSnapshot(doc(db, 'admins', user.email || 'anonymous'), (snap) => {
      if (snap.exists()) {
        setIsAdmin(true);
        setAdminPermissions(snap.data().permissions);
      } else if (isSuper) {
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

  // Sync user reactions for the Jubilee Documentary
  useEffect(() => {
    if (!user) return;
    const reactionRef = doc(db, 'posts', 'jubilee_documentary', 'reactions', user.uid);
    const unsub = onSnapshot(reactionRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserLikes(prev => ({ ...prev, jubilee_documentary: !!data.like }));
        setUserLoves(prev => ({ ...prev, jubilee_documentary: !!data.love }));
      }
    });
    return () => unsub();
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
        if (data.dayImages && data.dayImages.length > 0) {
          setDayImages(data.dayImages);
        }
        if (data.estateWebsiteUrl) {
          setEstateWebsiteUrl(data.estateWebsiteUrl);
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
            activeAccessCode: 'IRE2026',
            estateWebsiteUrl: 'https://ire-akari.estate',
            createdAt: serverTimestamp()
          });
        }

        // Initialize Jubilee Documentary stats
        const docRef = doc(db, 'posts', 'jubilee_documentary');
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          await setDoc(docRef, {
            id: 'jubilee_documentary',
            authorName: 'Committee',
            text: 'Ire-Akari at 30: A Documentary',
            mediaUrls: ['https://res.cloudinary.com/qgvszym1/video/upload/v1784929959/Untitled_video_3_1_cafnet.mp4'],
            likeCount: 0,
            loveCount: 0,
            timestamp: serverTimestamp(),
            isFeatured: true
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

  // Handle Admin Login
  const handleAdminLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
      showToast("Login failed. Use justfashion414@gmail.com", "error");
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
    const start = new Date('2026-11-30T00:00:00');
    const end = new Date('2026-12-07T00:00:00');
    if (now < start) return 'before';
    if (now > end) return 'after';
    return 'during';
  };

  const phase = getDayPhase();

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
            className="fixed inset-0 z-[500] overflow-hidden flex items-center justify-center bg-[#EEEDF3] dark:bg-[#0B171C] cursor-pointer select-none"
          >
            {/* THE GIANT NAME: IRE AKARI ESTATE · SOKA, IBADAN (PLAIN TEXT ONLY) */}
            <div className="relative z-10 flex flex-col items-center max-w-full px-4 text-center pointer-events-none">
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 18 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease: "circOut" }}
              >
                <h1 className="text-[clamp(4rem,18vw,12rem)] font-black font-display tracking-[-0.08em] leading-[0.75] uppercase mb-0 text-[#0E6B75] drop-shadow-sm">
                  I&nbsp;RE AKARI
                </h1>
                <h2 className="text-[clamp(4rem,18vw,12rem)] font-black font-display tracking-[-0.08em] leading-[0.75] uppercase flex items-center justify-center gap-[0.05em] text-[#0E6B75] drop-shadow-sm">
                  <span>ESTATE</span>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 12, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="w-[0.3em] h-[0.3em] rounded-full bg-[#0E6B75] opacity-80"
                  />
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                transition={{ delay: 0.3, duration: 0.9 }}
                className="flex items-center gap-4 mt-10 sm:mt-12 w-full max-w-md mx-auto"
              >
                <div className="h-[2px] flex-1 bg-[#0E6B75] opacity-20" />
                <p className="text-[clamp(0.8rem,3vw,1.5rem)] font-display font-black tracking-[0.4em] uppercase whitespace-nowrap opacity-60 text-[#0E6B75]">
                  Soka, Ibadan
                </p>
                <div className="h-[2px] flex-1 bg-[#0E6B75] opacity-20" />
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Simplified Header - CLEAN DESIGN (Hidden when viewing full-portrait Reels) */}
      {!(activeTab === 'feed' && feedSubTab === 'reels') && (
        <header className={`sticky top-0 z-[60] backdrop-blur-md px-5 py-3.5 border-b transition-colors ${isDarkMode ? 'bg-[#0B171C]/80 border-[#22363E]' : 'bg-[#EEEDF3]/80 border-[#DAD8E3]'}`}>
          <div className="max-w-[520px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-[1.15rem] font-black font-display tracking-[-0.01em] leading-none text-[#0E6B75]">Ire-Akari</h1>
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
              {/* HERO - EXACT REPLICATION */}
              <div className="rounded-[28px] p-[26px_22px_22px] text-[#F2F7F8] bg-[#0B3A43] relative overflow-hidden shadow-xl" style={{
                background: 'radial-gradient(120% 90% at 88% 0%, #1F7380 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, #3A2F63 0%, transparent 62%), #0B3A43'
              }}>
                <div className="flex items-end gap-[14px]">
                  <p className="text-[clamp(6.5rem,34vw,9.5rem)] font-black font-display leading-[0.78] tracking-[-0.05em] m-0 animate-sheen text-transparent bg-clip-text" aria-label="30">30</p>
                  <div className="pb-1">
                    <strong className="block text-[1.3rem] font-display leading-[1.15]">years of<br/>Ire-Akari</strong>
                    <span className="block text-[0.85rem] opacity-[0.82] mt-1">Pearl anniversary week</span>
                  </div>
                </div>

                {showProfilePrompt && !isAdmin && (
                  <div className="mt-5 bg-white/10 border border-white/20 rounded-[20px] p-4 flex items-center justify-between gap-4 backdrop-blur-md">
                    <div className="flex-1">
                      <b className="text-[0.95rem] font-display block mb-0.5">Complete your profile</b>
                      <p className="text-[0.8rem] opacity-80 m-0 leading-tight">Add your name and photo to join the community wall.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="whitespace-nowrap px-4 py-2 bg-white text-[#0B3A43] rounded-full text-[0.75rem] font-black uppercase tracking-wider shadow-sm hover:scale-105 active:scale-95 transition-all"
                    >
                      Set Up
                    </button>
                  </div>
                )}
                
                {phase === 'before' && <CountdownTimer targetDate={new Date('2026-11-30T00:00:00')} isDarkMode={isDarkMode} />}

                {phase === 'during' && (
                  <div className="mt-5 bg-white/10 border border-white/14 rounded-[18px] p-[14px_16px]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#7CF2B0]" />
                      <b className="text-[1.05rem] font-display">Day 1 of 7, happening now</b>
                    </div>
                    <p className="text-[0.9rem] opacity-[0.9] m-0">Next: Opening ceremony at 5:00pm, Clubhouse lawn</p>
                  </div>
                )}

                {phase === 'after' && (
                  <div className="mt-5 bg-white/10 border border-white/14 rounded-[18px] p-[14px_16px]">
                    <b className="text-[1.05rem] font-display">Thank you for 30 wonderful years</b>
                    <p className="text-[0.9rem] opacity-[0.9] m-0">The week is over, but the memories are still coming in.</p>
                  </div>
                )}

                <button 
                  onClick={() => setActiveTab('feed')}
                  className="mt-4 inline-flex items-center justify-center gap-2 border-0 rounded-full p-[10px_18px] font-bold bg-white text-[#0B3A43] text-sm hover:scale-105 transition-all group"
                >
                  See what neighbours are posting
                  <motion.span 
                    animate={{ x: [0, 5, 0] }} 
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="flex items-center"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[3]" />
                  </motion.span>
                </button>
              </div>

              {/* VIDEO & THREE DECADES LEGACY SECTION */}
              <div className="mt-8 mb-4">
                <div className="text-center max-w-3xl mx-auto mb-8 px-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0E6B75]/10 border border-[#0E6B75]/30 rounded-full text-[#0E6B75] mb-4">
                    <PartyPopper className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">30th Anniversary Jubilee</span>
                  </div>
                  <h2 className="text-3xl font-display font-black tracking-tight mb-4">Three Decades of Legacy</h2>
                  <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
                    Celebrating 30 years of serene environments and community strength since 1996.
                  </p>
                </div>

                {/* Documentary Video */}
                <div className="flex flex-col items-center justify-center mb-8 relative">
                  <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-[24px] overflow-hidden border-4 border-[#0E6B75] shadow-2xl bg-black group/video">
                    <video
                      src="https://res.cloudinary.com/qgvszym1/video/upload/v1784929959/Untitled_video_3_1_cafnet.mp4"
                      className="w-full h-full object-cover"
                      loop
                      playsInline
                      autoPlay
                      muted
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* THE WEEK - EXACT REPLICATION */}
              <section className="mt-8">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">The week</h2>
                <div className="flex gap-2 overflow-x-auto no-scrollbar p-[2px_2px_10px]">
                  {DAYS_DATA.map((d, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActiveDay(i)}
                      className={`flex-shrink-0 border rounded-[16px] p-[8px_14px] text-center min-w-[64px] transition-colors ${activeDay === i ? 'bg-[#0E6B75] border-[#0E6B75] text-white' : (isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]')}`}
                    >
                      <small className={`block text-[0.75rem] ${activeDay === i ? 'opacity-[0.85]' : 'text-[#5A6970]'}`}>{d.l}</small>
                      <b className="text-[1.05rem] font-display">{d.n}{i === 0 ? ' Nov' : ' Dec'}</b>
                    </button>
                  ))}
                </div>

                {/* Day-specific Image (Three Decades Legacy Linked) */}
                <div className={`mb-3 rounded-[24px] overflow-hidden border aspect-video bg-black/5 dark:bg-white/5 relative ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'}`}>
                  <AnimatePresence mode="wait">
                    {dayImages[activeDay] ? (
                      <motion.img 
                        key={dayImages[activeDay]}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4 }}
                        src={dayImages[activeDay]} 
                        className="w-full h-full object-cover" 
                        alt={`Programme Day ${activeDay + 1}`} 
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                        <ImageIcon className="w-10 h-10 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No photo set for this day</span>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={`rounded-[20px] border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                  {DAYS_DATA[activeDay].events.map((e, idx) => {
                    const id = `day-${activeDay}-ev-${idx}`;
                    const isBookmarked = bookmarks.includes(id);
                    return (
                      <div key={idx} className="flex gap-[14px] p-[14px_14px_14px_16px] items-start border-t first:border-t-0 border-[#DAD8E3] dark:border-[#22363E]">
                        <div className="flex-shrink-0 w-[62px] font-display font-semibold text-[0.95rem] pt-[1px]">{e.t}</div>
                        <div className="flex-1 min-w-0">
                          <strong className="block leading-[1.3] text-sm">{e.title}</strong>
                          <span className={`text-[0.88rem] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>{e.v}</span>
                        </div>
                        <button 
                          onClick={() => toggleBookmark(id)}
                          className={`border-0 bg-transparent p-1.5 rounded-[10px] transition-colors ${isBookmarked ? 'text-[#0E6B75]' : 'text-[#5A6970]'}`}
                        >
                          <BookmarkIcon active={isBookmarked} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* OUR STORY - EXACT REPLICATION */}
              <section className="mt-8">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">Our story</h2>
                <ol className="m-0 p-[6px_4px_0_4px] list-none">
                  <TimelineItem year="1996" title="First keys handed over" desc="The first families moved in and the road to the gate was still sand." isDarkMode={isDarkMode} />
                  <TimelineItem year="2003" title="Residents' association formed" desc="Neighbours organised to run security, water and sanitation together." isDarkMode={isDarkMode} />
                  <TimelineItem year="2011" title="Borehole and perimeter fence" desc="Paid for by the residents themselves." isDarkMode={isDarkMode} />
                  <TimelineItem year="2018" title="Clubhouse opens" desc="A home for weddings, meetings and Sunday football viewing." isDarkMode={isDarkMode} />
                  <TimelineItem year="2026" title="Thirty years" desc="One week to celebrate everyone who built this place." isNow isDarkMode={isDarkMode} />
                </ol>
              </section>

              {/* GOOD TO KNOW - EXACT REPLICATION */}
              <section className="mt-8">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">Good to know</h2>
                <div className={`p-[16px_18px] rounded-[20px] border mb-2.5 ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                  <strong className="block mb-0.5 text-[0.93rem]">Dress code</strong>
                  <p className={`m-0 text-[0.93rem] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
                    Day 1 and Day 7: pearl white with one colour of your choice. Day 5: wear your block colours.
                  </p>
                </div>
                <div className={`p-[16px_18px] rounded-[20px] border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                  <strong className="block mb-0.5 text-[0.93rem]">Parking and gate access</strong>
                  <p className={`m-0 text-[0.93rem] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>
                    Guest cars park on the field behind Block D from 4pm each evening. Gate staff will hold the guest list.
                  </p>
                </div>
              </section>

              {/* GET IN TOUCH - EXACT REPLICATION */}
              <section className="mt-8">
                <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[30px_4px_12px] leading-[1.25]">Get in touch</h2>
                <div className={`p-[18px] flex flex-col gap-3 items-start rounded-[20px] border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
                  <p className="m-0 text-[0.93rem]">
                    <strong className="font-bold">Anniversary committee</strong><br/>
                    <span className={`${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Clubhouse, Ire-Akari Estate</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a href="tel:+2340000000000" className="inline-flex items-center justify-center gap-2 border-0 rounded-full p-[10px_18px] font-bold bg-[#E1EFF0] dark:bg-[#173039] text-[#0E6B75] dark:text-[#4FC3CF] text-sm hover:scale-105 transition-transform">
                      <PhoneIcon />
                      Call committee
                    </a>
                  </div>
                </div>
              </section>

              {/* Giant Stylized Footer with Interactive Photo Grid Background */}
              <section className="relative overflow-hidden w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-[700px] sm:min-h-[850px] flex items-center justify-center bg-[#EEEDF3] dark:bg-[#0B171C]">
                {/* INTERACTIVE PHOTO GRID BACKGROUND with AUTOMATIC SCANNING EFFECT */}
                <div className="absolute inset-0 z-0 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 auto-rows-fr opacity-60">
                  <GridScanner isDarkMode={isDarkMode} />
                </div>

                {/* THE OVERLAID NAME */}
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
                      I&nbsp;RE AKARI
                    </h2>
                    <h2 className="text-[clamp(4rem,18vw,12rem)] font-black font-display tracking-[-0.08em] leading-[0.75] uppercase flex items-center justify-center gap-[0.05em] text-[#0E6B75] drop-shadow-sm">
                      <span>ESTATE</span>
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 12, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="w-[0.3em] h-[0.3em] rounded-full bg-[#0E6B75] opacity-80" 
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
                      Soka, Ibadan
                    </p>
                    <div className="h-[2px] flex-1 bg-[#0E6B75] opacity-20" />
                  </motion.div>
                </motion.div>
              </section>

              {/* Footer Links */}
              <footer className="py-10 text-center border-t border-[#DAD8E3] dark:border-[#22363E] mt-12 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-[32px] mx-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center">
                    <h4 className="text-[1.1rem] font-black font-display text-[#0E6B75] mb-1">Ire-Akari Estate</h4>
                    <p className={`text-xs ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Pearl Anniversary 1996 - 2026</p>
                  </div>
                  
                  <div className="pt-2 opacity-40">
                     <p className="text-[0.65rem] font-bold uppercase tracking-widest">Built for the community</p>
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
              {/* Segmented Control: Post vs Reels (shown here on Post tab; inside ReelsFeed scroll container on Reels tab so it scrolls up out of view) */}
              {feedSubTab !== 'reels' && (
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
                      const isPortraitReel = hasVideo && media.length === 1 && orientation === 'portrait';
                      return !isPortraitReel;
                    });

                    if (regularPosts.length === 0) {
                      return (
                        <div className="py-24 text-center opacity-30">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                          <p className="font-black uppercase tracking-widest text-xs">No posts shared yet</p>
                          <p className="text-[0.75rem] mt-2">Tap the center button to share text, photos, or landscape videos!</p>
                        </div>
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
                          name={p.authorName || 'Resident'}
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
                      return hasVideo && orientation === 'portrait';
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
              <h2 className="text-[1.25rem] font-black font-display tracking-[-0.01em] m-[14px_4px_12px] leading-[1.25]">Resident Profile</h2>
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
                  <strong className="block text-[1rem]">Ire-Akari 30</strong>
                  <small className={`block text-[0.85rem] leading-[1.35] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Pearl Anniversary Community Portal. Established 1996.</small>
                </div>
                <div className="p-[14px_18px] flex items-center justify-between gap-4 border-t border-[#DAD8E3] dark:border-[#22363E]">
                  <div>
                    <strong className="block text-[1rem]">Report a problem</strong>
                    <small className={`block text-[0.85rem] leading-[1.35] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>Tell the committee if something looks wrong</small>
                  </div>
                  <button className="inline-flex items-center justify-center gap-2 border-0 rounded-full p-[10px_18px] font-bold bg-[#E1EFF0] dark:bg-[#173039] text-[#0E6B75] dark:text-[#4FC3CF] text-sm">Report</button>
                </div>
                <div className="p-[14px_18px] border-t border-[#DAD8E3] dark:border-[#22363E] text-center">
                  <span
                    onClick={() => {
                      const newCount = aboutClickCount + 1;
                      if (newCount >= 3) {
                        handleAdminLogin();
                        setAboutClickCount(0);
                      } else {
                        setAboutClickCount(newCount);
                      }
                    }}
                    className={`text-xs font-bold tracking-wide select-none cursor-pointer ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}
                  >
                    Happy 30th Anniversary
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
                          <strong className="block text-[1rem]">Committee Control</strong>
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
        dayImages={dayImages}
        onUpdateDayImages={async (urls: string[]) => {
          try {
            await setDoc(doc(db, 'app_config', 'main'), {
              dayImages: urls,
              lastUpdated: serverTimestamp()
            }, { merge: true });
            showToast("Programme images updated!");
          } catch (err) {
            console.error("Update day images error:", err);
            showToast("Failed to update programme images.", "error");
          }
        }}
        estateWebsiteUrl={estateWebsiteUrl}
        onUpdateEstateUrl={async (url: string) => {
          try {
            await setDoc(doc(db, 'app_config', 'main'), {
              estateWebsiteUrl: url,
              lastUpdated: serverTimestamp()
            }, { merge: true });
            showToast("Estate website link updated!");
          } catch (err) {
            console.error("Update estate url error:", err);
            showToast("Failed to update website link.", "error");
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
                placeholder="What's happening in Ire-Akari?"
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
                          authorName: displayName || 'Resident',
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
                      showToast('Invalid access code. Check with committee.', 'error');
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

      {/* Bottom Nav - DYNAMIC FEED/SEND BUTTON */}
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
                    <h3 className="text-lg font-black font-display leading-tight">Install Ire-Akari App</h3>
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
          post={posts.find(p => p.id === activeMediaIndex.postId) || (activeMediaIndex.postId === 'jubilee_documentary' ? { id: 'jubilee_documentary', authorName: 'Committee', mediaUrls: ['https://res.cloudinary.com/qgvszym1/video/upload/v1784929959/Untitled_video_3_1_cafnet.mp4'] } : null)}
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
  const title = post.text || 'Check out this memory from Ire-Akari Estate 30th Anniversary!';

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

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[22px] h-[22px] fill-none stroke-current stroke-[1.8] ${active ? 'fill-current' : ''}`} viewBox="0 0 24 24">
      <path d="M7 4h10v16l-5-4-5 4z"/>
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-[19px] h-[19px] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>
    </svg>
  );
}

function TimelineItem({ year, title, desc, isNow, isDarkMode }: { year: string; title: string; desc: string; isNow?: boolean; isDarkMode: boolean }) {
  return (
    <li className={`relative p-[0_0_22px_86px] before:absolute before:left-[64px] before:top-[6px] before:bottom-[-6px] before:w-[2px] ${isNow ? '' : 'before:bg-[#DAD8E3] dark:before:bg-[#22363E]'} last:before:hidden`}>
      <div className={`absolute left-[58px] top-[6px] w-[14px] h-[14px] rounded-full shadow-[0_0_0_4px_var(--bg)] transition-all ${isNow ? 'bg-[#C9A24B] shadow-[0_0_0_4px_#EEEDF3,0_0_0_6px_#C9A24B] dark:shadow-[0_0_0_4px_#0B171C,0_0_0_6px_#C9A24B]' : 'bg-[#0E6B75]'}`} />
      <time className="absolute left-0 top-0 w-[52px] text-right font-black font-display text-[1.1rem] tracking-tighter">{year}</time>
      <strong className="block leading-[1.3] text-sm">{title}</strong>
      <p className={`m-0 text-[0.9rem] ${isDarkMode ? 'text-[#93A4AB]' : 'text-[#5A6970]'}`}>{desc}</p>
    </li>
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
  const toggleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll past the Post/Reels toggle bar onto the first reel when Reels opens,
  // or allow the user to scroll back to the very top to tap Post/Reels while keeping
  // each reel strictly snap-locked so the next video is only seen when swiping up.
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const toggleHeight = toggleRef.current ? toggleRef.current.offsetHeight : 0;
    if (clientHeight > 0) {
      const adjustedScroll = Math.max(0, scrollTop - toggleHeight);
      const idx = Math.min(
        Math.max(0, reels.length - 1),
        Math.round(adjustedScroll / clientHeight)
      );
      if (idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  };

  if (!reels || reels.length === 0) {
    return (
      <div>
        <div className={`flex items-center p-1.5 rounded-2xl mb-4 border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
          <button
            onClick={onSwitchToPost}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              isDarkMode ? 'text-[#93A4AB] hover:text-white' : 'text-[#5A6970] hover:text-[#14262D]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Post</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap bg-[#0E6B75] text-white shadow-md"
          >
            <Film className="w-4 h-4" />
            <span>Reels</span>
          </button>
        </div>
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
      className="h-[calc(100dvh-96px)] min-h-[500px] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative rounded-[28px]"
    >
      {/* Post / Reels Toggle Switch inside the scroll container so it scrolls up out of view when viewing reels */}
      <div ref={toggleRef} className="snap-start pb-3">
        <div className={`flex items-center p-1.5 rounded-2xl border ${isDarkMode ? 'bg-[#13232A] border-[#22363E]' : 'bg-white border-[#DAD8E3]'}`}>
          <button
            onClick={onSwitchToPost}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              isDarkMode ? 'text-[#93A4AB] hover:text-white' : 'text-[#5A6970] hover:text-[#14262D]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Post</span>
          </button>
          <button
            onClick={() => {
              if (containerRef.current && toggleRef.current) {
                containerRef.current.scrollTo({ top: toggleRef.current.offsetHeight, behavior: 'smooth' });
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap bg-[#0E6B75] text-white shadow-md"
          >
            <Film className="w-4 h-4" />
            <span>Reels</span>
          </button>
        </div>
      </div>

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
              {reel.isAd ? (reel.sponsorName || 'Featured Partner') : (reel.authorName || 'Resident')}
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

function CountdownTimer({ targetDate, isDarkMode }: { targetDate: Date; isDarkMode: boolean }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      if (distance < 0) { clearInterval(timer); return; }
      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="grid grid-cols-4 gap-2 mt-[22px]">
      <TimerBlock value={timeLeft.d} label="days" />
      <TimerBlock value={timeLeft.h} label="hours" />
      <TimerBlock value={timeLeft.m} label="mins" />
      <TimerBlock value={timeLeft.s} label="secs" />
    </div>
  );
}

function TimerBlock({ value, label }: { value: number; label: string }) {
  const displayValue = value.toString().padStart(2, '0');
  
  return (
    <div className="bg-white/10 border border-white/14 rounded-[16px] p-[10px_4px_8px] text-center overflow-hidden">
      <div className="h-8 relative">
        <AnimatePresence mode="popLayout">
          <motion.b 
            key={value}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ 
              duration: 0.5, 
              ease: [0.34, 1.56, 0.64, 1] // Springy bounce for rolling feel
            }}
            className="absolute inset-0 block text-[1.6rem] font-display leading-[1.1] font-mono"
          >
            {displayValue}
          </motion.b>
        </AnimatePresence>
      </div>
      <small className="text-[0.72rem] opacity-[0.8] mt-1 block uppercase font-bold tracking-wider">{label}</small>
    </div>
  );
}

function GridScanner({ isDarkMode }: { isDarkMode: boolean }) {
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
        // Only the active row is "cleared" (showing image clearly)
        const isCurrentlyScanning = rowIdx === activeRow;
        
        return (
          <GridImage 
            key={i} 
            index={i} 
            isDarkMode={isDarkMode} 
            isCleared={isCurrentlyScanning} 
          />
        );
      })}
    </>
  );
}

function GridImage({ index, isDarkMode, isCleared: autoCleared }: any) {
  const [manualCleared, setManualCleared] = useState(false);
  const isCleared = autoCleared || manualCleared;
  
  const images = [
    'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1472653425572-fa511b1ea9be?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80'
  ];
  
  const imgSrc = images[index % images.length];

  return (
    <div 
      className="relative w-full aspect-square cursor-pointer group pointer-events-auto"
      onClick={() => setManualCleared(!manualCleared)}
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
        transition={{ duration: 0.8 }}
        className={`absolute inset-0 pointer-events-none transition-colors ${isDarkMode ? 'bg-[#0B171C]/80' : 'bg-[#EEEDF3]/85'}`}
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

function AdminDashboardModal({ 
  isOpen, 
  onClose, 
  activeCode, 
  onUpdateCode, 
  isDarkMode, 
  heroImages, 
  onUpdateHeroImages,
  dayImages,
  onUpdateDayImages,
  estateWebsiteUrl,
  onUpdateEstateUrl,
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
  onUpdateReelAds
}: any) {
  const [newCode, setNewCode] = useState(activeCode ?? '');
  const [newUrl, setNewUrl] = useState(estateWebsiteUrl ?? 'https://ire-akari.estate');
  const [isDirty, setIsDirty] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState('settings');
  const [newAdminEmail, setNewAdminEmail] = useState('');

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

  // Sync newCode & newUrl with live values
  useEffect(() => {
    if (isOpen && !isDirty) {
      setNewCode(activeCode ?? '');
      setNewUrl(estateWebsiteUrl ?? 'https://ire-akari.estate');
    }
  }, [activeCode, estateWebsiteUrl, isOpen, isDirty]);

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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] z-[111] rounded-[32px] p-0 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${isDarkMode ? 'bg-[#13232A] border border-[#22363E]' : 'bg-white border border-[#DAD8E3]'}`}
          >
            {/* Modal Header */}
            <div className={`p-6 border-b ${isDarkMode ? 'border-[#22363E]' : 'border-[#DAD8E3]'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-[#0E6B75]" />
                  <h3 className="text-2xl font-black font-display tracking-tight">Admin Control</h3>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5"><X className="w-6 h-6" /></button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-2xl bg-black/5">
                {[
                  { id: 'settings', label: 'Settings', icon: Settings, show: true },
                  { id: 'ads', label: 'Ads', icon: Megaphone, show: isSuper },
                  { id: 'admins', label: 'Admins', icon: Users, show: isSuper },
                  { id: 'recycle', label: 'Bin', icon: Trash, show: adminPermissions?.canDeletePosts }
                ].filter(t => t.show).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAdminTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === tab.id ? (isDarkMode ? 'bg-[#0E6B75] text-white shadow-lg' : 'bg-white text-[#0E6B75] shadow-sm') : 'opacity-40 hover:opacity-100'}`}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 pt-6">
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

                  {isSuper && (
                    <div className="space-y-6 pt-4 border-t border-black/5 dark:border-white/5">
                      <div className="bg-[#0E6B75]/5 p-4 rounded-[20px] border border-[#0E6B75]/10">
                        <div className="flex items-center gap-2 mb-4">
                          < ShieldCheck className="w-4 h-4 text-[#0E6B75]" />
                          <h4 className="text-[0.7rem] uppercase tracking-widest font-black text-[#0E6B75]">Super Admin Controls</h4>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[0.65rem] uppercase tracking-widest font-black mb-2 opacity-50">Main Estate Website URL</label>
                            <div className="flex gap-2">
                              <input 
                                type="url"
                                value={newUrl}
                                onChange={(e) => {
                                  setNewUrl(e.target.value);
                                  setIsDirty(true);
                                }}
                                className={`flex-1 p-3.5 rounded-xl border-none outline-none font-medium transition-colors text-sm ${isDarkMode ? 'bg-[#0B171C] text-white' : 'bg-[#EEEDF3] text-[#14262D]'}`}
                                placeholder="https://..."
                              />
                              <button 
                                onClick={async () => {
                                  await onUpdateEstateUrl(newUrl);
                                  setIsDirty(false);
                                }}
                                className="px-5 bg-[#0E6B75] text-white rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                              >
                                <Check className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Save</span>
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <a
                                href={newUrl || estateWebsiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                                  isDarkMode
                                    ? 'border-[#22363E] bg-[#0B171C] text-[#4FC3CF] hover:bg-[#22363E]'
                                    : 'border-[#DAD8E3] bg-white text-[#0E6B75] hover:bg-[#EEEDF3]'
                                }`}
                              >
                                <ExternalLink className="w-4 h-4" />
                                Open Main Website
                              </a>
                              {onBackToMain && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onBackToMain();
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0E6B75] text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
                                >
                                  <Home className="w-4 h-4" />
                                  View Legacy Site
                                </button>
                              )}
                            </div>

                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch('/api/download-env');
                                    if (!res.ok) throw new Error('Failed to fetch env file');
                                    const text = await res.text();
                                    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = '.env';
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                    showToast('Downloaded .env file!');
                                  } catch {
                                    showToast('Could not download .env file.', 'error');
                                  }
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#C9A24B] text-[#14262D] text-xs font-black uppercase tracking-widest hover:opacity-95 transition-all shadow-sm"
                              >
                                <Download className="w-4 h-4" />
                                Download Netlify .env File
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[0.65rem] uppercase tracking-widest font-black mb-3 opacity-50 tracking-normal">Three Decades Legacy (Programme Day Images 1-7)</label>
                            <div className="grid grid-cols-4 gap-2">
                              {DAYS_DATA.map((day, idx) => (
                                <div key={idx} className="space-y-1">
                                  <label className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border dark:border-[#22363E] flex flex-col items-center justify-center cursor-pointer group">
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        
                                        showToast(`Uploading image for Day ${idx + 1}...`);
                                        const url = await uploadToCloudinary(file as any, 'programme');
                                        const newDayImages = [...dayImages];
                                        newDayImages[idx] = url;
                                        onUpdateDayImages(newDayImages);
                                      }}
                                    />
                                    {dayImages[idx] ? (
                                      <>
                                        <img src={dayImages[idx]} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" alt="" />
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                          <RefreshCw className="w-5 h-5 text-white" />
                                        </div>
                                      </>
                                    ) : (
                                      <Plus className="w-5 h-5 text-[#0E6B75]/40" />
                                    )}
                                  </label>
                                  <span className="block text-[8px] text-center font-black uppercase opacity-40">{day.l}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[0.6rem] opacity-50 mt-3 italic">Upload an image for each day of the anniversary week. These will appear when users select the day in the programme.</p>
                          </div>
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
  src: string;
  left: string;
  width: string;
  initialRotate: number;
  pairIndex: number;
  totalPairs: number;
  isRightLane: boolean;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
}

const PAIR_TRAVERSE_SECONDS = 9; // Time for one pair of images to traverse the hero banner

const FloatingPhotoCard: React.FC<FloatingPhotoCardProps> = ({ src, left, width, initialRotate, pairIndex, totalPairs, isRightLane, constraintsRef }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(1000);
  const isHovered = useRef(false);
  const isDragging = useRef(false);
  const isTouching = useRef(false);
  const [isPausedState, setIsPausedState] = useState(false);
  const initialized = useRef(false);
  const pxPerSecond = useRef(0);
  const prefersReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  const updatePausedState = () => {
    const paused = isHovered.current || isDragging.current || isTouching.current;
    setIsPausedState(paused);
  };

  useAnimationFrame((_, delta) => {
    if (!constraintsRef.current || !cardRef.current) return;

    const containerHeight = constraintsRef.current.offsetHeight;
    const cardHeight = cardRef.current.offsetHeight || 220;
    const margin = 60;
    // Distance between consecutive pairs: set to ~72% of containerHeight so that
    // as the current pair approaches the top of the hero banner, the next pair of 2 images
    // is already emerging from the bottom before the current pair disappears at the top.
    const pairSpacing = Math.max(cardHeight + 70, containerHeight * 0.72);
    const totalCycleLength = Math.max(containerHeight + cardHeight + margin, pairSpacing * Math.max(1, totalPairs));

    if (containerHeight === 0) return;

    if (!initialized.current) {
      pxPerSecond.current = (containerHeight + cardHeight) / PAIR_TRAVERSE_SECONDS;
      // Start pair 0 inside the lower half of the viewport while subsequent pairs follow at pairSpacing intervals
      const laneStagger = isRightLane ? 30 : 0;
      const startPos = (containerHeight * 0.65) + (pairIndex * pairSpacing) + laneStagger;
      y.set(startPos);
      initialized.current = true;
    }

    const dt = Math.min(delta, 100) / 1000;
    
    let speedMultiplier = 1.0;
    if (isHovered.current || isDragging.current || isTouching.current) speedMultiplier = 0.15;
    if (prefersReducedMotion) speedMultiplier *= 0.05;
    
    let nextY = y.get() - (pxPerSecond.current * dt * speedMultiplier);
    
    if (nextY < -(cardHeight + margin)) {
      nextY += totalCycleLength;
      x.set(0); 
    }
    
    if (!isDragging.current) {
      y.set(nextY);
    }
  });

  return (
    <motion.div
      ref={cardRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={constraintsRef}
      onDragStart={() => { isDragging.current = true; updatePausedState(); }}
      onDragEnd={() => { isDragging.current = false; updatePausedState(); }}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') {
          isHovered.current = true;
          updatePausedState();
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') {
          isHovered.current = false;
          updatePausedState();
        }
      }}
      onPointerDown={() => { isTouching.current = true; updatePausedState(); }}
      onPointerUp={() => { isTouching.current = false; updatePausedState(); }}
      onPointerCancel={() => { isTouching.current = false; updatePausedState(); }}
      initial={{ rotate: initialRotate }}
      style={{ 
        left, 
        width, 
        position: 'absolute',
        x,
        y,
        zIndex: isPausedState ? 100 : 10,
        touchAction: 'none'
      }}
      className="cursor-grab active:cursor-grabbing select-none"
      whileHover={{ scale: 1.05, zIndex: 110 }}
    >
      <div className={`bg-white p-2 pb-10 shadow-2xl rounded-sm ${isPausedState ? 'scale-110 shadow-black/40' : 'shadow-black/20'}`}>
        <img 
          src={src} 
          className="w-full h-auto object-cover pointer-events-none" 
          alt="" 
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

function FloatingHeroSection({ isDarkMode, images }: { isDarkMode: boolean, images: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 14 slot configurations paired into Left + Right lanes so 2 images scroll together at a time
  const pairLaneConfigs = [
    // Pair 1
    { left: "6%", width: "clamp(135px, 38vw, 200px)", rotate: -6 },
    { left: "54%", width: "clamp(135px, 38vw, 200px)", rotate: 5 },
    // Pair 2
    { left: "8%", width: "clamp(135px, 38vw, 200px)", rotate: 4 },
    { left: "52%", width: "clamp(135px, 38vw, 200px)", rotate: -5 },
    // Pair 3
    { left: "5%", width: "clamp(135px, 38vw, 200px)", rotate: -4 },
    { left: "55%", width: "clamp(135px, 38vw, 200px)", rotate: 6 },
    // Pair 4
    { left: "9%", width: "clamp(135px, 38vw, 200px)", rotate: 5 },
    { left: "53%", width: "clamp(135px, 38vw, 200px)", rotate: -4 },
    // Pair 5
    { left: "7%", width: "clamp(135px, 38vw, 200px)", rotate: -5 },
    { left: "54%", width: "clamp(135px, 38vw, 200px)", rotate: 4 },
    // Pair 6
    { left: "6%", width: "clamp(135px, 38vw, 200px)", rotate: 6 },
    { left: "52%", width: "clamp(135px, 38vw, 200px)", rotate: -6 },
    // Pair 7
    { left: "8%", width: "clamp(135px, 38vw, 200px)", rotate: -4 },
    { left: "54%", width: "clamp(135px, 38vw, 200px)", rotate: 5 },
  ];

  const cappedImages = images.slice(0, 14);
  const totalPairs = Math.max(1, Math.ceil(cappedImages.length / 2));

  return (
    <section 
      ref={containerRef}
      className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-[65vh] sm:h-[80vh] overflow-hidden bg-[#0E6B75] mb-12 shadow-inner"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent)]" />
      </div>
      
      <div className="absolute inset-0 overflow-hidden">
        {cappedImages.map((src, i) => {
          const config = pairLaneConfigs[i % pairLaneConfigs.length];
          const pairIndex = Math.floor(i / 2);
          const isRightLane = i % 2 === 1;
          return (
            <FloatingPhotoCard 
              key={`${cappedImages.length}-${i}-${src}`} 
              src={src} 
              left={config.left} 
              width={config.width} 
              initialRotate={config.rotate} 
              pairIndex={pairIndex}
              totalPairs={totalPairs}
              isRightLane={isRightLane}
              constraintsRef={containerRef}
            />
          );
        })}
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[340px] z-[151] rounded-[28px] p-8 shadow-2xl text-center ${isDarkMode ? 'bg-[#13232A] border border-[#22363E]' : 'bg-white border border-[#DAD8E3]'}`}
          >
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
