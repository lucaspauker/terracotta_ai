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
import { calculateColor, metricFormat } from '/components/utils';
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

const plugins = [
  {
    afterDraw: chart => {
      if (chart.tooltip?._active?.length) {
        let x = chart.tooltip._active[0].element.x;
        let yAxis = chart.scales.y;
        let ctx = chart.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, yAxis.top);
        ctx.lineTo(x, yAxis.bottom);
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // set a dash pattern
        ctx.strokeStyle = 'black'; // set the line color to black
        ctx.stroke();
        ctx.restore();
      }
    }
  }
];

const options = {
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: 'Training loss curve',
      color: 'black',
      font: {
        size: 16,
        weight: 'normal',
      },
    },
    legend: {
      display: true,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      enabled: true,
    },
  },
  scales: {
    y: {
      title: {
        color: 'black',
        display: true,
        text: 'Loss',
      },
    },
    x: {
      title: {
        color: 'black',
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
  const [templateString, setTemplateString] = useState('');
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

      setTemplateString(res.data.templateString);

      // Get the evaluations associated with the model
      axios.get("/api/evaluate/model/" + last).then((res) => {
          if (res.data.trainingCurve) {
            const labels = res.data.trainingCurve.x;
            setGraphData({
              labels,
              datasets: [
                {
                  label: 'Training loss moving average',
                  data: res.data.trainingCurve.yMovingAverage,
                  borderColor: 'rgba(0, 0, 255, 1)',
                  borderWidth: 3,
                  pointRadius: 0,
                },
                {
                  label: 'Training loss',
                  data: res.data.trainingCurve.y,
                  borderColor: 'rgba(156, 35, 21, 0.7)',
                  borderWidth: 2,
                  pointRadius: 0,
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

      <div className="horizontal-box full-width" style={{alignItems: 'flex-start'}}>
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
        </div>
        <div>
          <Typography variant="h6">Template</Typography>
          <div className='tiny-space' />
          <TextField
            multiline
            InputProps={{ readOnly: true, }}
            className="white"
            value={templateString}
            sx={{width: '400px'}}
          />
        </div>
      </div>
      <div className='medium-space' />

      {trainEval || graphData ?
        <>
        <Typography variant='h6'>
          Training evaluation
        </Typography>
        <div>
          <div className='tiny-space'/>
          <Paper className='card vertical-box' variant='outlined'>
            {graphData && <Line options={options} plugins={plugins} data={graphData} className='chart'/>}
            {trainEval &&
              <div className='horizontal-box-grid'>
                {trainEval.metrics.map(metric => (
                  <div className="metric-box" key={metric} style={{backgroundColor: calculateColor(trainEval.metricResults[metric])}}>
                    <Typography variant='h6' sx={{fontWeight: 'bold'}}>
                      {metricFormat(metric)}
                    </Typography>
                    <div className='small-space'/>
                    <Typography variant='h6'>
                      {metric === 'accuracy' ?
                        parseFloat(trainEval.metricResults[metric] * 100).toFixed(0) + " %" :
                        parseFloat(trainEval.metricResults[metric]).toFixed(2)}
                    </Typography>
                  </div>
                ))}
              </div>
            }
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
          e.status === "succeeded" &&
          <div key={e._id}>
            <div className='tiny-space'/>
            <Paper className='card' variant='outlined'>
              <Typography>Evaluation name: <Link className='link' href={"/evaluate/" + e._id}>{e.name}</Link></Typography>
              {e.description ? <Typography>Description: {e.description}</Typography> : null }
              <Typography>Dataset name: <Link className='link' href={"/data/" + e.datasetId}>{e.datasetName}</Link></Typography>
              <div className='small-space'/>
              <div className='horizontal-box-grid'>
                {e.metrics.map(metric => (
                  <div className="metric-box" key={metric} style={{backgroundColor: calculateColor(e.metricResults[metric])}}>
                    <Typography variant='h6' sx={{fontWeight: 'bold'}}>
                      {metricFormat(metric)}
                    </Typography>
                    <div className='small-space'/>
                    <Typography variant='h6'>
                      {metric === 'accuracy' ?
                        parseFloat(e.metricResults[metric] * 100).toFixed(0) + " %" :
                        parseFloat(e.metricResults[metric]).toFixed(2)}
                    </Typography>
                  </div>
                ))}
              </div>
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
