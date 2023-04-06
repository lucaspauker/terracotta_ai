import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import axios from 'axios';

import styles from '@/styles/Data.module.css'

export default function Add() {
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [error, setError] = useState();
  const [type, setType] = useState('classification');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const nameRef = useRef();
  const promptRef = useRef();

  const handleCreateModel = () => {
    axios.post("http://localhost:3005/model/add", {
        name: nameRef.current.value,
        prompt: promptRef.current.value,
        provider: provider,
        model_type: model,
        datetime: Date.now(),
      }).then((res) => {
        console.log(res.data);
        setError();
      }).catch((error) => {
        console.log(error);
        setError(error.response.data);
      });
  }

  return (
    <div className='main'>
      <Button variant='contained' color="secondary" component={Link} href="/models">
        Back
      </Button>
      <Typography variant='h4' className={styles.header}>
        Create Model
      </Typography>
      <div className='medium-space' />

      <TextField
        id="outlined-basic"
        label="Model name"
        variant="outlined"
        className='text-label'
        inputRef={nameRef}
      />
      {error ? <Typography variant='body2' color='red'>
          Error: {error}
        </Typography> : null}
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
          value={provider}
          label="Provider"
          onChange={(e) => setProvider(e.target.value)}
        >
          <MenuItem value={'openai'}>OpenAI</MenuItem>
          <MenuItem value={'anthropic'}>Anthropic</MenuItem>
        </Select>
      </FormControl>
      <FormControl className='button-margin' disabled={provider !== 'openai'}>
        <InputLabel id="model-label">Model</InputLabel>
        <Select
          labelId="model-label"
          className="simple-select"
          value={model}
          label="Model"
          onChange={(e) => setModel(e.target.value)}
        >
          <MenuItem value={'ada'}>Ada</MenuItem>
          <MenuItem value={'babbage'}>Babbage</MenuItem>
          <MenuItem value={'curie'}>Curie</MenuItem>
          <MenuItem value={'davinci'}>Davinci</MenuItem>
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

      <Button variant='contained' color="primary" onClick={handleCreateModel}>Create model</Button>
    </div>
  )
}
