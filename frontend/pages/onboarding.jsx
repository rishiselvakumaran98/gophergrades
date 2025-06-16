import React, { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Progress,
  useBreakpointValue,
  chakra,
} from "@chakra-ui/react";
import { Search2Icon } from "@chakra-ui/icons";

// User icon size in px
const userIconSize = 20; // Change this value to adjust icon size
const iconAreaWidth = userIconSize + 40;

const Onboarding = () => {
  const [name, setName] = useState("");
  const showImage = useBreakpointValue({ base: false, md: true });

  return (
    <Flex minH="100vh" direction={{ base: "column", md: "row" }}>
      {/* Left Side */}
      <Box
        flexBasis={{ base: '100%', md: '50%' }}
        width={{ base: '100%', md: '50%' }}
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="center"
        maxW="500px"
        w="100%"
        mx="auto"
        my="auto"
        py={[8, 12, 16]}
        bg="white"
        minW={0}
        height="100vh"
      >
        <chakra.img
          src={"/images/Goldy.png"}
          alt={"Goldy mascot"}
          maxW={["100px", "125px", "160px"]}
          height="auto"
          mb={6}
          alignSelf="flex-start"
          style={{ display: 'block' }}
        />
        <Heading
          as="h1"
          fontFamily="'IBM Plex Sans', sans-serif"
          fontWeight={700}
          fontSize={["2.5xl", "3.75xl", "5xl"]}
          mb={3}
          textAlign="left"
          bgGradient="linear(to-r, #3C3C3C 0%, #0F0F0F 100%)"
          bgClip="text"
          color="transparent"
          opacity={0.8}
        >
          Your Name 
        </Heading>
        <Text color="#888" fontSize={["lg", "xl"]} mb={4} textAlign="left" w="100%">
          Let's get your name before getting to the rest
        </Text>
        <InputGroup mb={6} maxW="500px" w="100%">
          <InputLeftElement
            pointerEvents="none"
            width={`${iconAreaWidth}px`}
            minW={`${iconAreaWidth}px`}
            height="100%"
            top="50%"
            transform="translateY(-50%)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="visible"
          >
            <chakra.img
              src="/images/user%20icon.png"
              alt="User icon"
              width={`${userIconSize}px`}
              height={`${userIconSize}px`}
              objectFit="contain"
              display="block"
            />
          </InputLeftElement>
          <Input
            placeholder="First and last name"
            fontSize="1.3rem"
            borderRadius="3xl"
            bg="white"
            boxShadow="0 4px 20px 0 rgba(0,0,0,0.05)"
            border="1px solid #E2E8F0"
            py={8}
            pl={`${iconAreaWidth - 5}px`}
            pr={6}
            _placeholder={{ color: "#AEAEAE" }}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </InputGroup>
        {/* Custom Progress Bar */}
        <Flex alignItems="center" w="100%" maxW="500px" mb={5}>
          <Box flex={1} position="relative" height={["18px", "10px"]} borderRadius="md" bg="#F3F3F3">
            <Box
              position="absolute"
              left={0}
              top={0}
              height="100%"
              width="20%"
              borderRadius="md"
              bg="#9D3345"
              transition="width 0.3s"
            />
          </Box>
          <Text ml={4} color="#888" fontSize="md" fontWeight={500}>
            Step 1/5
          </Text>
        </Flex>
        <Button
          w="100%"
          maxW="500px"
          bg="#9D3345"
          color="white"
          borderRadius="3xl"
          fontWeight={700}
          fontSize="1.3rem"
          height={["56px", "58px"]} // 56px for mobile, 58px for desktop
          minH={0}
          py={0}
          _hover={{ bg: name ? "#A0001A" : "#9D3345" }}
          opacity={name ? 1 : 0.5}
          disabled={!name}
        >
          Next &gt;
        </Button>
        <Text mt={16} color="#888" fontSize="sm" textAlign="center" maxW="500px">
          This information is confidential and will not be shared. You may update your responses at any time. For more details, see our{' '}
          <chakra.a href="/privacy" color="#800018" textDecoration="underline">
            Privacy Policy
          </chakra.a>.
        </Text>
      </Box>
      {/* Right Side (Image) */}
      {showImage && (
        <Box
          flexBasis="50%"
          width="50%"
          minH="100vh"
          display={{ base: "none", md: "block" }}
          position="relative"
        >
          <chakra.img
            src={"/images/price%20on%20ice%20image.png"}
            alt={"Pride on Ice"}
            objectFit="cover"
            w="100%"
            h="100vh"
          />
          {/* Black left-to-right fade overlay */}
          <Box
            position="absolute"
            top={0}
            left={0}
            w="100%"
            h="100%"
            pointerEvents="none"
            bg="linear-gradient(to right, rgba(0, 0, 0, 0.4) 0%, rgba(0,0,0,0.08) 70%, rgba(0,0,0,0) 100%)"
          />
        </Box>
      )}
    </Flex>
  );
};

export default Onboarding; 