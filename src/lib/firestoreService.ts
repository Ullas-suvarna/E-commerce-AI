import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ReturnRecord, ProductSummary, ReturnPattern } from './types';
import { INITIAL_RETURNS, INITIAL_PRODUCTS, INITIAL_PATTERNS } from './mockData';

export interface UserProfileData {
  uid: string;
  email: string | null;
  name?: string | null;
  photoURL?: string | null;
  storeName?: string;
  createdAt?: any;
  lastLoginAt?: any;
}

// User Profile Services (/users/{userId})
export async function saveUserProfile(uid: string, email: string, storeName: string) {
  try {
    const userRef = doc(db, 'users', uid);
    const profileData: UserProfileData = {
      uid,
      email,
      name: email.split('@')[0] || 'Store Owner',
      storeName,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(userRef, profileData, { merge: true });
    return profileData;
  } catch (err) {
    return { uid, email, storeName };
  }
}

export async function saveGoogleUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const exists = snap.exists();

    const name = user.displayName || user.email?.split('@')[0] || 'Store Owner';

    const profileData: Record<string, any> = {
      uid: user.uid,
      name,
      email: user.email || '',
      photoURL: user.photoURL || null,
      lastLoginAt: serverTimestamp(),
    };

    if (!exists) {
      profileData.storeName = `${name}'s Store`;
      profileData.createdAt = serverTimestamp();
    }

    await setDoc(userRef, profileData, { merge: true });
    return profileData;
  } catch (err) {
    console.warn('saveGoogleUserProfile Firestore error:', err);
    return null;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
  } catch (err) {
    return null;
  }
  return null;
}

// Returns Subcollection Services (/users/{userId}/returns/{returnId})
export function subscribeToUserReturns(
  uid: string,
  onSuccess: (returns: ReturnRecord[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const returnsCol = collection(db, 'users', uid, 'returns');
    const q = query(returnsCol, orderBy('returnDate', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const records: ReturnRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({
            ...(docSnap.data() as ReturnRecord),
            id: docSnap.id,
          });
        });
        onSuccess(records);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

export async function addFirestoreReturn(uid: string, record: Omit<ReturnRecord, 'id'> & { id?: string }) {
  const customId = record.id || `RET-${Math.floor(1000 + Math.random() * 9000)}`;
  const userDocRef = doc(db, 'users', uid || 'demo-user-spark', 'returns', customId);

  const payload = {
    ...record,
    id: customId,
    uid: uid || 'demo-user-spark',
    createdAt: serverTimestamp(),
  };

  await setDoc(userDocRef, payload, { merge: true });
  return customId;
}

export async function updateFirestoreReturn(uid: string, returnId: string, updatedData: Partial<ReturnRecord>) {
  const userDocRef = doc(db, 'users', uid || 'demo-user-spark', 'returns', returnId);

  const payload = {
    ...updatedData,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(userDocRef, payload, { merge: true });
  } catch (e) {
    try {
      await updateDoc(userDocRef, payload);
    } catch (err) {}
  }
}

// Batch Import Return Records from CSV with custom Document IDs matching returnId
export async function batchImportFirestoreReturns(
  uid: string,
  records: ReturnRecord[],
  onProgress?: (progress: number) => void
) {
  const userReturnsCol = collection(db, 'users', uid || 'demo-user-spark', 'returns');
  const chunkSize = 50;
  let processed = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((rec) => {
      const userDocRef = doc(userReturnsCol, rec.id);

      const payload = {
        ...rec,
        uid: uid || 'demo-user-spark',
        createdAt: serverTimestamp(),
      };

      batch.set(userDocRef, payload, { merge: true });
    });

    await batch.commit();
    processed += chunk.length;
    if (onProgress) {
      onProgress(Math.round((processed / records.length) * 100));
    }
  }

  return records.length;
}

export async function deleteFirestoreReturn(uid: string, returnId: string) {
  const userDocRef = doc(db, 'users', uid || 'demo-user-spark', 'returns', returnId);
  await deleteDoc(userDocRef);
}

export async function clearAllFirestoreReturns(uid: string) {
  try {
    const userReturnsCol = collection(db, 'users', uid || 'demo-user-spark', 'returns');
    const snap = await getDocs(userReturnsCol);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch (e) {}
}

// Products Subcollection Services (/users/{userId}/products/{productId})
export function subscribeToUserProducts(
  uid: string,
  onSuccess: (products: ProductSummary[]) => void
) {
  try {
    const productsCol = collection(db, 'users', uid, 'products');
    return onSnapshot(
      productsCol,
      (snapshot) => {
        const prods: ProductSummary[] = [];
        snapshot.forEach((docSnap) => {
          prods.push(docSnap.data() as ProductSummary);
        });
        onSuccess(prods);
      },
      () => {}
    );
  } catch (e) {
    return () => {};
  }
}

// AI Patterns Subcollection Services (/users/{userId}/patterns/{patternId})
export function subscribeToUserPatterns(
  uid: string,
  onSuccess: (patterns: ReturnPattern[]) => void
) {
  try {
    const patternsCol = collection(db, 'users', uid, 'patterns');
    return onSnapshot(
      patternsCol,
      (snapshot) => {
        const pats: ReturnPattern[] = [];
        snapshot.forEach((docSnap) => {
          pats.push(docSnap.data() as ReturnPattern);
        });
        onSuccess(pats);
      },
      () => {}
    );
  } catch (e) {
    return () => {};
  }
}

// Seed initial sample data into Firestore if user database is newly created
export async function seedInitialUserDataIfEmpty(uid: string) {
  try {
    const returnsCol = collection(db, 'users', uid, 'returns');
    const snap = await getDocs(returnsCol);

    if (snap.empty) {
      const batch = writeBatch(db);
      INITIAL_RETURNS.forEach((ret) => {
        const newDocRef = doc(returnsCol, ret.id);
        batch.set(newDocRef, {
          ...ret,
          createdAt: serverTimestamp(),
        });
      });

      const productsCol = collection(db, 'users', uid, 'products');
      INITIAL_PRODUCTS.forEach((prod) => {
        const newDocRef = doc(productsCol, prod.sku);
        batch.set(newDocRef, prod);
      });

      const patternsCol = collection(db, 'users', uid, 'patterns');
      INITIAL_PATTERNS.forEach((pat) => {
        const newDocRef = doc(patternsCol, pat.id);
        batch.set(newDocRef, pat);
      });

      await batch.commit();
    }
  } catch (err) {
    // Suppress console error if Firestore rules reject unauthenticated write
  }
}

// Complaint Screening Subcollection Services (/users/{userId}/complaintScreening/{screeningId})
export async function saveFirestoreScreeningRecord(uid: string, record: any) {
  try {
    const docRef = doc(db, 'users', uid || 'demo-user-spark', 'complaintScreening', record.id);
    await setDoc(docRef, { ...record, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    // Non-fatal if offline or demo
  }
}

export async function batchSaveFirestoreScreenings(uid: string, records: any[]) {
  try {
    const batch = writeBatch(db);
    const colRef = collection(db, 'users', uid || 'demo-user-spark', 'complaintScreening');
    records.slice(0, 450).forEach((rec) => {
      const docRef = doc(colRef, rec.id);
      batch.set(docRef, { ...rec, updatedAt: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    // Non-fatal if offline or demo
  }
}

export async function deleteFirestoreScreeningRecord(uid: string, screeningId: string) {
  try {
    const docRef = doc(db, 'users', uid || 'demo-user-spark', 'complaintScreening', screeningId);
    await deleteDoc(docRef);
  } catch (err) {
    // Non-fatal if offline or demo
  }
}

// Rejected Complaints Subcollection Services (/users/{userId}/rejectedComplaints/{rejectedId})
export async function saveFirestoreRejectedComplaint(uid: string, record: any) {
  try {
    const docRef = doc(db, 'users', uid || 'demo-user-spark', 'rejectedComplaints', record.id);
    await setDoc(docRef, { ...record, rejectedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    // Non-fatal if offline or demo
  }
}

export async function deleteFirestoreRejectedComplaint(uid: string, rejectedId: string) {
  try {
    const docRef = doc(db, 'users', uid || 'demo-user-spark', 'rejectedComplaints', rejectedId);
    await deleteDoc(docRef);
  } catch (err) {
    // Non-fatal if offline or demo
  }
}

export function subscribeToUserRejectedComplaints(
  uid: string,
  onSuccess: (rejected: any[]) => void
) {
  try {
    const colRef = collection(db, 'users', uid || 'demo-user-spark', 'rejectedComplaints');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const rejected: any[] = [];
        snapshot.forEach((docSnap) => {
          rejected.push(docSnap.data());
        });
        onSuccess(rejected);
      },
      () => {}
    );
  } catch (e) {
    return () => {};
  }
}

export async function getFirestoreRejectedComplaints(uid: string): Promise<any[]> {
  try {
    const colRef = collection(db, 'users', uid || 'demo-user-spark', 'rejectedComplaints');
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach((docSnap) => list.push(docSnap.data()));
    return list;
  } catch (e) {
    return [];
  }
}

export function subscribeToUserScreenings(
  uid: string,
  onSuccess: (screenings: any[]) => void
) {
  try {
    const colRef = collection(db, 'users', uid || 'demo-user-spark', 'complaintScreening');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const screenings: any[] = [];
        snapshot.forEach((docSnap) => {
          screenings.push(docSnap.data());
        });
        onSuccess(screenings);
      },
      () => {}
    );
  } catch (e) {
    return () => {};
  }
}

export async function saveFirestoreCompanyRules(uid: string, rules: any[]) {
  try {
    const docRef = doc(db, 'users', uid || 'demo-user-spark', 'companyRules', 'config');
    await setDoc(docRef, { rules, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {}
}

export async function getFirestoreCompanyRules(uid: string): Promise<any[] | null> {
  try {
    const docRef = doc(db, 'users', uid || 'demo-user-spark', 'companyRules', 'config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return (snap.data()?.rules as any[]) || null;
    }
  } catch (err) {}
  return null;
}
