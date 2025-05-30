// theme.ts
import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import { IBM_Plex_Sans, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
  fallback: ["system-ui", "arial"],
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: "700",
  subsets: ["latin"],
  variable: '--font-ibm-plex-sans',
  display: "block",
});

const newColors = {
  primaryNeon: "#00FFFF",   // Cyan (We'll replace its use for the title)
  secondaryNeon: "#FF00FF", // Magenta
  accentNeon: "#39FF14",    // Lime Green
  textBright: "#F5F5F5",    // Slightly softer bright white for better readability
  textSubtle: "#BDBDBD",   // Softer subtle text
  backgroundDark: "#121212", 
  cardDarkBg: "#1E1E1E",     
  titanium: "#434B4D",
};

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    body: `var(${inter.variable}), sans-serif`,
    heading: `var(${ibmPlexSans.variable}), sans-serif`,
  },
  colors: {
    brand: {
      maroon: "#7A0019",
      gold: "#FFCC33", // UMN Gold
      neonMaroon: "#A0002C", // A slightly brighter maroon for dark mode buttons

    },
    neon: newColors, // Keep your other neon colors accessible
    metal: { // Adding a new category for metallic colors
      titanium: newColors.titanium,
    }
  },
  semanticTokens: {
    colors: {
      pageBackground: {
        default: 'gray.50',
        _dark: newColors.backgroundDark,
      },
      cardBackground: {
        default: 'white',
        _dark: newColors.cardDarkBg,
      },
      // --- NAVBAR BACKGROUND MODIFICATION ---
      navbarBackground: {
        default: 'white', // Or your light mode navbar color e.g., 'gray.100'
        _dark: 'metal.titanium', // Titanium for dark mode
      },
      primaryText: {
        default: 'gray.800',
        _dark: newColors.textBright,
      },
      secondaryText: {
        default: 'gray.600',
        _dark: newColors.textSubtle,
      },
      // --- "GOPHER GRADES!" TITLE COLOR MODIFICATION ---
      accentText: {
        default: 'brand.maroon',
        _dark: 'brand.gold', // UMN Gold for dark mode
      },
      accentText2: {
        default: 'blue.500',
        _dark: 'neon.secondaryNeon',
      },
      buttonNeonBg: {
        default: 'brand.maroon',
        _dark: 'neon.accentNeon',
      },
      buttonNeonText: {
        default: 'white',
        _dark: 'black',
      },
      iconColor: {
        default: 'gray.600',
        _dark: newColors.textBright,
      }
    },
  },
  components: {
    Heading: {
      baseStyle: (props: Record<string, any>) => ({
        fontWeight: "700",
        // The 'accentText' semantic token will now handle the Gopher Grades title color
        // So, we can make this more general if needed, or specific variants.
        // For example, if all h1 should use accentText:
        color: props.as === 'h1' ? 'accentText' : (props.colorMode === 'dark' ? 'neon.textBright' : 'brand.maroon'),
        letterSpacing: "-0.05em",
      }),
      variants: {
        'neon-title': (props: Record<string, any>) => ({
          color: props.colorMode === 'dark' ? 'brand.gold' : 'brand.maroon',
          textShadow: props.colorMode === 'dark' ? `0 0 5px #FFCC33, 0 0 10px #FFCC33` : 'none',
        })
      }
    },
    Text: { // Ensure general text is readable in dark mode
        baseStyle: (props: Record<string, any>) => ({
            color: props.colorMode === 'dark' ? 'primaryText' : 'inherit', // Uses semantic token
        })
    },
    // ... (Keep your Button and Input variant styles)
  },
});

export { inter, ibmPlexSans };
export default theme;