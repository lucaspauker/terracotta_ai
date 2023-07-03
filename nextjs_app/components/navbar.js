import { useState, useEffect } from 'react';
import Router from "next/router";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
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
import EditIcon from '@mui/icons-material/Edit';
import BrushIcon from '@mui/icons-material/Brush';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DiamondIcon from '@mui/icons-material/Diamond';
import RocketIcon from '@mui/icons-material/Rocket';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {CgPushLeft, CgPushRight} from "react-icons/cg";
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios';

export default function Navbar({expanded, setExpanded, width, setWidth}) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [project, setProject] = useState('');
  const [allProjects, setAllProjects] = useState(null);
  const fullWidth = 250;
  const collapsedWidth = 56;

  const isSelected = (p) => {
    if (router.pathname.startsWith('/evaluate') && p === 'Evaluate') {
      return true;
    } else if (router.pathname.startsWith('/data') && p === 'Datasets') {
      return true;
    } else if (router.pathname.startsWith('/models') && p === 'Models') {
      return true;
    } else if (router.pathname.startsWith('/playground') && p === 'Test') {
      return true;
    } else if (router.pathname.startsWith('/projects') && p === 'Projects') {
      return true;
    } else if (router.pathname.startsWith('/settings') && p === 'API keys') {
      return true;
    } else if (router.pathname.startsWith('/deploy') && p === 'Deploy') {
      return true;
    } else {
      return false;
    }
  }

  const getLink = (p) => {
    if (p === 'Datasets') {
      return '/data';
    } else if (p === 'Projects') {
      return '/projects';
    } else if (p === 'Models') {
      return '/models';
    } else if (p === 'Test') {
      return '/playground';
    } else if (p === 'Evaluate') {
      return '/evaluate';
    } else if (p === 'API keys') {
      return '/settings';
    } else if (p === 'Deploy') {
      return '/deploy';
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

  const refreshProjects = () => {
    setLoading(true);
    if (localStorage.getItem("project")) {
      setProject(localStorage.getItem("project"));
    };
    axios.get("/api/project").then((res) => {
      setAllProjects(res.data);
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
  }

  const handleExpand = () => {
    setExpanded(true);
    setWidth(fullWidth);
    localStorage.setItem("expanded", true);
  }

  const handleContract = () => {
    setExpanded(false);
    setWidth(collapsedWidth);
    localStorage.setItem("expanded", false);
  }

  useEffect(() => {
    refreshProjects();
    window.addEventListener("storage", () => {
      refreshProjects();
    });
    if (localStorage.getItem("expanded") === "false") {
      setExpanded(false);
      setWidth(collapsedWidth);
    }
  }, []);

  return(
    <Drawer
      anchor='left'
      variant='permanent'
    >
      <Box
        sx={{ width: `${width}px`, transition: 'width 1s' }}
      >
        <Toolbar>
          {expanded ?
            <div className='horizontal-box full-width'>
              <div />
              <IconButton onClick={handleContract}>
                <CgPushLeft sx={{color: 'black', fontSize: '1.5rem'}} />
              </IconButton>
            </div>
            :
            <IconButton onClick={handleExpand} sx={{marginLeft:'-16px'}}>
              <CgPushRight sx={{color: 'black', fontSize: '1.5rem'}} />
            </IconButton>
          }
        </Toolbar>
        {expanded &&
          <>
          <Divider />
          <div className='tiny-space' />
          <div className='horizontal-box'>
            <FormControl variant="filled" size='small'>
              {allProjects ?
                <>
                  <InputLabel id="project-label">Choose project</InputLabel>
                  <Select
                    labelId="project-label"
                    className="simple-select"
                    label="Choose project"
                    value={project}
                    onChange={handleProjectChange}
                    disabled={allProjects.length === 0}
                  >
                    {allProjects.map((p) => (
                      <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </>
                :
                <CircularProgress/>
              }
            </FormControl>
          </div>
          <div className='tiny-space' />
          </>
        }
        <Divider />
        <List>
          {['Projects', 'Datasets', 'Models', 'Test', 'Evaluate', 'Deploy'].map((text, index) => (
            <div key={text}>
              <ListItem
                disablePadding
                button
                component={Link}
                href={getLink(text)}
                disabled={!allProjects || allProjects.length === 0 && text !== 'Projects'}
              >
                <ListItemButton selected={isSelected(text)}>
                  <ListItemIcon>
                    {text === 'Datasets' ? <TextSnippetIcon /> :
                     text === 'Models' ? <LightbulbIcon /> :
                     text === 'Test' ? <EditIcon /> :
                     text === 'Projects' ? <PaletteIcon /> :
                     text === 'Deploy' ? <RocketIcon /> :
                     text === 'Evaluate' ? <FunctionsIcon /> : null}
                  </ListItemIcon>
                  {expanded && <ListItemText primary={text} />}
                </ListItemButton>
              </ListItem>
              {!expanded && <div className='tiny-space'/>}
            </div>
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
                {expanded && <ListItemText primary={text} />}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
