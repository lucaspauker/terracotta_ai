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
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import axios from 'axios';
import { useRouter } from 'next/router'
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
  const router = useRouter()

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

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
          Datasets
        </Typography>
        <Button variant='contained' color="secondary" component={Link} href="/data/add">
          + New dataset
        </Button>
      </div>
      <div className='tiny-space' />

      <div>
        {datasets.length > 0 ?
          <Paper variant="outlined">
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell className='table-cell'>Name</TableCell>
                    <TableCell className='table-cell'>ID</TableCell>
                    <TableCell className='table-cell'>Description</TableCell>
                    <TableCell className='table-cell'>Data filename</TableCell>
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
          </Paper>
          :
          <>
          <div className='medium-space'/>
          <Paper variant='outlined' className='info-box'>
            <Typography variant='h4'>
              What is a dataset?
            </Typography>
            <Typography variant='body1'>
              A dataset is your data that you can use to finetune a large language model (LLM).
              Datasets consist of two columns: <span className='italic'>input</span> and
              <span className='italic'>output</span>.
            </Typography>
            <div className='medium-space'/>

            <Typography variant='h4'>
              How can I get started?
            </Typography>
            <Typography variant='body1'>
              To create a dataset, you need a CSV file of your data. Then, click the
              "new dataset" button to build a dataset. This will take you to the
              new dataset page, which will let you upload a CSV file and
              choose which columns of your CSV
              data are input and output. Or, if you don't have data, check out some of
              these links to get started:
            </Typography>
            <List sx={{ listStyleType: 'disc' }}>
              <ListItem>
                <Link href='' className='link'>
                  <Typography>SMS spam dataset</Typography>
                </Link>
              </ListItem>
              <ListItem>
                <Link href='' className='link'>
                  <Typography>Sports commentary classification dataset</Typography>
                </Link>
              </ListItem>
              <ListItem>
                <Link href='' className='link'>
                  <Typography>Another dataset</Typography>
                </Link>
              </ListItem>
            </List>
            <div className='medium-space'/>

            <Typography variant='h4'>
              Is there a tutorial?
            </Typography>
            <Typography variant='body1'>
              Check out our tutorial here:&nbsp;
              <Link href='' className='link'>
                some tutorial
              </Link>
            </Typography>
          </Paper>
          </>
        }
      </div>
    </div>
  )
}
