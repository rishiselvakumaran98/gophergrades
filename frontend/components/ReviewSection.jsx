import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Button,
  VStack,
  IconButton,
  ChevronLeftIcon,
  ChevronRightIcon,
  HStack,
  Spinner,
  Text,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import ReviewCard from './ReviewCard';

const ReviewSection = ({ initialReviewsData, profName }) => {
  const [reviews, setReviews] = useState(initialReviewsData ? initialReviewsData.reviews : []);
  const [currentPage, setCurrentPage] = useState(initialReviewsData ? initialReviewsData.currentPage : 1);
  const [totalPages, setTotalPages] = useState(initialReviewsData ? initialReviewsData.totalPages : 1);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(currentPage);
  // const headingColor = useColorModeValue('gray.700', 'gray.200');

  useEffect(() => {
    setReviews(initialReviewsData.reviews);
    setCurrentPage(initialReviewsData.currentPage);
    setTotalPages(initialReviewsData.totalPages);
  }, [initialReviewsData]); // The dependency array is the key to making this work.



   const fetchPage = async (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(profName)}?page=${pageNumber}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
        // Scroll to the top of the review section when changing pages
        document.getElementById('review-section-top')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error("Failed to fetch reviews for page", pageNumber, error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!reviews || reviews.length === 0) {
    return <Text>No reviews available for this professor.</Text>;
  }

  return (
    <VStack spacing={4} align="stretch" id="review-section-top">
      {isLoading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" />
        </Flex>
      ) : (
        reviews.map((review) => (
          <ReviewCard key={review._id} review={review} />
        ))
      )}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <HStack justify="center" align="center" spacing={4} mt={4}>
          <IconButton
            icon={<ChevronLeftIcon />}
            aria-label="Previous Page"
            onClick={() => fetchPage(currentPage - 1)}
            isDisabled={currentPage <= 1 || isLoading}
          />
          <Text>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </Text>
          <IconButton
            icon={<ChevronRightIcon />}
            aria-label="Next Page"
            onClick={() => fetchPage(currentPage + 1)}
            isDisabled={currentPage >= totalPages || isLoading}
          />
        </HStack>
      )}
    </VStack>
  );
};

export default ReviewSection;
