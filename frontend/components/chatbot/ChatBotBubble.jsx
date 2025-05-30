// File: components/chatbot/ChatBotBubble.jsx
import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  useColorModeValue
} from '@chakra-ui/react';

import { ChatIcon, CloseIcon } from '@chakra-ui/icons';

const ChatBotBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const bg = useColorModeValue('white', 'gray.700');

  const toggleOpen = () => setIsOpen(!isOpen);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { from: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const res = await fetch('/api/chatbotTest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input })
      });
      const data = await res.json();
      const botMsg = { from: 'bot', text: data.reply };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box position="fixed" bottom={4} right={4} zIndex={1000}>
      <IconButton
        icon={isOpen ? <CloseIcon /> : <ChatIcon />}
        onClick={toggleOpen}
        aria-label="Chatbot Toggle"
        size="lg"
        isRound
      />

      {isOpen && (
        <Box
          width="300px"
          height="400px"
          bg={bg}
          boxShadow="lg"
          borderRadius="md"
          mt={2}
          display="flex"
          flexDirection="column"
          p={3}
        >
          <VStack spacing={2} flex="1" overflowY="auto">
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                alignSelf={msg.from === 'user' ? 'flex-end' : 'flex-start'}
                bg={msg.from === 'user' ? 'blue.100' : 'gray.100'}
                px={3}
                py={2}
                borderRadius="md"
                maxWidth="80%"
              >
                <Text fontSize="sm">{msg.text}</Text>
              </Box>
            ))}
          </VStack>

          <HStack mt={2}>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              size="sm"
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} size="sm">
              Send
            </Button>
          </HStack>
        </Box>
      )}
    </Box>
  );
};

export default ChatBotBubble;

