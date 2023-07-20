import { useState, useEffect } from 'react';
import Head from 'next/head'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Navbar from './navbar'
import Header from './header'
import { Lato, Inter, Bebas_Neue } from 'next/font/google'

const lato = Lato({
  subsets: ['latin'],
  weight: ['100', '300', '400', '700', '900'],
})
const inter = Inter({ subsets: ['latin'] })
const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
})

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
    h1: {
      fontFamily: bebas.style.fontFamily,
      letterSpacing: '2px',
    },
    h2: {
      fontFamily: bebas.style.fontFamily,
      letterSpacing: '2px',
    },
    h3: {
      fontFamily: bebas.style.fontFamily,
      letterSpacing: '1px',
    },
    h4: {
      fontFamily: bebas.style.fontFamily,
      letterSpacing: '1px',
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
  const [expanded, setExpanded] = useState(true);
  const [width, setWidth] = useState(250);  // Navbar width

  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>Terracotta</title>
        <meta name="description" content="Terracotta LLM Management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header navbarExpanded={expanded} navbarWidth={width} />
      <Navbar expanded={expanded} setExpanded={setExpanded} width={width} setWidth={setWidth}/>
      <main style={{width:`calc(100% - ${width}px)`, marginLeft:`${width}px`, transition: 'all 1s'}}>
        {children}
      </main>
    </ThemeProvider>
  )
}

export function SimpleLayout({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>Terracotta</title>
        <meta name="description" content="Experiment with LLMs quickly and intuitively" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main>{children}</main>
    </ThemeProvider>
  )
}
