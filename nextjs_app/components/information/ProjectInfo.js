import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

const Info = () => {
  return (
    <Paper variant='outlined' className='info-box'>
      <Typography variant='h4'>
        What is a project?
      </Typography>
      <Typography variant='body1'>
        To get started, create a project. Create a new project for every
        task you want to do.
        There are two kinds of projects: classification and generative.
        Use a classification project if you want to classify text into certain
        predefined categories.
        Use a generative project if you want to generate freeform text.
      </Typography>
    </Paper>
  );
};

export default Info;
