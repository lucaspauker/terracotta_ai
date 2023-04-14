import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
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

export default function Train() {
  const [provider, setProvider] = useState('');
  const [modelArchitecture, setModelArchitecture] = useState('');
  const [dataset, setDataset] = useState('');
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [modelName, setModelName] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  // TODO: Change batch size initialization based on dataset size. OpenAI dynamically configures this
  // to be 0.2% of dataset size capped at 256. To do this, we need to store info about
  // dataset size in the datasets collection when it is uploaded.
  const hyperParams = {"n_epochs": 4, "batch_size": null, "learning_rate_multuplier": null};
  const router = useRouter();

  const steps = ['Model and Dataset', 'Hyperparameter Selection'];


  console.log(localStorage.getItem("project"));

  const handleFinetune = () => {
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
    }
    axios.post("/api/finetune/finetune", {
        provider: provider,
        modelArchitecture: modelArchitecture,
        modelName: modelName,
        dataset: dataset,
        projectName: projectName,
        hyperParams: hyperParams,
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

  // Functions for the stepper

  const isStepOptional = (step) => {
    return step === 1;
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const isNextDisabled = (i) => {
    if (i === 0) {
      return (modelName === '' || provider === '' || modelArchitecture === '' || dataset === '');
    }
    return false;
  }

  return (
    <div className='main'>
      <Button variant='contained' color="secondary" onClick={() => router.back()}>
        Back
      </Button>
      <div className='medium-space' />

      <Stepper activeStep={activeStep}>
        {steps.map((label, index) => {
          const stepProps = {};
          const labelProps = {};
          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <div className='medium-space' />

      <Paper className='card vertical-box'>

        {activeStep === 0 ?
          <>
            <TextField
              label="Model name"
              variant="outlined"
              className='text-label center'
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
            />
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
                required
              >
                <MenuItem value={'openai'}>OpenAI</MenuItem>
                <MenuItem value={'anthropic'}>Anthropic</MenuItem>
              </Select>
              </FormControl>
              <div className='small-space' />
              <FormControl className='button-margin' disabled={provider !== 'openai'}>
                <InputLabel id="model-label">Model Architecture</InputLabel>
                <Select
                  labelId="model-label"
                  className="simple-select"
                  value={modelArchitecture}
                  label="Model"
                  onChange={(e) => setModelArchitecture(e.target.value)}
                  required
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
                        required
                      >
                        {datasets.map((d, i) => (
                          <MenuItem value={d.name} key={i}>{d.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                }
                <div className='medium-space' />
          </>
          : null}

        {activeStep === 1 ?
          <>
            <TextField
              label="Number of epochs"
              variant="outlined"
              className='text-label center'
              value={hyperParams.n_epochs}
              onChange={(e) => hyperParams.n_epochs = e.target.value}
            />
            <div className='medium-space' />
            <TextField
              label="Batch size"
              variant="outlined"
              className='text-label center'
              value={hyperParams.batch_size}
              onChange={(e) => hyperParams.batch_size = e.target.value}
            />
            <div className='medium-space' />
            <TextField
              label="Learning rate multiplier"
              variant="outlined"
              className='text-label center'
              value={hyperParams.learning_rate_multuplier}
              onChange={(e) => hyperParams.learning_rate_multuplier = e.target.value}
            />
            <div className='medium-space' />
            <Button variant='contained' color="primary" onClick={handleFinetune}>Finetune</Button>
          </>
          : null}

        <div className='medium-space' />
        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button
            color="inherit"
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />

          {activeStep === steps.length - 1 ? null :
            <Button color="secondary" variant="contained" onClick={handleNext} disabled={isNextDisabled(activeStep)}>Next</Button>
          }
        </Box>
      </Paper>
    </div>
  )
}
