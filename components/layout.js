import Head from 'next/head'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Navbar from './navbar'
import Header from './header'
import { Lato, Inter } from 'next/font/google'

const lato = Lato({
  subsets: ['latin'],
  weight: ['100', '300', '400', '700', '900'],
})
const inter = Inter({ subsets: ['latin'] })

const theme = createTheme({
  typography: {
    fontFamily: lato.style.fontFamily,
    body1: {
      fontFamily: lato.style.fontFamily,
    },
    primary: {
      fontFamily: lato.style.fontFamily,
    },
    secondary: {
      fontFamily: lato.style.fontFamily,
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#9C2315',
    },
    secondary: {
      main: '#C66E4E',
    },
  },
});

export function Layout({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>Terracotta</title>
        <meta name="description" content="Terracotta LLM Management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Barlow&family=Bebas+Neue&family=Roboto+Condensed&display=swap" rel="stylesheet" />
      </Head>
      <Header />
      <Navbar />
      <main>{children}</main>
    </ThemeProvider>
  )
}

export function SimpleLayout({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>Canopy LLM Management</title>
        <meta name="description" content="Sharpen LLM Management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Barlow&family=Bebas+Neue&family=Roboto+Condensed&display=swap" rel="stylesheet" />
      </Head>
      <main>{children}</main>
    </ThemeProvider>
  )
}
