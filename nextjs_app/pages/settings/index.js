import { useState, useEffect } from 'react';
import { getSession, useSession } from "next-auth/react"
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import { DataGrid } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { BsCheckLg } from 'react-icons/bs';
import axios from 'axios';

const InputApiBox = ({provider, apiKey, setKey, showPassword, setShowPassword,
    updateApiKeys, saveChecked}) => (
  <div className='horizontal-box'>
    <TextField
      size='small'
      label={provider === 'openai' ? "OpenAI API key" : "Cohere API key"}
      variant="outlined"
      className='text-label center'
      value={showPassword ? apiKey : apiKey.substr(0, 24)}
      onChange={(e) => setKey(e.target.value)}
      type={showPassword ? "text" : "password"}
      InputProps={{
        endAdornment: (
          <IconButton
            aria-label="toggle password visibility"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
          </IconButton>
        )
      }}
    />
    {saveChecked ?
      <Button onClick={() => updateApiKeys("cohere")} variant='contained' sx={{marginLeft: 1, width: 60}}>
        <BsCheckLg size={24}/>
      </Button>
      :
      <Button onClick={() => updateApiKeys(provider)} variant='contained' sx={{marginLeft: 1, width: 60}}>
        Save
      </Button>
    }
  </div>
);

export async function getServerSideProps(context) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [openAiKey, setOpenAiKey] = useState('');
  const [cohereKey, setCohereKey] = useState('');
  const [showOpenAiPassword, setShowOpenAiPassword] = useState(false);
  const [showCoherePassword, setShowCoherePassword] = useState(false);
  const [saveOpenAiChecked, setSaveOpenAiChecked] = useState(false);
  const [saveCohereChecked, setSaveCohereChecked] = useState(false);

  const updateApiKeys = (provider) => {
    let body = {};
    if (provider === "openai") {
      console.log("Updating OpenAI API key");
      setSaveOpenAiChecked(true);
      setTimeout(function() { setSaveOpenAiChecked(false); }, 2000);
      body = {apiKey: openAiKey, update: "openai"};
    } else if (provider === "cohere") {
      console.log("Updating Cohere API key");
      setSaveCohereChecked(true);
      setTimeout(function() { setSaveCohereChecked(false); }, 2000);
      body = {apiKey: cohereKey, update: "cohere"};
    } else {
      console.log("Provider not found, API keys not updated");
      return;
    }
    axios.post("/api/user/apikeys", body).then((res) => {
      }).catch((error) => {
        console.log(error);
      });
  }

  useEffect(() => {
    setLoading(true);
    axios.get("/api/user").then((res) => {
        setLoading(false);
        if (res.data.openAiKey) setOpenAiKey(res.data.openAiKey);
        if (res.data.cohereKey) setCohereKey(res.data.cohereKey)
      }).catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
           Settings
        </Typography>
        <div/>
      </div>
      <div className='tiny-space' />

      {loading ?
        <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
        :
        <div className='main-content'>
          <Paper className='card vertical-box' variant='outlined'>
            <Typography variant='h6'>API Keys</Typography>
            <div className='small-space'/>
            <div className='small-space'/>
            <InputApiBox
              provider="openai"
              apiKey={openAiKey}
              setKey={setOpenAiKey}
              showPassword={showOpenAiPassword}
              setShowPassword={setShowOpenAiPassword}
              updateApiKeys={updateApiKeys}
              setChecked={saveOpenAiChecked}
              saveChecked={saveOpenAiChecked}
            />
            <Typography variant='body2' className='form-label'>
              For information about how to add an OpenAI API key, refer to <Link href="https://www.howtogeek.com/885918/how-to-get-an-openai-api-key/" target='_blank' className='link'>this guide.</Link>
            </Typography>
            <div className='medium-space'/>
            <InputApiBox
              provider="cohere"
              apiKey={cohereKey}
              setKey={setCohereKey}
              showPassword={showCoherePassword}
              setShowPassword={setShowCoherePassword}
              updateApiKeys={updateApiKeys}
              saveChecked={saveCohereChecked}
            />
            <Typography variant='body2' className='form-label'>
              To get a Cohere API key, create an account and go to <Link href="https://dashboard.cohere.ai/api-keys" target='_blank' className='link'>this link.</Link>
            </Typography>
            <div className='small-space'/>
          </Paper>
        </div>
      }
    </div>
  )
}
