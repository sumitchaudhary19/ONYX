import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Loader2, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@mnit.ac.in')) {
      setError('Please enter a valid @mnit.ac.in email address.');
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (resetError) {
      setError('Something went wrong. Please try again.');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f172a]/95 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl backdrop-blur-xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 border border-white/20 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                <Mail className="w-7 h-7 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Reset Password</h3>
              <p className="text-sm text-white/50 mb-6">
                Enter your MNIT email and we'll send you a secure link to reset your password.
              </p>

              <form onSubmit={handleSubmit} autoComplete="on">
                <input
                  type="email"
                  placeholder="your.name@mnit.ac.in"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoComplete="username"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 transition-colors text-sm"
                />

                {error && (
                  <p className="text-rose-400 text-xs mt-2 font-medium animate-pulse">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full mt-5 py-3.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] text-sm"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-6"
              >
                <Check className="w-8 h-8 text-emerald-400" />
              </motion.div>

              <h3 className="text-xl font-bold text-white mb-2">Check Your Inbox</h3>
              <p className="text-sm text-white/50 mb-6">
                We've sent a password reset link to <span className="text-white font-medium">{email}</span>. 
                Click the link in the email to set a new password.
              </p>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-all text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
