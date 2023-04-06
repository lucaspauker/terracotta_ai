import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';
import AWS from 'aws-sdk'

import styles from '@/styles/Data.module.css'

const S3_BUCKET ='canopy-ai-labs';
const REGION ='us-west-1';

AWS.config.update({
  accessKeyId: 'AKIAUSK3QUU7AKEWWSG4',
  secretAccessKey: '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'
})

const myBucket = new AWS.S3({
    params: { Bucket: S3_BUCKET},
    region: REGION,
})

export default function Add() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const nameRef = useRef();
  const [error, setError] = useState();
  const [type, setType] = useState('classification');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const [progress , setProgress] = useState(0);

  const handleFileInput = (e) => {
    setSelectedFile(e.target.files[0]);
    console.log(e.target.files[0]);
    uploadFile(e.target.files[0]);
  }

  const uploadFile = (file) => {
    const params = {
      ACL: 'public-read',
      Body: file,
      Bucket: S3_BUCKET,
      Key: 'raw_finetune_data/' + file.name,
    };

    myBucket.putObject(params)
      .on('httpUploadProgress', (evt) => {
        setProgress(Math.round((evt.loaded / evt.total) * 100))
      })
      .send((err) => {
        if (err) console.log(err)
      })
  }

  const handleCreateDataset = () => {
    axios.post("http://localhost:3005/data/add", {
        name: nameRef.current.value,
        type: type,
        filename: "foobar.csv",
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
      <Button variant='contained' color="secondary" component={Link} href="/data">
        Back
      </Button>
      <Typography variant='h4' className={styles.header}>
        Create Dataset
      </Typography>
      <Typography variant='body1'>
        Upload your data and save it to fine tune later! Supported file formats:
        JSON, CSV, JSONL.
      </Typography>
      <div className='medium-space' />

      <TextField
        id="outlined-basic"
        label="Dataset name"
        variant="outlined"
        className='text-label'
        inputRef={nameRef}
      />
      {error ? <Typography variant='body2' color='red'>
          Error: {error}
        </Typography> : null}
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
          <ToggleButton value="classification">
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
        <div className='horizontal-box'>
          <Button variant="outlined" color="primary" component="label">
            Upload file
            <input type="file" accept=".csv, .json" onChange={handleFileInput}  hidden/>
          </Button>
          <Typography variant='body1' sx={{color:'grey'}}>&nbsp;{selectedFile ? selectedFile.name : null}</Typography>
        </div>
      </div>
      <Typography>File upload progress: {progress}%</Typography>
      <div className='medium-space' />

      <Button variant='contained' color="primary" onClick={handleCreateDataset}>Create dataset</Button>
    </div>
  )
}
