'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function UpdatePasswordPage() {
  const router = useRouter();
  
  // Form Data
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Feedback
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Opcional: Redirigir al login si el enlace expiró o no hay sesión válida
        // router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw new Error(updateError.message);
      
      setMessage('Password updated successfully! Redirecting to your dashboard...');
      
      setTimeout(() => {
        window.location.replace('https://app.luckypetag.com/');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  // --- SVG ICONS ---
  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );

  return (
    <div className="bg-[#f2fbf6] min-h-screen flex flex-col overflow-x-hidden font-sans text-[#151d1b] selection:bg-[#a1f4c6] selection:text-[#002112]">
      
      {/* Top Branding & Wave Area */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-[#4D9E76] z-0">
        <div className="absolute bottom-[-2px] left-0 w-full overflow-hidden leading-none rotate-180">
          <svg preserveAspectRatio="none" viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg" className="relative block w-[calc(150%+1.3px)] h-[100px]">
            <path className="fill-[#f2fbf6]" d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
          </svg>
        </div>
      </div>

      <main className="flex-grow relative flex items-center justify-center py-16 px-6 z-10">
        {/* Centered Card */}
        <div className="w-full max-w-[520px]">
          <div className="bg-white rounded-3xl p-10 md:p-14 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] border border-[#bec9c0]/10">
            
            <div className="flex flex-col items-center text-center mb-10">
              <div className="mb-6">
                <div className="flex flex-col items-center">
                  <div 
                    className="w-24 sm:w-28 h-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => router.push('/')}
                  >
                    <img 
                      src="/logo.webp" 
                      alt="Lucky Pet Tag" 
                      className="w-full h-auto object-contain" 
                      style={{ 
                        filter: 'brightness(0) saturate(100%) invert(48%) sepia(61%) saturate(417%) hue-rotate(104deg) brightness(89%) contrast(86%)' 
                      }}
                    />
                  </div>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#151d1b] tracking-tight mb-3">
                Set New Password
              </h1>
              <p className="text-[#3f4942]/80 font-medium text-sm">
                Enter your new secure password below to regain access to your dashboard.
              </p>
            </div>

            {/* Feedback Messages */}
            <div className="mb-6">
              {error && <div className="bg-[#ba1a1a]/10 border border-[#ba1a1a]/20 text-[#ba1a1a] p-4 rounded-2xl text-sm text-center font-medium">{error}</div>}
              {message && <div className="bg-[#4D9E76]/10 border border-[#4D9E76]/20 text-[#4D9E76] p-4 rounded-2xl text-sm text-center font-medium">{message}</div>}
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              
              {/* New Password */}
              <div className="space-y-2 text-left">
                <label className="text-[11px] font-bold text-[#3f4942] tracking-wider uppercase ml-1 block cursor-pointer">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-4 pr-12 rounded-full bg-[#edf6f1] border-none focus:ring-4 focus:ring-[#4D9E76]/10 transition-all text-[#151d1b] placeholder:text-[#6f7a72]/40 text-sm outline-none cursor-text"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-[#bec9c0]/60 hover:text-[#4D9E76] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2 text-left">
                <label className="text-[11px] font-bold text-[#3f4942] tracking-wider uppercase ml-1 block cursor-pointer">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-6 py-4 pr-12 rounded-full bg-[#edf6f1] border-none focus:ring-4 focus:ring-[#4D9E76]/10 transition-all text-[#151d1b] placeholder:text-[#6f7a72]/40 text-sm outline-none cursor-text"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-[#bec9c0]/60 hover:text-[#4D9E76] transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !!message}
                className="w-full py-5 px-6 rounded-full bg-[#151d1b] text-white font-bold text-base shadow-xl shadow-black/5 hover:bg-black transition-all active:scale-[0.98] flex justify-center items-center gap-3 disabled:opacity-70 mt-4 cursor-pointer"
              >
                {loading ? (
                  <><span className="w-2.5 h-2.5 bg-[#4D9E76] rounded-full shadow-[0_0_8px_#4D9E76] animate-pulse"></span>Processing...</>
                ) : 'Update Password'}
              </button>
            </form>

            {/* Footer Links */}
            <footer className="mt-12 text-center">
              <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-[#bec9c0] uppercase tracking-widest">
                <a href="https://luckypetag.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#4D9E76] transition-colors cursor-pointer">Privacy Policy</a>
                <span className="w-1 h-1 rounded-full bg-[#bec9c0]/30"></span>
                <a href="https://luckypetag.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#4D9E76] transition-colors cursor-pointer">Terms of Service</a>
                <span className="w-1 h-1 rounded-full bg-[#bec9c0]/30"></span>
                <a href="https://luckypetag.com/help" target="_blank" rel="noopener noreferrer" className="hover:text-[#4D9E76] transition-colors cursor-pointer">Help Center</a>
              </div>
              <p className="mt-4 text-[10px] font-medium text-[#bec9c0]/60 tracking-wide">
                &copy; {new Date().getFullYear()} Lucky Pet Tag. All rights protected.
              </p>
            </footer>

          </div>
        </div>
      </main>
    </div>
  );
}