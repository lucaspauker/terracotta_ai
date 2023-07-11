import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import {FaArrowRight} from "react-icons/fa";

const Info = () => {
  return (
    <Paper variant='outlined' className='info-box'>
      <Typography variant='h4'>
        What is a fine-tuned model?
      </Typography>
      <Typography variant='body1'>
        Large language models (LLMs) such as GPT-3 are trained on large amounts
        of text data and therefore understand language well. However, since they
        are trained on general data, in order to create a model useful for a
        specific use-case, one must fine-tune the model on
        use-case specific data. Then, the model uses what it learned on general data
        and applies it to the new data and quickly learns the new task. This is
        similar to teaching someone a new skill.
      </Typography>
      <div className='medium-space'/>

      <Typography variant='h4'>
        How can I get started?
      </Typography>
      <Typography variant='body1'>
        In order to fine-tune models, you need an OpenAI API key.&nbsp;&nbsp;
        <Button size='small' variant='outlined' color="secondary" component={Link} href="/settings">
          Add API Key &nbsp;<FaArrowRight />
        </Button>
      </Typography>

      <Typography variant='body1'>
        To fine-tune your own custom model, first make sure that you have uploaded
        a dataset.
        Once you have a dataset, click the &quot;fine-tune model&quot; button to get started.
        This will take you to the model finetuning page.
        The first step is to choose the model architecture and dataset.
        Second, you can customize the inputs and outputs for the fine-tuned model.
        Third, you can select hyperparameters.
        Once you have specified all this information, you can start the fine-tuning process
        with a single button click.
      </Typography>
    </Paper>
  );
};

export default Info;
