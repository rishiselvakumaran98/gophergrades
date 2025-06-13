// hooks/useProfile.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useProfile() {
  const [session, setSession ] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false); // Stop loading after initial session check
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // Cleanup subscription on component unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);


  useEffect(() => {
    if (session) {
      setIsLoading(true);
      fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          // If the profile is not found (404), it's a new user.
          if (res.status === 404) {
            return { profile: null };
          }
          throw new Error('Failed to fetch profile data');
        })
        .then(data => {
          setProfile(data.profile);
          // A user is "new" if they don't have a profile or majors set.
          if (!data.profile || !data.profile.majors || data.profile.majors.length === 0) {
            setIsNewUser(true);
          } else {
            setIsNewUser(false);
          }
          setIsLoading(false);
        })
        .catch(error => {
          console.error("useProfile fetch error:", error);
          setIsLoading(false);
        });
    } else {
      // If there's no session, reset the state
      setProfile(null);
      setIsNewUser(false);
      setIsLoading(false);
    }
  }, [session]); // Dependency array ensures this runs when session changes

  return { profile, isLoading, isNewUser };
}