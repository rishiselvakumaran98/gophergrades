// components/LoginButton.jsx
"use client";
import { useState, useEffect } from "react";
import NextLink from "next/link"; // Renamed to avoid conflict with Chakra's Link
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  useColorModeValue
} from "@chakra-ui/react";
import { supabase } from '../lib/supabase';

export const LoginButton = () => {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // Immediately check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setStatus(session ? 'authenticated' : 'unauthenticated');
    });

    // Listen for changes in authentication state (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setStatus(session ? 'authenticated' : 'unauthenticated');
    });

    // Cleanup the subscription when the component unmounts
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Login handler
  const handleGoogleLogin = async () => {
    setStatus('loading');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  // Logout handler
  const handleLogout = async () => {
    setStatus('loading');
    await supabase.auth.signOut();
  };

  // Define colors using semantic tokens or direct values, adaptable to theme
  const buttonBg = useColorModeValue('brand.maroon', 'brand.neonMaroon'); // Assuming you have neonMaroon for dark mode
  const buttonColor = 'white';
  const dropdownBg = useColorModeValue('gray.50', 'gray.700');
  const dropdownItemHoverBg = useColorModeValue('gray.100', 'gray.600');
  const dropdownTextColor = useColorModeValue('black', 'white');


  if (status === "loading") {
    return (
      <Button
        bg={buttonBg}
        color={buttonColor}
        isLoading
        spinner={<Spinner size="sm" />}
        _hover={{ bg: buttonBg }} // Keep bg same on hover for loading
        px={6}
        py={2.5}
        fontWeight="bold"
        borderRadius="md"
      >
        Loading...
      </Button>
    );
  }

  if (status === "authenticated" && session) {
    return (
      <Menu>
        <MenuButton
          as={Button}
          bg={buttonBg}
          color={buttonColor}
          px={6}
          py={2.5}
          fontWeight="bold"
          borderRadius="md"
          _hover={{ filter: 'brightness(90%)' }}
          _active={{ filter: 'brightness(80%)' }}
        >
          Hi, {session.user?.user_metadata?.full_name?.split(" ")[0] || session.user?.email?.split("@")[0]}
        </MenuButton>
        <MenuList 
            bg={dropdownBg} 
            borderColor={useColorModeValue('gray.200', 'gray.600')}
            boxShadow="md"
            zIndex={10} // Ensure dropdown is on top
        >
          <MenuItem
            as={NextLink}
            href="/profile"
            bg={dropdownBg}
            color={dropdownTextColor}
            _hover={{ bg: dropdownItemHoverBg }}
          >
            Profile
          </MenuItem>
          <MenuItem
            onClick={handleLogout}
            bg={dropdownBg}
            color={dropdownTextColor}
            _hover={{ bg: dropdownItemHoverBg }}
          >
            Logout
          </MenuItem>
        </MenuList>
      </Menu>
    );
  }

  return (
    <Button
      onClick={handleGoogleLogin}
      bg={buttonBg}
      color={buttonColor}
      px={6}
      py={2.5}
      fontWeight="bold"
      borderRadius="md"
      _hover={{ filter: 'brightness(90%)' }}
      _active={{ filter: 'brightness(80%)' }}
    >
      Login
    </Button>
  );
};