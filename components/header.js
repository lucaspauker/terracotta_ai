import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ForestIcon from '@mui/icons-material/Forest';
import IconButton from '@mui/material/IconButton';
import { useSession, signIn, signOut } from "next-auth/react";
import axios from 'axios';

const drawerWidth = 250;

export default function Header() {
  const { data: session } = useSession()

  const handleSignOut = () => {
    window.location.href = '/';
    axios.post("http://localhost:3005/admin/logout", {
      }).then((res) => {
        console.log('Logging out status: ' + res.status);
      }).catch((error) => {
        console.log(error);
      });
    signOut();
  }

  return(
    <AppBar
      position="fixed"
      elevation={0}
      sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
    >
      <Toolbar>
        <ForestIcon fontSize={'large'}/>
        <Typography variant="h1" sx={{ flexGrow: 1, fontSize: 30, fontWeight: 'bold', letterSpacing: 2}}>
          &nbsp;Canopy
        </Typography>
        <div className='horizontal-box'>
          {session ?
            <Button variant='outlined' color="inherit" className='button-margin' onClick={handleSignOut}>Sign out</Button>
            : null }
          {session ?
            <div className='vertical-box profile-area'>
              <img src={session.user.image} referrerPolicy="no-referrer" className='profile-picture'/>
              <Typography variant='body2'>{session.user.name}</Typography>
            </div>
            : <Typography>Not signed in</Typography>}
        </div>
      </Toolbar>
    </AppBar>
  );
}
