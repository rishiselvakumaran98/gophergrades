import React from "react";
import {
  Alert,
  Badge,
  HStack,
  Link as ChakraLink,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { AiOutlineChrome } from "react-icons/ai";
import { BsBrowserEdge, BsBrowserFirefox } from "react-icons/bs";
import trackEvent from "../lib/track";

const voidFunc = () => {};
const ChromeExtensionBanner = ({ setShowAlert = voidFunc, source }) => {
  if (typeof window === "undefined") return null;
  const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
  const isMicrosoftEdge = navigator.userAgent.toLowerCase().indexOf("edg") > -1;
  const isChrome = navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
  const colorScheme = isFirefox ? "orange" : "green";

  let browser;
  if (isChrome) {
    browser = "chrome";
  } else if (isMicrosoftEdge) {
    browser = "edge";
  } else if (isFirefox) {
    browser = "firefox";
  } else {
    browser = "Chrome";
  }

  const eventSource = `${browser}.${source}`;

  const browserName = browser.charAt(0).toUpperCase() + browser.slice(1);

  // --- Dark Mode Specific Colors ---
  // For Green Scheme in Dark Mode
  const darkGreenTextColor = useColorModeValue(`${colorScheme}.900`, "green.300"); // Brighter green for dark text
  const darkGreenSubtleTextColor = useColorModeValue(`${colorScheme}.500`, "green.400");
  const darkGreenBadgeBg = useColorModeValue(`${colorScheme}.500`, "green.400"); // Badge bg
  const darkGreenBadgeColor = useColorModeValue('white', 'black'); // Badge text
  const darkGreenAlertBg = useColorModeValue(`${colorScheme}.100`, `${colorScheme}.800`); // Alert background (e.g. green.100 for light, green.800 for dark)
  
  // For Orange Scheme (Firefox) in Dark Mode
  const darkOrangeTextColor = useColorModeValue(`${colorScheme}.900`, "orange.300");
  const darkOrangeSubtleTextColor = useColorModeValue(`${colorScheme}.500`, "orange.400");
  const darkOrangeAlertBg = useColorModeValue(`${colorScheme}.100`, `${colorScheme}.800`);


  // Select text colors based on the determined scheme
  const mainTextColor = isFirefox ? darkOrangeTextColor : darkGreenTextColor;
  const subtleTextColor = isFirefox ? darkOrangeSubtleTextColor : darkGreenSubtleTextColor;
  const alertBg = isFirefox ? darkOrangeAlertBg : darkGreenAlertBg;
  
  // Neon glow effect for dark mode
  const glowColor = useColorModeValue("transparent", isFirefox ? "orange.300" : "green.300");


  return (
    <Alert
      borderRadius={"lg"}
      colorScheme={colorScheme}
      variant={"left-accent"}
      bg={alertBg}
      cursor={"pointer"}
      _hover={{ opacity: 0.9 }}
      as={"button"}
      onClick={() => {
        setShowAlert(false);

        if (isFirefox) window.open("/firefox", "_blank");
        else window.open("/chrome", "_blank");

        trackEvent(eventSource + (isFirefox ? ".firefox" : ".chrome"), {
          type: "download",
        });
        window.localStorage.setItem("downloadedChromeExtension", "true");
      }}
      // Apply the glow effect using boxShadow for dark mode
      boxShadow={useColorModeValue("md", `0 0 10px 2px ${glowColor}, 0 0 5px 1px ${glowColor} inset`)}
      sx={{
        // Ensure the accent border uses a more visible color in dark mode too
        '&[data-status="green"]': {
            borderLeftColor: useColorModeValue('green.500', 'green.300'),
        },
        '&[data-status="orange"]': {
            borderLeftColor: useColorModeValue('orange.500', 'orange.300'),
        }
      }}
    >
      <Badge mr={2} colorScheme={colorScheme} variant={"solid"}>
        <HStack py={1.5} px={3}>
          {isChrome && <AiOutlineChrome size={20} />}
          {isMicrosoftEdge && <BsBrowserEdge size={20} />}
          {isFirefox && <BsBrowserFirefox size={20} />}
          <Text>New</Text>
        </HStack>
      </Badge>
      <VStack spacing={0} pl={2} align={"start"}>
        <Text
          color={mainTextColor}
          textAlign={"left"}
          className={"hide-if-extension-downloaded"}
          fontWeight="medium"
        >
          Check out our <ChakraLink color={useColorModeValue('blue.600', 'blue.300')} fontWeight="bold">{browserName} extension</ChakraLink>!
        </Text>
        <Text
          color={mainTextColor}
          textAlign={"left"}
          display={"none"}
          className={"show-if-extension-downloaded"}
        >
          Thanks for downloading our extension!
        </Text>
        <Text fontSize={"xs"} color={subtleTextColor}>
          Now with data from Fall 2024.
        </Text>
      </VStack>
    </Alert>
  );
};

export default ChromeExtensionBanner;
