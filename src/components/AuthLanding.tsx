import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, ShieldCheck, Sparkles, Lock, ArrowRight, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';

interface AuthLandingProps {
  onLoginSuccess: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      // Friendly message for popup closed or canceled
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed. Please click below to try again.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        setError('Popup request was replaced. Please try once more.');
      } else {
        setError(err?.message || 'Authentication encountered an issue. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-landing-view" className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between selection:bg-stone-200">
      {/* Top Bar */}
      <header id="landing-header" className="w-full border-b border-stone-200/80 bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-stone-900">Reflections</h1>
            <p className="text-xs text-stone-500">Mindful Journaling with Gemini</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-medium text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero-Trust Firestore Security</span>
        </div>
      </header>

      {/* Main Hero Card */}
      <main id="landing-main-content" className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col justify-center items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-8 md:p-12 text-center"
        >
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Powered by Gemini 3.6 Flash & Cloud Firestore</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight leading-tight max-w-2xl mx-auto">
            A private space for your thoughts, examined with clarity.
          </h2>

          <p className="mt-4 text-stone-600 text-base max-w-xl mx-auto leading-relaxed">
            Write reflective journal entries, engage in deep multi-turn dialogue with Gemini, synthesize key takeaways, and brainstorm solutions in complete privacy.
          </p>

          {/* Error notice */}
          {error && (
            <div id="auth-error-banner" className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm max-w-md mx-auto text-left flex items-start space-x-2">
              <span className="font-medium">Notice:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Sign In CTA */}
          <div className="mt-8 flex flex-col items-center justify-center space-y-3">
            <button
              id="google-signin-button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full sm:w-auto min-w-[260px] h-12 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white font-medium text-sm flex items-center justify-center space-x-3 transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  {/* Google G vector logo */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </>
              )}
            </button>
            <p className="text-xs text-stone-400">Passwordless authentication via Firebase Auth</p>
          </div>

          {/* Three Feature Pillars */}
          <div className="mt-12 pt-8 border-t border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div id="feature-pillar-isolation" className="p-4 rounded-xl bg-stone-50/80 border border-stone-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900">User Data Isolation</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Entries are secured under owner-bound paths in Cloud Firestore. No other user can ever query or read your thoughts.
              </p>
            </div>

            <div id="feature-pillar-multiturn" className="p-4 rounded-xl bg-stone-50/80 border border-stone-100">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-3">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900">Multi-Turn Dialogue</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Converse continuously on any entry. Gemini preserves context to challenge assumptions and ask clarifying questions.
              </p>
            </div>

            <div id="feature-pillar-modes" className="p-4 rounded-xl bg-stone-50/80 border border-stone-100">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900">Reflect, Summarize, Solve</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Toggle seamlessly between empathetic introspection, executive key-takeaway summaries, and creative brainstorming.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer id="landing-footer" className="w-full border-t border-stone-200/80 bg-white/60 py-4 px-6 text-center text-xs text-stone-500">
        <div className="flex items-center justify-center space-x-4">
          <span className="flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict Firestore Rules Deployed</span>
          </span>
          <span>•</span>
          <span>Server-Side Gemini API Proxy</span>
          <span>•</span>
          <span>Google Cloud Run Ready</span>
        </div>
      </footer>
    </div>
  );
};
