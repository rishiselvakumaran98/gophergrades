import React, { useRef, useEffect, useState } from "react";
import {
  Box,
  chakra,
  Collapse,
  Flex,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import dynamic from "next/dynamic";
import PageLayout from "../components/Layout/PageLayout";
import SearchBar from "../components/Search/SearchBar";
import SearchResults from "../components/Search/SearchResults";
import { useSearch } from "../components/Search/useSearch";
import { searchDurations } from "../lib/config";

const ChromeExtensionBanner = dynamic(
  import("../components/ChromeExtensionBanner"),
  { ssr: false }
);

// Easily adjustable top padding for the search input box when searching
const searchActiveTopPadding = 40; // px, adjust as needed

const Home = () => {
  const {
    search,
    searchResults,
    pageShown: [rawShowPage, setShowPage],
    handleChange,
  } = useSearch();

  const showPage = rawShowPage && !search;

  const searchBarRef = useRef(null);
  const [bannerWidth, setBannerWidth] = useState(null);

  useEffect(() => {
    function updateWidth() {
      if (searchBarRef.current) {
        setBannerWidth(searchBarRef.current.offsetWidth * 0.49);
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <PageLayout
      px={0}
      maxW="100vw"
      justifyContent="flex-start"
      imageUrl={`$${
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/images/advert.png`
          : "/images/advert.png"
      }`}
      hideHeader={search.trim() !== ''}
    >
      <Box pl="75px" width="100%">
        <Flex
          alignItems={"start"}
          justifyContent={"space-between"}
          flexDirection={"column"}
        >
          <VStack alignItems="flex-start" spacing={[2, 2, 2]} width="100%">
            <Box mb={[0, 0, 0]} alignSelf="flex-start">
              <Collapse
                in={showPage}
                transition={{
                  exit: { duration: searchDurations.exit / 2 },
                  enter: {
                    duration: (3 * searchDurations.enter) / 4,
                    delay: searchDurations.enter / 4,
                  },
                }}
              >
                <Box
                  pt={[0, 0, showPage ? "calc(5vh)" : "5px"]}
                  width={"215px"}
                  transitionDuration={"0.2s"}
                  transitionDelay={"0.2s"}
                  maxW={["60vw", "30vw", "20vw"]}
                  opacity={0.8}
                  style={{
                    aspectRatio: "1762/1403",
                  }}
                  alignSelf={"flex-start"}
                >
                  <chakra.img
                    src={"images/Goldy.png"}
                    alt={"Gopher logo"}
                    style={{
                      aspectRatio: "1762/1403",
                    }}
                  />
                </Box>
              </Collapse>
            </Box>
            <Collapse
              unmountOnExit={false}
              in={showPage}
              startingHeight={0.01}
              animateOpacity
              transition={{
                exit: { duration: searchDurations.exit },
                enter: { duration: searchDurations.enter },
              }}
            >
              <Heading
                fontSize={["40px", "45px", "80px"]}
                paddingTop={[0, 10, 0]}
                textAlign="left"
                bgGradient="linear(to-r, #3C3C3C 0%, #0F0F0F 100%)"
                bgClip="text"
                opacity={0.8}
              >
                Gopher Grades!
              </Heading>
              <Text
                maxW={["100%", "50%", "100%"]}
                style={{
                  color: "#7B7B7B",
                }}
                textAlign="left"
                py={[8, 10, 2]}
                fontWeight={300}
                fontSize={["16px", "18px", "21px"]}
              >
                View all the past grades for classes taken at the University of
                Minnesota, Twin Cities.
              </Text>
            </Collapse>
            <Box
              width="60%"
              pl={0}
              pr={0}
              ref={searchBarRef}
              pt={search.trim() ? `${searchActiveTopPadding}px` : 0}
            >
              <SearchBar
                placeholder={search || undefined}
                onChange={handleChange}
              />
              <Box
                display="flex"
                flexDirection="row"
                gap="2%"
                mt={6}
                width="100%"
              >
                <Box width="49%" borderRadius="2xl">
                  <Collapse in={showPage} animateOpacity style={{overflow: 'visible'}}>
                    <ChromeExtensionBanner
                      title="Explore Gropher Grades v3"
                      subtitle="AI Chatbot + Account Personalization"
                      image="/images/v3%20image.png"
                      link="/chrome"
                      width="100%"
                      source={"index"}
                    />
                  </Collapse>
                </Box>
                <Box width="49%" borderRadius="2xl">
                  <Collapse in={showPage} animateOpacity style={{overflow: 'visible'}}>
                    <ChromeExtensionBanner
                      title="Download Firefox Extension"
                      subtitle="Integrated with Schedule Builder"
                      image="/images/chrome%20image.png"
                      width="100%"
                      source={"index"}
                    />
                  </Collapse>
                </Box>
              </Box>
            </Box>
          </VStack>
        </Flex>
      </Box>
      <Box pl="5vw" pr="5vw">
        <SearchResults
          search={search}
          searchResults={searchResults}
          pageShown={[showPage, setShowPage]}
        />
      </Box>
      <Box pb={[200, 250, 100]} />
    </PageLayout>
  );
};

export default Home;
