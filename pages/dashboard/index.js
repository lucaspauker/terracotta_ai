import { useState, useEffect } from 'react';
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
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import axios from 'axios';
axios.defaults.withCredentials = true

import styles from '@/styles/Data.module.css'

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

export default function Dashboard() {
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [dataset, setDataset] = useState('');
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [type, setType] = useState('class');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);

  return (
    <div className='main'>
      <Typography variant='h4' className='page-main-header'>
        Dashboard
      </Typography>
      <div className='medium-space' />

      <Button variant='contained' color="primary">Dash</Button>
    </div>
  )
}
