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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const options = {
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: 'Training loss curve',
    },
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      title: {
        display: true,
        text: 'Loss',
      },
    },
    x: {
      title: {
        display: true,
        text: 'Step',
      },
    },
  },
};


export default function ModelPage() {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [trainEval, setTrainEval] = useState(null);
  const [evals, setEvals] = useState([]);
  const [graphData, setGraphData] = useState(null);
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
    axios.get("/api/models/" + last).then((res) => {
      setModel(res.data);

      // Get the evaluations associated with the model
      axios.get("/api/evaluate/model/" + last).then((res) => {
          if (res.data.trainingCurve) {
            const labels = res.data.trainingCurve.x;
            setGraphData({
              labels,
              datasets: [
                {
                  label: 'Training loss',
                  data: res.data.trainingCurve.y,
                  borderColor: '#9C2315',
                  borderWidth: 1,
                },
              ],
            });
          }

          let evalsList = [];
          // The training evaluation is special, so deal with it separately
          const resEvals = res.data.evals;
          for (let i=0; i<resEvals.length; i++) {
            if (resEvals[i].trainingEvaluation) {
              setTrainEval(resEvals[i]);
            } else {
              evalsList.push(resEvals[i]);
            }
          }
          setEvals(evalsList);
          setLoading(false);
        }).catch((error) => {
          console.log(error);
        });
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box cursor-pointer'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon'/>
          <Typography variant='h4' className='page-main-header'>
            {model.name}
          </Typography>
        </div>
        <div>
          <Button className='button-margin' variant='contained' color="error" onClick={handleClickOpen}>Delete</Button>
        </div>
      </div>
      <div className='medium-space' />

      <div>
        <Typography variant='h6'>
          Model info
        </Typography>
        <div className='tiny-space'/>
        <Paper className='small-card' variant='outlined'>
          <Typography>Provider: {model.provider === 'openai' ? 'OpenAI' : model.provider}</Typography>
          <Typography>Architecture: {model.modelArchitecture}</Typography>
          <Typography>Finetuning dataset: <Link className='link' href={'/data/' + model.datasetId}>{model.datasetName}</Link></Typography>
          <Typography><span className='status'>Status:&nbsp;&nbsp;<BsFillCircleFill className={model.status==='succeeded' || model.status==='imported' ? 'model-succeeded' : model.status==='failed' ? 'model-failed' : 'model-training'}/>{model.status.toLowerCase()}</span></Typography>
        </Paper>
        <div className='medium-space' />
      </div>

      {trainEval ?
        <>
        <Typography variant='h6'>
          Training evaluation
        </Typography>
        <div>
          <div className='tiny-space'/>
          <Paper className='card' variant='outlined' className='vertical-box'>
            {graphData ? <Line options={options} data={graphData} className='chart'/> : null}
            <div className='horizontal-box'>
              {trainEval.metrics.map(metric => (
                <div className="metric-box" key={metric}>
                  <Typography variant='h6'>
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </Typography>
                  <div className='small-space'/>
                  <Typography>
                    {parseFloat(trainEval.metricResults[metric] * 100).toFixed(2)} %
                  </Typography>
                </div>
              ))}
            </div>
          </Paper>
        </div>
        <div className='medium-space' />
        </>
        : null }

      {evals.length > 0 ?
        <>
        <Typography variant='h6'>
          Evaluations
        </Typography>
        {evals.map(e => (
          <div key={e._id}>
            <div className='tiny-space'/>
            <Paper className='card' variant='outlined'>
              <Typography>Name: {e.name}</Typography>
              <Typography>Description: {e.description}</Typography>
              <Typography>Dataset name: <Link className='link' href={"/data/" + e.datasetId}>{e.datasetName}</Link></Typography>
              <Typography>Metrics: {e.metrics}</Typography>
            </Paper>
          </div>
        ))}
        </>
        : null }

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
