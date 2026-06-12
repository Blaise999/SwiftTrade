'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useStore, getRegistrationRedirect, getRegistrationMessage } from '@/lib/auth/store';

// ============================================
// VALIDATION SCHEMA
// ============================================
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

// ============================================
// ANIMATED BACKGROUND COMPONENT
// ============================================
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(212,175,55,0.15),rgba(0,0,0,0))]" />
      
      {/* Animated orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 bg-[#C4A052]/10 rounded-full blur-[120px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#2FA56B]/5 rounded-full blur-[80px]"
        animate={{
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}

// ============================================
// LOGIN PAGE COMPONENT
// ============================================
export default function LoginPage() {
  const router = useRouter();
  const { login, error: storeError, clearError } = useStore();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync store error
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: true,
    },
  });

  const email = watch('email');

  // Handle form submission
  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);
    setRedirectMessage(null);
    clearError();

    try {
      const result = await login(data.email, data.password);

      if (result.success) {
        setSuccessMessage('Welcome back! Redirecting...');
        
        // Show registration message if not complete
        if (result.redirect && result.redirect !== '/dashboard') {
          const status = result.redirect === '/kyc' ? 'pending_kyc'
            : result.redirect === '/connect-wallet' ? 'pending_wallet'
            : result.redirect === '/auth/verify-otp' ? 'pending_verification'
            : 'complete';
          
          const message = getRegistrationMessage(status as any);
          if (message) {
            setRedirectMessage(message);
          }
        }

        // Redirect after brief delay
        setTimeout(() => {
          router.push(result.redirect || '/dashboard');
        }, result.redirect === '/dashboard' ? 800 : 1500);
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-0 w-full flex items-center justify-center">
      
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#C4A052]/20 via-transparent to-[#C4A052]/20 rounded-3xl blur-xl opacity-50" />
          
          {/* Main card */}
          <div className="relative bg-[#0E1B30]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C4A052]/20 to-[#C4A052]/5 border border-[#C4A052]/20 mb-4"
              >
                <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-label="Swifttrade"><rect x="0.5" y="0.5" width="39" height="39" rx="9" fill="#0E1B30" stroke="rgba(255,255,255,0.10)" /><path d="M9 15 L18 10 L24 14 L31 10" stroke="#C4A052" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 24 L16 27 L23 22 L31 26" stroke="#3B948C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold text-white tracking-tight"
              >
                Welcome back
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-2 text-sm text-slate-400"
              >
                Sign in to your trading account
              </motion.p>
            </div>

            {/* Success Message */}
            <AnimatePresence mode="wait">
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 rounded-xl bg-[#2FA56B]/10 border border-[#2FA56B]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2FA56B]/20 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-[#2FA56B]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2FA56B]">{successMessage}</p>
                      {redirectMessage && (
                        <p className="text-xs text-slate-400 mt-1">{redirectMessage}</p>
                      )}
                    </div>
                    <Loader2 className="w-4 h-4 text-[#2FA56B] animate-spin" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && !successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-400">{error}</p>
                      {error.includes('Invalid') && (
                        <Link
                          href="/auth/forgot-password"
                          className="text-xs text-red-400/70 hover:text-red-400 mt-1 inline-block"
                        >
                          Forgot your password?
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-2"
              >
                <label className="text-sm font-medium text-slate-300">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#C4A052]/20 to-transparent rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#C4A052] transition-colors" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={isLoading}
                      className={`w-full pl-12 pr-4 py-3.5 bg-white/[0.04] border rounded-xl text-white placeholder:text-slate-600 focus:outline-none transition-all disabled:opacity-50 ${
                        errors.email
                          ? 'border-red-500/50 focus:border-red-500'
                          : 'border-white/[0.08] focus:border-[#C4A052]/50 focus:bg-white/[0.05]'
                      }`}
                    />
                  </div>
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-red-400 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.email.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-[#C4A052]/70 hover:text-[#C4A052] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#C4A052]/20 to-transparent rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#C4A052] transition-colors" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={isLoading}
                      className={`w-full pl-12 pr-12 py-3.5 bg-white/[0.04] border rounded-xl text-white placeholder:text-slate-600 focus:outline-none transition-all disabled:opacity-50 ${
                        errors.password
                          ? 'border-red-500/50 focus:border-red-500'
                          : 'border-white/[0.08] focus:border-[#C4A052]/50 focus:bg-white/[0.05]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-red-400 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.password.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Remember Me */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      {...register('rememberMe')}
                      type="checkbox"
                      disabled={isLoading}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border border-white/20 rounded-md bg-white/[0.04] peer-checked:bg-[#C4A052] peer-checked:border-[#C4A052] transition-all flex items-center justify-center peer-disabled:opacity-50">
                      <svg
                        className="w-3 h-3 text-black opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    Keep me signed in
                  </span>
                </label>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-4 rounded-xl font-semibold text-black overflow-hidden group disabled:cursor-not-allowed"
                >
                  {/* Button background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#C4A052] via-sapphire-500 to-[#C4A052] bg-[length:200%_100%] group-hover:animate-shimmer transition-all group-disabled:opacity-50" />
                  
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 bg-[#C4A052]/20 blur-xl" />
                  </div>
                  
                  {/* Button content */}
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </motion.div>
            </form>

            {/* Sign Up Link */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-8 text-center text-sm text-slate-400"
            >
              Don't have an account?{' '}
              <Link
                href="/auth/signup"
                className="text-[#C4A052] hover:text-[#C4A052]/80 font-medium transition-colors"
              >
                Create account
              </Link>
            </motion.p>
          </div>
        </div>

        {/* Security Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>256-bit SSL encryption</span>
        </motion.div>
      </motion.div>

      {/* Custom shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .group-hover\\:animate-shimmer:hover {
          animation: shimmer 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
