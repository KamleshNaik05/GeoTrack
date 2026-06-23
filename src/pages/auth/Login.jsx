import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Map, ShieldAlert, BadgeCheck, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If user is already logged in, redirect them
  useEffect(() => {
    if (user && profile) {
      const from = location.state?.from?.pathname || (profile.role === 'admin' ? '/admin' : '/trainee');
      navigate(from, { replace: true });
    }
  }, [user, profile, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Fetch profile to get role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      toast.success('Signed in successfully.');

      // Navigate based on role
      if (profileData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/trainee');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] relative">
      {/* Mobile-only 6px primary accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-[6px] bg-primary-500 md:hidden z-10"></div>

      {/* 1. LEFT PANEL (40%) - Hidden on mobile */}
      <div className="hidden md:flex md:w-[35%] lg:w-[40%] bg-primary-500 text-white flex-col justify-between p-10 min-h-[100dvh] select-none">
        <div>
          {/* SAIL/RSP Badge */}
          <div className="inline-flex items-center gap-1 bg-accent-500/20 text-accent-400 border border-accent-400/30 text-xs font-semibold px-2.5 py-1 rounded-md mb-8">
            SAIL · Rourkela Steel Plant
          </div>

          {/* Product Title */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-extrabold text-white tracking-tight">GeoTrack</span>
            <span className="text-4xl font-extrabold text-accent-400 tracking-tight">RSP</span>
          </div>

          {/* Tagline */}
          <p className="text-blue-150 text-sm max-w-sm mb-12">
            Industrial Trainee Safety & Monitoring System
          </p>

          {/* Core Feature List */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg">
              <Map size={16} className="text-accent-400 shrink-0" />
              <span className="text-xs text-blue-100 font-medium">Real-Time Geofence Monitoring</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg">
              <BadgeCheck size={16} className="text-accent-400 shrink-0" />
              <span className="text-xs text-blue-100 font-medium">Automated Attendance Logging</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg">
              <ShieldAlert size={16} className="text-accent-400 shrink-0" />
              <span className="text-xs text-blue-100 font-medium">Instant One-Tap SOS Alerts</span>
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="text-[10px] text-blue-300/50">
          <span>v1.0.0 · RMHP Safety Operations · © {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL (Full white section) */}
      <div className="flex flex-1 items-center justify-center bg-white min-h-[100dvh] px-6 py-12 w-full md:w-[65%] lg:w-[60%]">
        <div className="w-full max-w-sm space-y-6">
          
          {/* Mobile-only header logo */}
          <div className="md:hidden select-none flex flex-col items-center mb-6">
            <h1 className="text-xl font-bold text-primary-500 text-center">GeoTrack RSP</h1>
            <p className="text-xs text-gray-400 text-center">RMHP Safety System</p>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-gray-900 text-left">
              Sign in to your account
            </h3>
            <p className="text-xs text-gray-500 text-left">
              Enter credentials authorized by RMHP Division
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@geotrack.com"
                disabled={loading}
                className="w-full h-11 md:h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full h-11 md:h-10 pl-3 pr-10 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-650 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 md:h-10 bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors duration-150 flex items-center justify-center disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          {/* Register Redirect */}
          <div className="text-center pt-2">
            <span className="text-xs text-gray-500">New trainee or supervisor? </span>
            <Link to="/register" className="text-xs font-semibold text-primary-500 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
