'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveUserProfile, getUserProfile, saveGoogleUserProfile } from '@/lib/firestoreService';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  storeName: string;
  plan: string;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password?: string, storeName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemoUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize Firebase Auth state changes with fallback timeout safety
  useEffect(() => {
    let resolved = false;

    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    }, 1200);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        let storeName = fbUser.displayName ? `${fbUser.displayName}'s Store` : 'AeroCraft Commerce';
        try {
          const profilePromise = getUserProfile(fbUser.uid);
          const profileTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 1000));
          const profile: any = await Promise.race([profilePromise, profileTimeout]);
          if (profile?.storeName) {
            storeName = profile.storeName;
          }
        } catch (e) {
          console.warn('Profile fetch timeout fallback used');
        }

        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Store Owner',
          photoURL: fbUser.photoURL || null,
          storeName,
          plan: 'Firebase Spark (Free Plan)',
        });
      } else {
        setUser(null);
      }

      if (!resolved) {
        resolved = true;
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password = 'password123') => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      await saveGoogleUserProfile({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
      });
    } catch (err: any) {
      throw err;
    }
  };

  const register = async (email: string, password = 'password123', storeName = 'My E-commerce Store') => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserProfile(cred.user.uid, email, storeName);
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        console.warn('Firebase Email Verification send warning:', e);
      }
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const loginDemoUser = () => {
    setUser({
      uid: 'demo-user-spark',
      email: 'demo@store.com',
      displayName: 'Demo Store Manager',
      storeName: 'AeroCraft Commerce (Demo)',
      plan: 'Firebase Spark (Free Plan)',
    });
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        loginWithGoogle,
        register,
        resetPassword,
        logout,
        loginDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
