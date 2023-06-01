import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import axios from 'axios';
import { Button, CircularProgress, Typography, Card, CardContent, Grid } from '@mui/material';
import { FaArrowLeft } from 'react-icons/fa';
import BarGraph from 'components/BarGraph';
import {toTitleCase, metricFormat} from 'components/utils';

export default function EvaluationDatasetPage() {
  const [loading, setLoading] = useState(false);
  const [evals, setEvals] = useState(null);
  const [selected, setSelected] = useState({});
  const [allSelected, setAllSelected] = useState({});
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const clear = () => {
    setSelected({});
  }

  const handleEvaluationCardClick = (id) => {
    setSelected(selected => {
      const updated = { ...selected, [id]: !selected[id] };
      return updated;
    });
  }

  useEffect(() => {
    setLoading(true);
    const last = window.location.href.split('/').pop();  // This is a hack

    axios
      .get("/api/evaluate/by-dataset/" + last)
      .then((res) => {
        console.log(res.data);
        setEvals(res.data);
        let newAllSelected = {};
        res.data.map((e) => {newAllSelected[e._id] = true;});
        setAllSelected(newAllSelected);
        setSelected(newAllSelected);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.response.data.error);
        setLoading(false);
      });
  }, []);

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box cursor-pointer'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon'/>
          <Typography variant='h4' className='page-main-header'>
            Evaluation Dataset View
          </Typography>
        </div>
      </div>
      <div className='medium-space' />
      {loading ?
        <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
        : evals && evals.length > 0 ? (
        <div>
          <div className='horizontal-box full-width'>
            <Typography variant='h6'>Evaluations:</Typography>
            <div>
              <Button onClick={clear} variant='outlined' size='small'>Select none</Button>
              <Button onClick={() => setSelected(allSelected)} variant='outlined' size='small' className='button-margin'>Select all</Button>
            </div>
          </div>
          <div className='tiny-space'/>
          <div className='horizontal-scroll-box small-scrollbar'>
            {evals.map((evaluation) => (
              evaluation.status === "succeeded" &&
              <div key={evaluation._id}>
                <Card
                  className={selected[evaluation._id] ? 'evaluation-card cursor-pointer active' : 'evaluation-card cursor-pointer'}
                  onClick={() => handleEvaluationCardClick(evaluation._id)}
                  style={{width: 250, marginRight: 10, marginTop: 4, marginLeft: 4}}
                >
                  <CardContent>
                    <Typography sx={{marginBottom: 2, fontWeight: 'bold'}} variant='subtitle1' align='center'>{evaluation.name}</Typography>
                    {evaluation.metrics.map((e) => (
                      <Typography key={e}>{metricFormat(e)}: {Number(evaluation.metricResults[e]).toFixed(2)}</Typography>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          <div className='medium-space'/>
          <Typography variant='h6'>Metrics:</Typography>
          <div className='tiny-space'/>
          <BarGraph evaluations={evals} selected={selected} />
        </div>
      ) : (
        <Typography>No evaluations available.</Typography>
      )}
    </div>
  );
}

