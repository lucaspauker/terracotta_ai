import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Checkbox from '@mui/material/Checkbox';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Select from '@mui/material/Select';
import ImageIcon from '@mui/icons-material/Image';
import axios from 'axios';
import Papa from 'papaparse';
import { v4 } from "uuid";
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from 'next/router'

import { FaArrowLeft } from 'react-icons/fa';
import { AiOutlineCloseCircle } from 'react-icons/ai';
import { BiCopy, BiInfoCircle } from 'react-icons/bi';

const steps = ['Upload Training Data', 'Choose Validation Data', 'Review'];

const FileUploadForm = ({ handleFileInput }) => {
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile.type === 'text/csv') {
      handleFileInput({ target: { files: [droppedFile] } });
    } else {
      console.log('Please drop a CSV file.');  // TODO: Should add a better error message
    }
  };

  return (
    <form
      id="form-file-upload"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".csv"
        id="input-file-upload"
        onChange={handleFileInput}
      />
      <label id="label-file-upload" htmlFor="input-file-upload" className="cursor-pointer">
        <div>
          <ImageIcon sx={{ fontSize: 64 }} color="primary" />
          <Typography>
            Drag and drop your CSV data file here <br /> or{' '}
            <span className="upload-text">choose a file</span>
          </Typography>
        </div>
      </label>
    </form>
  );
};

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
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileVal, setSelectedFileVal] = useState(null);
  const [realFileName, setRealFileName] = useState('');  // Filename in S3
  const [realFileNameVal, setRealFileNameVal] = useState('');
  const [autoGenerateVal, setAutoGenerateVal] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [trainInputFileData, setTrainInputFileData] = useState({});
  const [valInputFileData, setValInputFileData] = useState({});
  const [numTrainExamples, setNumTrainExamples] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [numValExamples, setNumValExamples] = useState(10);
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const router = useRouter();

  const handleFileInput = (e) => {
    console.log(e.target.files[0]);
    const f = e.target.files[0];
    if (f.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the limit of 10 MB');
    } else {
      setUploadError('');
      const reader = new FileReader();
      reader.readAsText(f);
      reader.onload = function(event) {
        const data = event.target.result;
        // Get the headers by splitting first row of CSV
        let h = data.split('\n')[0].split(',');
        setHeaders(h);
      }
      setSelectedFile(f);
      Papa.parse(f, { complete: function(results) {
        console.log("Number of rows:", results.data.length);
        setNumTrainExamples(results.data.length);
        setNumValExamples(parseInt(results.data.length / 5));
        console.log(results);
      }, header: true, skipEmptyLines: true});
      uploadFile(f);
    }
  }

  const handleFileInputVal = (e) => {
    const f = e.target.files[0];
    if (f.size > 256 * 1024 * 1024) {
      setUploadError('File size exceeds the limit of 256 MB');
    } else {
      setUploadError('');
      setSelectedFileVal(f);
      Papa.parse(f, { complete: function(results) {
        setNumValExamples(results.data.length);
      }, header: true, skipEmptyLines: true});
      uploadFileVal(f);
    }
  }

  const uploadFile = (file) => {
    setTrainInputFileData(file);
  }

  const uploadFileToS3 = async (file, filename) => {
    const fileType = encodeURIComponent(file.type);

    const res = await axios.get(`/api/data/post-link?file=${filename}&fileType=${fileType}`);
    const {url, fields} = res.data;
    const formData = new FormData();

    Object.entries({ ...fields, file }).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const upload = await axios.post(url, formData);
      if (upload.status === 204) {
        console.log('Uploaded successfully!');
      } else {
        console.error('Upload failed.', upload);
      }
    } catch (error) {
      console.error('Upload failed.', error);
    }
  };

  const uploadFileVal = (file) => {
    setValInputFileData(file);
  }

  const handleCreateDataset = async () => {
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

    setIsCreatingDataset(true);

    await uploadFileToS3(trainInputFileData, realFileName);
    console.log('Upload completed successfully!');

    if (selectedFileVal && !autoGenerateVal) {
      await uploadFileToS3(valInputFileData, realFileNameVal);
      console.log('Val file upload completed successfully!');
    }

    const requestData = {
      name: name,
      description: description,
      trainFileName: realFileName,
      initialTrainFileName: selectedFile.name,
      valFileName: realFileNameVal,
      initialValFileName: selectedFileVal ? selectedFileVal.name : '',
      projectName: p,
      autoGenerateVal: autoGenerateVal,
      numValExamples: numValExamples,
      numTrainExamples: numTrainExamples,
      headers: headers
    };

    axios.post("/api/data/add", requestData)
      .then((res) => {
        setError("");
        router.push('/data');
      })
      .catch((err) => {
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
    return step === 1;
  };

  const isStepSkipped = (step) => {
    return skipped.has(step);
  };

  const handleNext = () => {
    if (activeStep === 1) {
      setName(selectedFile.name.substring(0, selectedFile.name.length - 4));
      if (!autoGenerateVal && !selectedFileVal) {
        setNumValExamples(0);
      }
    }
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
      return !selectedFile;
    } else if (i === 1) {
      return false;
    } else if (i === 2) {
      return name === '';
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
          <IconButton onClick={() => router.back()} className='back-icon cursor-pointer'>
            <FaArrowLeft size='30'/>
          </IconButton>
          <Typography variant='h4' className='page-main-header'>
            Upload Dataset
          </Typography>
        </div>
      </div>
      <div className='small-space' />

      <div className='main-content'>
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
                Training data
              </Typography>
              <div className='medium-space' />
              <div className="file-input">
                <div className='vertical-box'>
                  {uploadError ? <Typography variant='body2' color='red'>Error: {uploadError}</Typography> : null}
                  <div className='horizontal-box'>
                    { selectedFile ?
                      <Button variant="outlined" color="primary" component="label">
                        Upload new file
                        <input type="file" accept=".csv" onChange={handleFileInput}  hidden/>
                      </Button>
                      :
                      <FileUploadForm handleFileInput={handleFileInput} />
                    }
                  </div>
                </div>
              </div>
              {selectedFile ?
                <>
                  <div className='small-space'/>
                  <div className='border-card'>
                    <IconButton className='x-button' onClick={() => setSelectedFile(null)}>
                      <AiOutlineCloseCircle size={20} />
                    </IconButton>
                    <Typography variant='h6'>&nbsp;{selectedFile.name}</Typography>
                    <div className='small-space' />
                    <div className='vertical-box' style={{alignItems:'flex-start'}}>
                      <Typography>Number of rows:&nbsp; {numTrainExamples}</Typography>
                      <div className='tiny-space' />
                      <Typography>Headers&nbsp; ({headers.length} found): </Typography>
                      <div className='headers-container'>
                        {headers.map((h, i) =>
                          <div className='data-header' key={h}>
                            <Typography>{h}</Typography>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </> : null
              }
            </>
            : null}
          {activeStep === 1 ?
            <>
              <Typography variant='h6'>
                Validation data (optional)
              </Typography>
              <div className='medium-space' />
              <div className="file-input">
                <div className='vertical-box'>
                {uploadError ? <Typography variant='body2' color='red'>Error: {uploadError}</Typography> : null}
                  <Button variant="outlined" color="primary" component="label" disabled={autoGenerateVal}>
                    Upload validation data
                    <input type="file" accept=".csv, .json" onChange={handleFileInputVal}  hidden/>
                  </Button>
                  {selectedFileVal ?
                    <Typography variant='body1' sx={{color:'grey'}}>&nbsp;{selectedFileVal.name}</Typography>
                    : null}
                </div>
              </div>
              <div className='tiny-space' />
              <Typography variant='body2' className='form-label'>
                The validation dataset must have the same column names as the training dataset.
              </Typography>
              <div className='medium-space' />

              <FormGroup>
                <FormControlLabel
                    control={<Checkbox checked={autoGenerateVal} onChange={() => setAutoGenerateVal(!autoGenerateVal)}/>}
                    label="Automatically partition validation data from training data" />
              </FormGroup>

              {autoGenerateVal && selectedFile ?
                <>
                  <div className='medium-space' />
                  <Typography variant='body1'>
                    Total number of examples: &nbsp;{numTrainExamples}
                  </Typography>
                  <div className='tiny-space' />
                  <div className='horizontal-box'>
                    <Typography variant='body1'>
                      Number of validation examples:&nbsp;&nbsp;
                    </Typography>
                    <div className='vertical-box'>
                      <TextField
                        label="#"
                        type="number"
                        variant="outlined"
                        className='center'
                        value={numValExamples}
                        sx={{width: 100}}
                        onChange={(e) => setNumValExamples(e.target.value)}
                      />
                      <Typography variant='body2'>
                        {Math.round((numValExamples / numTrainExamples) * 100)}% of dataset
                      </Typography>
                    </div>
                  </div>
                </> : null }
            </>
            : null}

          {activeStep === 2 ?
            <>
              <Typography variant='h6'>
                Review your dataset
              </Typography>
              <div className='medium-space' />
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
              <div className='light-background-card'>
                <Typography>Train file name: {selectedFile.name}</Typography>
                <Typography>Number of rows: {numTrainExamples}</Typography>
                {selectedFileVal ?
                  <Typography>Number of train rows: {numTrainExamples}</Typography>
                  :
                  <Typography>Number of train rows: {numTrainExamples - numValExamples}</Typography>
                }
                <Typography>Number of validation rows: {numValExamples}</Typography>
              </div>
              <div className='medium-space' />
              {error ? <Typography variant='body2' color='red'>Error: {error}</Typography> : null}
              {!error && isCreatingDataset ? <Typography variant='body2'>Securely uploading dataset... (this may take a minute)</Typography> : null}
              <div className='vertical-box'>
                <Button size='large' variant='contained' color="primary" onClick={handleCreateDataset}>Create dataset</Button>
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

            {activeStep === steps.length - 1 ? null :
              <Button color="secondary" variant="contained" onClick={handleNext} disabled={isNextDisabled(activeStep)}>Next</Button>
            }
          </Box>
        </Paper>
      </div>
    </div>
  )
}

