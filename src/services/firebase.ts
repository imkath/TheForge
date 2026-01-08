import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { config } from '@/config';
import type { MicroSaaSIdea, ForgeUser } from '@/types';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Initialize Firebase
export function initializeFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!app) {
    app = initializeApp(config.firebase);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth: auth!, db: db! };
}

// Get Firestore path for user data (isolation per user as per info.txt)
function getUserPath(userId: string): string {
  return `artifacts/${config.app.id}/users/${userId}`;
}

// Auth Service
export const authService = {
  async signIn(): Promise<ForgeUser> {
    const { auth } = initializeFirebase();
    const credential = await signInAnonymously(auth);
    return {
      uid: credential.user.uid,
      isAnonymous: credential.user.isAnonymous,
      createdAt: Date.now(),
    };
  },

  onAuthChange(callback: (user: ForgeUser | null) => void): Unsubscribe {
    const { auth } = initializeFirebase();
    return onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        callback({
          uid: firebaseUser.uid,
          isAnonymous: firebaseUser.isAnonymous,
        });
      } else {
        callback(null);
      }
    });
  },

  getCurrentUser(): ForgeUser | null {
    const { auth } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) return null;
    return {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
    };
  },
};

// Ideas (Vault) Service
export const vaultService = {
  // Subscribe to saved ideas (real-time sync as per info.txt)
  subscribeToIdeas(
    userId: string,
    callback: (ideas: MicroSaaSIdea[]) => void
  ): Unsubscribe {
    const { db } = initializeFirebase();
    const ideasRef = collection(db, getUserPath(userId), 'saved_ideas');
    const q = query(ideasRef, orderBy('timestamp', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const ideas = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MicroSaaSIdea[];
      callback(ideas);
    }, (error) => {
      console.error('Firestore subscription error:', error);
    });
  },

  // Save idea to vault
  async saveIdea(userId: string, idea: Omit<MicroSaaSIdea, 'id'>): Promise<string> {
    const { db } = initializeFirebase();
    const ideasRef = collection(db, getUserPath(userId), 'saved_ideas');
    const docRef = await addDoc(ideasRef, {
      ...idea,
      timestamp: Date.now(),
    });
    return docRef.id;
  },

  // Delete idea from vault
  async deleteIdea(userId: string, ideaId: string): Promise<void> {
    const { db } = initializeFirebase();
    const ideaRef = doc(db, getUserPath(userId), 'saved_ideas', ideaId);
    await deleteDoc(ideaRef);
  },

  // Update idea (for validation status, UVP, etc.)
  async updateIdea(
    userId: string,
    ideaId: string,
    updates: Partial<MicroSaaSIdea>
  ): Promise<void> {
    const { db } = initializeFirebase();
    const ideaRef = doc(db, getUserPath(userId), 'saved_ideas', ideaId);
    await updateDoc(ideaRef, updates);
  },
};

// Hunting Sessions Service
export const sessionService = {
  async saveSession(
    userId: string,
    session: {
      verticals: string[];
      ideasFound: number;
      status: 'completed' | 'failed';
    }
  ): Promise<string> {
    const { db } = initializeFirebase();
    const sessionsRef = collection(db, getUserPath(userId), 'hunting_sessions');
    const docRef = await addDoc(sessionsRef, {
      ...session,
      completedAt: Date.now(),
    });
    return docRef.id;
  },
};
