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

const getGradientColor = (rating, type) => {
  const value = Math.round(parseFloat(rating)); // Round to the nearest whole number
  if (isNaN(value)) return '#A0AEC0'; // A neutral gray for invalid data

  // Define the color scales based on your SVG example
  const qualityColors = {
    1: '#ff0000', // Red
    2: '#ec6c17', // Orange-Red
    3: '#ecc94b', // Yellow
    4: '#93ba41', // Light Green
    5: '#38a169', // Green
  };

  const difficultyColors = {
    1: '#38a169', // Green (Easy)
    2: '#93ba41', // Light Green
    3: '#ecc94b', // Yellow
    4: '#ec6c17', // Orange-Red
    5: '#ff0000', // Red (Hard)
  };

  if (type === 'quality') {
    return qualityColors[value] || '#A0AEC0';
  }
  
  if (type === 'difficulty') {
    return difficultyColors[value] || '#A0AEC0';
  }

  return '#A0AEC0'; // Default fallback
};

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
            {review.quality && (
                <Tag size="md" variant="solid" bg={getGradientColor(review.quality, 'quality')} color="white">
                    Quality: {review.quality} / 5
                </Tag>
            )}
            {review.difficulty && (
                <Tag size="md" variant="solid" bg={getGradientColor(review.difficulty, 'difficulty')} color="white">
                    Difficulty: {review.difficulty} / 5
                </Tag>
            )}
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
