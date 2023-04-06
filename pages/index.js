import Link from 'next/link';
import Typography from '@mui/material/Typography';

import styles from '@/styles/Home.module.css'

export default function Home() {
  return (
    <main className={[styles.main, 'main'].join(' ')}>
      <Typography>
        Welcome to the home page!
      </Typography>
    </main>
  )
}
