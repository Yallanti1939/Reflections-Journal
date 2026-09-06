import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  BookOpen,
  BrainCircuit,
  Wand2,
  Copy,
  Check,
  RotateCcw,
  Clock,
  User as UserIcon,
  Bot,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { JournalInteraction, ReflectionMode, Turn } from '../types';
import { sendReflectionRequest, generateAutoTitle } from '../lib/geminiApi';
import { saveInteractionToFirestore } from '../lib/firebase';

interface JournalWorkspaceProps {
  user: User;
  activeEntry: JournalInteraction | null;
  onEntrySaved: (entry: JournalInteraction) => void;
  onNewEntry: () => void;
}

const PROMPT_SUGGESTIONS = [
  {
    title: 'Cognitive Reset',
    mode: 'reflection' as ReflectionMode,
    text: 'What situation caused me friction today, what assumptions did I make, and how might another person view the exact same moment?',
  },
  {
    title: 'Weekly Synthesis',
    mode: 'summary' as ReflectionMode,
    text: 'Here are the key things I worked through this week: 1) handled unexpected team changes, 2) completed major milestone under pressure, 3) felt overwhelmed on Thursday. Help me summarize the core lessons and emotional trajectory.',
  },
  {
    title: 'Creative Brainstorm',
    mode: 'brainstorm' as ReflectionMode,
    text: 'I am struggling to find consistent focus between deep technical work and reactive meetings. Brainstorm 4 distinct habits or schedule frameworks I could experiment with next week.',
  },
];

export const JournalWorkspace: React.FC<JournalWorkspaceProps> = ({
  user,
  activeEntry,
  onEntrySaved,
  onNewEntry,
}) => {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<ReflectionMode>('reflection');
  const [inputContent, setInputContent] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [errorNotice, setErrorNotice] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);

  const turnsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state whenever activeEntry changes
  useEffect(() => {
    if (activeEntry) {
      setTitle(activeEntry.title || '');
      setMode(activeEntry.mode || 'reflection');
      setTurns(activeEntry.turns || []);
      setErrorNotice(null);
    } else {
      // Clean slate for new entry
      setTitle('Personal Reflection');
      setMode('reflection');
      setTurns([]);
      setInputContent('');
      setErrorNotice(null);
      setLastModelUsed(null);
    }
  }, [activeEntry]);

  // Scroll to bottom of conversation feed on new turn
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isSubmitting]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTurnId(id);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  const handleAutoTitle = async () => {
    const textSample = turns[0]?.content || inputContent;
    if (!textSample.trim()) return;

    setIsGeneratingTitle(true);
    try {
      const generated = await generateAutoTitle(textSample);
      setTitle(generated);
      if (activeEntry) {
        const updated: JournalInteraction = {
          ...activeEntry,
          title: generated,
          updatedAt: new Date().toISOString(),
        };
        await saveInteractionToFirestore(user.uid, updated);
        onEntrySaved(updated);
      }
    } catch (err) {
      console.error('Auto title failed:', err);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // Submit new reflection turn
  const handleSubmitTurn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = inputContent.trim();
    if (!cleanInput || isSubmitting) return;

    setErrorNotice(null);
    setIsSubmitting(true);
    setSubmittingStep('Consulting Gemini 3.6 Flash...');

    const timestamp = new Date().toISOString();
    const newUserTurn: Turn = {
      id: `turn-user-${Date.now()}`,
      role: 'user',
      content: cleanInput,
      timestamp,
    };

    // Prepare updated turns history
    const historyPayload = turns.map((t) => ({
      role: t.role,
      content: t.content,
    }));

    try {
      // 1. Call Gemini with resilient server-side fallback
      const aiResponse = await sendReflectionRequest({
        prompt: cleanInput,
        mode,
        history: historyPayload,
        title: title || 'Personal Reflection',
      });

      setLastModelUsed(aiResponse.modelUsed);
      setSubmittingStep('Persisting to Cloud Firestore...');

      const newModelTurn: Turn = {
        id: `turn-model-${Date.now() + 1}`,
        role: 'model',
        content: aiResponse.reply,
        timestamp: new Date().toISOString(),
      };

      const nextTurns = [...turns, newUserTurn, newModelTurn];

      // Auto-generate title if this is the first turn and title is default
      let effectiveTitle = title;
      if ((!title || title === 'Personal Reflection') && turns.length === 0) {
        effectiveTitle = cleanInput.slice(0, 45) + (cleanInput.length > 45 ? '...' : '');
      }

      const interactionId = activeEntry?.id || `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const interactionRecord: JournalInteraction = {
        id: interactionId,
        userId: user.uid,
        title: effectiveTitle,
        mode,
        turns: nextTurns,
        summary: mode === 'summary' ? aiResponse.reply : activeEntry?.summary,
        createdAt: activeEntry?.createdAt || timestamp,
        updatedAt: new Date().toISOString(),
      };

      // 2. Guaranteed Transaction Verification: persist to Firestore
      await saveInteractionToFirestore(user.uid, interactionRecord);

      // 3. Only clear user input buffer AFTER successful write to Firestore
      setInputContent('');
      setTurns(nextTurns);
      setTitle(effectiveTitle);
      onEntrySaved(interactionRecord);
    } catch (err: any) {
      console.error('Submission or persistence error:', err);
      // Retain the user input buffer as required by directives!
      setErrorNotice({
        message: err?.message || 'Failed to complete transaction with Gemini/Firestore.',
        canRetry: true,
      });
    } finally {
      setIsSubmitting(false);
      setSubmittingStep(null);
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    if (activeEntry && newTitle.trim()) {
      try {
        const updated: JournalInteraction = {
          ...activeEntry,
          title: newTitle.trim(),
          updatedAt: new Date().toISOString(),
        };
        await saveInteractionToFirestore(user.uid, updated);
        onEntrySaved(updated);
      } catch (err) {
        console.error('Error auto-saving title:', err);
      }
    }
  };

  return (
    <main
      id="journal-workspace-container"
      className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-stone-50/50"
    >
      {/* Top Entry Metadata Bar */}
      <div
        id="workspace-meta-bar"
        className="px-6 py-3 border-b border-stone-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <input
            id="entry-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleTitleChange(title)}
            placeholder="Title your reflection..."
            className="text-base font-semibold text-stone-900 bg-transparent hover:bg-stone-50 focus:bg-white px-2 py-1 rounded-lg border border-transparent focus:border-stone-300 focus:outline-none transition-all w-full max-w-md truncate"
          />

          {(turns.length > 0 || inputContent.trim().length > 10) && (
            <button
              id="auto-title-button"
              onClick={handleAutoTitle}
              disabled={isGeneratingTitle}
              title="Generate poetic title with Gemini"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            >
              <Wand2 className={`w-4 h-4 ${isGeneratingTitle ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div
          id="workspace-mode-selector"
          className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200/80 text-xs"
        >
          <button
            id="mode-tab-reflection"
            type="button"
            onClick={() => setMode('reflection')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              mode === 'reflection'
                ? 'bg-white text-stone-900 font-medium shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Reflect</span>
          </button>
          <button
            id="mode-tab-summary"
            type="button"
            onClick={() => setMode('summary')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              mode === 'summary'
                ? 'bg-white text-stone-900 font-medium shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Summarize</span>
          </button>
          <button
            id="mode-tab-brainstorm"
            type="button"
            onClick={() => setMode('brainstorm')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              mode === 'brainstorm'
                ? 'bg-white text-stone-900 font-medium shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-amber-600" />
            <span>Brainstorm</span>
          </button>
        </div>
      </div>

      {/* Error & Retry Banner (Transaction integrity guarantee) */}
      {errorNotice && (
        <div
          id="workspace-error-banner"
          className="mx-6 mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800 shrink-0"
        >
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold">Persistence / Generation Notice</p>
              <p className="text-rose-700">{errorNotice.message}</p>
            </div>
          </div>
          {errorNotice.canRetry && (
            <button
              id="retry-save-button"
              onClick={() => handleSubmitTurn()}
              className="inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs transition-colors shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry Save</span>
            </button>
          )}
        </div>
      )}

      {/* Main Conversation Thread Feed */}
      <div id="thread-feed-container" className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {turns.length === 0 ? (
          <div id="thread-empty-state" className="max-w-2xl mx-auto py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-serif text-stone-900 font-medium">
              Begin a thoughtful reflection
            </h2>
            <p className="text-xs text-stone-600 mt-1.5 max-w-md mx-auto leading-relaxed">
              Write about your challenges, achievements, or state of mind. Gemini 3.6 Flash will
              respond with insightful questions, summaries, or brainstorming ideas.
            </p>

            {/* Prompt Starters */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
              {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  id={`prompt-suggestion-${idx}`}
                  type="button"
                  onClick={() => {
                    setInputContent(suggestion.text);
                    setMode(suggestion.mode);
                    textareaRef.current?.focus();
                  }}
                  className="p-3.5 rounded-xl bg-white border border-stone-200 hover:border-stone-400 hover:shadow-xs text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-1.5 text-[11px] font-medium text-stone-700 mb-1.5">
                    <Lightbulb className="w-3 h-3 text-amber-500" />
                    <span>{suggestion.title}</span>
                  </div>
                  <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed group-hover:text-stone-900">
                    {suggestion.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div id="turns-history-stream" className="max-w-3xl mx-auto space-y-5">
            {turns.map((turn, index) => {
              const isUser = turn.role === 'user';
              return (
                <div
                  key={turn.id || index}
                  id={`turn-bubble-${turn.id || index}`}
                  className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Bot className="w-4 h-4 text-amber-300" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 sm:p-5 max-w-[85%] sm:max-w-[78%] leading-relaxed ${
                      isUser
                        ? 'bg-stone-900 text-stone-100 shadow-sm'
                        : 'bg-white border border-stone-200/90 text-stone-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200/30 text-[11px]">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-stone-400">
                          {isUser ? 'You' : 'Gemini 3.6 Flash'}
                        </span>
                        {!isUser && lastModelUsed && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                            {lastModelUsed}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="flex items-center space-x-1 text-stone-400 font-mono text-[10px]">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {new Date(turn.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                        <button
                          id={`copy-turn-${turn.id}`}
                          onClick={() => handleCopy(turn.content, turn.id)}
                          title="Copy text"
                          className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-white/10 transition-colors"
                        >
                          {copiedTurnId === turn.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm whitespace-pre-wrap font-sans">
                      {turn.content}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submitting Loading Indicator */}
            {isSubmitting && (
              <div id="submitting-spinner-row" className="flex items-start space-x-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
                  <span className="text-xs text-stone-600 font-medium">
                    {submittingStep || 'Processing with Gemini 3.6 Flash...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={turnsEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Composer Bar */}
      <div
        id="journal-composer-wrapper"
        className="p-4 sm:px-6 bg-white border-t border-stone-200 shrink-0"
      >
        <form
          id="journal-turn-form"
          onSubmit={handleSubmitTurn}
          className="max-w-3xl mx-auto flex flex-col space-y-2.5"
        >
          <div className="relative rounded-xl border border-stone-300 focus-within:border-stone-800 focus-within:ring-1 focus-within:ring-stone-800 bg-white transition-all shadow-xs">
            <textarea
              ref={textareaRef}
              id="reflection-input-textarea"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmitTurn();
                }
              }}
              placeholder={
                mode === 'summary'
                  ? 'Paste or write your notes to summarize key points...'
                  : mode === 'brainstorm'
                  ? 'Describe your project or dilemma to brainstorm ideas...'
                  : 'Write your thoughts, feelings, or questions for reflection...'
              }
              rows={3}
              maxLength={8000}
              className="w-full p-3.5 text-xs sm:text-sm text-stone-900 bg-transparent placeholder:text-stone-400 focus:outline-none resize-none leading-relaxed"
            />

            <div className="px-3 py-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
              <div className="flex items-center space-x-2">
                <span>{inputContent.length} / 8000 chars</span>
                <span className="hidden sm:inline text-stone-300">•</span>
                <span className="hidden sm:inline">Press ⌘+Enter to submit</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="submit-turn-button"
                  type="submit"
                  disabled={!inputContent.trim() || isSubmitting}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-medium text-xs transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'summary'
                          ? 'Summarize'
                          : mode === 'brainstorm'
                          ? 'Brainstorm'
                          : 'Reflect'}
                      </span>
                      <Send className="w-3 h-3 text-amber-300" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
};
