import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalInteraction, OperationType, FirestoreErrorInfo } from '../types';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// CRITICAL CONSTRAINT: Test connection on boot
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
export function stripUndefined<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

// Persist an entire interaction document
export async function saveInteractionToFirestore(
  userId: string,
  interaction: JournalInteraction
): Promise<void> {
  if (!userId) {
    throw new Error('User must be authenticated to save interactions.');
  }

  const docPath = `users/${userId}/interactions/${interaction.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'interactions', interaction.id);
    const sanitizedPayload = stripUndefined({
      id: interaction.id,
      userId: interaction.userId || userId,
      title: interaction.title.slice(0, 200),
      mode: interaction.mode,
      turns: interaction.turns.map((t) => ({
        id: t.id,
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
      })),
      summary: interaction.summary ? interaction.summary.slice(0, 5000) : null,
      tags: interaction.tags || [],
      createdAt: interaction.createdAt,
      updatedAt: interaction.updatedAt || new Date().toISOString(),
    });

    await setDoc(docRef, sanitizedPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// Delete an interaction document
export async function deleteInteractionFromFirestore(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId) throw new Error('User must be authenticated.');
  const docPath = `users/${userId}/interactions/${interactionId}`;
  try {
    const docRef = doc(db, 'users', userId, 'interactions', interactionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// Real-time subscription to user interactions
export function subscribeUserInteractions(
  userId: string,
  onUpdate: (items: JournalInteraction[]) => void,
  onError: (error: FirestoreErrorInfo) => void
): Unsubscribe {
  const collectionPath = `users/${userId}/interactions`;
  const collRef = collection(db, 'users', userId, 'interactions');
  const q = query(collRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: JournalInteraction[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: data.id || d.id,
          userId: data.userId || userId,
          title: data.title || 'Untitled Reflection',
          mode: data.mode || 'reflection',
          turns: Array.isArray(data.turns) ? data.turns : [],
          summary: data.summary || undefined,
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, collectionPath);
      } catch (err: any) {
        try {
          const parsed = JSON.parse(err.message) as FirestoreErrorInfo;
          onError(parsed);
        } catch {
          onError({
            error: err.message,
            operationType: OperationType.GET,
            path: collectionPath,
            authInfo: {},
          });
        }
      }
    }
  );
}
