import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
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
import { GiPalmTree, GiPorcelainVase, GiClayBrick } from 'react-icons/gi';
import { AiFillCaretDown } from 'react-icons/ai';
import { BiUser, BiLogOutCircle, BiSun } from 'react-icons/bi';
import {BsFillCaretDownFill, BsFire} from 'react-icons/bs';
import axios from 'axios';

const drawerWidth = 250;

export default function Header() {
  const { data: session } = useSession()
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const router = useRouter();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = () => {
    axios.post("http://localhost:3000/admin/logout", {
      }).then((res) => {
        console.log('Logging out status: ' + res.status);
        router.push("/");
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
        <GiClayBrick size='40'/>
        <Typography variant="h1" sx={{ flexGrow: 1, fontSize: 30}} className='website-title'>
          &nbsp;Terracotta
        </Typography>
        <div className='horizontal-box'>
          {session ?
            <div>
              <div className='profile-area horizontal-box' onClick={handleClick}>
                <div className='vertical-box'>
                  <img src={session.user.image} referrerPolicy="no-referrer"
                    className={open ? 'profile-picture profile-picture-active' : 'profile-picture'}/>
                </div>
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
                <div className='tiny-space' />
                <Divider />
                <div className='tiny-space' />
                <div className='vertical-box menu-box'>
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
