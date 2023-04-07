import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { Layout, SimpleLayout } from '../components/layout'
import ForestIcon from '@mui/icons-material/Forest';

import styles from '@/styles/Home.module.css'

export async function getServerSideProps(context) {
  const session = await getSession(context)

  if (session) {
    return {
      redirect: {
        destination: '/dashboard',
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
      <div className='horizontal-box'>
        <ForestIcon className='homepageicon'/>
        <Typography variant='h2' sx={{fontWeight: 500}}>
          &nbsp;Canopy AI Labs&nbsp;
        </Typography>
        <ForestIcon className='homepageicon'/>
      </div>
      <div className='large-space'/>

      <div>
        <Button variant='contained' color='secondary' size='large' onClick={() => signIn()}>Sign in</Button>
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
