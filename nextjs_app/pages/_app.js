import '@/styles/globals.css'
import { Layout, SimpleLayout } from '../components/layout'
import { SessionProvider } from "next-auth/react"
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";


function createEmotionCache() {
 return createCache({ key: "css", prepend: true });
}
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
          <Component {...pageProps} />
        </Layout>
      </SessionProvider>
    </CacheProvider>
  );
}
