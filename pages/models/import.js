import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Box from '@mui/material/Box';
import { FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"

import styles from '@/styles/Data.module.css'

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

export default function Import() {
    const [provider, setProvider] = useState('');
    const [error, setError] = useState();
    const [type, setType] = useState('classification');
    const [importableModels, setImportableModels] = useState([]);
    const [importModel, setImportModel] = useState({});
    const [modelName, setModelName] = useState('');
    const router = useRouter()
  
    const handleProviderChange = (provider) => {
      setProvider(provider);
      setImportModel({});
      let p = '';
      if (localStorage.getItem("project")) {
        p = localStorage.getItem("project");
      };
      axios.post("/api/models/import/list", {
        projectName: p,
        }).then((res) => {
          console.log(res.data);
          setError();
          setImportableModels(res.data);
        }).catch((err) => {
          console.log(err);
          setError(err.response.data.error);
        });
    }

    const handleImportModel = () => {
        let p = '';
        if (localStorage.getItem("project")) {
            p = localStorage.getItem("project");
        };
        axios.post("/api/models/import/add", {
            projectName: p,
            modelName: modelName,
            model: importModel,
            }).then((res) => {
              setError();
            }).catch((err) => {
              console.log(err);
              setError(err.response.data.error);
            });
    }


  
    return (
      <div className='main'>
        <div className='horizontal-box full-width'>
          <div className='horizontal-box'>
            <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon cursor-pointer'/>
            <Typography variant='h4' className='page-main-header'>
              Import Model
            </Typography>
          </div>
        </div>
        <div className='small-space' />
  
        <Paper className='card vertical-box' variant='outlined'>
          <div className='medium-space' />
          <FormControl>
            <InputLabel id="provider-label">Provider</InputLabel>
            <Select
                labelId="provider-label"
                className="wide-select"
                label="Provider"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                required
            >
              <MenuItem value={'openai'}>OpenAI</MenuItem>
              <MenuItem value={'cohere'}>Cohere</MenuItem>
            </Select>
          </FormControl>
          <div className='tiny-space' />
          <FormControl>
            <InputLabel id="model-label">Model</InputLabel>
            <Select
                labelId="model-label"
                className="wide-select"
                label="Model"
                value={importModel}
                onChange={(e) => setImportModel(e.target.value)}
                required
            >
              {importableModels.map((model) => (
                <MenuItem value={model} key={model.id}>{model.id}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <div className='small-space' />
            <TextField
              label="Model name"
              variant="outlined"
              className='text-label center'
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
            />
          <div className='medium-space' />
          {importModel !== {}? 
            <div>
                <Box sx={{textAlign: 'left'}}>
                <Typography>Finetune ID: {importModel.id}</Typography>
                <Typography>Architecture: {importModel.model}</Typography>
                <Typography>Model name: {importModel.fine_tuned_model}</Typography>
                </Box>
                <div className='small-space' />
            </div>
          : null}
          
          {error ? <Typography variant='body2' color='red'>Error: {error}</Typography> : null}
          <Button variant='contained' color="primary" onClick={handleImportModel}>Import Model</Button>
        </Paper>
      </div>
    )
  }