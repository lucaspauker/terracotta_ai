import { useRouter } from 'next/router'
import Link from 'next/link';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { FaArrowLeft } from 'react-icons/fa';

export default function Custom404() {
  const router = useRouter();

  return (
    <div className="main">
      <div className='horizontal-box full-width'>
        <div className='horizontal-box'>
          <IconButton onClick={() => router.back()} className='back-icon cursor-pointer'>
            <FaArrowLeft size='30'/>
          </IconButton>
          <Typography variant='h4' className='page-main-header'>
            Back
          </Typography>
        </div>
      </div>
      <div className='small-space' />
      <div className="vertical-box">
        <Typography variant="h2">404 - Page Not Found</Typography>
      </div>
    </div>
  );
}
