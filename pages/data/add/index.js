import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';

import styles from '@/styles/Data.module.css'

export default function Add() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [type, setType] = useState('class');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);

  const handleUploadFile = () => {
  }

  const handleCreateDataset = () => {
  }

  useEffect(() => {
    axios.get("http://localhost:3005/data/list").then((res) => {
      console.log(res.data);
      setDatasets(res.data);
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  return (
    <div className='main'>
      <Typography variant='h4' className={styles.header}>
        Data Management
      </Typography>
      <div className='medium-space' />

      <Typography variant='h5'>
        Your datasets
      </Typography>
      {loading ?
        <CircularProgress />
        :
        <div>
          {datasets.length > 0 ?
            <div>
              <p>{datasets[0]["name"]}</p>
              <p>{datasets.length}</p>
              {datasets.map((d, index) => {
                <h1>Foo</h1>
              })}
            </div>
            :
            <Typography variant='body1'>
              No datasets found :(
              Create a dataset below!
            </Typography>
          }
        </div>
      }
      <div className='large-space' />
      <Divider />
      <div className='large-space' />

      <Typography variant='h5'>
        Create new dataset
      </Typography>
      <Typography variant='body2'>
        Upload your data and save it to fine tune later! Supported file formats:
        JSON, CSV, JSONL.
      </Typography>
      <div className='medium-space' />

      <TextField id="outlined-basic" label="Dataset name" variant="outlined" className='text-label'/>
      <div className='medium-space' />

      <div className="horizontal-box">
        <Typography variant='body1'>
          Type of data:&nbsp;&nbsp;
        </Typography>
        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={(e, val) => setType(val)}
          aria-label="text alignment"
        >
          <ToggleButton value="class">
            <Typography variant='body1'>
              Classification
            </Typography>
          </ToggleButton>
          <ToggleButton value="generative">
            <Typography variant='body1'>
              Generative
            </Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='medium-space' />

      <div className="file-input">
      <Button variant="outlined" component="label">
        Upload file
        <input type="file" accept=".csv, .json" ref={(domFileRef) => {setSelectedFile(domFileRef)}}  hidden/>
      </Button>
      </div>
      <div className='medium-space' />

      <Button variant='contained' color="success" onClick={handleCreateDataset}>Create dataset</Button>
    </div>
  )
}
