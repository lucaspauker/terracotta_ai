import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItem from '@mui/material/ListItem';

const Info = () => {
  return (
    <Paper variant='outlined' className='info-box'>
      <Typography variant='h4'>
        What is a dataset?
      </Typography>
      <Typography variant='body1'>
        In order to build good machine learning models, you need to have a good dataset.
        With Terracotta, you can upload a CSV to our platform, then use it to fine-tune a large language model (LLM).
      </Typography>
      <div className='medium-space'/>

      <Typography variant='h4'>
        How can I get started?
      </Typography>
      <Typography variant='body1'>
        To create a dataset, you need a CSV file of your data. Then, click the
        &quot;upload dataset&quot; button to get started. This will take you to the
        new dataset page, which will let you upload a CSV file and specify training and
        validation data.
        Or, if you don&apos;t have data, check out the datasets in
        <Link href='https://github.com/lucaspauker?tab=repositories' className='link'>
          &nbsp;this repo&nbsp;
        </Link>
        to get started.
      </Typography>
    </Paper>
  );
};

export default Info;
