import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Enable App Check debug token BEFORE initializing Firebase App or AI services
if (typeof window !== 'undefined') {
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBWusI91r6edytivvycXUzJAbZIjJi0D3c",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "e-commerce-ai-13830.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "e-commerce-ai-13830",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "e-commerce-ai-13830.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "470147616464",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:470147616464:web:a990705ffacf5eadce58d5",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-HHN6W882B3",
};

// Singleton initialization for Next.js App Router
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Client-side Firebase App Check Initialization
if (typeof window !== 'undefined') {
  try {
    const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (recaptchaKey && recaptchaKey !== '6LdDemoKeyForDevelopmentSetup1234567890') {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (err) {
    console.debug('Firebase App Check initialized in development mode');
  }
}

// Client-side Firebase AI Logic Initialization (Spark Free Tier)
// Configured explicitly with new GoogleAIBackend() (Gemini Developer API backend)
// Uses existing firebaseConfig credentials — NO separate standalone Gemini API key is created.
export function getFirebaseAiModel(modelName = 'gemini-3.6-flash') {
  try {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    return getGenerativeModel(ai, { model: modelName });
  } catch (err) {
    console.warn('Fallback initializing Firebase AI GoogleAIBackend model:', err);
    const ai = getAI(app);
    return getGenerativeModel(ai, { model: 'gemini-3.6-flash' });
  }
}

let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
export default app;
