import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from 'next/router'
import { FaArrowLeft } from 'react-icons/fa';

import styles from '@/styles/Data.module.css'

const steps = ['Dataset and model', 'Metrics', 'Review'];

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

const metrics = ['accuracy', 'f1', 'precision', 'recall'];

export default function DoEvaluate() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [numRows, setNumRows] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [datasets, setDatasets] = useState([]);
  const [dataset, setDataset] = useState('');
  const [checked, setChecked] = useState({});
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('');
  const { data: session } = useSession();
  const router = useRouter()

  const toggleChecked = (id) => {
    let updatedChecked = Object.assign({}, checked);
    updatedChecked[id] = !checked[id];
    setChecked(updatedChecked);
  }

  const isChecked = (id) => {
    if (!(id in checked)) {
      let updatedChecked = Object.assign({}, checked);
      updatedChecked[id] = true;
      setChecked(updatedChecked);
    }
    return checked[id];
  }

  const handleRunEvaluation = () => {
    console.log(name);
    if (name === '') {
      setError("Please provide a name.");
      return;
    }
    let p = '';
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
    };

    axios.post("/api/evaluate/evaluate", {
        name: name,
        description: description,
        projectName: p,
        modelName: model,
        datasetName: dataset,
        metrics: metrics,
      }).then((res) => {
        console.log(res.data);
        setError();
        router.push('/evaluate');
      }).catch((err) => {
        console.log(err);
        setError(err.response.data.error);
      });
  }

  useEffect(() => {
    setLoading(true);
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
    }

    axios.post("/api/models", {projectName: projectName}).then((res) => {
      setModels(res.data);
      axios.post("/api/data/list", {projectName: projectName}).then((res) => {
        setDatasets(res.data);
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  // Functions for the stepper
  const isStepOptional = (step) => {
    return false;
  };

  const isStepSkipped = (step) => {
    return skipped.has(step);
  };

  const handleNext = () => {
    let newSkipped = skipped;
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped(newSkipped);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSkip = () => {
    if (!isStepOptional(activeStep)) {
      // You probably want to guard against something like this,
      // it should never occur unless someone's actively trying to break something.
      throw new Error("You can't skip a step that isn't optional.");
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped((prevSkipped) => {
      const newSkipped = new Set(prevSkipped.values());
      newSkipped.add(activeStep);
      return newSkipped;
    });
  };

  const isNextDisabled = (i) => {
    if (i === 0) {
      return name === '' || !dataset || !model;
    } else if (i === 1) {
      return false;
    }
    return true;
  }

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon cursor-pointer'/>
          <Typography variant='h4' className='page-main-header'>
            Evaluate
          </Typography>
        </div>
      </div>
      <div className='small-space' />

      <Stepper activeStep={activeStep}>
        {steps.map((label, index) => {
          const stepProps = {};
          const labelProps = {};
          if (isStepOptional(index)) {
            labelProps.optional = (
              <Typography variant="caption">Optional</Typography>
            );
          }
          if (isStepSkipped(index)) {
            stepProps.completed = false;
          }
          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <div className='small-space' />

      <Paper className='card vertical-box' variant='outlined'>
        {activeStep === 0 ?
          <>
            <Typography variant='h6'>
              General information
            </Typography>
            <div className='small-space' />
            <div className='vertical-box'>
              <TextField
                label="Evaluation name"
                variant="outlined"
                className='text-label center'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className='small-space' />
              <TextField
                label="Description"
                variant="outlined"
                className='text-label'
                multiline
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className='small-space' />
              <FormControl>
                <InputLabel id="dataset-label">Dataset</InputLabel>
                <Select
                  labelId="dataset-label"
                  className="wide-select"
                  label="Dataset"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                >
                  {datasets.map((d) => (
                    <MenuItem key={d._id} value={d.name}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <div className='small-space' />
              <FormControl>
                <InputLabel id="model-label">Model</InputLabel>
                <Select
                  labelId="model-label"
                  className="wide-select"
                  label="Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {models.map((m) => (
                    <MenuItem key={m._id} value={m.name}>{m.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </>
          : null}

        {activeStep === 1 ?
          <>
            <Typography variant='h6'>
              Metrics
            </Typography>
            <div className='small-space' />
            <div className='vertical-box align-left'>
              {metrics.map(m => (
                <div className='horizontal-box'>
                  <Checkbox key={m} checked={isChecked(m)} onChange={() => toggleChecked(m)} />
                  <Typography>{m.charAt(0).toUpperCase() + m.slice(1)}</Typography>
                </div>
              ))}
            </div>
          </>
          : null}

        {activeStep === 2 ?
          <>
            <Typography variant='h6'>
              Review your evaluation
            </Typography>
            <div className='small-space' />
            <Box sx={{textAlign: 'left'}}>
              <Typography>Name: {name}</Typography>
              <Typography>Dataset: {dataset}</Typography>
              <Typography>Model: {model}</Typography>
              <Typography>Metrics: {metrics.map((m, i) =>
                                      (isChecked(m) ? m + ' ' : null)
                                    )}</Typography>
            </Box>
            <div className='small-space' />
            {error ? <Typography variant='body2' color='red'>Error: {error}</Typography> : null}
            <div className='vertical-box'>
              <Button variant='contained' color="primary" onClick={handleRunEvaluation}>Run evaluation</Button>
            </div>
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
          {isStepOptional(activeStep) && (
            <Button color="inherit" onClick={handleSkip} sx={{ mr: 1 }}>
              Skip
            </Button>
          )}

          {activeStep === steps.length - 1 ? null :
            <Button color="secondary" variant="contained" onClick={handleNext} disabled={isNextDisabled(activeStep)}>Next</Button>
          }
        </Box>
      </Paper>
    </div>
  )
}

