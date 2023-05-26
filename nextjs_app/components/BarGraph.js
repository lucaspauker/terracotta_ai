import React from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import {toTitleCase, metricFormat} from 'components/utils';

const BarGraph = ({ evaluations }) => {
  const labels = evaluations.map((evaluation) => evaluation.name);
  const metrics = evaluations[0]?.metrics || [];

  const colors = ['#6fbdf0', '#339665', '#ed6548', '#853973'];

  const graphComponents = metrics.map((metric, index) => {
    const color = colors[index % colors.length];
    const dataset = {
      label: metric,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1,
      data: evaluations.map((evaluation) => evaluation.metricResults[metric].toFixed(2)),
    };

    const data = {
      labels: labels,
      datasets: [dataset],
    };

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
        <Bar data={data} options={options} height={64}/>
      </div>
    );
  });

  return <div>{graphComponents}</div>;
};

export default BarGraph;
import 'chart.js/auto';
