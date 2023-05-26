import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import IconButton from '@mui/material/IconButton';
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
import {timestampToDateTime, toTitleCase} from "../../components/utils";
import {FaTrash} from "react-icons/fa";

import MenuComponent from "components/MenuComponent";

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

  useEffect(() => {
    let p = currentProject;
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
      setCurrentProject(localStorage.getItem("project"));
    };
    axios.get("/api/project").then((res) => {
        if (res.data !== "No data found") {
          setProjects(res.data);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
    window.addEventListener("storage", () => {
      let p = currentProject;
      if (localStorage.getItem("project")) {
        p = localStorage.getItem("project");
        setCurrentProject(localStorage.getItem("project"));
      };
      axios.get("/api/project").then((res) => {
          if (res.data !== "No data found") {
            setProjects(res.data);
          }
          setLoading(false);
        }).catch((error) => {
          console.log(error);
        });
    });
  }, []);

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

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
        {projects.length > 0 ?
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
                  <Typography>
                    Created {timestampToDateTime(project.timeCreated)}
                  </Typography>
                  <Typography color="text.secondary">
                    {toTitleCase(project.type)}
                  </Typography>
                </CardContent>
                <CardActions className='vertical-box'>
                  <Button onClick={() => handleProjectChange(project.name)} disabled={project.name===currentProject}>Switch to this project</Button>
                  <div className='tiny-space'/>
                </CardActions>
                <div className='small-space'/>
              </Card>
            ))}
          </div>
          :
         <>
          <Paper variant='outlined' className='info-box'>
            <Typography variant='h4'>
              What is a project?
            </Typography>
            <Typography variant='body1'>
              To get started, create a project. Create a new project for every
              kind of task you want to do.
            </Typography>
            <div className='medium-space'/>

            <Typography variant='h4'>
              Is there a tutorial?
            </Typography>
            <Typography variant='body1'>
              Check out our tutorial here:&nbsp;
              <Link href='' className='link'>
                some tutorial
              </Link>
            </Typography>
          </Paper>
          </>
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
