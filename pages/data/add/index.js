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
import { v4 } from "uuid";
import { getSession, useSession, signIn, signOut } from "next-auth/react"

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

export default function Add() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [error, setError] = useState();
  const [type, setType] = useState('classification');
  const [selectedFile, setSelectedFile] = useState(null);
	const [isFilePicked, setIsFilePicked] = useState(false);
  const [realFileName, setRealFileName] = useState('');
  const [progress , setProgress] = useState(0);
  const nameRef = useRef();
  const descriptionRef = useRef();
  const [user, setUser] = useState(null);
  const { data: session } = useSession();

  const handleFileInput = (e) => {
    setSelectedFile(e.target.files[0]);
    uploadFile(e.target.files[0]);
  }

  console.log(realFileName);

  const uploadFile = (file) => {
    const params = {
      ACL: 'public-read',
      Body: file,
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + realFileName,
    };

    myBucket.putObject(params)
      .on('httpUploadProgress', (evt) => {
        setProgress(Math.round((evt.loaded / evt.total) * 100))
      })
      .send((err) => {
        if (err) console.log(err)
      });
  }

  const handleCreateDataset = () => {
    if (nameRef.current.value === '') {
      setError("Please provide a name.");
      return;
    }
    if (!selectedFile) {
      setError("Please submit a file.");
      return;
    }
    axios.post("/api/data/add", {
        name: nameRef.current.value,
        description: descriptionRef.current.value,
        type: type,
        user_id: user._id,
        filename: realFileName,
        initial_filename: selectedFile.name,
        datetime: Date.now(),
      }).then((res) => {
        console.log(res.data);
        setError();
        window.location.href = '/data';
      }).catch((err) => {
        console.log(err);
        setError(err.response.data.error);
      });
  }

  useEffect(() => {
    setRealFileName(v4() + ".csv");
    axios.post("/api/user", {
        email: session.user.email,
      }).then((res) => {
        setUser(res.data);
        console.log(res.data);
      }).catch((error) => {
        console.log(error);
      });
  }, []);

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
      <div className='small-space' />
      <TextField
        id="outlined-basic"
        label="Description"
        variant="outlined"
        className='text-label'
        inputRef={descriptionRef}
      />
      <div className='medium-space' />

      <div className="horizontal-box flex-start">
        <Typography variant='body1'>
          Type of data:&nbsp;&nbsp;
        </Typography>
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
          <ToggleButton value="generative">
            <Typography variant='body1'>
              Generative
            </Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='medium-space' />

      <div className="file-input">
        <div className='horizontal-box flex-start'>
          <Button variant="outlined" color="primary" component="label">
            Upload file
            <input type="file" accept=".csv, .json" onChange={handleFileInput}  hidden/>
          </Button>
          {selectedFile ?
            <Typography variant='body1' sx={{color:'grey'}}>&nbsp;{selectedFile.name}</Typography>
            : null}
        </div>
      </div>
      <Typography>File upload progress: {progress}%</Typography>
      <div className='medium-space' />

      {error ? <Typography variant='body2' color='red'>Error: {error}</Typography> : null}
      <Button variant='contained' color="primary" onClick={handleCreateDataset}>Create dataset</Button>
    </div>
  )
}
