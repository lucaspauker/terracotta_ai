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
                    <TableCell className='table-cell'>Dataset Name</TableCell>
                    <TableCell className='table-cell'>Provider</TableCell>
                    <TableCell className='table-cell'>Architecture</TableCell>
                    <TableCell className='table-cell'>Status</TableCell>
                    <TableCell className='table-cell'>Provider Model ID</TableCell>
                    <TableCell className='table-cell'>Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {models.map((model) => (
                    <TableRow
                      key={model._id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>{model.name}</TableCell>
                      <TableCell>{model.datasetName}</TableCell>
                      <TableCell>{model.provider}</TableCell>
                      <TableCell>{model.modelArchitecture}</TableCell>
                      <TableCell>{model.status}</TableCell>
                      <TableCell>{"providerModelName" in model? model.providerModelName:"pending"}</TableCell>
                      <TableCell>{"cost" in model ? "$" + model.cost :"pending"}</TableCell>
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
              What is a finetuned model?
            </Typography>
            <Typography variant='body1'>
              Large language models (LLMs) such as GPT-3 are trained on large amounts
              of text data and therefore understand language well. However, since they
              are trained on general data, in order to create a model useful for a
              specific use-case such as spam detection, one must finetune the model on
              spam detection data. Then, the model uses what it learned on general data
              and applies it to the new data and quickly learns the new task. This is
              similar to teaching someone a new skill.
            </Typography>
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
