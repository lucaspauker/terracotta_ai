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
  const [project, setProject] = useState('');
  const { data: session } = useSession();

  useEffect(() => {
    let p = project;
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
      setProject(localStorage.getItem("project"));
    };
    axios.post("/api/data/list", {
        projectName: p,
      }).then((res) => {
        if (res.data !== "No data found") {
          setDatasets(res.data);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });

    window.addEventListener("storage", () => {
      let p = project;
      if (localStorage.getItem("project")) {
        p = localStorage.getItem("project");
        setProject(localStorage.getItem("project"));
      };
      axios.post("/api/data/list", {
          projectName: p,
        }).then((res) => {
          if (res.data !== "No data found") {
            setDatasets(res.data);
          }
          setLoading(false);
        }).catch((error) => {
          console.log(error);
        });
    });
  }, []);

  return (
    <div className='main'>
      <Typography variant='h4' className='page-main-header'>
        Datasets
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
                <TableHead sx={{backgroundColor:'#0077be'}}>
                  <TableRow>
                    <TableCell sx={{color:'white'}}>Name</TableCell>
                    <TableCell sx={{color:'white'}}>ID</TableCell>
                    <TableCell sx={{color:'white'}}>Description</TableCell>
                    <TableCell sx={{color:'white'}}>Data filename</TableCell>
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
                      <TableCell>{dataset.description}</TableCell>
                      <TableCell>{dataset.initialTrainFileName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            :
            <Typography variant='body1'>
              No datasets found :(
            </Typography>
          }
        </div>
      }
    </div>
  )
}
