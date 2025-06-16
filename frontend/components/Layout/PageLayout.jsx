import { Box, Flex, Button, Input, Text } from "@chakra-ui/react";
import React, { useState, useEffect, useRef } from "react";
import MyHeading from "./MyHeading";
import PageBackground from "../PageBackground";
import { Footer } from "./Footer";
import { useRouter } from "next/router";
import Image from "next/image";

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "goldy",
      text: [
        "Hi! I'm Goldy 👋",
        "Your new Virtual Academic Advisor!",
        "Ask me anything about classes, graduation requirements, or what you need to complete your degree."
      ]
    }
  ]);
  const chatEndRef = useRef(null);

  // Easily adjustable Goldy icon size
  const goldySize = 185; // px
  // Easily adjustable input box shadow
  const inputShadow = "0 4px 24px 0 rgba(0,0,0,0.15)";
  // Control the size of the add/send icon buttons in the message input box
  const iconButtonSize = 36; // px (change this value to control button/icon size)
  // Padding controls for icon buttons
  const iconButtonGap = 10; // px, space between add and send icons
  const iconButtonPadRight = 8; // px, space to the right of send icon
  const iconButtonPadLeft = 10; // px, space to the left of add icon
  const iconButtonPadTop = 10; // px, space above icons
  const iconButtonPadBottom = 10; // px, space below icons
  // Padding below header text to separate from wave
  const headerTextPadBottom = 32; // px

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = () => {
    if (inputValue.trim() === "") return;
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: [inputValue] }
    ]);
    setInputValue("");
  };
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chatbot Button */}
      <Box
        position="fixed"
        bottom={[0, -5]}
        right={[0, -5]}
        zIndex={120}
        width={`${goldySize}px`}
        height={`${goldySize}px`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        bg="none"
        boxShadow="none"
        onClick={() => setOpen((v) => !v)}
        style={{ transition: 'box-shadow 0.2s' }}
      >
        <Image src="/images/goldy%20AI%20icon.png" alt="Goldy AI Chatbot" width={goldySize} height={goldySize} style={{ borderRadius: 16 }} />
      </Box>
      {/* Chatbot Window (appears above icon, icon remains visible) */}
      {open && (
        <Box
          position="fixed"
          bottom={[goldySize + -24, goldySize - 24]} // 20% more gap above icon
          right={[0, 7]}
          zIndex={130}
          width={["95vw", "444px"]}
          maxW="95vw"
          height={["80vh", "580px"]}
          maxH="95vh"
          bg="white"
          borderRadius="2xl"
          boxShadow="0 8px 48px 0 rgba(0,0,0,0.20)"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          {/* Header */}
          <Box position="relative" bg="#9D3345" px={5} pt={5} borderTopLeftRadius="2xl" borderTopRightRadius="2xl">
            <Box display="flex" alignItems="center" justifyContent="space-between" pb={`${headerTextPadBottom}px`}>
              <Box>
                <Text color="white" fontWeight={700} fontSize="20px">Goldy the Virtual Advisor</Text>
                <Text color="white" fontWeight={400} fontSize="16px">
                  <Box as="span" color="#FFD43B" fontWeight={600} textDecoration="underline" cursor="pointer">Log in</Box> to save your chats
                </Text>
              </Box>
              <Box as="button" bg="transparent" border="none" cursor="pointer" p={0} m={0} onClick={() => setOpen(false)}>
                <Image src="/images/downarrow.png" alt="Close chat" width={20} height={20} style={{ display: 'block' }} />
              </Box>
            </Box>
            {/* Wave SVG absolutely positioned at the bottom of the header */}
            <Box position="absolute" left={0} right={0} bottom={-1} w="100%" h="32px" overflow="hidden" lineHeight={0} zIndex={2} pointerEvents="none">
              <svg viewBox="0 0 500 32" width="100%" height="32" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,16 Q125,32 250,16 T500,16 V32 H0 Z" fill="#FAFAFA" />
              </svg>
            </Box>
          </Box>
          {/* Chat Area */}
          <Box flex={1} px={4} py={4} overflowY="auto" bg="#FAFAFA" display="flex" flexDirection="column" justifyContent="flex-end">
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                alignSelf={msg.sender === "user" ? "flex-end" : "flex-start"}
                bg={msg.sender === "user" ? "#9D3345" : "white"}
                color={msg.sender === "user" ? "white" : "#9D3345"}
                borderTopLeftRadius={msg.sender === "user" ? "20px" : "20px"}
                borderTopRightRadius={msg.sender === "user" ? "20px" : "20px"}
                borderBottomRightRadius={msg.sender === "user" ? "5px" : "20px"}
                borderBottomLeftRadius={msg.sender === "user" ? "20px" : "5px"}
                boxShadow="0 2px 12px 0 rgba(0,0,0,0.08)"
                p={5}
                mb={3}
                maxW="81%"
                display="flex"
                flexDirection="column"
                textAlign={msg.sender === "user" ? "right" : "left"}
              >
                {msg.text.map((line, i) => (
                  <Text
                    key={i}
                    fontWeight={600}
                    mb={i === msg.text.length - 2 ? 3 : 0} // Add space after "Your new Virtual Academic Advisor!"
                    fontSize={msg.sender === "user" ? "md" : i === 0 || i === 1 ? "16px" : "md"}
                    color={msg.sender === "user" ? "white" : "#9D3345"}
                    lineHeight={1.25}
                  >
                    {line}
                  </Text>
                ))}
              </Box>
            ))}
            <div ref={chatEndRef} />
          </Box>
          {/* Input Area */}
          <Box px={4} py={3} bg="#FAFAFA" display="flex" alignItems="center">
            <Box
              display="flex"
              alignItems="center"
              flex={1}
              bg="white"
              borderRadius="16px"
              boxShadow={inputShadow}
              pr={0}
              height={`${iconButtonSize + iconButtonPadTop + iconButtonPadBottom}px`} // input height matches icon size + vertical padding
            >
              <Input
                placeholder="Ask Goldy..."
                borderRadius="12px"
                bg="white"
                border="none"
                fontSize="md"
                flex={1}
                height={`${iconButtonSize + iconButtonPadTop + iconButtonPadBottom}px`}
                _placeholder={{ color: "#888" }}
                boxShadow="none"
                pr={2}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <Box
                display="flex"
                alignItems="center"
                pl={`${iconButtonPadLeft}px`}
                pr={`${iconButtonPadRight}px`}
                pt={`${iconButtonPadTop}px`}
                pb={`${iconButtonPadBottom}px`}
                gap={`${iconButtonGap}px`}
              >
                <Button
                  bg="#FFD43B"
                  color="#9D3345"
                  borderRadius="full"
                  minW={0}
                  w={`${iconButtonSize}px`}
                  h={`${iconButtonSize}px`}
                  p={0}
                  _hover={{ bg: "#FFE066" }}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Image src="/images/plus icon.png" alt="Plus" width={iconButtonSize * 0.5} height={iconButtonSize * 0.5} style={{ display: 'block' }} unoptimized />
                </Button>
                <Button bg="#9D3345" color="white" borderRadius="full" minW={0} w={`${iconButtonSize}px`} h={`${iconButtonSize}px`} p={0} _hover={{ bg: "#A0001A" }} display="flex" alignItems="center" justifyContent="center" onClick={handleSend}>
                  <Box as="span" fontSize={`${iconButtonSize * 0.5}px`} fontWeight={700} display="flex" alignItems="center" justifyContent="center">&uarr;</Box>
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

const PageLayout = ({
  footer = true,
  children,
  scriptOnly = false,
  px = ["4vw", "5vw", "7vw"],
  maxW = "1300px",
  justifyContent = "center",
  hideHeader = false,
  ...props
}) => {
  const router = useRouter();

  // Only show header on homepage
  const showHeader = router.pathname === "/" && !hideHeader;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (scriptOnly) {
    return (
      <>
        <MyHeading {...props} />
        {children}
      </>
    );
  }
  return (
    <Box>
      <MyHeading {...props} />
      <PageBackground />
      {showHeader && (
        <>
          <Flex
            as="header"
            position="fixed"
            top={0}
            left={0}
            width="100vw"
            height="100px"
            alignItems="center"
            justifyContent="flex-end"
            px={["2vw", "3vw", "2vw"]}
            background="rgba(255,255,255,0.00)"
            zIndex={100}
            boxShadow="none"
          >
            <Button
              colorScheme="yellow"
              bg="rgba(255,255,255,0.7)"
              color="#7B5E00"
              fontWeight={700}
              borderRadius="xl"
              px={6}
              py={6}
              fontSize={["md", "lg"]}
              boxShadow="0 2px 8px 0 rgba(0,0,0,0.04)"
              _hover={{ bg: "#FFD43B" }}
              mr="8px"
              ml="8px"
            >
              <Box
                as="span"
                fontFamily="'IBM Plex Sans', sans-serif"
                bgGradient="linear(to-b, #840017, #1E0005)"
                bgClip="text"
                color="transparent"
                fontWeight={700}
              >
                Log In
              </Box>
            </Button>
            <Button
              colorScheme="yellow"
              bg="rgba(247,206,85,0.8)"
              color="#7B5E00"
              fontWeight={700}
              borderRadius="xl"
              px={6}
              py={6}
              fontSize={["md", "lg"]}
              boxShadow="0 2px 8px 0 rgba(0,0,0,0.04)"
              _hover={{ bg: "#FFD43B" }}
              mr="0px"
              ml="8px"
              onClick={() => router.push('/onboarding')}
            >
              <Box
                as="span"
                fontFamily="'IBM Plex Sans', sans-serif"
                bgGradient="linear(to-b, #840017, #1E0005)"
                bgClip="text"
                color="transparent"
                fontWeight={700}
              >
                Create Account
              </Box>
            </Button>
          </Flex>
          <Box height="64px" />
        </>
      )}
      <Flex direction={"row"} justifyContent={justifyContent}>
        <Box px={px} maxW={maxW} width={"100%"}>
          {children}

          {footer && <Footer />}
        </Box>
      </Flex>
      {/* Show chatbot on all pages except onboarding, after mount */}
      {mounted && !router.pathname.startsWith('/onboarding') && <Chatbot />}
    </Box>
  );
};

export default PageLayout;
