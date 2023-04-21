import { useState, useEffect, useRef } from 'react';
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

import styles from '@/styles/Data.module.css'

export default function Playground() {
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [finetunedModels, setFinetunedModels] = useState([]);
  const [baseModels, setBaseModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const promptRef = useRef();

  const submit = () => {
    console.log(promptRef.current.value);
    setOutput("");
    setLoading(true);
    axios.post("/api/infer/" + provider, {
        model: model,
        prompt: provider === "openai"? promptRef.current.value + "\n\n###\n\n": promptRef.current.value,
        //prompt: promptRef.current.value + " ->",
      }).then((res) => {
        console.log(res.data);
        if (res.data !== "No data found") {
          setOutput(res.data["output"]);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
  }

  const clear = () => {
    setOutput("");
    setModel('');
    promptRef.current.value = '';
  }

  const groupByProviders = (models) => {
      let result = {"openai":[],"cohere":[]};
      for (let i = 0; i < models.length; i++) {
        result[models[i].provider].push(models[i]);
      }
      return result;
  }

  useEffect(() => {
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
    }

    axios.post("/api/model/list", {projectName: projectName}).then((res) => {
      if (res.data !== "No data found") {
        let data = res.data;
        setFinetunedModels(data);
      }
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });


    // LOOK HERE
    axios.get("/api/providers/list").then((res) => {
      console.log(res.data);
      const temp = groupByProviders(res.data);
      setBaseModels(temp);
      console.log("base models");
      console.log(temp);
    }).catch((error) => {
      console.log(error);
    });



    window.addEventListener("storage", () => {
      let projectName = '';
      if (localStorage.getItem("project")) {
        projectName = localStorage.getItem("project");
      }
      axios.post("/api/model/list", {projectName: projectName}).then((res) => {
        console.log(res.data);
        if (res.data !== "No data found") {
          let data = res.data;
          setFinetunedModels(data);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
    });
  }, []);

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
          Playground
        </Typography>
      </div>
      <div className='medium-space' />

      <Typography variant='body1'>
        Provider
      </Typography>
      <div className='tiny-space' />
      <FormControl>
        <InputLabel id="provider-label">Provider</InputLabel>
          <Select
            labelId="provider-label"
            className="wide-select"
            label="Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
           >
            <MenuItem value={'openai'}>OpenAI</MenuItem>
            <MenuItem value={'cohere'}>Cohere</MenuItem>
          </Select>
      </FormControl>

      <div className='tiny-space' />

      <Typography variant='body1'>
        Model
      </Typography>
      <div className='tiny-space' />
      <FormControl>
        <InputLabel id="model-label">Model</InputLabel>
        <Select
          labelId="model-label"
          className="wide-select"
          value={model}
          label="Model"
          onChange={(e) => setModel(e.target.value)}
        >  
          <MenuItem value={'text-ada-001'}>OpenAI GPT-3 Ada</MenuItem>
          <MenuItem value={'text-babbage-001'}>OpenAI GPT-3 Babbage</MenuItem>
          <MenuItem value={'text-curie-001'}>OpenAI GPT-3 Curie</MenuItem>
          <MenuItem value={'text-davinci-003'}>OpenAI GPT-3 Davinci</MenuItem>
          <MenuItem value={'generate-medium'}>Cohere Generate (Medium)</MenuItem>
          <MenuItem value={'generate-xlarge'}>Cohere Generate (XLarge)</MenuItem>
          <MenuItem value={'classify-small'}>Cohere Classify (Medium)</MenuItem>
          <MenuItem value={'classify-large'}>Cohere Classify (Large)</MenuItem>
          <MenuItem value={'classify-multilingual'}>Cohere Classify (Multilingual)</MenuItem>

          {finetunedModels.length > 0 ? <Divider /> : null}
          {finetunedModels.map((model) => (
            <MenuItem value={model.providerModelId} key={model._id}>{model.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <div className='medium-space' />


      <Typography variant='body1'>
        Prompt
      </Typography>
      <div className='tiny-space' />
      <TextField
        label="Summarize the article..."
        multiline
        rows={10}
        className='prompt'
        inputRef={promptRef}
      />
      <div className='medium-space' />

      {output ?
        <>
          <Typography variant='body1'>
            Output
          </Typography>
          <div className='tiny-space' />
          <Typography>
            <span className='model-output'>{output}</span>
          </Typography>
        </>
        : null }

      {loading ?  <CircularProgress /> : null}
      <div className='medium-space' />

      <Button className='button-margin' color='secondary' variant='contained' onClick={clear}>Clear</Button>
      <Button variant='contained' color="success" onClick={submit}>Submit</Button>
    </div>
  )
}
