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
import axios from 'axios';
import AWS from 'aws-sdk';
import Papa from 'papaparse';
import { v4 } from "uuid";
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from 'next/router'

import styles from '@/styles/Data.module.css'

const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET;
const REGION = process.env.NEXT_PUBLIC_S3_REGION;

AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY,
  secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY
});
const myBucket = new AWS.S3({
  params: { Bucket: S3_BUCKET },
  region: REGION,
});

const steps = ['General information', 'Training data', 'Validation data', 'Review'];

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

export default function AddDataset() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [error, setError] = useState();
  const [type, setType] = useState('classification');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileVal, setSelectedFileVal] = useState(null);
  const [realFileName, setRealFileName] = useState('');  // Filename in S3
  const [realFileNameVal, setRealFileNameVal] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressVal, setProgressVal] = useState(0);
  const [autoGenerateVal, setAutoGenerateVal] = useState(false);
  const [checked, setChecked] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [trainInputFileData, setTrainInputFileData] = useState({});
  const [valInputFileData, setValInputFileData] = useState({});
  const [numRows, setNumRows] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [numValExamples, setNumValExamples] = useState(100);
  const [user, setUser] = useState(null);
  const { data: session } = useSession();
  const router = useRouter()

  const handleFileInput = (e) => {
    console.log(e.target.files[0]);
    const f = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(f);
    reader.onload = function(event) {
      const data = event.target.result;
      // Get the headers by splitting first row of CSV
      setHeaders(data.split('\n')[0].split(','));
    }
    setSelectedFile(f);
    Papa.parse(f, { complete: function(results) {
      setNumRows(results.data.length);  // Subtract the header row
      console.log(results);
    }, header: true, skipEmptyLines: true});
    uploadFile(f);
  }

  const handleFileInputVal = (e) => {
    setSelectedFileVal(e.target.files[0]);
    uploadFileVal(e.target.files[0]);
  }

  const uploadFile = (file) => {
    setTrainInputFileData(file);
  }

  const uploadFileVal = (file) => {
    setValInputFileData(file);
  }

  const handleCreateDataset = () => {
    console.log(name);
    if (name === '') {
      setError("Please provide a name.");
      return;
    }
    if (!selectedFile) {
      setError("Please submit a file.");
      return;
    }
    let p = '';
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
    };

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('trainFileName', realFileName);
    formData.append('initialTrainFileName', selectedFile.name);
    formData.append('valFileName', realFileNameVal);
    formData.append('initialValFileName', selectedFileVal ? selectedFileVal.name : '');
    formData.append('projectName', p);
    formData.append('trainFileData', trainInputFileData);
    formData.append('valFileData', valInputFileData);
    formData.append('autoGenerateVal', checked);
    formData.append('numValExamples', numValExamples);
    formData.append('datetime', Date.now());

    axios.post("/api/data/add", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }}).then((res) => {
        console.log(res.data);
        setError();
        router.push('/data');
      }).catch((err) => {
        console.log(err);
        setError(err.response.data.error);
      });
  }

  useEffect(() => {
    const v = v4();
    setRealFileName(v + "-train.csv");
    setRealFileNameVal(v + "-val.csv");
  }, []);

  // Functions for the stepper
  const isStepOptional = (step) => {
    return step === 2;
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

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <div className='main'>
      <Button variant='contained' color="secondary" component={Link} href="/data">
        Back
      </Button>
      <div className='vertical-box'>
        <Typography variant='h4' className='page-main-header'>
          Create Dataset
        </Typography>
        <Typography variant='body1'>
          Upload your data to fine tune later!
        </Typography>
      </div>
      <div className='medium-space' />

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
      <div className='medium-space' />

      <Paper className='card vertical-box'>

        {activeStep === 0 ?
          <>
            <Typography variant='h6'>
              General information
            </Typography>
            <div className='small-space' />
            <div className='vertical-box'>
              <TextField
                label="Dataset name"
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
            </div>
            <div className='medium-space' />
            <div className="horizontal-box flex-start">
              <ToggleButtonGroup
                value={type}
                exclusive
                onChange={(e, val) => setType(val)}
              >
                <ToggleButton value="classification">
                  <Typography variant='body1'>
                    Classification
                  </Typography>
                </ToggleButton>
                <ToggleButton value="generation">
                  <Typography variant='body1'>
                    Generative
                  </Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </div>
          </>
          : null}

        {activeStep === 1 ?
          <>
            <Typography variant='h6'>
              Training data
            </Typography>
            <div className='small-space' />
            <div className="file-input">
              <div className='vertical-box'>
                <Button variant="outlined" color="primary" component="label">
                  Upload training data
                  <input type="file" accept=".csv, .json" onChange={handleFileInput}  hidden/>
                </Button>
              </div>
            </div>
            {selectedFile ?
              <>
                <div className='medium-space' />
                <Typography variant='h6'>&nbsp;{selectedFile.name}</Typography>
                <div className='horizontal-box'>
                  <Typography>Headers:&nbsp; </Typography>
                  {headers.map((h, i) =>
                    <div className='data-header' key={h}>
                      <Typography>{h}</Typography>
                    </div>
                  )}
                </div>
              </>
              : null}
          </>
          : null}

        {activeStep === 2 ?
          <>
            <Typography variant='h6'>
              Validation data (optional)
            </Typography>
            <div className='small-space' />
            <div className="file-input">
              <div className='vertical-box'>
                <Button variant="outlined" color="primary" component="label" disabled={autoGenerateVal}>
                  Upload validation data
                  <input type="file" accept=".csv, .json" onChange={handleFileInputVal}  hidden/>
                </Button>
                {selectedFileVal ?
                  <Typography variant='body1' sx={{color:'grey'}}>&nbsp;{selectedFileVal.name}</Typography>
                  : null}
              </div>
            </div>
            <div className='medium-space' />

            <FormGroup>
              <FormControlLabel
                  control={<Checkbox checked={autoGenerateVal} onChange={() => setAutoGenerateVal(!autoGenerateVal)}/>}
                  label="Automatically generate validation data from training data" />
            </FormGroup>

            {autoGenerateVal && selectedFile ?
              <>
                <div className='medium-space' />
                <Typography variant='body1'>
                  Total number of examples: {numRows}
                </Typography>
                <div className='tiny-space' />
                <div className='horizontal-box'>
                  <Typography variant='body1'>
                    Number of validation examples:&nbsp;
                  </Typography>
                  <TextField
                    label="#"
                    type="number"
                    variant="outlined"
                    className='center'
                    value={numValExamples}
                    sx={{width: 100}}
                    onChange={(e) => setNumValExamples(e.target.value)}
                  />
                  <Typography>&nbsp;{Math.round((numValExamples / numRows) * 100) / 100}% of dataset</Typography>
                </div>
              </> : null }
          </>
          : null}

        {activeStep === 3 ?
          <>
            <Typography variant='h6'>
              Review your dataset
            </Typography>
            <div className='small-space' />
            <Box sx={{textAlign: 'left'}}>
              <Typography>Name: {name}</Typography>
              <Typography>Description: {description}</Typography>
              <Typography>Type: {type}</Typography>
              <Typography>Train file name: {selectedFile.name}</Typography>
              <Typography>Number of rows: {numRows}</Typography>
            </Box>
            <div className='small-space' />
            {error ? <Typography variant='body2' color='red'>Error: {error}</Typography> : null}
            <div className='vertical-box'>
              <Button variant='contained' color="primary" onClick={handleCreateDataset}>Create dataset</Button>
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
            <Button color="secondary" variant="contained" onClick={handleNext}>Next</Button>
          }
        </Box>
      </Paper>
    </div>
  )
}

