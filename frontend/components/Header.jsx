// components/Header.jsx
import { Flex, useColorModeValue, Box, Button, HStack } from '@chakra-ui/react'; // Added Button and HStack
import Navbar from './Navbar'; // Your navigation links (Home, Courses, Instructors)
import { LoginButton } from './LoginButton'; // Your login button
import { ColorModeSwitcher } from './ColorModeSwitcher'; // Your theme switcher

export default function Header() {
  // This function would handle the navigation to the "Add Review" page
  // You might want to use Next.js's router for this if it's an internal page
  const handleAddReviewClick = () => {
    // Example: router.push('/add-review');
    console.log("Add Review Clicked"); 
  };

  return (
    <Flex
      as="header"
      width="full"
      align="center"
      justifyContent="space-between" // This keeps Navbar left and the new group right
      py={4} // Adjusted padding for a more standard header height
      px={{ base: 4, md: 8 }}
      bg="navbarBackground" // Semantic token for background
      borderBottomWidth="1px"
      borderColor={useColorModeValue('gray.200', 'gray.600')} // Adjusted dark mode border
      boxShadow={useColorModeValue('sm', 'none')} // Subtle shadow for light, none for dark
    >
      {/* Left side: Navigation Links */}
      <Navbar />

      {/* Right side: Group of action buttons */}
      <HStack spacing={{ base: 2, md: 4 }} align="center"> {/* Use HStack for horizontal layout and spacing */}
        <ColorModeSwitcher />
        
        <Button 
          variant="solid" // Or your preferred variant
          colorScheme="yellow" // Example: UMN Gold-like, or use your "neon" variant
          onClick={handleAddReviewClick}
          size="md" // Adjust size as needed
        >
          Add Review
        </Button>
        
        <LoginButton />
      </HStack>
    </Flex>
  );
}