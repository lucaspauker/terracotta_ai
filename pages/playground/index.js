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
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const promptRef = useRef();

  const submit = () => {
    console.log(promptRef.current.value);
    setOutput("");
    setLoading(true);
    axios.post("/api/infer", {
        provider: provider,
        model: model,
        prompt: promptRef.current.value + "\n\n###\n\n",
      }).then((res) => {
        console.log(res.data);
        if (res.data !== "No data found") {
          setOutput(res.data.choices[0].text);
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

  useEffect(() => {
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
      <Typography variant='h4' className='page-main-header'>
        Playground
      </Typography>
      <div className='medium-space' />

      <Typography variant='body1'>
        Model
      </Typography>
      <div className='tiny-space' />
      <FormControl className="model-select">
        <InputLabel id="model-label">Model</InputLabel>
        <Select
          labelId="model-label"
          className="model-select"
          value={model}
          label="Model"
          onChange={(e) => setModel(e.target.value)}
        >
          <MenuItem value={'text-ada-001'}>OpenAI GPT-3 Ada</MenuItem>
          <MenuItem value={'text-babbage-001'}>OpenAI GPT-3 Babbage</MenuItem>
          <MenuItem value={'text-curie-001'}>OpenAI GPT-3 Curie</MenuItem>
          <MenuItem value={'text-davinci-003'}>OpenAI GPT-3 Davinci</MenuItem>
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
      <Typography>Or choose prompt from dataset... (TODO)</Typography>
      <div className='medium-space' />

      {output ?
        <Typography className='model-output'>
          {output}
        </Typography>
        : null }

      {loading ?  <CircularProgress /> : null}
      <div className='medium-space' />

      <Button className='button-margin' color='secondary' variant='contained' onClick={clear}>Clear</Button>
      <Button variant='contained' color="success" onClick={submit}>Submit</Button>
    </div>
  )
}
