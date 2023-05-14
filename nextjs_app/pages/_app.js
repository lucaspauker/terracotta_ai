import '@/styles/globals.css'
import { Layout, SimpleLayout } from '../components/layout'
import { SessionProvider } from "next-auth/react"

export default function App({ Component, pageProps: { session, ...pageProps },}) {
  const getLayout = Component.getLayout || null;

  if (getLayout) {
    return (
      <SessionProvider session={session}>
        {getLayout(<Component {...pageProps} />)}
      </SessionProvider>
    );
  }
  return (
    <SessionProvider session={session}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </SessionProvider>
  );
}
