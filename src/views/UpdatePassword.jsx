import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
];

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isPasswordStrong = PASSWORD_REGEX.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong) {
      setError('Password does not meet the strength requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'Failed to update password. Please try again.');
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/chat'), 2000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#060b18] flex items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-6"
          >
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Password Updated!</h2>
          <p className="text-white/50 text-sm">Redirecting you to ONYX...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b18] flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 border border-white/20 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
          <Lock className="w-7 h-7 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Set New Password</h1>
        <p className="text-sm text-white/50 mb-8">Choose a strong password for your ONYX account.</p>

        <form onSubmit={handleSubmit} autoComplete="on">
          {/* New Password */}
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete="new-password"
              required
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/70 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Rules */}
          {password.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-4 space-y-1.5 overflow-hidden"
            >
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password);
                return (
                  <div key={rule.label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-white/5 border border-white/10'}`}>
                      {passed && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                    </div>
                    <span className={`text-xs ${passed ? 'text-emerald-400' : 'text-white/40'}`}>{rule.label}</span>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Confirm Password */}
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              autoComplete="new-password"
              required
              className={`w-full bg-black/50 border rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none transition-colors text-sm ${
                confirmPassword.length > 0
                  ? passwordsMatch
                    ? 'border-emerald-500/50 focus:border-emerald-500/70'
                    : 'border-rose-500/50 focus:border-rose-500/70'
                  : 'border-white/10 focus:border-blue-500/60'
              }`}
            />
          </div>

          {error && (
            <p className="text-rose-400 text-xs mb-4 font-medium animate-pulse">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordStrong || !passwordsMatch}
            className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] text-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
