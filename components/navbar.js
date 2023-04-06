import { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import SettingsIcon from '@mui/icons-material/Settings';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FunctionsIcon from '@mui/icons-material/Functions';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useRouter } from 'next/router'
import Link from 'next/link'

const drawerWidth = 250;

export default function Navbar() {
  const router = useRouter();

  const isSelected = (p) => {
    if (router.pathname === '/' && p === 'Dashboard') {
      return true;
    } else if (router.pathname.startsWith('/data') && p === 'Data') {
      return true;
    } else if (router.pathname.startsWith('/models') && p === 'Models') {
      return true;
    } else {
      return false;
    }
  }

  const getLink = (p) => {
    if (p === 'Dashboard') {
      return '/';
    } else if (p === 'Data') {
      return '/data';
    } else if (p === 'Models') {
      return '/models';
    } else {
      return '/';
    }
  }

  return(
    <Drawer
      anchor='left'
      variant='permanent'
    >
      <Box
        sx={{ width: drawerWidth }}
      >
        <Toolbar />
        <Divider />
        <List>
          {['Dashboard', 'Data', 'Train', 'Models', 'Playground', 'Evaluate'].map((text, index) => (
            <ListItem key={text} disablePadding button component={Link} href={getLink(text)}>
              <ListItemButton selected={isSelected(text)}>
                <ListItemIcon>
                  {text === 'Data' ? <TextSnippetIcon /> :
                   text === 'Models' ? <LightbulbIcon /> :
                   text === 'Dashboard' ? <DashboardIcon /> :
                   text === 'Evaluate' ? <FunctionsIcon /> : null}
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          {['Settings'].map((text, index) => (
            <ListItem key={text} disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  {text === 'Settings' ? <SettingsIcon /> : null}
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
