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
import { FaArrowLeft } from 'react-icons/fa';
import IconButton from '@mui/material/IconButton';
import { BiCopy, BiInfoCircle } from 'react-icons/bi';

import { toTitleCase } from '/components/utils';
import {CustomTooltip} from '/components/CustomTooltip.js';

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
  const [description, setDescription] = useState('');
  const [datasets, setDatasets] = useState([]);
  const [modelName, setModelName] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('')
  const [hyperParams, setHyperParams] = useState({"n_epochs": 4, "batch_size": null, "learning_rate_multiplier": null, "prompt_loss_weight":null});
  // TODO: Change batch size initialization based on dataset size. OpenAI dynamically configures this
  // to be 0.2% of dataset size capped at 256. To do this, we need to store info about
  // dataset size in the datasets collection when it is uploaded.

  const router = useRouter();

  const steps = ['Model and dataset', 'Hyperparameter selection', 'Review'];

  const handleFinetune = () => {
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
    }
    if (provider === "openai") {
      axios.post("/api/models/finetune/openai", {
        provider: provider,
        modelArchitecture: modelArchitecture,
        modelName: modelName,
        description: description,
        dataset: dataset,
        projectName: projectName,
        hyperParams: hyperParams,
      }).then((res) => {
        console.log(res.data);
        setError();
        router.push('/models');
      }).catch((error) => {
        console.log(error);
        setError('Error finetuning model');
      });
    } else if (provider === "cohere") {
    }
  }

  const estimateCost = () => {
    axios.post("/api/models/finetune/cost", {
        provider: provider,
        modelArchitecture: modelArchitecture,
        epochs: hyperParams["n_epochs"],
        dataset: dataset,
      }).then((res) => {
        setEstimatedCost(res.data.estimatedCost);
        console.log("response data")
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
    if (activeStep === 0) {
      setModelName(toTitleCase(modelArchitecture) + "_" + dataset);
    }
    if (activeStep === 1) {
      estimateCost();
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const isNextDisabled = (i) => {
    if (i === 0) {
      return (provider === '' || modelArchitecture === '' || dataset === '');
    }
    return false;
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon cursor-pointer'/>
          <Typography variant='h4' className='page-main-header'>
            Finetune model
          </Typography>
        </div>
      </div>
      <div className='small-space' />

      <div className='main-content'>
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
        <div className='small-space' />

        <Paper className='card vertical-box' variant='outlined'>

          {activeStep === 0 ?
            <>
              <Typography variant='h6'>
                Model and dataset
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
                  className="wide-select"
                  label="Provider"
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setModelArchitecture('');
                  }}
                  required
                >
                  <MenuItem value={'openai'}>OpenAI</MenuItem>
                  <MenuItem value={'cohere'}>Cohere</MenuItem>
                </Select>
              </FormControl>
              <div className='small-space' />
                
              <FormControl className='button-margin' disabled={provider !== 'openai'}>
                <InputLabel id="model-label">Model architecture</InputLabel>
                <Select
                    labelId="model-label"
                    className="wide-select"
                    value={modelArchitecture}
                    label="Model architecture"
                    onChange={(e) => setModelArchitecture(e.target.value)}
                    required
                >
                    <MenuItem value={'ada'}>Ada {
                      <CustomTooltip title="💡 Capable of very simple tasks, usually the fastest model in the GPT-3 series, and lowest cost." className='tooltip'>
                        <IconButton disableRipple={true}>
                          <BiInfoCircle size={16} color='#9C2315'/>
                        </IconButton>
                      </CustomTooltip>}
                    </MenuItem>
                    <MenuItem value={'babbage'}>Babbage {
                      <CustomTooltip title="💡 Capable of straightforward tasks, very fast, and lower cost." className='tooltip'>
                        <IconButton disableRipple={true}>
                          <BiInfoCircle size={16} color='#9C2315'/>
                        </IconButton>
                      </CustomTooltip>}
                    </MenuItem>
                    <MenuItem value={'curie'}>Curie {
                      <CustomTooltip title="💡 Very capable, but faster and lower cost than Davinci." className='tooltip'>
                        <IconButton disableRipple={true}>
                          <BiInfoCircle size={16} color='#9C2315'/>
                        </IconButton>
                      </CustomTooltip>}
                    </MenuItem>
                    <MenuItem value={'davinci'}>Davinci {
                      <CustomTooltip title="💡 Most capable GPT-3 model. Can do any task the other models can do, often with higher quality." className='tooltip'>
                        <IconButton disableRipple={true}>
                          <BiInfoCircle size={16} color='#9C2315'/>
                        </IconButton>
                      </CustomTooltip>}
                    </MenuItem>
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
                          className="wide-select"
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
            </>
            : null}

          {activeStep === 1 ?
            <>
              <Typography variant='h6'>
                Hyperparameters
              </Typography>
              <div className='small-space' />
              <TextField
                label="Number of epochs"
                variant="outlined"
                className='text-label center'
                value={hyperParams.n_epochs}
                onChange={(e) => setHyperParams({...hyperParams, n_epochs: e.target.value})}
              />
              <Typography variant='body2' className='form-label'>
                The number of epochs to train the model for. An epoch refers to one full cycle through the training dataset.
              </Typography>
              <div className='medium-space' />
              <TextField
                label="Batch size"
                variant="outlined"
                className='text-label center'
                value={hyperParams.batch_size ? hyperParams.batch_size : ''}
                onChange={(e) => setHyperParams({...hyperParams, batch_size: e.target.value})}
              />
              <Typography variant='body2' className='form-label'>
                The batch size is the number of training examples used to train a single forward and backward pass. By default, this will be set to 0.2% of the size of your training set, up to 256.
              </Typography>
              <div className='medium-space' />
              <TextField
                label="Learning rate multiplier"
                variant="outlined"
                className='text-label center'
                value={hyperParams.learning_rate_multiplier ? hyperParams.learning_rate_multiplier : ''}
                onChange={(e) => setHyperParams({...hyperParams, learning_rate_multiplier: e.target.value})}
              />
              <Typography variant='body2' className='form-label'>
                By default, the learning rate multiplier is the 0.05, 0.1, or 0.2 depending on batch size. The learning rate used for fine-tuning is the original rate used for pertaining multiplied by this value.
              </Typography>
              <div className='medium-space' />
              <TextField
                label="Prompt loss weight"
                variant="outlined"
                className='text-label center'
                value={hyperParams.prompt_loss_weight ? hyperParams.prompt_loss_weight : ''}
                onChange={(e) => setHyperParams({...hyperParams, prompt_loss_weight: e.target.value})}
              />
              <Typography variant='body2' className='form-label'>
              This controls how much the model tries to learn to generate the prompt (as compared to the completion which always has a weight of 1.0), and can add a stabilizing effect to training when completions are short. 
              If prompts are extremely long (relative to completions), you can reduce this parameter to avoid over-prioritizing learning the prompt.
              </Typography>

            </>
            : null}

          {activeStep === 2 ?
            <>
              <Typography variant='h6'>
                Review and launch
              </Typography>
              <div className='medium-space' />
              <TextField
                label="Model name"
                variant="outlined"
                className='text-label center'
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
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
              <div className='medium-space' />
              <Box sx={{textAlign: 'left'}}>
                <Typography>Provider: {provider === 'openai' ? 'OpenAI' : provider}</Typography>
                <Typography>Architecture: {modelArchitecture}</Typography>
                <Typography>Dataset: {dataset}</Typography>
                <Typography>Estimated cost: $ {estimatedCost}</Typography>
              </Box>
              <div className='medium-space' />
              {error ? <Typography variant='body2' color='red'>Error: {error}</Typography> : null}
              <Button size='large' variant='contained' color="primary" onClick={handleFinetune}>Finetune</Button>
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
    </div>
  )
}
