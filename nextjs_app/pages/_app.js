import '../styles/globals.css'
import * as React from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import { SessionProvider } from "next-auth/react"
import createEmotionCache from '../components/createEmotionCache';
import ErrorBoundary from '../components/ErrorBoundary'
import { Layout, SimpleLayout } from '../components/layout'

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export default function App({Component, emotionCache = clientSideEmotionCache, pageProps: { session, ...pageProps },}) {
  const getLayout = Component.getLayout || null;
  if (getLayout) {
    return (
      <CacheProvider value={emotionCache}>
        <SessionProvider session={session}>
          {getLayout(<Component {...pageProps} />)}
        </SessionProvider>
      </CacheProvider>
    );
  }
  return (
    <CacheProvider value={emotionCache}>
      <SessionProvider session={session}>
        <Layout>
          <ErrorBoundary>
            <Component {...pageProps} />
          </ErrorBoundary>
        </Layout>
      </SessionProvider>
    </CacheProvider>
  );
}
