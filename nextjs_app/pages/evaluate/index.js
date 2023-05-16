import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { useRouter } from 'next/router'
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import {FaTrash} from "react-icons/fa";
import {HiOutlineRefresh} from "react-icons/hi";

import { calculateColor, timestampToDateTimeShort } from '/components/utils';
import MenuComponent from "components/MenuComponent";

const metricMap = {
  'f1': 'F1',
  'bleu': 'BLEU',
  'rougel': 'RougeL',
}

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

export default function Evaluate() {
  const [loading, setLoading] = useState(true);
  const [evals, setEvals] = useState([]);
  const [project, setProject] = useState('');
  const router = useRouter()
  const [page, setPage] = useState(0);
  const [visibleRows, setVisibleRows] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const { data: session } = useSession();

  const handleEdit = (id) => {
    router.push("/evaluate/edit/" + id);
  };

  const handleOpen = (id) => {
    setIdToDelete(id);
  };

  const doDelete = () => {
    axios.post("/api/evaluate/delete/" + idToDelete).then((res) => {
      console.log(res.data);
      setOpen(false);
      refreshData();
    }).catch((error) => {
      console.log(error);
    });
  }

  const refreshData = () => {
    setLoading(true);
    let p = project;
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
      setProject(localStorage.getItem("project"));
    };
    axios.post("/api/evaluate", {
        projectName: p,
      }).then((res) => {
        if (res.data !== "No data found") {
          setEvals(res.data);
          setPage(0);
          const newPage = 0;
          const updatedRows = res.data.slice(
            newPage * rowsPerPage,
            newPage * rowsPerPage + rowsPerPage,
          );
          setVisibleRows(updatedRows);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
  }

  const handleChangePage = useCallback(
    (event, newPage) => {
      setPage(newPage);
      const updatedRows = evals.slice(
        newPage * rowsPerPage,
        newPage * rowsPerPage + rowsPerPage,
      );
      setVisibleRows(updatedRows);
    },
  );

  const handleChangeRowsPerPage = useCallback(
    (event) => {
      const updatedRowsPerPage = parseInt(event.target.value, 10);
      setRowsPerPage(updatedRowsPerPage);
      setPage(0);

      const updatedRows = evals.slice(
        0 * updatedRowsPerPage,
        0 * updatedRowsPerPage + updatedRowsPerPage,
      );
      setVisibleRows(updatedRows);
    },
  );

  useEffect(() => {
    if (idToDelete !== null) {
      setOpen(true);
    }
  }, [idToDelete]);

  useEffect(() => {
    refreshData();

    window.addEventListener("storage", () => {
      refreshData();
    });
  }, []);

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
          Evaluations
        </Typography>
        <div>
          <IconButton color="secondary" className='button-margin' onClick={refreshData}>
            <HiOutlineRefresh size={25} />
          </IconButton>
          <Button variant='contained' color="secondary" component={Link} href="/evaluate/evaluate">
            + New evaluation
          </Button>
        </div>
      </div>
      <div className='tiny-space' />

      <div>
        {evals.length > 0 ?
          <Paper variant="outlined">
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell className='table-cell'>Name</TableCell>
                    <TableCell className='table-cell'>Date created</TableCell>
                    <TableCell className='table-cell'>Model name</TableCell>
                    <TableCell className='table-cell'>Dataset name</TableCell>
                    <TableCell className='table-cell'>Metrics</TableCell>
                    <TableCell className='table-cell'></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((e) => (
                    <TableRow
                      key={e._id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 }, margin: 0 }}
                    >
                      <TableCell>
                        {e.status === "failed" ?
                          <div className='horizontal-box flex-start'>
                            <div>{e.name} &nbsp;&nbsp;&nbsp;</div>
                            <Tooltip title="Error running evaluation">
                              <ErrorIcon sx={{color:'red', fontSize:16}}/>
                            </Tooltip>
                          </div>
                          : e.metricResults ?
                          <Link className='link' href={"/evaluate/" + e._id}>{e.name}</Link>
                          :
                          <div className='horizontal-box flex-start'>
                            <div>{e.name} &nbsp;&nbsp;&nbsp;</div>
                            <CircularProgress size={16}/>
                          </div>
                        }
                      </TableCell>
                      <TableCell>{timestampToDateTimeShort(e.timeCreated)}</TableCell>
                      <TableCell><Link className='link' href={"/models/" + e.modelId}>{e.modelName}</Link></TableCell>
                      <TableCell><Link className='link' href={"/data/" + e.datasetId}>{e.datasetName}</Link></TableCell>
                      <TableCell>
                        {e.metricResults ?
                          <div className='metrics-cell'>
                            {e.metrics.map(m => <div key={m} className='metric-in-table'>
                              <span className='metric-in-table-text' style={{backgroundColor: calculateColor(e.metricResults[m])}}>
                                {m in metricMap ? metricMap[m] : m}
                            </span></div>)}
                          </div>
                          :
                          <div className='metrics-cell'>
                            {e.metrics.map(m => <div key={m} className='metric-in-table'>
                              <span className='metric-in-table-text'>
                                {m in metricMap ? metricMap[m] : m}
                              </span></div>)}
                          </div>
                        }
                      </TableCell>
                      <TableCell>
                        <MenuComponent
                          editFunction={() => handleEdit(e._id)}
                          deleteFunction={() => handleOpen(e._id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Divider/>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={evals.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          </Paper>
          :
          <>
          <Paper variant='outlined' className='info-box'>
            <Typography variant='h4'>
              What is an evaluation?
            </Typography>
            <Typography variant='body1'>
              A dataset is your data that you can use to finetune a large language model (LLM).
              Datasets consist of two columns: <span className='italic'>input</span> and
              <span className='italic'>output</span>.
            </Typography>
            <div className='medium-space'/>

            <Typography variant='h4'>
              How can I get started?
            </Typography>
            <Typography variant='body1'>
              To create a dataset, you need a CSV file of your data. Then, click the
              &quot;new dataset&quot; button to build a dataset. This will take you to the
              new dataset page, which will let you upload a CSV file and
              choose which columns of your CSV
              data are input and output. Or, if you don&apos;t have data, check out some of
              these links to get started:
            </Typography>
            <List sx={{ listStyleType: 'disc' }}>
              <ListItem>
                <Link href='' className='link'>
                  <Typography>SMS spam dataset</Typography>
                </Link>
              </ListItem>
              <ListItem>
                <Link href='' className='link'>
                  <Typography>Sports commentary classification dataset</Typography>
                </Link>
              </ListItem>
              <ListItem>
                <Link href='' className='link'>
                  <Typography>Another dataset</Typography>
                </Link>
              </ListItem>
            </List>
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
        onClose={() => setOpen(false)}
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete evaluation?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This action is permanent and cannot be reversed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={doDelete} autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
