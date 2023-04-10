import { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuList from '@mui/material/MenuItem';
import MenuItem from '@mui/material/MenuItem';
import ForestIcon from '@mui/icons-material/Forest';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import { useSession, signIn, signOut } from "next-auth/react";
import { GiPalmTree } from 'react-icons/gi';
import { AiFillCaretDown } from 'react-icons/ai';
import { BiUser, BiLogOutCircle, BiSun } from 'react-icons/bi';
import {BsFillCaretDownFill} from 'react-icons/bs';
import axios from 'axios';

const drawerWidth = 250;

export default function Header() {
  const { data: session } = useSession()
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

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
      className='header'
    >
      <Toolbar>
        <GiPalmTree size='50'/>
        <Typography variant="h1" sx={{ flexGrow: 1, fontSize: 30, fontWeight: 'bold', letterSpacing: 1}}>
          &nbsp;Canopy
        </Typography>
        <div className='horizontal-box'>
          {session ?
            <div>
              <div className='profile-area horizontal-box' onClick={handleClick}>
                <div className='vertical-box'>
                  <img src={session.user.image} referrerPolicy="no-referrer"
                    className={open ? 'profile-picture profile-picture-active' : 'profile-picture'}/>
                </div>
                <BsFillCaretDownFill />
              </div>
              <Menu
                className='menu'
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                  style: {
                    width: 200,
                  },
                }}
              >
                <div className='small-space' />
                <div className='vertical-box'>
                  <img src={session.user.image} referrerPolicy="no-referrer" className='profile-picture'/>
                  <div className='tiny-space' />
                  <Typography>{session.user.name}</Typography>
                  <Typography className='subtitle' variant='subtitle2'>{session.user.email}</Typography>
                </div>
                <div className='small-space' />
                <Divider />
                <div className='small-space' />
                <div className='vertical-box menu-box'>
                  <MenuItem onClick={handleClose} className='menu-item'>
                    <ListItemIcon><BiUser /></ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleClose} className='menu-item'>
                    <ListItemIcon><BiSun /></ListItemIcon>
                    <ListItemText>Upgrade account</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleSignOut} className='menu-item'>
                    <ListItemIcon><BiLogOutCircle /></ListItemIcon>
                    <ListItemText>Sign out</ListItemText>
                  </MenuItem>
                </div>
              </Menu>
            </div>
            : <Typography>Not signed in</Typography>}
        </div>
      </Toolbar>
    </AppBar>
  );
}
