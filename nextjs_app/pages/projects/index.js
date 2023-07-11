import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import {timestampToDateTime, toTitleCase} from "@/components/utils";
import ProjectInfo from "@/components/information/ProjectInfo";
import {FaTrash} from "react-icons/fa";

import MenuComponent from "components/MenuComponent";

const CountComponent = ({ type, count }) => {
  return (
    <Box className='vertical-box' sx={{width: 75,
        backgroundColor: type==='dataset' ? '#FFA58F' : type==='model' ? '#F5E6D1' : '#AFC4D9',
        borderRadius:4, padding: 0.5}}>
      <Typography sx={{ fontSize: 18, fontWeight: 'bold' }}>
        {count}
      </Typography>
      <Typography sx={{ fontSize: 12 }}>
        {count === 1 ? type: type + 's'}
      </Typography>
    </Box>
  );
};

export async function getServerSideProps(context) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default function Projects() {
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('class');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const [currentProject, setCurrentProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [projectIdToDelete, setProjectIdToDelete] = useState([]);
  const [open, setOpen] = useState(false);
  const [countData, setCountData] = useState({});
  const { data: session } = useSession();
  const router = useRouter();

  const handleEdit = (id) => {
    router.push("/projects/edit/" + id);
  };

  // For dialogue box
  const handleClickOpen = (id) => {
    setOpen(true);
    setProjectIdToDelete(id);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const doDelete = () => {
    // API call to delete project
    axios.post("/api/project/delete/" + projectIdToDelete).then((res) => {
      console.log(res.data);

      // After deleting, call project/list again to get all the projects
      axios.get("/api/project").then((res) => {
          if (res.data !== "No data found") {
            setProjects(res.data);
          }
          setLoading(false);

          // After all the API calls, close the dialogue box
          handleClose();
        }).catch((error) => {
          console.log(error);
        });
    }).catch((error) => {
      console.log(error);
    });
  }

  const handleProjectChange = (name) => {
    const project = name;
    if (project === '') return;
    localStorage.setItem("project", project);
    window.dispatchEvent(new Event("storage"));
  }

  const reload = () => {
    let p = currentProject;
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
      setCurrentProject(localStorage.getItem("project"));
    };
    axios.get("/api/project").then((res) => {
        setProjects(res.data);
        setLoading(false);

        // Check if project exists in the user's projects
        let projectMatch = false;

        // Get the counts for each project
        let newCountData = {}
        let promises = []

        for (let i=0; i < res.data.length; i++) {
          const promise = axios.get("/api/project/get-counts/" + res.data[i]._id).then(res2 => {
            newCountData[res.data[i]._id] = res2.data;
          }).catch(e => console.log(e));
          promises.push(promise);

          if (res.data[i].name === p) {
            console.log(p);
            projectMatch = true;
          }
        }

      Promise.all(promises).then(() => {
          setCountData(newCountData);
        }).catch(error => {
          console.log("Error:", error);
        });

        if (!projectMatch && res.data.length > 0) {
          localStorage.setItem("project", res.data[0].name);
          window.dispatchEvent(new Event("storage"));
          setCurrentProject(res.data[0].name);
        }
      }).catch((error) => {
        console.log(error);
      });
  }

  useEffect(() => {
    reload();
    window.addEventListener("storage", () => {
      reload();
    });
  }, []);

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
          Projects
        </Typography>
        <Button variant='contained' color="secondary" component={Link} href="/projects/add">
          + New project
        </Button>
      </div>
      <div className='tiny-space' />

      <div>
        {loading ?
          <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
          : projects.length > 0 ?
          <div className='card-container'>
            {projects.map((project) => (
              <Card variant="outlined" key={project._id}
                    className={project.name===currentProject ? 'project-card active-project-card' : 'project-card'}>
                <CardContent>
                  <div className='horizontal-box full-width' style={{alignItems: 'flex-start'}}>
                    <Typography variant="h6">
                      {project.name}
                    </Typography>
                    <MenuComponent editFunction={() => handleEdit(project._id)} deleteFunction={() => handleClickOpen(project._id)} />
                  </div>
                  <div className="tiny-space"/>
                  <Typography color="grey" >
                    Created {timestampToDateTime(project.timeCreated)}
                  </Typography>
                  <Typography sx={{fontWeight:'bold'}}>
                    {toTitleCase(project.type)}
                  </Typography>
                </CardContent>
                <div className='tiny-space'/>
                {countData[project._id] ?
                  <div className='horizontal-box' style={{justifyContent:'space-around'}}>
                    <CountComponent type='dataset' count={countData[project._id].datasetCount} />
                    <CountComponent type='model' count={countData[project._id].modelCount} />
                    <CountComponent type='evaluation' count={countData[project._id].evaluationCount} />
                  </div>
                :
                <div className='horizontal-box'><CircularProgress/></div>}
                <div className='small-space'/>
                <CardActions className='vertical-box'>
                  <Button onClick={() => handleProjectChange(project.name)} disabled={project.name===currentProject}>Switch to this project</Button>
                  <div className='tiny-space'/>
                </CardActions>
              </Card>
            ))}
          </div>
          :
          <ProjectInfo />
        }
      </div>
      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete project?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This action is permanent and cannot be reversed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={doDelete} autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
