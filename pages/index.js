import Link from 'next/link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { Layout, SimpleLayout } from '../components/layout'
import ForestIcon from '@mui/icons-material/Forest';
import { GiPalmTree, GiPorcelainVase, GiClayBrick } from 'react-icons/gi';

import styles from '@/styles/Home.module.css'

export async function getServerSideProps(context) {
  const session = await getSession(context)

  if (session) {
    return {
      redirect: {
        destination: '/data',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default function Home() {
  return (
    <div className='homepage'>
      <div className='vertical-box'>
        <div className='large-space'/>
        <div className='medium-space'/>
        <div className='horizontal-box'>
          <GiClayBrick className='homepageicon'/>
          <Typography variant='h2' sx={{fontWeight: 'bold', letterSpacing: 1, fontSize: 80}} className='splash-title'>
            &nbsp;Terracotta.ai&nbsp;
          </Typography>
        </div>
      </div>

      <div>
        <Button variant='text' color='secondary' onClick={() => signIn()}
                className='homepagebutton'>Sign in</Button>
        <div className='medium-space'/>
        <div className='large-space'/>
      </div>
    </div>
  )
}

Home.getLayout = function getLayout(page) {
  return (
    <SimpleLayout>
      {page}
    </SimpleLayout>
  )
}
