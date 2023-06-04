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
import { DataGrid } from '@mui/x-data-grid';
import { FaArrowLeft } from 'react-icons/fa';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import axios from 'axios';
import {BsFillCircleFill} from "react-icons/bs";
import { Line } from 'react-chartjs-2';
import { calculateMonochromeColor, calculateColor, baseModelNamesDict, metricFormat } from '/components/utils';
import DataTable from '../../components/DataTable';

function ConfusionMatrix({ evaluation }) {
  const rowSums = evaluation.metricResults['confusion'].map(row => row.reduce((partialSum, a) => partialSum + a, 0));

  return (
    <div>
      <div className='confusion-matrix'>
        <div className="grid-row header-row">
          <div className="grid-cell header-cell" />
          {evaluation.classes.map((item, columnIndex) => (
            <div key={columnIndex} className="grid-cell header-cell">
              <Typography>{item}</Typography>
            </div>
          ))}
          {evaluation.metricResults['confusion'].length > evaluation.classes.length &&
            <div className="grid-cell header-cell">
              <Typography>Misc</Typography>
            </div>
          }
        </div>
        {evaluation.metricResults['confusion'].map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            <div className="grid-cell header-cell">
              {rowIndex >= evaluation.classes.length ?
                <Typography>Misc</Typography>
                :
                <Typography>{evaluation.classes[rowIndex]}</Typography>
              }
            </div>
            {row.map((item, columnIndex) => (
              <div key={columnIndex} className="grid-cell"
                style={{backgroundColor: calculateMonochromeColor(rowSums[rowIndex] ? item / rowSums[rowIndex] : 0)}}>
                <Typography>{item}</Typography>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModelPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [evaluation, setEvaluation] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [predictionData, setPredictionData] = useState('');
  const router = useRouter();
  const { model_id } = router.query;

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const doDelete = () => {
    axios.post("/api/models/delete/" + model_id).then((res) => {
      console.log(res.data);
      router.push('/models');
    }).catch((error) => {
      console.log(error);
    });
  }

  useEffect(() => {
    const last = window.location.href.split('/').pop();  // This is a hack

    // Get the evaluations associated with the model
    axios.get("/api/evaluate/" + last).then((res) => {
      setEvaluation(res.data);
      setLoading(false);
      console.log(res.data);
    }).catch((error) => {
      console.log(error);
    });

    axios.post("/api/data/file", {
      fileName: last + '.csv',
      maxLines: 50,
      s3Folder: "predictions"
    }).then((json_data) => {
      setPredictionData(json_data.data);
      setHeaders(Object.keys(json_data.data[0]));
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
            {evaluation.name}
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
        <div className="horizontal-box full-width" style={{alignItems: 'flex-start'}}>
          <div>
            <Typography variant='h6'>
              Evaluation info
            </Typography>
            <div className='tiny-space'/>
            <Paper className='small-card' variant='outlined'>
              <Typography>
                Model: {evaluation.modelId ?
                    <Link className='link' href={'/models/' + evaluation.modelId}>{evaluation.modelName}</Link>
                    :
                    baseModelNamesDict[evaluation.completionName]
                }
              </Typography>
              <Typography>Evaluation dataset: <Link className='link' href={'/data/' + evaluation.datasetId}>{evaluation.datasetName}</Link></Typography>
            </Paper>
          </div>
          {evaluation.templateString &&
            <div>
              <Typography variant="h6">Template</Typography>
              <div className='tiny-space' />
              <TextField
                multiline
                InputProps={{ readOnly: true, }}
                className="white"
                value={evaluation.templateString}
                sx={{width: '400px'}}
              />
            </div>
          }
        </div>
        <div className='medium-space' />

        <div className='horizontal-box-grid'>
          {evaluation.metrics && evaluation.metrics.map(metric => (metric !== 'confusion') && (  // Handle conf matrix separately
            <div className="metric-box" key={metric} style={{backgroundColor: calculateColor(evaluation.metricResults[metric])}}>
              <Typography variant='h6' sx={{fontWeight: 'bold'}}>{metricFormat(metric)}</Typography>
              <div className='small-space'/>
              <Typography variant='h6'>
                {metric === 'accuracy' ?
                  parseFloat(evaluation.metricResults[metric] * 100).toFixed(0) + " %" :
                  parseFloat(evaluation.metricResults[metric]).toFixed(2)}
              </Typography>
            </div>
          ))}
        </div>
        <div className='medium-space' />

        {evaluation.metrics.includes('confusion') &&
          <div className='confusion-lr'>
            <Typography sx={{fontWeight: 'bold', marginTop: '100px'}}>True labels</Typography>
            <div className='confusion-right'>
              <Typography sx={{fontWeight: 'bold', marginLeft: '100px'}}>Predicted labels</Typography>
              <ConfusionMatrix evaluation={evaluation} />
            </div>
          </div>
        }

        {predictionData? 
          <DataTable 
            headers={headers} 
            rawData={predictionData} 
            downloadId={"predictions/" + window.location.href.split('/').pop() + ".csv"}
            downloadName = {evaluation.name + "_predictions.csv"}
          /> : null}
      </>
      }

      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete model?"}
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
