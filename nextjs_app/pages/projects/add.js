import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import { FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"

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
  const [progress , setProgress] = useState(0);
  const nameRef = useRef();
  const descriptionRef = useRef();
  const [user, setUser] = useState(null);
  const { data: session } = useSession();
  const router = useRouter()

  const handleCreateProject = () => {
    if (nameRef.current.value === '') {
      setError("Please provide a name.");
      return;
    }
    let p = '';
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
    };
    axios.post("/api/project/add", {
        name: nameRef.current.value,
        type: type,
        datetime: Date.now(),
      }).then((res) => {
        console.log(res.data);
        setError();

        // Switch to the newly created project
        localStorage.setItem("project", nameRef.current.value);
        window.dispatchEvent(new Event("storage"));

        router.push('/projects');
      }).catch((err) => {
        console.log(err);
        setError(err.response.data.error);
      });
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon cursor-pointer'/>
          <Typography variant='h4' className='page-main-header'>
            Create Project
          </Typography>
        </div>
      </div>
      <div className='small-space' />

      <div className='main-content'>
        <Paper className='card vertical-box' variant='outlined'>
          <TextField
            id="outlined-basic"
            label="Project name"
            variant="outlined"
            className='text-label'
            inputRef={nameRef}
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

          {error ? <Typography variant='body2' color='red'>Error: {error}</Typography> : null}
          <Button variant='contained' color="primary" onClick={handleCreateProject}>Create project</Button>
        </Paper>
      </div>
    </div>
  )
}
