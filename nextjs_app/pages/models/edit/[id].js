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
import { FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { calculateColor } from '/components/utils';

export default function EditModelPage() {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [modelId, setModelId] = useState('');
  const [model, setModel] = useState('');
  const [modelName, setModelName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const save = () => {
    axios.post("/api/models/update/" + modelId, {
      name: modelName,
    }).then((res) => {
      router.push('/models');
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
    axios.post("/api/models/delete/" + modelId).then((res) => {
      console.log(res.data);
      router.push('/models');
    }).catch((error) => {
      console.log(error);
    });
  }

  useEffect(() => {
    const model_id = window.location.href.split('/').pop();  // This is a hack
    setModelId(model_id);
    axios.get("/api/models/" + model_id).then((res) => {
      setModel(res.data);
      setModelName(res.data.name);
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box cursor-pointer'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon'/>
          <Typography variant='h4' className='page-main-header'>
            Edit Model
          </Typography>
        </div>
        <div>
          <Button className='button-margin' variant='contained' color="error" onClick={handleClickOpen}>Delete</Button>
        </div>
      </div>
      <div className='medium-space' />

      {loading ?
        <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
        :
        <div className="main-content">
          <Paper className='card vertical-box' variant='outlined'>
            <Typography variant='h6'>
              Edit model info
            </Typography>
            <div className='medium-space' />
            <TextField
              label="Model name"
              variant="outlined"
              className='text-label center'
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
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
      }
    </div>
  )
}
