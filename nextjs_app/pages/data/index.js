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

import {timestampToDateTimeShort} from '@/components/utils';
import MenuComponent from "@/components/MenuComponent";
import DataInfo from '@/components/information/DataInfo';

const addPercentage = (a, b) => {
  a = Number(a); b = Number(b);
  const percentage = (100 * a) / (a + b);
  return <>{a}&nbsp;&nbsp; <span style={{color:'grey'}}>({percentage.toFixed(0)}%)</span></>;
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

export default function Data() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [type, setType] = useState('class');
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const [project, setProject] = useState('');
  const [page, setPage] = useState(0);
  const [visibleRows, setVisibleRows] = useState([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const { data: session } = useSession();
  const router = useRouter()

  // Auto page refresh
  const [refreshCount, setRefreshCount] = useState(0);
  const maxRefreshes = 5;
  const refreshInterval = 2000;

  useEffect(() => {
    if (refreshCount >= maxRefreshes) return;
    const checkDatabaseChange = () => {
      refreshData(null, true);

      // Schedule the next refresh
      const nextRefreshInterval = refreshInterval * 2;
      const timeout = setTimeout(() => {
        setRefreshCount(prevCount => prevCount + 1);
      }, nextRefreshInterval);

      return () => clearTimeout(timeout); // Clean up the timeout on unmount
    };

    checkDatabaseChange();
  }, [refreshCount]);

  const handleEdit = (id) => {
    router.push("/data/edit/" + id);
  };

  const handleOpen = (id) => {
    setIdToDelete(id);
  };

  const doDelete = () => {
    axios.post("/api/data/delete/" + idToDelete).then((res) => {
      console.log(res.data);
      setOpen(false);
      refreshData();
    }).catch((error) => {
      console.log(error);
    });
  }

  const refreshData = (e, background=false) => {
    let p = project;
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
      setProject(localStorage.getItem("project"));
    };
    !background && setLoading(true);
    axios.post("/api/data/list", {
        projectName: p,
      }).then((res) => {
        setDatasets(res.data);
        if (!background) {
          setPage(0);
          const newPage = 0;
          const updatedRows = res.data.slice(
            newPage * rowsPerPage,
            newPage * rowsPerPage + rowsPerPage,
          );
          setVisibleRows(updatedRows);
        } else {
          const updatedRows = res.data.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
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
      const updatedRows = datasets.slice(
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

      const updatedRows = datasets.slice(
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

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
          Datasets
        </Typography>
        <div>
          <IconButton color="secondary" className='button-margin' onClick={refreshData}>
            <HiOutlineRefresh size={25} />
          </IconButton>
          <Button variant='contained' color="secondary" component={Link} href="/data/add">
            + Upload Dataset
          </Button>
        </div>
      </div>
      <div className='tiny-space' />

      <div>
        {loading ?
          <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
          : datasets.length > 0 ?
          <Paper variant="outlined">
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell className='table-cell'>Name</TableCell>
                    <TableCell className='table-cell'>Date created</TableCell>
                    <TableCell className='table-cell'>Initial filename</TableCell>
                    <TableCell className='table-cell'># training examples</TableCell>
                    <TableCell className='table-cell'># validation examples</TableCell>
                    <TableCell className='table-cell'></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((dataset) => (
                    <TableRow
                      key={dataset._id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 }, margin: 0 }}
                    >
                      <TableCell>
                        {dataset.status === "failed" ?
                          <div className='horizontal-box flex-start'>
                            <div>{dataset.name} &nbsp;&nbsp;&nbsp;</div>
                            <Tooltip title="Error creating dataset">
                              <ErrorIcon sx={{color:'red', fontSize:16}}/>
                            </Tooltip>
                          </div>
                          : dataset.status === 'loading' ?
                          <div className='horizontal-box flex-start'>
                            <div>{dataset.name} &nbsp;&nbsp;&nbsp;</div>
                            <div><CircularProgress size={16} sx={{marginTop: 1}} /></div>
                          </div>
                          :
                          <Link className='link' href={"/data/" + dataset._id}>{dataset.name}</Link>
                        }
                      </TableCell>
                      <TableCell>{timestampToDateTimeShort(dataset.timeCreated)}</TableCell>
                      <TableCell><span style={{color:'grey'}}>{dataset.initialTrainFileName}</span></TableCell>
                      <TableCell>{addPercentage(dataset.numTrainExamples, dataset.numValExamples)}</TableCell>
                      <TableCell>{addPercentage(dataset.numValExamples, dataset.numTrainExamples)}</TableCell>
                      <TableCell>
                        <MenuComponent
                          editFunction={() => handleEdit(dataset._id)}
                          deleteFunction={() => handleOpen(dataset._id)}
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
                count={datasets.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          </Paper>
          :
          <DataInfo/>
        }
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete dataset?"}
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
