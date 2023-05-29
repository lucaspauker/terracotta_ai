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

export default function ProjectPage() {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [project, setProject] = useState('');
  const [projectName, setProjectName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const save = () => {
    axios.post("/api/project/update/" + projectId, {
      name: projectName,
    }).then((res) => {
      setErrorMessage("");
      router.push('/projects');
    }).catch((error) => {
      setErrorMessage(error.response.data.error);
      console.log(error);
    });
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const doDelete = () => {
    axios.post("/api/project/delete/" + projectId).then((res) => {
      console.log(res.data);
      router.push('/projects');
    }).catch((error) => {
      console.log(error);
    });
  }

  useEffect(() => {
    const project_id = window.location.href.split('/').pop();  // This is a hack
    setProjectId(project_id);
    axios.get("/api/project/" + project_id).then((res) => {
      setProject(res.data);
      setProjectName(res.data.name);
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
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon'/>
          <Typography variant='h4' className='page-main-header'>
            Edit Project
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
            Edit project info
          </Typography>
          <div className='medium-space' />
          <TextField
            label="Project name"
            variant="outlined"
            className='text-label center'
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
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
            {"Delete project?"}
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
