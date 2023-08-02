import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { GiClayBrick } from 'react-icons/gi';

import Tutorial from '@/pages/user-guide/index';
import { SimpleLayout } from '@/components/layout'

export default function TutorialPublic() {
  return (
    <div className='homepage tutorial main-content'>
      <div className='header horizontal-box full-width'>
        <Typography className="logo horizontal-box" variant="h1">
          <GiClayBrick style={{marginRight: 10}}/>
          Terracotta
        </Typography>
        <Button className='sign-in-button' variant='contained' color='primary' size='large' onClick={() => signIn()}>Sign in with google or github</Button>
      </div>
      <Button variant='outlined' color='primary' size='large' component={Link} href="/" sx={{marginLeft: '50px', marginTop: '16px'}}>Back to main page</Button>
      <Tutorial />
      <div className="large-space" />
    </div>
  )
}

TutorialPublic.getLayout = function getLayout(page) {
  return (
    <SimpleLayout>
      {page}
    </SimpleLayout>
  )
}
