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
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"

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
  const [rawData, setRawData] = useState({});
  const [page, setPage] = useState(0);
  const [visibleRows, setVisibleRows] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const router = useRouter();
  const { dataset_id } = router.query;

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const doDelete = () => {
    axios.post("/api/data/delete/" + dataset_id).then((res) => {
      console.log(res.data);
      window.location.href = '/data';
    }).catch((error) => {
      console.log(error);
    });
  }

  const handleChangePage = useCallback(
    (event, newPage) => {
      setPage(newPage);
      const updatedRows = rawData.slice(
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
      }
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  return (
    <div className='main'>
      <Button variant='contained' color="secondary" component={Link} href="/data">
        Back
      </Button>
      <Typography variant='h4' className={styles.header}>
        Dataset View
      </Typography>
      <div className='medium-space' />

      <TextField
        id="outlined-basic"
        label="Dataset name"
        variant="outlined"
        className='text-label'
        value={dataset.name}
        onChange={(e) => setDataset(e.target.value)}
      />
      {error ? <Typography variant='body2' color='red'>
          Error: {error}
        </Typography> : null}
      <div className='medium-space' />

      <div className="horizontal-box flex-start">
        <Typography variant='body1'>
          Type of data:&nbsp;&nbsp;
        </Typography>
        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={(e, val) => setType(val)}
        >
          <ToggleButton value="classification">
            <Typography variant='body1'>
              Classification
            </Typography>
          </ToggleButton>
          <ToggleButton value="generative">
            <Typography variant='body1'>
              Generative
            </Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='medium-space' />

      {rawData.length > 0 ?
        <div>
          <div>
            <Typography>Train file name: {displayFilename}</Typography>
            <Typography>Number of rows: {rawData.length}</Typography>
          </div>
          <div className='small-space'/>
        </div> : null }
      {loading ? <CircularProgress /> :
        <Paper>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{backgroundColor:'#d6daef'}}>
                <TableRow>
                  <TableCell>Prompt</TableCell>
                  <TableCell>Completion</TableCell>
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
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={rawData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      }
      <div className='medium-space' />

      <Button variant='contained' color="primary">Update</Button>
      <Button className='button-margin' variant='contained' color="error" onClick={handleClickOpen}>Delete</Button>

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
