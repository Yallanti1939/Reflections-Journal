import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, subscribeUserInteractions, deleteInteractionFromFirestore } from './lib/firebase';
import { JournalInteraction } from './types';
import { AuthLanding } from './components/AuthLanding';
import { Header } from './components/Header';
import { HistorySidebar } from './components/HistorySidebar';
import { JournalWorkspace } from './components/JournalWorkspace';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [entries, setEntries] = useState<JournalInteraction[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<JournalInteraction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore entries only when authenticated
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setSelectedEntryId(null);
      return;
    }

    const unsubscribe = subscribeUserInteractions(
      user.uid,
      (updatedEntries) => {
        setEntries(updatedEntries);
      },
      (error) => {
        console.error('Realtime Firestore subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Derived active entry
  const activeEntry = entries.find((e) => e.id === selectedEntryId) || null;

  const handleSelectEntry = (entry: JournalInteraction) => {
    setSelectedEntryId(entry.id);
  };

  const handleNewEntry = () => {
    setSelectedEntryId(null);
  };

  const handleEntrySaved = (savedEntry: JournalInteraction) => {
    setSelectedEntryId(savedEntry.id);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || !user) return;
    setIsDeleting(true);
    try {
      await deleteInteractionFromFirestore(user.uid, entryToDelete.id);
      if (selectedEntryId === entryToDelete.id) {
        setSelectedEntryId(null);
      }
      setEntryToDelete(null);
    } catch (err) {
      console.error('Failed to delete entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading Screen while Firebase Auth initializes
  if (!isAuthReady) {
    return (
      <div id="auth-loading-screen" className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
          <span className="text-xs text-stone-500 font-medium">Connecting to Reflections...</span>
        </div>
      </div>
    );
  }

  // 1. Landing View for unauthenticated users
  if (!user) {
    return <AuthLanding onLoginSuccess={() => {}} />;
  }

  // 2. Authenticated Private Dashboard
  return (
    <div id="dashboard-app-view" className="min-h-screen bg-white text-stone-900 flex flex-col font-sans">
      <Header
        user={user}
        onNewEntry={handleNewEntry}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      <div id="dashboard-body-container" className="flex-1 flex overflow-hidden relative">
        <HistorySidebar
          entries={entries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={handleSelectEntry}
          onDeleteRequest={(entry) => setEntryToDelete(entry)}
          onNewEntry={handleNewEntry}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <JournalWorkspace
          user={user}
          activeEntry={activeEntry}
          onEntrySaved={handleEntrySaved}
          onNewEntry={handleNewEntry}
        />
      </div>

      <DeleteConfirmModal
        entry={entryToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setEntryToDelete(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
