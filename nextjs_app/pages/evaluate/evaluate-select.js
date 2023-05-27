import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { Layers, Psychology } from '@mui/icons-material';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { useRouter } from 'next/router';

const EvaluateSelect = () => {
  const router = useRouter();

  const EvaluationBox = ({ href, icon, title, description }) => (
    <Link href={href} passHref>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: 250,
          backgroundColor: '#f9f9f9',
          borderRadius: 4,
          border: '1px solid #ccc',
          maxWidth: 300, // Adjust the maxWidth to make the rectangles narrower
          cursor: 'pointer',
          p: 2, // Add padding to the boxes
        }}
      >
        {icon}
        <Typography variant="h6" color="text.primary" align="center" sx={{ mt: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" align="center" sx={{ mt: 1 }} color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Link>
  );

  return (
    <div className="main">
      <div className='horizontal-box full-width'>
        <div className='horizontal-box'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon cursor-pointer'/>
          <Typography variant='h4' className='page-main-header'>
            Evaluate
          </Typography>
        </div>
      </div>
      <div className='small-space' />
      <Grid container spacing={2} justifyContent='center'>
        <Grid item>
          <EvaluationBox
            href="/evaluate/evaluate-base"
            icon={<Layers fontSize="inherit" sx={{ color: 'primary.main', fontSize: '50px' }} />}
            title="Evaluate base model"
            description="Click here to evaluate the performance of a base model with a custom prompt."
          />
        </Grid>
        <Grid item>
          <EvaluationBox
            href="/evaluate/evaluate-finetuned"
            icon={<Psychology fontSize="inherit" sx={{ color: 'primary.main', fontSize: '50px' }} />}
            title="Evaluate finetuned model"
            description="Click here to evaluate the performance of your finetuned model."
          />
        </Grid>
      </Grid>
    </div>
  );
};

export default EvaluateSelect;

