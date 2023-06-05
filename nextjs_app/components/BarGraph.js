import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { toTitleCase, metricFormat } from 'components/utils';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

const BarGraph = ({ evaluations, selected }) => {
  const labels = evaluations.map((evaluation) => evaluation.name);
  const allMetrics = evaluations.reduce((metrics, evaluation) => {
    return metrics.concat(evaluation.metrics || []);
  }, []);
  let uniqueMetrics = [...new Set(allMetrics)];
  uniqueMetrics = uniqueMetrics.filter(m => m !== 'confusion');
  const [selectedMetrics, setSelectedMetrics] = useState(uniqueMetrics);
  const colors = ['#6fbdf0', '#339665', '#ed6548', '#853973'];

  const handleMetricChange = (metric) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const checkboxes = uniqueMetrics.map((metric) => (
    <div>
      <FormControlLabel
        key={metric}
        control={
          <Checkbox
            checked={selectedMetrics.includes(metric)}
            onChange={() => handleMetricChange(metric)}
          />
        }
        label={metricFormat(metric)}
      />
    </div>
  ));

  const graphComponents = selectedMetrics.map((metric, index) => {
    const color = colors[index % colors.length];
    const dataset = {
      label: metric,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1,
      data: evaluations
        .filter(
          (e) =>
            selected[e._id] &&
            e.metricResults?.[metric] >= 0 &&
            selectedMetrics.includes(metric)
        )
        .map((evaluation) => {
          const metricResult = evaluation.metricResults?.[metric];
          return metricResult !== undefined ? Number(metricResult).toFixed(2) : null;
        }),
    };

    const data = {
      labels: evaluations
        .filter(
          (evaluation) =>
            selected[evaluation._id] &&
            evaluation.metricResults?.[metric] >= 0 &&
            selectedMetrics.includes(metric)
        )
        .map((e) => e.name),
      datasets: [dataset],
    };

    console.log(data);

    const options = {
      indexAxis: 'y', // Display bars horizontally
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          min: 0,
          max: 1,
        },
      },
      plugins: {
        legend: false,
      },
      barThickness: 16,
      categoryPercentage: 0.5,
    };

    return (
      <div key={metric}>
        <Typography>{metricFormat(metric)}</Typography>
        <Bar data={data} options={options} height={evaluations.length * 28} />
      </div>
    );
  });

  // Render the checkboxes and graphs in separate sections
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={3}>
        {checkboxes}
      </Grid>
      <Grid item xs={12} sm={9}>
        {graphComponents}
      </Grid>
    </Grid>
  );
};

export default BarGraph;

