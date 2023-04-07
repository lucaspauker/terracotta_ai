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

export default function Train() {
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [type, setType] = useState('class');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const promptRef = useRef();

  useEffect(() => {
    axios.get("/api/data/list").then((res) => {
      console.log(res.data);
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
      <Typography variant='h4' className={styles.header}>
        Playground
      </Typography>
      <div className='medium-space' />

      <Typography variant='body1'>
        Model
      </Typography>
      <div className='tiny-space' />
      <FormControl>
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

      <Button variant='contained' color="primary">Finetune</Button>
    </div>
  )
}
