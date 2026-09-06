import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { JournalInteraction } from '../types';

interface DeleteConfirmModalProps {
  entry: JournalInteraction | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  entry,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  if (!entry) return null;

  return (
    <div
      id="delete-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="delete-modal-dialog"
        className="bg-white w-full max-w-md rounded-2xl border border-stone-200 shadow-xl p-6 relative animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          id="delete-modal-close-btn"
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">Delete Reflection?</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              This will permanently remove{' '}
              <strong className="text-stone-900 font-medium">"{entry.title}"</strong> and all its
              multi-turn exchanges from your private Firestore database. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-2.5">
          <button
            id="delete-modal-cancel-btn"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium rounded-lg text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="delete-modal-confirm-btn"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition-all shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
