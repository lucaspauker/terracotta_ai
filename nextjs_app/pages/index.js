import { useState, useEffect } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { Layout, SimpleLayout } from '../components/layout'
import { GiClayBrick } from 'react-icons/gi';
import { BsCheckLg, BsDiscord } from 'react-icons/bs';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CalculateIcon from '@mui/icons-material/Calculate';
import TwitterIcon from '@mui/icons-material/Twitter';
import EmailIcon from '@mui/icons-material/Email';
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
        setTimeout(function() { setEmailSuccess(false); }, 2000);
        console.log(res.data);
      }).catch((err) => {
        setEmailSuccess(false);
        console.log(err);
      });
  }

  return (
    <div className='homepage'>
      <div className="top-content fade-in-animation">
        <div className='header horizontal-box full-width'>
          <Typography className="logo horizontal-box" variant="h1">
            <GiClayBrick style={{marginRight: 10}}/>
            Terracotta
          </Typography>
          <Button className='sign-in-button' variant='contained' color='primary' size='large' onClick={() => signIn()}>Sign in with google or github</Button>
        </div>
        <div className='hero-image'></div>

        <div className='main-box'>
          <Typography className='main-box-header'>Experiment with LLMs rapidly and easily</Typography>
          <Typography className='main-box-subheader'>
            With Terracotta, supercharge your LLM development workflow through our easy-to-use platform.
          </Typography>
        </div>
      </div>
      <div className='information'>
        <div className='information-element'>
          <AccountTreeIcon className='icon' color="primary"/>
          <Typography variant="h3" className='part-header'>Manage many models</Typography>
          <Typography className='part-subtext'>Manage all your fine-tuned models in one place.</Typography>
        </div>
        <div className='information-element'>
          <FlashOnIcon className='icon' color="primary"/>
          <Typography variant="h3" className='part-header'>Iterate quickly</Typography>
          <Typography className='part-subtext'>Improve models with easy qualitative and quantitative evaluation.</Typography>
        </div>
        <div className='information-element'>
          <CloudIcon className='icon' color="primary"/>
          <Typography variant="h3" className='part-header'>Multiple providers</Typography>
          <Typography className='part-subtext'>Connect to OpenAI and Cohere.</Typography>
        </div>
      </div>

      <Divider className='homepage-divider' />

      <Typography variant='h2' className="homepage-subtitle">How does Terracotta work?</Typography>
      <div className='workflow-boxes'>
        <div className='workflow-box'>
          <div className="screenshot-container">
            <Box
              component='img'
              src='view_data_screenshot.png'
              alt='Data view screenshot'
              className='homepage-screenshot'
            />
          </div>
          <div className='screenshot-text-container'>
            <div className='vertical-box flex-start'>
              <div className='medium-space'/>
              <Typography variant='h3' className='horizontal-box'>
                <CloudUploadIcon sx={{fontSize: 64, marginRight: 2, marginBottom: 1}} />
                Upload your data
              </Typography>
              <div className='small-space' />
              <Typography variant='body1' className='workflow-body'>
                The first step in the process of fine-tuning a large language model
                is to upload your data.
                At the core of good models is good data.
                Use Terracotta to securely store your data to later use for fine-tuning a model.
              </Typography>
            </div>
          </div>
        </div>
        <div className='workflow-box'>
          <div className='screenshot-text-container'>
            <div className='vertical-box flex-start'>
              <Typography variant='h3' className='horizontal-box'>
                <RocketLaunchIcon sx={{fontSize: 64, marginRight: 2, marginBottom: 1}} />
                Fine-tune models
              </Typography>
              <div className='small-space' />
              <Typography variant='body1' className='workflow-body'>
                Fine-tune models on your data for both classification and text
                generation.
                We make the process of fine-tuning a model as easy as a few clicks.
              </Typography>
            </div>
          </div>
          <div className="screenshot-container">
            <Box
              component='img'
              src='model_screenshot.png'
              alt='Models view screenshot'
              className='homepage-screenshot-left'
            />
          </div>
        </div>
        <div className='workflow-box'>
          <div className="screenshot-container">
            <div className='offset-box'>
              <Box
                component='img'
                src='evaluation_screenshot.png'
                alt='Evaluation view screenshot'
                className='homepage-screenshot'
              />
            </div>
          </div>
          <div className='screenshot-text-container'>
            <div className='vertical-box flex-start'>
              <Typography variant='h3' className='horizontal-box'>
                <CalculateIcon sx={{fontSize: 64, marginRight: 2, marginBottom: 1}} />
                Create evaluations
              </Typography>
              <div className='small-space' />
              <Typography variant='body1' className='workflow-body'>
                Compare your models both qualitatively and quantitatively. For
                qualitative evaluation, feed prompts to various models at the same
                time and compare the model outputs. For quantitative evaluation, use
                our tool to evaluate models on datasets with a variety of evaluation
                metrics including accuracy, BLEU, and confusion matrices.
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <Divider className='homepage-divider' />

      <div className='vertical-box team-box'>
        <Typography variant='h2' className="homepage-subtitle">Our Team</Typography>
        <Typography variant='body1'>
          Terracotta was created by <Link className='link' target="_blank" href='https://www.linkedin.com/in/beri-kohen-behar-321302193/'>Beri Kohen</Link> and <Link className='link' target="_blank" href='https://www.linkedin.com/in/lucas-pauker-7b4571150/'>Lucas Pauker</Link>, two Stanford AI graduates excited about LLMs.
        </Typography>
      </div>

      <div className='homepage-space' />
      <Divider className='homepage-divider' />

      <div className='email-list-form'>
        <div className='vertical-box' style={{alignItems:'flex-start'}}>
          <Typography variant="h3" className="email-header">Sign up for our email list</Typography>
          <Typography className="part-subtext">We will keep you updated about what we are working on!</Typography>
        </div>
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
            <Button variant='contained' size='small' onClick={signUpEmailList}
              sx={{width:75}} className='green'>
              <BsCheckLg size={20}/>
            </Button>
            :
            <Button variant='contained' color='primary' size='small' onClick={signUpEmailList}
              sx={{width:75}} className='green-on-press'>
              Sign Up
            </Button>
          }
        </div>
      </div>

      <div className='footer'>
        <Typography>Copyright © 2023 Terracotta AI</Typography>
        <div className="small-space"/>
        <Link href="https://twitter.com/TerracottaAi" target="_blank">
          <IconButton>
            <TwitterIcon />
          </IconButton>
        </Link>
        <Link href="https://discord.gg/XA7eXACb" target="_blank">
          <IconButton>
            <BsDiscord />
          </IconButton>
        </Link>
        <Link href="mailto:lucas@terra-cotta.ai?subject=Hello">
          <IconButton>
            <EmailIcon />
          </IconButton>
        </Link>
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
