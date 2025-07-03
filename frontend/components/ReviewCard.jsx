import {
  Box,
  Text,
  VStack,
  HStack,
  Tag,
  Divider,
  useColorModeValue,
  Wrap,
} from '@chakra-ui/react';

const ReviewCard = ({ review }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'gray.100');

  const renderDetail = (label, value) => {
    if (value === null || value === undefined || value === -1 || value === "") return null;
    return (
        <Text fontSize="sm" color={textColor}>
            <Text as="span" fontWeight="600" color={headingColor}>{label}:</Text> {value.toString()}
        </Text>
    );
  };

  return (
    <Box
      p={5}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      bg={cardBg}
      w="100%"
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg" color={headingColor}>
            {review.courseCode || 'General Review'}
          </Text>
          <Text fontSize="sm" color={textColor}>{review.date}</Text>
        </HStack>
        <Divider />
        <HStack spacing={4}>
            {renderDetail("Quality", review.quality)}
            {renderDetail("Difficulty", review.difficulty)}
        </HStack>
        
        {review.reviewText && review.reviewText.trim() && (
          <Text fontStyle="italic" color={textColor}>"{review.reviewText.trim()}"</Text>
        )}
        
        <Wrap>
            {renderDetail("Grade", review.grade)}
            {renderDetail("Attendance", review.attendance)}
            {review.forCredit && renderDetail("For Credit", "Yes")}
            {review.onlineClass && renderDetail("Online", "Yes")}
        </Wrap>

        {review.tags && review.tags.length > 0 && (
            <Wrap>
                {review.tags.map(tag => tag && <Tag key={tag} size="sm">{tag}</Tag>)}
            </Wrap>
        )}
      </VStack>
    </Box>
  );
};

export default ReviewCard;
