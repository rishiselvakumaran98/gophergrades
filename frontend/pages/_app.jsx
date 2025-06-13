import { ChakraProvider } from "@chakra-ui/react";
import Header from '../components/Header';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import theme from '../theme';
import AuthManager from '../components/AuthManager';
import { useProfile } from '../hooks/useProfile';


function AppLogic({ Component, pageProps }) {
  const router = useRouter();

  const { isNewUser, isLoading } = useProfile();

  useEffect(() => {
    if (!isLoading && isNewUser && router.pathname !== '/profile') {
      router.push('/profile');
    }
  }, [isNewUser, isLoading, router]);

  return (
    <>
      <Header />
      <main style={{ padding: '1rem 2rem' }}>
        <Component {...pageProps} />
      </main>
    </>
  );
}

function MyApp({ Component, pageProps }) {
  return (
      <ChakraProvider theme={theme}>
        <AuthManager />
        <AppLogic Component={Component} pageProps={pageProps} />
      </ChakraProvider>
  );
}

export default MyApp;
