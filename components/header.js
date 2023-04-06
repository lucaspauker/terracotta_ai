import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DeblurIcon from '@mui/icons-material/Deblur';
import IconButton from '@mui/material/IconButton';

const drawerWidth = 250;

export default function Header() {
  return(
    <AppBar
      position="fixed"
      elevation={0}
      sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
    >
      <Toolbar>
        <DeblurIcon fontSize={'large'}/>
        <Typography variant="h1" sx={{ flexGrow: 1, fontSize: 30, fontWeight: 'bold',
            letterSpacing: 2}}>
          &nbsp;Canopy
        </Typography>
        <Button variant='outlined' color="inherit">Login</Button>
      </Toolbar>
    </AppBar>
  );
}
