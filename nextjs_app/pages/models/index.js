import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router'
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
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import {FaTrash, FaArrowRight} from "react-icons/fa";
import {BsFillCircleFill} from "react-icons/bs";
import {HiOutlineRefresh} from "react-icons/hi";
import { getSession, useSession, signIn, signOut } from "next-auth/react"

import {CustomTooltip} from '/components/CustomToolTip.js';
import {timestampToDateTimeShort, getPriceString} from '/components/utils';
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

export default function Models() {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [page, setPage] = useState(0);
  const [visibleRows, setVisibleRows] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const [user, setUser] = useState({});
  const router = useRouter();

  // Auto page refresh
  const [refreshCount, setRefreshCount] = useState(0);
  const maxRefreshes = 10;
  const refreshInterval = 60000;
  useEffect(() => {
    const checkDatabaseChange = () => {
      refreshModels(null, true);

      // Schedule the next refresh
      const nextRefreshInterval = refreshInterval;
      const timeout = setTimeout(() => {
        setRefreshCount(prevCount => prevCount + 1);
      }, nextRefreshInterval);

      return () => clearTimeout(timeout); // Clean up the timeout on unmount
    };

    checkDatabaseChange();
  }, [refreshCount]);

  const handleEdit = (id) => {
    router.push("/models/edit/" + id);
  };

  const handleOpen = (id) => {
    console.log(id)
    setIdToDelete(id);
  };

  const refreshModels = (e, background=false) => {
    !background && setLoading(true);
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
    }

    axios.get("/api/user",).then((res) => {setUser(res.data);}).catch((error) => console.log(error));
    axios.post("/api/models", {projectName: projectName}).then((res) => {
      console.log(res.data);
      if (res.data !== "No data found") {
        setModels(res.data);
        console.log(res.data);
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

  const doDelete = () => {
    axios.post("/api/models/delete/" + idToDelete).then((res) => {
      console.log(res.data);
      setOpen(false);
      refreshModels();
    }).catch((error) => {
      console.log(error);
    });
  }

  const handleChangePage = useCallback(
    (event, newPage) => {
      setPage(newPage);
      const updatedRows = models.slice(
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

      const updatedRows = models.slice(
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
    refreshModels();
    window.addEventListener("storage", () => {
      refreshModels();
    });
  }, []);

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
          Fine-tuned Models
        </Typography>
        <div>
          <IconButton color="secondary" onClick={refreshModels}>
            <HiOutlineRefresh size={25} />
          </IconButton>
          {!loading && user.openAiKey ?
            <Button variant='contained' color="secondary" component={Link} href="/models/finetune">
              + Fine-tune model
            </Button>
            : !user.openAiKey ?
            <CustomTooltip title={
                  <React.Fragment>
                    💡 Add your OpenAI API key to fine-tune a model.
                    <div className='small-space'/>
                    <Button variant='outlined' color="secondary" component={Link} href="/settings">
                      Go to settings &nbsp;<FaArrowRight />
                    </Button>
                  </React.Fragment>
                }
                className='tooltip'>
              <span>
                <Button variant='contained' color="secondary" disabled>
                  + Fine-tune model
                </Button>
              </span>
            </CustomTooltip>
            : loading ?
            <Button variant='contained' color='secondary'>
              + Fine-tune model
            </Button>
            :
            null
          }
        </div>
      </div>
      <div className='tiny-space' />

      <div>
        {loading ?
          <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
          : models.length > 0 ?
          <Paper variant="outlined">
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell className='table-cell'>Name</TableCell>
                    <TableCell className='table-cell'>Date created</TableCell>
                    <TableCell className='table-cell'>Dataset name</TableCell>
                    <TableCell className='table-cell'>Provider</TableCell>
                    <TableCell className='table-cell'>Architecture</TableCell>
                    <TableCell className='table-cell'>Status</TableCell>
                    <TableCell className='table-cell'>Provider model ID</TableCell>
                    <TableCell className='table-cell'>Cost</TableCell>
                    <TableCell className='table-cell'></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((model) => (
                    <TableRow
                      key={model._id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell><Link className='link' href={'models/' + model._id}>{model.name}</Link></TableCell>
                      <TableCell>{timestampToDateTimeShort(model.timeCreated)}</TableCell>
                      <TableCell>{model.datasetId? <Link className='link' href={'data/' + model.datasetId._id}>{model.datasetId.name}</Link>: null}</TableCell>
                      <TableCell>{model.provider === 'openai' ? 'OpenAI' : model.provider}</TableCell>
                      <TableCell>{model.modelArchitecture}</TableCell>
                      <TableCell><span className='status'><BsFillCircleFill className={model.status==='succeeded' || model.status==='imported' ? 'model-succeeded' : model.status==='failed' ? 'model-failed' : 'model-training'}/>{model.status.toLowerCase()}</span></TableCell>
                      <TableCell>{model.status==='failed' ?  "---"
                                  : model.providerData && ("modelId" in model.providerData)?
                                  <Link className='link' target="_blank" href={'https://platform.openai.com/playground?model=' + model.providerData.modelId}>
                                      {model.providerData.modelId}
                                  </Link>
                                  :"pending"}
                      </TableCell>
                      <TableCell>
                        {"cost" in model ?
                          getPriceString(model.cost):
                          model.status==='failed' ?
                          "---" :
                          "pending"}
                      </TableCell>
                      <TableCell>
                        <MenuComponent
                          editFunction={() => handleEdit(model._id)}
                          deleteFunction={() => handleOpen(model._id)}
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
                count={models.length}
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
              What is a fine-tuned model?
            </Typography>
            <Typography variant='body1'>
              Large language models (LLMs) such as GPT-3 are trained on large amounts
              of text data and therefore understand language well. However, since they
              are trained on general data, in order to create a model useful for a
              specific use-case such as spam detection, one must fine-tune the model on
              spam detection data. Then, the model uses what it learned on general data
              and applies it to the new data and quickly learns the new task. This is
              similar to teaching someone a new skill.
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
        onClose={() => setOpen(false)}
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete fine-tuned model?"}
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
