import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  VStack,
  Button,
  HStack,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import ReviewCard from './ReviewCard';

const ReviewsSection = ({ initialReviews, totalPages, currentPage, profName }) => {
  const [reviews, setReviews] = useState(initialReviews);
  const [page, setPage] = useState(currentPage);
  const [loading, setLoading] = useState(false);
  const headingColor = useColorModeValue('gray.700', 'gray.200');

  const fetchReviews = async (newPage) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews/${profName}?page=${newPage}`);
      const data = await response.json();
      setReviews(data.reviews);
      setPage(data.currentPage);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    }
    setLoading(false);
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      fetchReviews(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      fetchReviews(page - 1);
    }
  };
  
  if (!reviews || reviews.length === 0) {
      return null;
  }

  return (
    <Box w="100%" mt={8}>
      <Heading size="lg" mb={4} color={headingColor}>
        Student Reviews
      </Heading>
      {loading ? (
        <VStack>
            <Spinner />
        </VStack>
      ) : (
        <VStack spacing={4}>
          {reviews.map(review => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </VStack>
      )}
      <HStack mt={4} justify="center">
        <Button onClick={handlePrevPage} isDisabled={page <= 1 || loading}>
          Previous
        </Button>
        <Text>Page {page} of {totalPages}</Text>
        <Button onClick={handleNextPage} isDisabled={page >= totalPages || loading}>
          Next
        </Button>
      </HStack>
    </Box>
  );
};

export default ReviewsSection;
