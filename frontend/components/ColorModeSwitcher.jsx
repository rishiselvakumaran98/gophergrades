// components/ColorModeSwitcher.jsx
import { useColorMode, IconButton } from '@chakra-ui/react';
import { FaSun, FaMoon } from 'react-icons/fa';

export const ColorModeSwitcher = (props) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const SwitchIcon = colorMode === 'light' ? FaMoon : FaSun;

  return (
    <IconButton
      size="md"
      fontSize="lg"
      aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
      variant="ghost"
      color="current"
      marginRight="auto"
      onClick={toggleColorMode}
      icon={<SwitchIcon />}
      {...props}
    />
  );
};