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

  const columns = [
    { field: 'name', headerName: 'Model name', minWidth: 150},
    { field: 'id', headerName: 'Dataset ID', minWidth: 150},
    { field: 'provider', headerName: 'Provider', minWidth: 150},
    { field: 'model_type', headerName: 'Model type', minWidth: 150},
    { field: 'prompt', headerName: 'Prompt', minWidth: 150},
    { field: 'train_cost', headerName: 'Train cost', minWidth: 150},
    { field: 'inference_cost', headerName: 'Inference cost', minWidth: 150},
  ];

  const rows = [
    { modelName: "My first model", id: 'jaslkdjaldakld', provider: 'OpenAI', prompt: 'Foobar lipsum dolor', trainCost: '0.0007', inferenceCost: '0.02'},
    { modelName: "My second model", id: 'alkjasldjalkd', provider: 'OpenAI', prompt: 'Hi lipsum dolor', trainCost: '0.0007', inferenceCost: '0.01'},
    { modelName: "My third model", id: '12909300923128', provider: 'OpenAI', prompt: 'Hi lipsum dolor sit amet blah blahHi lipsum dolor sit amet blah blaHi lipsum dolor sit amet blah blaHi lipsum dolor sit amet blah blaHi lipsum dolor sit amet blah blaHi lipsum dolor sit amet blah blahhhhh', trainCost: '0.0007', inferenceCost: '0.01'},
  ];

  useEffect(() => {
    axios.get("/api/model/list").then((res) => {
      console.log(res.data);
      if (res.data !== "No data found") {
        let data = res.data;
        for (let i=0; i<data.length; i++) {
          data[i].id = data[i]._id;
        }
        setModels(data);
      }
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  return (
    <div className='main'>
      <Typography variant='h4' className='page-main-header'>
        Models
      </Typography>
      <div className='medium-space' />

      <div className='horizontal-box full-width'>
        <Typography variant='h5'>
        </Typography>
        <div>
          <Button className='button-margin' variant='contained' color="secondary" component={Link} href="/models/add">
            + Finetune model
          </Button>
        </div>
      </div>
      <div className='small-space' />

      {loading ?
        <CircularProgress />
        :
        <div>
          {models.length > 0 ?
            <Paper>
              <div style={{ height: '50vh', width: '100%' }}>
                <DataGrid
                  rows={models}
                  columns={columns}
                  pageSize={5}
                  rowsPerPageOptions={[5]}
                  checkboxSelection
                />
              </div>
            </Paper>
            :
            <Typography variant='body1'>
              No models found :(
            </Typography>
          }
        </div>
      }
    </div>
  )
}
