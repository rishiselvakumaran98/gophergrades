import { SessionProvider, useSession } from 'next-auth/react';
import { ChakraProvider } from "@chakra-ui/react";
import Header from '../components/Header';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import theme from '../theme';

import { useProfile } from '../hooks/useProfile';


function AppLogic({ Component, pageProps }) {
  const router = useRouter();
  const { status } = useSession();
  const { isNewUser, isLoading } = useProfile();

  useEffect(() => {
    if (!isLoading && isNewUser && router.pathname !== '/profile/setup') {
      router.push('/profile/setup');
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

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <ChakraProvider theme={theme}>
        <AppLogic Component={Component} pageProps={pageProps} />
      </ChakraProvider>
    </SessionProvider>
  );
}

export default MyApp;
