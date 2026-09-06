import React, { useState, useMemo } from 'react';
import { Search, Sparkles, BookOpen, Trash2, Calendar, MessageSquare, BrainCircuit, X } from 'lucide-react';
import { JournalInteraction, ReflectionMode } from '../types';

interface HistorySidebarProps {
  entries: JournalInteraction[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalInteraction) => void;
  onDeleteRequest: (entry: JournalInteraction) => void;
  onNewEntry: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteRequest,
  onNewEntry,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | ReflectionMode>('all');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesFilter = activeFilter === 'all' || entry.mode === activeFilter;
      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = entry.title.toLowerCase().includes(q);
      const inSummary = entry.summary ? entry.summary.toLowerCase().includes(q) : false;
      const inTurns = entry.turns.some((t) => t.content.toLowerCase().includes(q));
      return inTitle || inSummary || inTurns;
    });
  }, [entries, searchQuery, activeFilter]);

  const getModeBadge = (mode: ReflectionMode) => {
    switch (mode) {
      case 'summary':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-2.5 h-2.5" />
            <span>Summary</span>
          </span>
        );
      case 'brainstorm':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <BrainCircuit className="w-2.5 h-2.5" />
            <span>Brainstorm</span>
          </span>
        );
      case 'reflection':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Reflection</span>
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/30 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      <aside
        id="history-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 max-w-[85vw] bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Journal History</h2>
            <p className="text-xs text-stone-500">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} saved in Firestore
            </p>
          </div>
          <button
            id="close-sidebar-mobile-button"
            onClick={onClose}
            className="md:hidden p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-stone-100">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries & reflections..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white text-stone-900 placeholder:text-stone-400 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div id="mode-filters" className="flex items-center space-x-1 mt-2.5 overflow-x-auto pb-1 text-[11px]">
            <button
              id="filter-all-button"
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-stone-900 text-white font-medium'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All
            </button>
            <button
              id="filter-reflection-button"
              onClick={() => setActiveFilter('reflection')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'reflection'
                  ? 'bg-purple-900 text-purple-50 font-medium'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Reflect
            </button>
            <button
              id="filter-summary-button"
              onClick={() => setActiveFilter('summary')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'summary'
                  ? 'bg-blue-900 text-blue-50 font-medium'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Summary
            </button>
            <button
              id="filter-brainstorm-button"
              onClick={() => setActiveFilter('brainstorm')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'brainstorm'
                  ? 'bg-amber-900 text-amber-50 font-medium'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Brainstorm
            </button>
          </div>
        </div>

        {/* Entries List */}
        <div id="entries-scroll-container" className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredEntries.length === 0 ? (
            <div id="no-entries-placeholder" className="h-48 flex flex-col items-center justify-center text-center p-4 text-stone-400">
              <BookOpen className="w-8 h-8 stroke-[1.5] mb-2 text-stone-300" />
              <p className="text-xs font-medium text-stone-600">No reflections found</p>
              <p className="text-[11px] text-stone-400 mt-1 max-w-[180px]">
                {entries.length === 0
                  ? 'Start by creating your first entry on the right.'
                  : 'Try adjusting your search query or filter.'}
              </p>
              {entries.length === 0 && (
                <button
                  id="empty-state-new-entry-button"
                  onClick={onNewEntry}
                  className="mt-3 text-xs font-medium text-stone-900 underline hover:text-stone-700 cursor-pointer"
                >
                  Write first reflection
                </button>
              )}
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = entry.id === selectedEntryId;
              const firstUserTurn = entry.turns.find((t) => t.role === 'user');
              const preview = firstUserTurn?.content || 'Empty entry';

              return (
                <div
                  key={entry.id}
                  id={`entry-card-${entry.id}`}
                  onClick={() => {
                    onSelectEntry(entry);
                    onClose(); // close on mobile
                  }}
                  className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-stone-50 border-stone-900/40 shadow-xs'
                      : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-stone-900 line-clamp-1 flex-1">
                      {entry.title || 'Untitled Reflection'}
                    </h3>
                    <button
                      id={`delete-entry-${entry.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(entry);
                      }}
                      title="Delete Entry"
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 p-1 rounded transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                    {preview}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                    <div className="flex items-center space-x-1.5">
                      {getModeBadge(entry.mode)}
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>{entry.turns.length}</span>
                      </span>
                    </div>

                    <span className="flex items-center space-x-1 font-mono text-stone-400">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{formatDate(entry.updatedAt)}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
