// frontend/components/AuthManager.jsx
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthManager() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        // When a user signs in, send their session data to your backend
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session }),
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null; // This component does not render anything
}