import React from 'react'
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
import ListSubheader from '@mui/material/ListSubheader';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from 'next/router'
import { FaArrowLeft } from 'react-icons/fa';
import {createCustomTooltip} from '../../components/CustomToolTip.js';

import {toTitleCase, baseModelNamesDict, metricFormat, classificationMetrics, generationMetrics, multiclassClassificationMetrics} from '/components/utils';
import TemplateCreator from '../../components/TemplateCreator.js';

const steps = ['Select Dataset and Model', 'Create Template', 'Select Generation Parameters','Select Metrics', 'Review'];

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
  const [projectType, setProjectType] = useState('');
  const [checked, setChecked] = useState({});
  const [model, setModel] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const { data: session } = useSession();
  const router = useRouter()

  const [maxTokens, setMaxTokens] = useState(50);
  const [temperature, setTemperature] = useState(0.5);

  // Variables for the template
  const [templateString, setTemplateString] = useState('');
  const [outputColumn, setOutputColumn] = useState('');
  const [stopSequence, setStopSequence] = useState('');
  const [visibleRows, setVisibleRows] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [classes, setClasses] = useState([]);
  const [datasetLoading, setDatasetLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [evalData, setEvalData] = useState({});
  const [templateData, setTemplateData] = useState({});

  const templateTransform = (row) => {
    if (templateString !== '' && errorMessage === '') {
      const regex = /{{.*}}/g;
      const matches = templateString.match(regex);
      let result = templateString;
      matches.forEach((match) => {
        result = result.replace(match, row[match.replace('{{','').replace('}}','')]);
      });
      return result;
    } else {
      return "";
    }
  }

  const estimateCost = (tempTemplateData) => {
    axios.post("/api/models/finetune/cost", {
        provider: provider,
        modelArchitecture: modelArchitecture,
        epochs: hyperParams["n_epochs"],
        templateData: tempTemplateData,
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

    axios.post("/api/evaluate/evaluate-base", {
      name: name,
      description: description,
      projectName: p,
      completionName: model,
      datasetName: dataset.name,
      metrics: metrics.filter(x => checked[x]),
      templateString: templateString,
      templateData: templateData,
      outputColumn: outputColumn,
      stopSequence: stopSequence,
      maxTokens: maxTokens,
      temperature: temperature,
    }).then((res) => {
      console.log(res.data);
      setError();
      router.push('/evaluate/' + res.data);
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

    axios.post("/api/project/by-name", {projectName: projectName}).then((res) => {
        console.log(res);
        if (res.data.type === "classification") {
          setMetrics(classificationMetrics);
        } else if (res.data.type === "generative") {
          setMetrics(generationMetrics);
        } else {
          setMetrics([]);
        }
        setProjectType(res.data.type);
      }).catch((error) => {
        console.log(error);
      });

    axios.post("/api/data/list", {projectName: projectName}).then((res) => {
      setDatasets(res.data);
      setLoading(false);
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
    if (activeStep === 0) {
      if (dataset.valFileName) {
        axios.post("/api/data/file", {
          fileName: dataset.valFileName,
          maxLines: 50,
        }).then((json_data) => {
          setEvalData(json_data.data);
          const rowsOnMount = json_data.data.slice(0, 5);
          const inputHeaders = Object.keys(json_data.data[0]);
          setHeaders(inputHeaders);
          setOutputColumn(inputHeaders[1]);
          setTemplateString("{{" + inputHeaders[0] + "}}\n\n###\n\n");
          setStopSequence("$$$");
          setVisibleRows(rowsOnMount);
          setDatasetLoading(false);
        }).catch((error) => {
          console.log(error);
        });
      } else {
        axios.post("/api/data/file", {
          fileName: dataset.trainFileName,
          maxLines: 50,
        }).then((json_data) => {
          setEvalData(json_data.data);
          const rowsOnMount = json_data.data.slice(0, 5);
          const inputHeaders = Object.keys(json_data.data[0]);
          setHeaders(inputHeaders);
          setOutputColumn(inputHeaders[1]);
          setTemplateString("{{" + inputHeaders[0] + "}}\n\n###\n\n");
          setStopSequence("$$$");
          setVisibleRows(rowsOnMount);
          setDatasetLoading(false);
        }).catch((error) => {
          console.log(error);
        });
      }
    }

    if (activeStep === 1) {
      setName(baseModelNamesDict[model].replace(/ /g, "-") + " on " + dataset.name.replace(/ /g, "-"));
      let numWords = 0;
      let numChars = 0;
      evalData.forEach((row) => {
        numWords += templateTransform(row).split(" ").length + row[outputColumn].split(" ").length;
        numChars += templateTransform(row).length + row[outputColumn].length + stopSequence.length;
      });
      const tempTemplateData = {numTrainWords: numWords, numTrainChars: numChars, numValWords: 0, numValChars: 0};
      setTemplateData(tempTemplateData);

      // Find the number of classes in the output column
      if (projectType === "classification") {
        setLoading(true);
        axios.post("/api/data/get-classes", {
          datasetId: dataset._id,
          column: outputColumn,
        }).then((res) => {
          setClasses(res.data);
          if (res.data.length > 2) {
            setMetrics(multiclassClassificationMetrics);
          }
          setLoading(false);
        }).catch((error) => {
          console.log(error);
        });
      }

      //estimateCost(tempTemplateData);
    }

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
      return  !dataset || !model;
    } else if (i === 1) {
      return outputColumn === "";
    } 
    return false;
  }

  const handleReset = () => {
    setActiveStep(0);
  };

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon cursor-pointer'/>
          <Typography variant='h4' className='page-main-header'>
            Evaluate Base Model
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
                Specify dataset and model
              </Typography>
              <div className='medium-space' />
              <div className='vertical-box'>
                <FormControl>
                  <InputLabel id="model-label">Model</InputLabel>
                  <Select
                    labelId="model-label"
                    className="wide-select"
                    label="Model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    {Object.keys(baseModelNamesDict).map((completionName) => (
                        <MenuItem key={completionName} value={completionName}>{baseModelNamesDict[completionName]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                      <MenuItem key={d._id} value={d}>{d.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant='body2' color='textSecondary' sx={{width: '100%'}}>
                  Will use validation data from dataset if present. Else, will use
                  the entire dataset.
                </Typography>
              </div>
            </>
            : null}

          {activeStep === 1 ?
            <>
              <Typography variant='h6'>
                Finetuning Template
              </Typography>
              <div className='small-space' />
              {datasetLoading ?
                <div className="horizontal-box"><CircularProgress /></div>
                :
                <TemplateCreator
                  templateString={templateString}
                  stopSequence={stopSequence}
                  outputColumn={outputColumn}
                  errorMessage={errorMessage}
                  setTemplateString={setTemplateString}
                  setStopSequence={setStopSequence}
                  setOutputColumn={setOutputColumn}
                  setErrorMessage={setErrorMessage}
                  trainData={evalData}
                  headers={headers}
                  initialVisibleRows={visibleRows}
                  dataset={dataset}
                />
              }
            </>
            :null}

            {activeStep === 2 ?
              <>
                <Typography variant='h6'>
                  Specify generation parameters
                </Typography>
                <div className='medium-space' />
                <div className='vertical-box'>
                  <div className='horizontal-box'>
                  <TextField
                    label="Max tokens"
                    variant="outlined"
                    className='text-label'
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(e.target.value)}
                  />
                  {createCustomTooltip("The maximum number of tokens to generate per prediction")}
                  </div>
                  <div className='small-space' />
                  <div className='horizontal-box'>
                  <TextField
                    label="Temperature"
                    variant="outlined"
                    className='text-label'
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                  />
                  {createCustomTooltip("Higher temperature means more random output while lower temperature means more deterministic output")}
                  </div>
                </div>
              </>
            : null}   
          

          {activeStep === 3 ?
            <>
              <Typography variant='h6'>
                Metrics
              </Typography>
              <div className='medium-space' />
              <div className='vertical-box align-left'>
                {metrics.map(m => (
                  <div key={m} className='horizontal-box'>
                    <Checkbox key={m} checked={isChecked(m)} onChange={() => toggleChecked(m)} />
                    <Typography>{metricFormat(m)}</Typography>
                  </div>
                ))}
              </div>
            </>
            : null}

          {activeStep === 4 ?
            <>
              <Typography variant='h6'>
                Review your evaluation
              </Typography>
              <div className='medium-space' />
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
              <div className='medium-space' />
              <div className='light-background-card'>
                <Typography>Dataset: {dataset.name}</Typography>
                <Typography>Model: {baseModelNamesDict[model]}</Typography>
                <Typography>Metrics: {metrics.map((m, i) =>
                                        (isChecked(m) ? metricFormat(m) : '') +
                                        (i !== metrics.length - 1 ? ', ' : '')
                                      )}</Typography>
              </div>
              <div className='medium-space' />
              {error ? <Typography variant='body2' color='red'>Error: {error}</Typography> : null}
              <div className='vertical-box'>
                <Button size='large' variant='contained' color="primary" onClick={handleRunEvaluation}>Run evaluation</Button>
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
    </div>
  )
}

