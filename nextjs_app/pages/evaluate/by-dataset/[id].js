import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import axios from 'axios';
import { CircularProgress, Typography, Card, CardContent, Grid } from '@mui/material';
import { FaArrowLeft } from 'react-icons/fa';
import BarGraph from 'components/BarGraph';

const metricMap = {
  'f1': 'F1',
  'bleu': 'BLEU',
  'rougel': 'RougeL',
}

export default function EvaluationDatasetPage() {
  const [loading, setLoading] = useState(false);
  const [evals, setEvals] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const last = window.location.href.split('/').pop();  // This is a hack

    axios
      .get("/api/evaluate/by-dataset/" + last)
      .then((res) => {
        setEvals(res.data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className='main vertical-box'>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

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
      {evals && evals.length > 0 ? (
        <div>
          <Typography variant='h6'>Evaluations:</Typography>
          <div className='tiny-space'/>
          <Grid container spacing={2}>
            {evals.map((evaluation) => (
              <Grid item key={evaluation._id} xs={12} sm={6} md={4} lg={3}>
                <Card className='evaluation-card'>
                  <CardContent>
                    <Typography sx={{marginBottom: 2}} variant='subtitle1' align='center'>{evaluation.name}</Typography>
                    {evaluation.metrics.map((e) => (
                      <Typography>{metricMap[e]}: {evaluation.metricResults[e].toFixed(2)}</Typography>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <div className='medium-space'/>
          <Typography variant='h6'>Graphs:</Typography>
          <div className='tiny-space'/>
          <BarGraph evaluations={evals} />
        </div>
      ) : (
        <Typography>No evaluations available.</Typography>
      )}
    </div>
  );
}

