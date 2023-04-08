import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"

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

export default function Data() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [type, setType] = useState('class');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    axios.get("/api/data/list").then((res) => {
      console.log(res.data);
      if (res.data !== "No data found") {
        setDatasets(res.data);
      }
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  return (
    <div className='main'>
      <Typography variant='h4' className={styles.header}>
        Your Datasets
      </Typography>
      <div className='medium-space' />

      <div className='horizontal-box full-width'>
        <Typography variant='h5'>
        </Typography>
        <Button variant='contained' color="secondary" component={Link} href="/data/add">
          + Create dataset
        </Button>
      </div>
      <div className='small-space' />
      {loading ?
        <CircularProgress />
        :
        <div>
          {datasets.length > 0 ?
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{backgroundColor:'#d6daef'}}>
                  <TableRow>
                    <TableCell>Dataset name</TableCell>
                    <TableCell>Dataset ID</TableCell>
                    <TableCell>Number of rows</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datasets.map((dataset) => (
                    <TableRow
                      key={dataset._id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell><Link className='link' href={"/data/" + dataset._id}>{dataset.name}</Link></TableCell>
                      <TableCell>{dataset._id}</TableCell>
                      <TableCell>{dataset.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            :
            <Typography variant='body1'>
              No datasets found :(
              Create a dataset below!
            </Typography>
          }
        </div>
      }
    </div>
  )
}
