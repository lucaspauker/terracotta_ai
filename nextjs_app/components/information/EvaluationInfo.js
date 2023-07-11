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
        What is an evaluation?
      </Typography>
      <Typography variant='body1'>
        Evaluations refer to quantitative evaluations of a model on a dataset.
        Evaluations work by passing the inputs from a dataset through the model
        then comparing the model outputs to the ground truth.
        Depending on the project type (classification or generative), the metrics
        used to compare the model outputs to the ground truth will be different.
        Terracotta supports two types of evaluations: evaluations of base models
        (i.e. not fine-tuned models) and evaluations of fine-tuned models.
      </Typography>
      <div className='medium-space'/>

      <Typography variant='h4'>
        How can I get started?
      </Typography>
      <Typography variant='body1'>
        In order to create an evaluation, first make sure that you have uploaded a dataset.
        Once you have a dataset, click the &quot;new evaluation&quot; button to get started.
        Then, you can either select &quot;evaluate base model&quot; or &quot;evaluate fine-tuned model&quot;.
        In order to evaluate a fine-tuned model, you have to have trained a fine-tuned model.
        Then, you can select the model type, dataset, parameters, and metrics.
        Once everything is ready, you can run the evaluation with one click.
      </Typography>
    </Paper>
  );
};

export default Info;
