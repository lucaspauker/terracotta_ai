import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
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

// TODO add user input for model name
export default function Train() {
  const [provider, setProvider] = useState('');
  const [modelArchitecture, setModelArchitecture] = useState('');
  const [dataset, setDataset] = useState('');
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [modelName, setModelName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter()

  const handleFinetune = () => {
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project")
    }
    axios.post("/api/finetune/finetune", {
        provider: provider,
        modelArchitecture: modelArchitecture,
        modelName: modelName,
        dataset: dataset,
        projectName: projectName,
      }).then((res) => {
        console.log(res.data);
        setError();
      }).catch((error) => {
        console.log(error);
        setError(error.response.data);
      });
  }

  useEffect(() => {
    let p = '';
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
    };
    axios.post("/api/data/list", {
        projectName: p,
      }).then((res) => {
        if (res.data !== "No data found") {
          setDatasets(res.data);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <div className='main'>
      <Button variant='contained' color="secondary" onClick={() => router.back()}>
        Back
      </Button>
      <Typography variant='h4' className='page-main-header'>
        Train Model
      </Typography>
      <div className='medium-space' />

      <Typography variant='body1'>
        Base model
      </Typography>
      <div className='tiny-space' />
      <FormControl>
        <InputLabel id="provider-label">Provider</InputLabel>
        <Select
          labelId="provider-label"
          className="simple-select"
          label="Provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <MenuItem value={'openai'}>OpenAI</MenuItem>
          <MenuItem value={'anthropic'}>Anthropic</MenuItem>
        </Select>
      </FormControl>
      <FormControl className='button-margin' disabled={provider !== 'openai'}>
        <InputLabel id="model-label">Model Architecture</InputLabel>
        <Select
          labelId="model-label"
          className="simple-select"
          value={modelArchitecture}
          label="Model"
          onChange={(e) => setModelArchitecture(e.target.value)}
        >
          <MenuItem value={'ada'}>Ada</MenuItem>
          <MenuItem value={'babbage'}>Babbage</MenuItem>
          <MenuItem value={'curie'}>Curie</MenuItem>
          <MenuItem value={'davinci'}>Davinci</MenuItem>
        </Select>
      </FormControl>
      <div className='medium-space' />

      <Typography variant='body1'>
        Dataset
      </Typography>
      <div className='tiny-space' />
      {loading ?
        <CircularProgress /> :
        <FormControl>
          <InputLabel id="dataset-label">Dataset</InputLabel>
          <Select
            labelId="dataset-label"
            className="simple-select"
            value={dataset}
            label="Dataset"
            onChange={(e) => setDataset(e.target.value)}
          >
            {datasets.map((d, i) => (
              <MenuItem value={d.name} key={i}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      }
      <div className='medium-space' />

      <Button variant='contained' color="primary" onClick={handleFinetune}>Finetune</Button>
    </div>
  )
}
