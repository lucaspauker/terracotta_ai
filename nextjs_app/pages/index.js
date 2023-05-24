import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { Layout, SimpleLayout } from '../components/layout'
import ForestIcon from '@mui/icons-material/Forest';
import { AccountTree, FlashOn, Cloud } from '@mui/icons-material';

import styles from '@/styles/Home.module.css'

export async function getServerSideProps(context) {
  const session = await getSession(context)

  if (session) {
    return {
      redirect: {
        destination: '/projects',
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
      <div className="top-content">
        <div className='header horizontal-box full-width'>
          <Typography className="logo" variant="h1">Terracotta</Typography>
          <Button variant='contained' color='primary' size='large' onClick={() => signIn()}>Sign in</Button>
        </div>
        <div className='hero-image'></div>

        <div className='main-box'>
          <Typography className='main-box-header'>Finetune large language models fast and easily</Typography>
          <Typography className='main-box-subheader'>With Terracotta, quickly finetune powerful models such as GPT-3</Typography>
        </div>
      </div>
      <div className='information'>
        <div className='information-element'>
          <AccountTree className='icon' color="primary"/>
          <Typography variant="h3" className='part-header'>Manage many models</Typography>
          <Typography className='part-subtext'>Manage all your finetuned models in one place.</Typography>
        </div>

        <div className='information-element'>
          <FlashOn className='icon' color="primary"/>
          <Typography variant="h3" className='part-header'>Iterate quickly</Typography>
          <Typography className='part-subtext'>Improve models with easy qualitative and quantitative evaluation.</Typography>
        </div>

        <div className='information-element'>
          <Cloud className='icon' color="primary"/>
          <Typography variant="h3" className='part-header'>Multiple providers</Typography>
          <Typography className='part-subtext'>Connect to OpenAI and Cohere.</Typography>
        </div>
      </div>

      <div className='email-list-form'>
        <Typography variant="h3" className="email-header">Sign up for our email list</Typography>
        <div className='email-form-container horizontal-box'>
          <TextField
            label='Email'
            variant='outlined'
            size='small'
            sx={{width: 300, marginRight: 2}}
          />
          <Button variant='contained' color='primary' size='small'>
            Sign Up
          </Button>
        </div>
      </div>

      <div className='footer'>
        <Typography>Copyright © 2023 Terracotta AI</Typography>
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
