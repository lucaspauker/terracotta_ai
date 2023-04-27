import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import { DataGrid } from '@mui/x-data-grid';
import { FaArrowLeft } from 'react-icons/fa';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import axios from 'axios';
import {BsFillCircleFill} from "react-icons/bs";

import styles from '@/styles/Data.module.css';

export default function ModelPage() {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [evals, setEvals] = useState([]);
  const router = useRouter();
  const { model_id } = router.query;

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const doDelete = () => {
    axios.post("/api/models/delete/" + model_id).then((res) => {
      console.log(res.data);
      router.push('/models');
    }).catch((error) => {
      console.log(error);
    });
  }

  useEffect(() => {
    const last = window.location.href.split('/').pop();  // This is a hack
    axios.get("/api/models/" + last).then((res) => {
      setModel(res.data);
      axios.get("/api/evaluate/model/" + last).then((res) => {
          setEvals(res.data);
          setLoading(false);
        }).catch((error) => {
          console.log(error);
        });
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
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon'/>
          <Typography variant='h4' className='page-main-header'>
            {model.name}
          </Typography>
        </div>
        <div>
          <Button className='button-margin' variant='contained' color="error" onClick={handleClickOpen}>Delete</Button>
        </div>
      </div>
      <div className='medium-space' />

      <div>
        <Typography variant='h6'>
          Model info
        </Typography>
        <div className='tiny-space'/>
        <Paper className='small-card' variant='outlined'>
          <Typography>Provider: {model.provider === 'openai' ? 'OpenAI' : model.provider}</Typography>
          <Typography>Architecture: {model.modelArchitecture}</Typography>
          <Typography><span className='status'>Status:&nbsp;&nbsp;<BsFillCircleFill className={model.status==='succeeded' || model.status==='imported' ? 'model-succeeded' : model.status==='failed' ? 'model-failed' : 'model-training'}/>{model.status.toLowerCase()}</span></Typography>
        </Paper>
        <div className='medium-space' />
      </div>

      {evals.length > 0 ?
        <>
        <Typography variant='h6'>
          Evaluations
        </Typography>
        {evals.map(e => (
          <div key={e._id}>
            <div className='tiny-space'/>
            <Paper className='card' variant='outlined'>
              <Typography>Name: {e.name}</Typography>
              <Typography>Description: {e.description}</Typography>
              <Typography>Dataset name: <Link className='link' href={"/data/" + e.datasetId}>{e.datasetName}</Link></Typography>
              <Typography>Metrics: {e.metrics}</Typography>
            </Paper>
          </div>
        ))}
        </>
        : null }

      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete model?"}
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
