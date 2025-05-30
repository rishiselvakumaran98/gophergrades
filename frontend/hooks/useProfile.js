// hooks/useProfile.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useProfile() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          setProfile(data.profile);
          // A user is "new" if they haven't set their major yet.
          if (data.profile && (!data.profile.majors || data.profile.majors.length === 0)) {
            setIsNewUser(true);
          }
          setIsLoading(false);
        });
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  return { profile, isLoading, isNewUser };
}