import { useState, useEffect } from 'react';
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
import axios from 'axios';

import styles from '@/styles/Data.module.css'

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [openAiKey, setOpenAiKey] = useState('');
  const [cohereKey, setCohereKey] = useState('');
  const [showOpenAiPassword, setShowOpenAiPassword] = useState(false);
  const [showCoherePassword, setShowCoherePassword] = useState(false);

  const updateApiKeys = (provider) => {
    let body = {};
    if (provider === "openai") {
      console.log("Updating OpenAI API key");
      body = {openAiKey: openAiKey};
    } else if (provider === "cohere") {
      console.log("Updating Cohere API key");
      body = {cohereKey: cohereKey};
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

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
           Settings
        </Typography>
        <div/>
      </div>
      <div className='tiny-space' />

      <div className='main-content'>
        <Paper className='card vertical-box' variant='outlined'>
          <Typography variant='h6'>API Keys</Typography>
          <div className='small-space'/>
          <div className='horizontal-box'>
            <TextField
              label="OpenAI API key"
              variant="outlined"
              className='text-label center'
              value={showOpenAiPassword ? openAiKey : openAiKey.substr(0, 24)}
              onChange={(e) => setOpenAiKey(e.target.value)}
              type={showOpenAiPassword ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowOpenAiPassword(!showOpenAiPassword)}
                  >
                    {showOpenAiPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                )
              }}
            />
            <Button onClick={() => updateApiKeys("openai")} variant='contained' sx={{marginLeft: 1}}>Save</Button>
          </div>
          <div className='small-space'/>
          <div className='horizontal-box'>
            <TextField
              label="Cohere API key"
              variant="outlined"
              className='text-label center'
              value={showCoherePassword ? cohereKey: cohereKey.substr(0, 24)}
              onChange={(e) => setCohereKey(e.target.value)}
              type={showCoherePassword ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowCoherePassword(!showCoherePassword)}
                  >
                    {showCoherePassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                )
              }}
            />
            <Button onClick={() => updateApiKeys("cohere")} variant='contained' sx={{marginLeft: 1}}>Save</Button>
          </div>
        </Paper>
      </div>
    </div>
  )
}
