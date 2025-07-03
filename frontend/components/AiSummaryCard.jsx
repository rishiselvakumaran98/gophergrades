import {
  Box,
  Heading,
  Text,
  Tag,
  Wrap,
  VStack,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import Card from './Card';
import GeminiIcon from './GeminiIcon';

const AiSummaryCard = ({ summary }) => {
  const { aiSummary, aiSummaryTags } = summary;
  const headingColor = useColorModeValue('gray.600', 'gray.300');
  const tagBg = useColorModeValue('gray.200', 'gray.600');
  const tagColor = useColorModeValue('gray.800', 'gray.100');

  if (!aiSummary && (!aiSummaryTags || aiSummaryTags.length === 0)) {
    return null;
  }

  return (
    <Card>
      <VStack spacing={4} align="stretch">
        {aiSummary && (
          <Box>
            <HStack spacing={2} mb={2}>
              <GeminiIcon color="purple.500" w={5} h={5} />
              <Heading size="md" color={headingColor}>
                AI Summary
              </Heading>
            </HStack>
            <Text fontSize="md" lineHeight="tall">
              {aiSummary}
            </Text>
          </Box>
        )}

        {aiSummaryTags && aiSummaryTags.length > 0 && (
            <Box>
                <HStack spacing={2} mb={3}>
                    <Heading size="md" color={headingColor}>
                        AI Tags
                    </Heading>
                </HStack>
                <Wrap>
                {aiSummaryTags.map((tag, index) => (
                    <Tag
                    key={index}
                    size="lg"
                    variant="solid"
                    bg={tagBg}
                    color={tagColor}
                    borderRadius="full"
                    >
                    {tag}
                    </Tag>
                ))}
                </Wrap>
            </Box>
        )}
      </VStack>
    </Card>
  );
};

export default AiSummaryCard;
