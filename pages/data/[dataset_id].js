import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TablePagination from '@mui/material/TablePagination';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { DataGrid } from '@mui/x-data-grid';
import { FaArrowLeft } from 'react-icons/fa';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import axios from 'axios';

import styles from '@/styles/Data.module.css';

export default function DataPage() {
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState({name: '', type: 'classification'});
  const [error, setError] = useState('');
  const [type, setType] = useState('classification');
  const [filename, setFilename] = useState('');
  const [displayFilename, setDisplayFilename] = useState('');
	const [isFilePicked, setIsFilePicked] = useState(false);
  const nameRef = useRef();
  const [open, setOpen] = useState(false);
  const [trainOrVal, setTrainOrVal] = useState('train');
  const [rawData, setRawData] = useState({});
  const [rawDataVal, setRawDataVal] = useState(null);
  const [page, setPage] = useState(0);
  const [visibleRows, setVisibleRows] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const router = useRouter();
  const { dataset_id } = router.query;

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const reloadDataset = (e, val) => {
    setTrainOrVal(val);
    setPage(0);
    const newPage = 0;
    if (val === 'train') {
      const updatedRows = rawData.slice(
        newPage * rowsPerPage,
        newPage * rowsPerPage + rowsPerPage,
      );
      setVisibleRows(updatedRows);
    } else {
      const updatedRows = rawDataVal.slice(
        newPage * rowsPerPage,
        newPage * rowsPerPage + rowsPerPage,
      );
      setVisibleRows(updatedRows);
    }
  }

  const doDelete = () => {
    axios.post("/api/data/delete/" + dataset_id).then((res) => {
      console.log(res.data);
      router.push('/data');
    }).catch((error) => {
      console.log(error);
    });
  }

  const handleChangePage = useCallback(
    (event, newPage) => {
      setPage(newPage);
      if (trainOrVal === 'train') {
        const updatedRows = rawData.slice(
          newPage * rowsPerPage,
          newPage * rowsPerPage + rowsPerPage,
        );
        setVisibleRows(updatedRows);
      } else {
        const updatedRows = rawDataVal.slice(
          newPage * rowsPerPage,
          newPage * rowsPerPage + rowsPerPage,
        );
        setVisibleRows(updatedRows);
      }
    },
  );

  const handleChangeRowsPerPage = useCallback(
    (event) => {
      const updatedRowsPerPage = parseInt(event.target.value, 10);
      setRowsPerPage(updatedRowsPerPage);
      setPage(0);

      const updatedRows = rawData.slice(
        0 * updatedRowsPerPage,
        0 * updatedRowsPerPage + updatedRowsPerPage,
      );
      setVisibleRows(updatedRows);
    },
  );

  useEffect(() => {
    const last = window.location.href.split('/').pop();  // This is a hack
    axios.get("/api/data/" + last).then((res) => {
      if (res.data !== "No data found") {
        setDataset(res.data);
        setFilename(res.data.trainFileName);
        setDisplayFilename(res.data.initialTrainFileName);

        console.log(res.data.trainFileName);
        axios.post("/api/data/file", {
            fileName: res.data.trainFileName,
          }).then((json_data) => {
            setRawData(json_data.data);
            const rowsOnMount = json_data.data.slice(0, rowsPerPage);
            setVisibleRows(rowsOnMount);
            setLoading(false);
          }).catch((error) => {
            console.log(error);
          });
        if (res.data.valFileName) {
          axios.post("/api/data/file", {
              fileName: res.data.valFileName,
            }).then((json_data) => {
              setRawDataVal(json_data.data);
            }).catch((error) => {
              console.log(error);
            });
        }
      }
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box cursor-pointer'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon'/>
          <Typography variant='h4' className='page-main-header'>
            {dataset.name}
          </Typography>
        </div>
        <div>
          <Button className='button-margin' variant='contained' color="error" onClick={handleClickOpen}>Delete</Button>
        </div>
      </div>
      <div className='medium-space' />

      <div>
        <Typography variant='h6'>
          Dataset info
        </Typography>
        <div className='tiny-space'/>
        <Paper className='small-card' variant='outlined'>
          <Typography variant='body1'>
            Task:&nbsp;{type}
          </Typography>

          {rawData.length > 0 ?
            <div>
              <div>
                <Typography>Train file name: {displayFilename}</Typography>
                <Typography># of train rows: {rawData.length}</Typography>
                {rawDataVal ? <Typography># of validation rows: {rawDataVal.length}</Typography>
                  : <Typography>No validation data</Typography>}
                {dataset.classes ?
                  <Typography>Classes: {dataset.classes.map((x, i) =>
                    (i < dataset.classes.length - 1 ? x + ", " : x))}</Typography>
                  : null }
              </div>
            </div> : null }
        </Paper>
        <div className='medium-space' />
      </div>

      <div className='horizontal-box full-width'>
        <Typography variant='h6'>
          View data
        </Typography>
        {rawDataVal ? <ToggleButtonGroup
          value={trainOrVal}
          exclusive
          onChange={reloadDataset}
        >
          <ToggleButton value="train">
            <Typography variant='body1'>
              Train
            </Typography>
          </ToggleButton>
          <ToggleButton value="val">
            <Typography variant='body1'>
              Validation
            </Typography>
          </ToggleButton>
        </ToggleButtonGroup> : null }
      </div>
      <div className='tiny-space' />
      <Paper variant='outlined'>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell className='table-cell'>Input</TableCell>
                <TableCell className='table-cell'>Output</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row, i) => (
                <TableRow
                  key={i}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{row.prompt}</TableCell>
                  <TableCell>{row.completion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider/>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={trainOrVal === 'train' ? rawData.length : rawDataVal.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <div className='medium-space' />

      <Dialog
        open={open}
        onClose={handleClose}
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
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={doDelete} autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
