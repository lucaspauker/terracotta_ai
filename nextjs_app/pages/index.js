import { useState } from 'react';
import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { Layout, SimpleLayout } from '../components/layout'
import { AccountTree, FlashOn, Cloud } from '@mui/icons-material';
import { GiClayBrick } from 'react-icons/gi';
import { BsCheckLg } from 'react-icons/bs';
import axios from 'axios';

export default function Home() {
  const [email, setEmail] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);

  const signUpEmailList = () => {
    setEmail('');
    axios.post("/api/email/add", {
        email: email,
      }).then((res) => {
        setEmailSuccess(true);
        setTimeout(function() { setEmailSuccess(false); }, 5000);
        console.log(res.data);
      }).catch((err) => {
        setEmailSuccess(false);
        console.log(err);
      });
  }

  return (
    <div className='homepage'>
      <div className="top-content">
        <div className='header horizontal-box full-width'>
          <Typography className="logo horizontal-box" variant="h1">
            <GiClayBrick style={{marginRight: 10}}/>
            Terracotta
          </Typography>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{width: 300, marginRight: 2}}
          />
          {emailSuccess ?
            <Button variant='contained' color='primary' size='small' onClick={signUpEmailList}
              sx={{width:75}}>
              <BsCheckLg size={20}/>
            </Button>
            :
            <Button variant='contained' color='primary' size='small' onClick={signUpEmailList}
              sx={{width:75}}>
              Sign Up
            </Button>
          }
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
