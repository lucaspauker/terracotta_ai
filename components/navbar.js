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
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import DiamondIcon from '@mui/icons-material/Diamond';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { useRouter } from 'next/router'
import Link from 'next/link'

const drawerWidth = 250;

export default function Navbar() {
  const router = useRouter();
  const [project, setProject] = useState('');

  const isSelected = (p) => {
    if (router.pathname === '/dashboard' && p === 'Dashboard') {
      return true;
    } else if (router.pathname.startsWith('/data') && p === 'Data') {
      return true;
    } else if (router.pathname.startsWith('/models') && p === 'Models') {
      return true;
    } else if (router.pathname.startsWith('/train') && p === 'Train') {
      return true;
    } else if (router.pathname.startsWith('/playground') && p === 'Playground') {
      return true;
    } else {
      return false;
    }
  }

  const getLink = (p) => {
    if (p === 'Dashboard') {
      return '/dashboard';
    } else if (p === 'Data') {
      return '/data';
    } else if (p === 'Models') {
      return '/models';
    } else if (p === 'Train') {
      return '/train';
    } else if (p === 'Playground') {
      return '/playground';
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
          <ListItem key=''>
            <FormControl>
              <InputLabel id="project-label">Project</InputLabel>
              <Select
                labelId="project-label"
                className="simple-select project-select"
                label="Project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              >
                <MenuItem value={'create'}>+ New project</MenuItem>
                <Divider />
                <MenuItem value={'mfp'}>My First Project</MenuItem>
                <MenuItem value={'anthropic'}>Anthropic</MenuItem>
              </Select>
            </FormControl>
          </ListItem>
          {['Dashboard', 'Data', 'Train', 'Models', 'Playground', 'Evaluate'].map((text, index) => (
            <ListItem key={text} disablePadding button component={Link} href={getLink(text)}>
              <ListItemButton selected={isSelected(text)}>
                <ListItemIcon>
                  {text === 'Data' ? <TextSnippetIcon /> :
                   text === 'Models' ? <LightbulbIcon /> :
                   text === 'Train' ? <DiamondIcon /> :
                   text === 'Playground' ? <PlayCircleFilledWhiteIcon /> :
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
