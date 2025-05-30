// components/Navbar.jsx
import NextLink from 'next/link'; // Renamed to avoid conflict
import { HStack, Link as ChakraLink, useColorModeValue } from '@chakra-ui/react';

export default function Navbar() {
  const linkColor = useColorModeValue('gray.700', 'gray.200');
  const linkHoverBorderColor = useColorModeValue('brand.maroon', 'brand.gold');

  const navLinkStyles = {
    textDecoration: 'none',
    fontWeight: '500',
    py: 2, // Equivalent to padding: 8px 0;
    borderBottom: '2px solid transparent',
    transition: 'border-bottom 0.2s ease-in-out',
    _hover: {
      borderBottomColor: linkHoverBorderColor,
      textDecoration: 'none', // Ensure no underline on hover if not desired
    },
  };

  return (
    <HStack as="nav" spacing={6} align="center"> {/* Replaces .nav and .navList */}
      <ChakraLink as={NextLink} href="/" {...navLinkStyles} color={linkColor}>
        Home
      </ChakraLink>
    </HStack>
  );
}