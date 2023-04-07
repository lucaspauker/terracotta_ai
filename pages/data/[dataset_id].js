import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import axios from 'axios';
import AWS from 'aws-sdk'
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

export default function DataPage() {
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState({name: '', type: 'classification'});
  const [error, setError] = useState('');
  const [type, setType] = useState('classification');
  const [selectedFile, setSelectedFile] = useState('');
	const [isFilePicked, setIsFilePicked] = useState(false);
  const nameRef = useRef();
  const router = useRouter()
  const { dataset_id } = router.query
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    axios.get("/api/data/" + dataset_id).then((res) => {
      console.log(res.data);
      if (res.data !== "No data found") {
        setDataset(res.data);
      }

      // Load the file

      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  const doDelete = () => {
    axios.post("/api/data/delete/" + dataset_id).then((res) => {
      console.log(res.data);
      window.location.href = '/data';
    }).catch((error) => {
      console.log(error);
    });
  }

  const getFile = (file) => {
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

  return (
    <div className='main'>
      <Button variant='contained' color="secondary" component={Link} href="/data">
        Back
      </Button>
      <Typography variant='h4' className={styles.header}>
        Dataset View
      </Typography>
      <div className='medium-space' />

      <TextField
        id="outlined-basic"
        label="Dataset name"
        variant="outlined"
        className='text-label'
        value={dataset.name}
        onChange={(e) => setDataset(e.target.value)}
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

      <Button variant='contained' color="primary">Update</Button>
      <Button className='button-margin' variant='contained' color="error" onClick={handleClickOpen}>Delete</Button>

      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete dataset?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This action is permanent and cannot be reversed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={doDelete} autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
