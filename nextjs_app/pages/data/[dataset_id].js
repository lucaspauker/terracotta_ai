import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TablePagination from '@mui/material/TablePagination';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { DataGrid } from '@mui/x-data-grid';
import { BiShuffle } from 'react-icons/bi';
import { FaArrowLeft } from 'react-icons/fa';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import axios from 'axios';

import DataTable from '../../components/DataTable';

export default function DataPage() {
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState({name: '', type: 'classification'});
  const [error, setError] = useState('');
  const [type, setType] = useState('classification');
  const [filename, setFilename] = useState('');
  const [displayFilename, setDisplayFilename] = useState('');
	const [isFilePicked, setIsFilePicked] = useState(false);
  const nameRef = useRef();
  const [open, setOpen] = useState(false);
  const [trainOrVal, setTrainOrVal] = useState('train');
  const [rawData, setRawData] = useState({});
  const [inputValData, setInputValData] = useState(null);
  const [inputTrainData, setInputTrainData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const router = useRouter();
  const { dataset_id } = router.query;

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const reloadDataset = (e, val) => {
    setTrainOrVal(val);
    if (val === 'train') {
      setRawData(inputTrainData)
    } else {
      setRawData(inputValData)
    }
  }

  const doDelete = () => {
    axios.post("/api/data/delete/" + dataset_id).then((res) => {
      console.log(res.data);
      router.push('/data');
    }).catch((error) => {
      console.log(error);
    });
  }

  const shuffleData = () => {
    setLoading(true);
    if (trainOrVal === 'train') {
      // Get train file from S3
      axios.post("/api/data/file", {
          fileName: dataset.trainFileName,
          maxLines: 50,
          shuffle: true,
        }).then((json_data) => {
          setRawData(json_data.data);
          setInputTrainData(json_data.data);
          setLoading(false);
        }).catch((error) => {
          console.log(error);
        });
    } else {
      // Get train file from S3
      axios.post("/api/data/file", {
          fileName: dataset.valFileName,
          maxLines: 50,
          shuffle: true,
        }).then((json_data) => {
          setRawData(json_data.data);
          setInputValData(json_data.data);
          setLoading(false);
        }).catch((error) => {
          console.log(error);
        });
    }
  }

  useEffect(() => {
    const last = window.location.href.split('/').pop();  // This is a hack
    axios.get("/api/data/" + last).then((res) => {
      setDataset(res.data);
      setFilename(res.data.trainFileName);
      setDisplayFilename(res.data.initialTrainFileName);

      // Get train file from S3
      axios.post("/api/data/file", {
          fileName: res.data.trainFileName,
          maxLines: 50,
        }).then((json_data) => {
          setRawData(json_data.data);
          setInputTrainData(json_data.data);
          setHeaders(Object.keys(json_data.data[0]));
          setLoading(false);
        }).catch((error) => {
          console.log(error);
        });

      // Get val file from S3
      if (res.data.valFileName) {
        axios.post("/api/data/file", {
            fileName: res.data.valFileName,
            maxLines: 50,
          }).then((json_data) => {
            setInputValData(json_data.data);
          }).catch((error) => {
            console.log(error);
          });
      }
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
            {dataset.name}
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
      <>
        <div>
          <Typography variant='h6'>
            Dataset info
          </Typography>
          <div className='tiny-space'/>
          <Paper className='small-card' variant='outlined'>
            <Typography variant='body1'>
              Task:&nbsp;{type}
            </Typography>

            {inputTrainData.length > 0 ?
              <div>
                <div>
                  <Typography>Train file name: {displayFilename}</Typography>
                  <Typography># of train rows: {dataset.numTrainExamples}</Typography>
                  {inputValData ? <Typography># of validation rows: {dataset.numValExamples}</Typography>
                    : <Typography>No validation data</Typography>}
                  {dataset.classes ?
                    <Typography>Classes: {dataset.classes.map((x, i) =>
                      (i < dataset.classes.length - 1 ? x + ", " : x))}</Typography>
                    : null }
                </div>
              </div> : null }
          </Paper>
          <div className='medium-space' />
        </div>

        <div className='horizontal-box full-width'>
          <div className='horizontal-box'>
            <Typography variant='h6'>
              View data
            </Typography>
            <IconButton color="primary" onClick={shuffleData}>
              <BiShuffle />
            </IconButton>
          </div>
          {inputValData ? <ToggleButtonGroup
            value={trainOrVal}
            exclusive
            onChange={reloadDataset}
          >
            <ToggleButton value="train">
              <Typography variant='body1'>
                Train
              </Typography>
            </ToggleButton>
            <ToggleButton value="val">
              <Typography variant='body1'>
                Validation
              </Typography>
            </ToggleButton>
          </ToggleButtonGroup> : null }
        </div>
        <div className='tiny-space' />

        <DataTable headers={headers} rawData={rawData} />
        <div className='medium-space' />
      </>
    }

      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete dataset?"}
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
  )
}
