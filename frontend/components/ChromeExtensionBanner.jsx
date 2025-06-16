import React from "react";
import { Box, Flex, Text, Image } from "@chakra-ui/react";
import trackEvent from "../lib/track";

const voidFunc = () => {};
const ChromeExtensionBanner = ({
  setShowAlert = voidFunc,
  source,
  width,
  title = "Download Chrome Extension",
  subtitle = "Integrated with Schedule Builder",
  image = "https://images.icon-icons.com/3053/PNG/512/google_chrome_macos_bigsur_icon_190133.png",
  link
}) => {
  if (typeof window === "undefined") return null;
  console.log("[GopherGrades] navigator.userAgent:", navigator.userAgent);
  const ua = navigator.userAgent.toLowerCase();
  const isFirefox = ua.includes("firefox");
  const isEdge = ua.includes("edg");
  const isOpera = ua.includes("opr");
  const isChrome = ua.includes("chrome") && !isEdge && !isOpera;

  let browser;
  if (isChrome) {
    browser = "chrome";
  } else if (isEdge) {
    browser = "edge";
  } else if (isOpera) {
    browser = "opera";
  } else if (isFirefox) {
    browser = "firefox";
  } else {
    browser = "chrome";
  }

  console.log("[GopherGrades] Detected browser:", browser);

  let dynamicLink = link;
  if (!dynamicLink) {
    if (browser === "chrome" || browser === "edge" || browser === "opera") {
      dynamicLink = "/chrome";
    } else if (browser === "firefox") {
      dynamicLink = "/firefox";
    } else {
      dynamicLink = "/chrome";
    }
  }

  const eventSource = `${browser}.${source}`;

  // Replace 'Firefox' or 'Chrome' in title/subtitle with detected browser name if present
  let displayTitle = title;
  let displaySubtitle = subtitle;
  if (title && (title.toLowerCase().includes('firefox') || title.toLowerCase().includes('chrome'))) {
    displayTitle = title.replace(/firefox|chrome/i, browser.charAt(0).toUpperCase() + browser.slice(1));
  }
  if (subtitle && (subtitle.toLowerCase().includes('firefox') || subtitle.toLowerCase().includes('chrome'))) {
    displaySubtitle = subtitle.replace(/firefox|chrome/i, browser.charAt(0).toUpperCase() + browser.slice(1));
  }

  return (
    <Box
      as="button"
      onClick={() => {
        setShowAlert(false);
        window.open(dynamicLink, "_blank");
        trackEvent(eventSource + (isFirefox ? ".firefox" : ".chrome"), {
          type: "download",
        });
        window.localStorage.setItem("downloadedChromeExtension", "true");
      }}
      width={width || "49%"}
      bg="#FFFFFF"
      borderRadius="2xl"
      boxShadow="0px 8px 32px 0px rgba(158, 158, 158, 0.15)"
      display="flex"
      alignItems="center"
      px={[2.8, 4.2]}
      py={[2.1, 2.8]}
      borderLeft="7px solid #9D3345"
      cursor="pointer"
      _hover={{ boxShadow: "0 4px 32px 0 rgba(111, 19, 29, 0.25)", opacity: 0.92 }}
      transition="box-shadow 0.2s, opacity 0.2s"
      height="90px"
    >
      <Image
        src={image}
        alt={title}
        boxSize={["39px", "45px"]}
        borderRadius="lg"
        ml="10px"
        mr="10px"
        flexShrink={0}
      />
      <Box textAlign="left">
        <Text fontSize={["14px", "18px", "21px"]} fontWeight="medium" color="#800018" lineHeight={1.1}>
          {displayTitle}
        </Text>
        <Text fontSize={["12px", "14px", "16px"]} color="#7B7B7B" fontWeight={300} mt={0.7}>
          {displaySubtitle}
        </Text>
      </Box>
    </Box>
  );
};

export default ChromeExtensionBanner;