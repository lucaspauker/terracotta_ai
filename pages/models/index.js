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
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

import styles from '@/styles/Data.module.css'

export default function Models() {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);

  useEffect(() => {
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
    }
    axios.post("/api/model/list", {projectName: projectName}).then((res) => {
      console.log(res.data);
      if (res.data !== "No data found") {
        let data = res.data;
        setModels(data);
        console.log(data);
      }
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
    window.addEventListener("storage", () => {
      let projectName = '';
      if (localStorage.getItem("project")) {
        projectName = localStorage.getItem("project");
      }
      axios.post("/api/model/list", {projectName: projectName}).then((res) => {
        console.log(res.data);
        if (res.data !== "No data found") {
          let data = res.data;
          setModels(data);
          console.log(data);
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
          Finetuned Models
        </Typography>
        <Button className='button-margin' variant='contained' color="secondary" component={Link} href="/models/add">
          + Finetune model
        </Button>
      </div>
      <div className='tiny-space' />

      <div>
        {models.length > 0 ?
          <Paper variant="outlined">
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell className='table-cell'>Name</TableCell>
                    <TableCell className='table-cell'>ID</TableCell>
                    <TableCell className='table-cell'>Provider</TableCell>
                    <TableCell className='table-cell'>Architecture</TableCell>
                    <TableCell className='table-cell'>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {models.map((model) => (
                    <TableRow
                      key={model._id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>{model.name}</TableCell>
                      <TableCell>{model._id}</TableCell>
                      <TableCell>{model.provider}</TableCell>
                      <TableCell>{model.modelArchitecture}</TableCell>
                      <TableCell>{model.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          :
          <Typography variant='body1'>
            No models found :(
          </Typography>
        }
      </div>
    </div>
  )
}
