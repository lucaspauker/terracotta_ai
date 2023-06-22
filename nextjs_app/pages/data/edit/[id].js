import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { calculateColor } from '/components/utils';

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

export default function EditDataPage() {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [datasetId, setDatasetId] = useState('');
  const [dataset, setDataset] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const save = () => {
    axios.post("/api/data/update/" + datasetId, {
      name: datasetName,
    }).then((res) => {
      console.log(res.data);
      router.push('/data');
    }).catch((error) => {
      setErrorMessage(error.response.data.error);
    });
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const doDelete = () => {
    axios.post("/api/data/delete/" + datasetId).then((res) => {
      console.log(res.data);
      router.push('/data');
    }).catch((error) => {
      console.log(error);
    });
  }

  useEffect(() => {
    const dataset_id = window.location.href.split('/').pop();  // This is a hack
    setDatasetId(dataset_id);
    axios.get("/api/data/" + dataset_id).then((res) => {
      setDataset(res.data);
      setDatasetName(res.data.name);
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box cursor-pointer'>
          <IconButton onClick={() => router.back()} className='back-icon cursor-pointer'>
            <FaArrowLeft size='30'/>
          </IconButton>
          <Typography variant='h4' className='page-main-header'>
            Edit Dataset
          </Typography>
        </div>
        <div>
          <Button className='button-margin' variant='contained' color="error" onClick={handleClickOpen}>Delete</Button>
        </div>
      </div>
      <div className='medium-space' />

      <div className="main-content">
        <Paper className='card vertical-box' variant='outlined'>
          <Typography variant='h6'>
            Edit dataset info
          </Typography>
          <div className='medium-space' />
          <TextField
            label="Dataset name"
            variant="outlined"
            className='text-label center'
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            required
          />
          <div className='medium-space' />
          {errorMessage ? <Typography variant='body2' color='red'>Error: {errorMessage}</Typography> : null}
          <Button size='large' variant="contained" onClick={save}>Save</Button>
        </Paper>

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
    </div>
  )
}
