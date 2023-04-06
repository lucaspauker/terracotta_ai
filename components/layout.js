import Head from 'next/head'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Navbar from './navbar'
import Header from './header'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#9fa8da',
    },
    secondary: {
      main: '#ff8a65',
    },
  },
});

export default function Layout({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>Canopy LLM Management</title>
        <meta name="description" content="Sharpen LLM Management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <Navbar />
      <main>{children}</main>
    </ThemeProvider>
  )
}
