import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const DistributionBarGraph = ({ data }) => {
  const classLabels = Object.keys(data);
  const classCounts = Object.values(data);
  const colors = ['#6fbdf0', '#339665', '#ed6548', '#853973'];

  const chartData = {
    labels: classLabels,
    datasets: [
      {
        data: classCounts,
        backgroundColor: 'rgba(255, 0, 0, 0.6)',
        borderColor: 'rgba(255, 0, 0, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="bar-graph">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export default DistributionBarGraph;
