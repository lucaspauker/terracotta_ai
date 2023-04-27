import { useState, useEffect } from 'react';
import Router from "next/router";
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
import PaletteIcon from '@mui/icons-material/Palette';
import Build from '@mui/icons-material/Build';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ConstructionIcon from '@mui/icons-material/Construction';
import BrushIcon from '@mui/icons-material/Brush';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DiamondIcon from '@mui/icons-material/Diamond';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios';

const drawerWidth = 250;

export default function Navbar() {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [project, setProject] = useState('');
  const [allProjects, setAllProjects] = useState([]);

  const isSelected = (p) => {
    if (router.pathname === '/dashboard' && p === 'Dashboard') {
      return true;
    } else if (router.pathname.startsWith('/evaluate') && p === 'Evaluate') {
      return true;
    } else if (router.pathname.startsWith('/data') && p === 'Data') {
      return true;
    } else if (router.pathname.startsWith('/models') && p === 'Models') {
      return true;
    } else if (router.pathname.startsWith('/playground') && p === 'Playground') {
      return true;
    } else if (router.pathname.startsWith('/projects') && p === 'Projects') {
      return true;
    } else if (router.pathname.startsWith('/settings') && p === 'API keys') {
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
    } else if (p === 'Projects') {
      return '/projects';
    } else if (p === 'Models') {
      return '/models';
    } else if (p === 'Playground') {
      return '/playground';
    } else if (p === 'Evaluate') {
      return '/evaluate';
    } else if (p === 'API keys') {
      return '/settings';
    } else {
      return '/';
    }
  }

  const handleProjectChange = (e) => {
    const project = e.target.value;
    setProject(project);
    if (project === '') return;
    localStorage.setItem("project", project);
    window.dispatchEvent(new Event("storage"));
  }

  useEffect(() => {
    if (localStorage.getItem("project")) {
      setProject(localStorage.getItem("project"));
    };
    axios.get("/api/project/list").then((res) => {
      console.log(res.data);
      if (res.data !== "No data found") {
        setAllProjects(res.data);
      }
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
    window.addEventListener("storage", () => {
      if (localStorage.getItem("project")) {
        setProject(localStorage.getItem("project"));
      };
      axios.get("/api/project/list").then((res) => {
        console.log(res.data);
        if (res.data !== "No data found") {
          setAllProjects(res.data);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
    });
  }, []);

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
        <div className='tiny-space' />
        <div className='horizontal-box'>
          <FormControl variant="filled">
            <InputLabel id="project-label">Project</InputLabel>
            <Select
              labelId="project-label"
              className="simple-select project-select"
              label="Project"
              value={project}
              onChange={handleProjectChange}
            >
              {allProjects.map((project) => (
                <MenuItem key={project.name} value={project.name}>{project.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className='tiny-space' />
        <Divider />
        <List>
          {['Dashboard', 'Projects', 'Data', 'Models', 'Playground', 'Evaluate'].map((text, index) => (
            <ListItem key={text} disablePadding button component={Link} href={getLink(text)}>
              <ListItemButton selected={isSelected(text)}>
                <ListItemIcon>
                  {text === 'Data' ? <TextSnippetIcon /> :
                   text === 'Models' ? <LightbulbIcon /> :
                   text === 'Playground' ? <ConstructionIcon /> :
                   text === 'Dashboard' ? <DashboardIcon /> :
                   text === 'Projects' ? <PaletteIcon /> :
                   text === 'Evaluate' ? <FunctionsIcon /> : null}
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          {['API keys'].map((text, index) => (
            <ListItem key={text} disablePadding button component={Link} href={getLink(text)}>
              <ListItemButton selected={isSelected(text)}>
                <ListItemIcon>
                  {text === 'API keys' ? <SettingsIcon /> : null}
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
