import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation } from '../hooks/useLocation';

export const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  isSharing: false,
  coords: null,
  locationError: null,
  accuracy: null,
  startTracking: () => {},
  stopTracking: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Instantiate global location tracking hook
  const {
    isSharing,
    coords,
    error: locationError,
    accuracy,
    startTracking,
    stopTracking,
  } = useLocation();

  // Helper to fetch user profile
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error) setProfile(data);
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
          // Force location sharing off when logging out
          stopTracking();
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error };
    }
  };

  const signUp = async (email, password, profileData) => {
    setLoading(true);
    try {
      // 1. Create Supabase Auth user (passing metadata fields for the trigger)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: profileData.full_name,
            role: profileData.role,
            institution: profileData.institution,
            division: profileData.division,
            contact: profileData.contact,
            employee_id: profileData.employee_id,
            shift_code: profileData.shift_code,
          }
        }
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Sign up completed but no user returned.');
      }

      return { data, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      stopTracking(); // Ensure tracking is stopped
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      isSharing,
      coords,
      locationError,
      accuracy,
      startTracking,
      stopTracking,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
