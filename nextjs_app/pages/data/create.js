import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import IconButton from '@mui/material/IconButton';
import Select from 'react-select'
import axios from 'axios';
import AWS from 'aws-sdk';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from 'next/router'
import { FaArrowLeft, FaTrash } from 'react-icons/fa';

import styles from '@/styles/Data.module.css'

const steps = ['General information', 'Training data', 'Validation data', 'Review'];

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

export default function CreateDataset() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const numRows = 5;
  const [rows, setRows] = useState(Array.from({ length: numRows }, () => ({ input: '', output: '' })));
  const router = useRouter()

  const handleAddRow = () => {
    const newRow = { input: '', output: '' };
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (index) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const handleClearAll = () => {
    setRows(Array.from({ length: numRows }, () => ({ input: '', output: '' })));
  };

  const handleChangeInput = (event, index) => {
    const newRows = [...rows];
    newRows[index].input = event.target.value;
    setRows(newRows);
  };

  const handleChangeOutput = (event, index) => {
    const newRows = [...rows];
    newRows[index].output = event.target.value;
    setRows(newRows);
  };

  const handleDownloadCsv = () => {
    const csvRows = [];
    csvRows.push(['Input', 'Output']); // Add header row
    rows.forEach((row) => {
      const input = row.input.replace(/"/g, '""'); // Escape double quotes
      const output = row.output.replace(/"/g, '""'); // Escape double quotes
      csvRows.push([`"${input}"`, `"${output}"`]); // Enclose fields in double quotes
    });
    const csvData = csvRows.map((row) => row.join(',')).join('\n'); // Convert rows to CSV format
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' }); // Create a blob containing the CSV data
    const url = URL.createObjectURL(blob); // Create a URL for the blob
    const link = document.createElement('a'); // Create a link element
    link.setAttribute('href', url);
    link.setAttribute('download', 'dataset.csv'); // Set the filename for the CSV file
    document.body.appendChild(link); // Add the link to the document body
    link.click(); // Click the link to download the CSV file
  };


  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <div className='horizontal-box'>
          <FaArrowLeft size='30' onClick={() => router.back()} className='back-icon cursor-pointer'/>
          <Typography variant='h4' className='page-main-header'>
            Create CSV
          </Typography>
        </div>
      </div>
      <div className='tiny-space' />
      <Paper variant="outlined">
        <TableContainer>
          <Table aria-label="dataset table">
            <TableHead>
              <TableRow>
                <TableCell className='table-cell' align="center">Input</TableCell>
                <TableCell className='table-cell' align="center">Output</TableCell>
                <TableCell className='table-cell' align="center"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index} className='no-border'>
                  <TableCell className='no-border'>
                    <TextField className='create-field' multiline rows={4} value={row.input} onChange={(event) => handleChangeInput(event, index)} />
                  </TableCell>
                  <TableCell className='no-border'>
                    <TextField className='create-field' multiline rows={4} value={row.output} onChange={(event) => handleChangeOutput(event, index)} />
                  </TableCell>
                  <TableCell align="center" className='no-border'>
                    <IconButton onClick={() => handleDeleteRow(index)}>
                      <FaTrash className='trash-icon-large'/>
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <div className='small-space' />
      <div className='horizontal-box'>
        <Button variant="contained" color="primary" onClick={handleAddRow}>
          Add Row
        </Button>
        <Button className='button-margin' variant="contained" color="primary" onClick={handleClearAll}>
          Clear all
        </Button>
        <Button className='button-margin' variant="contained" color="primary" onClick={handleDownloadCsv}>
          Download as CSV
        </Button>
      </div>
    </div>
  )
}

