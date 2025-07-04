import React, { useRef } from "react";
import {
  Box,
  Collapse,
  Divider,
  Heading,
  useMediaQuery,
  VStack,
  Wrap,
  Flex, // Add Flex for horizontal layout
  Button, // Add Button
  Tag,
} from "@chakra-ui/react";
import PageLayout from "../../components/Layout/PageLayout";
import SearchBar from "../../components/Search/SearchBar";
import { getInstructorClasses, getInstructorInfo } from "../../lib/db";
import { distributionsToCards } from "../../components/distributionsToCards";
import { useSearch } from "../../components/Search/useSearch";
import SearchResults from "../../components/Search/SearchResults";
import BigNumberCard from "../../components/BigNumberCard";
import { getProfessorSummary, getProfessorReviews } from "../../lib/mongodb"; // Import the new function
import ReviewSection from "../../components/ReviewSection";
import AiSummaryCard from "../../components/AiSummaryCard"; // Import the new component

export default function Prof({ profData, summary, reviewsData }) {
  const {
    id,
    name,
    distributions,
    RMP_link: RMPLink,
    RMP_score: RMPScore,
    RMP_diff: RMPDiff,
  } = profData;
  const [isMobile] = useMediaQuery("(max-width: 550px)");

  const {
    search,
    searchResults,
    pageShown: [showPage, setShowPage],
    handleChange,
  } = useSearch();

  const reviewsRef = useRef(null);

  const handleScrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // map all class distribution to a proper format:
  const formattedDistributions = distributions
    .map((dist) => ({
      ...dist,
      title: `${dist.dept_abbr} ${dist.course_num}: ${dist.class_desc}`,
      href: `/class/${dist.dept_abbr}${dist.course_num}`,
    }))
    // sort by number of students
    .sort((a, b) => b.students - a.students);

  const totalDistribution = {
    // take every distribution's grades map and sum up each key
    grades: formattedDistributions.reduce(
      (acc, curr) => ({
        ...acc,
        ...Object.fromEntries(
          Object.entries(curr.grades).map(([key, val]) => [
            key,
            (acc[key] || 0) + val,
          ])
        ),
      }),
      {}
    ),
    students: formattedDistributions.reduce(
      (acc, curr) => acc + (curr.students || 0),
      0
    ),
    title: "All Courses",
    isSummary: true,
    info: "This total also includes classes that they may not teach anymore.",
    distribution_id: id,
  };

  const totalDistributions = distributionsToCards(
    [totalDistribution],
    isMobile
  );

  const renderedDistributions = distributionsToCards(
    formattedDistributions,
    isMobile,
    "NONE"
  );

  return (
    <PageLayout
      title={`${name} | GopherGrades`}
      imageURL={`${
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : ""
      }/api/image/prof/${id}`}
    >
      <Box py={8} align={"start"} width={"100%"}>
        <SearchBar placeholder={search || undefined} onChange={handleChange} />
        <SearchResults
          searchResults={searchResults}
          search={search}
          pageShown={[showPage, setShowPage]}
        />
        <Collapse
          in={showPage}
          animateOpacity
          style={{
            width: "100%",
            paddingRight: 10,
            paddingLeft: 10,
          }}
        >
          {/* <Heading my={4}>{name}</Heading> */}
          <Flex
            alignItems="center"
            justifyContent="space-between"
            width="100%"
            my={4}
          >
            <Heading>{name}</Heading>
            {/* Add the Reviews button */}
            <Button
              onClick={handleScrollToReviews}
              variant="outline"
              colorScheme="red" // This will use the red color from your Chakra theme
              borderColor="red.500"
              size="md"
            >
              Reviews
            </Button>
          </Flex>
          <VStack spacing={4} align={"start"} pb={4} minH={"60vh"}>
            {totalDistributions}

            {summary && (
              <Wrap spacing={"8px"} width={"100%"} overflow={"visible"} mb={2}>
                <BigNumberCard
                  href={RMPLink}
                  source={"Rate My Professor"}
                  val={summary.avgQuality.toFixed(1)}
                  outOf={5}
                />
                <BigNumberCard
                  href={RMPLink}
                  source={"Difficulty"}
                  val={summary.avgDifficulty.toFixed(1)}
                  outOf={5}
                />
              </Wrap>
            )}
            {/* This will render the AiSummaryCard if summary data exists */}
            {summary && (
              <Box pt={2} pb={2} width="100%">
                <AiSummaryCard summary={summary} />
              </Box>
            )}
            <Divider
              orientation={"horizontal"}
              style={{
                borderColor: "#49080F",
                borderBottomWidth: 1,
                opacity: 0.15,
              }}
            />
            {renderedDistributions}

            {reviewsData && reviewsData.reviews.length > 0 && (
              <Box ref={reviewsRef} pt={8} width="100%">
                {/* THE FIX: Use a Flex container to display the heading and count */}
                <Flex align="center" mb={4}>
                  <Heading size="lg" mr={3}>
                    Student Reviews
                  </Heading>
                  {/* Display the total review count in a Tag */}
                  <Tag size="lg" variant="solid" colorScheme="gray" borderRadius="full">
                    {summary.totalReviews}
                  </Tag>
                </Flex>
                <ReviewSection
                  initialReviewsData={reviewsData}
                  profName={name}
                />
              </Box>
            )}
          </VStack>
        </Collapse>
      </Box>
    </PageLayout>
  );
}

export async function getServerSideProps({ res, params }) {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${60 * 60 * 24 * 7}, stale-while-revalidate=${
      60 * 60 * 24 * 30 // if loaded within a month, use the stale cache, but re-render in the background
    }`
  );
  if (!params.profCode) {
    return {
      redirect: {
        destination: `/`,
        permanent: false,
      },
    };
  }

  const { profCode } = params;

  const info = await getInstructorInfo(profCode);

  if (info.length === 0) {
    return {
      redirect: {
        destination: `/?q=${profCode}`,
        permanent: false,
      },
    };
  }

  const distributions = await getInstructorClasses(profCode);
  const profName = info[0].name;
  const summaryData = await getProfessorSummary(profName);
  const reviewsData = await getProfessorReviews(profName, 1); // Fetch the first page
  
  let serializableSummary = null;
  if (summaryData) {
    if (summaryData.summaryLastUpdated)
    serializableSummary = { ...summaryData };
    const lastUpdated = serializableSummary.summaryLastUpdated;
    if (lastUpdated && lastUpdated instanceof Date) {
      serializableSummary.summaryLastUpdated = lastUpdated.toISOString();
    }
  }
    

  return {
    props: {
      profData: {
        ...info[0],
        distributions,
      },
      summary: serializableSummary || null,
      reviewsData: reviewsData || null,
    },
  };
}
