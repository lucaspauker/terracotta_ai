import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Box from '@mui/material/Box';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { FaArrowLeft } from 'react-icons/fa';
import { BiShuffle, BiCopy, BiInfoCircle } from 'react-icons/bi';

function TemplateCreator({
      templateString,
      stopSequence,
      outputColumn,
      errorMessage,
      setTemplateString,
      setStopSequence,
      setOutputColumn,
      setErrorMessage,
      trainData,
      headers,
      initialVisibleRows,
      dataset,
      shuffleData,
    }) {

  const [page, setPage] = useState(0);
  const [visibleRows, setVisibleRows] = useState(initialVisibleRows);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [models, setModels] = useState([]);
  const [templateModel, setTemplateModel] = useState('');
  const [datasetLoading, setDatasetLoading] = useState(true);

  const handleChangePage = useCallback(
    (event, newPage) => {
      setPage(newPage);
      const updatedRows = trainData.slice(
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

      const updatedRows = trainData.slice(
        0 * updatedRowsPerPage,
        0 * updatedRowsPerPage + updatedRowsPerPage,
      );
      setVisibleRows(updatedRows);
    },
  );

  const handleTemplateChange = (newTemplateString) => {
    if (newTemplateString !== '') {
      const regex = /{{[^{}]*}}/g;
      let matches = newTemplateString.match(regex);
      if (matches === null) {
        setErrorMessage('Template must contain at least one variable e.g. {{input}}');
      } else {
        const matchStrings = matches.map((match) => match.replace('{{','').replace('}}',''));
        let templateStringCopy = newTemplateString;
        for (let i = 0; i < matchStrings.length; i++){
          if (!headers.includes(matchStrings[i])) {
            setErrorMessage(`{{${matchStrings[i]}}} does not match any column in the dataset`);
            setTemplateString(newTemplateString);
            return;
          } else {
            templateStringCopy = templateStringCopy.replace(matches[i], '');
          }
        }
        if (templateStringCopy.indexOf('{{') !== -1) {
          setErrorMessage("Template contains unclosed variable tag {{")
        } else if (templateStringCopy.indexOf('}}') !== -1) {
          setErrorMessage("Template contains unclosed variable tag }}")
        } else {
          setErrorMessage('');
        }
      }
    } else {
      setErrorMessage('');
    }
    setTemplateString(newTemplateString);
  }

  const templateTransform = (row) => {
    if (templateString !== '' && errorMessage === '') {
      const regex = /{{[^{}]*}}/g;
      const matches = templateString.match(regex);
      let result = templateString;
      matches.forEach((match) => {
        result = result.replace(match, row[match.replace('{{','').replace('}}','')]);
      });
      return result;
    } else {
      return "";
    }
  }

  useEffect(() => {
    let p = '';
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
    };
    axios.post("/api/models", {projectName: p}).then((res) => {
      console.log(dataset._id)
      console.log(res.data);
      const filteredModels = res.data.filter( (model) => model.datasetId?._id === dataset._id);
      console.log(filteredModels);
      setModels(filteredModels);
    }).catch((error) => {
      console.log(error);
    });
  }, []);

  useEffect(() => {
    setDatasetLoading(true);
    setPage(0);
    const updatedRows = trainData.slice(0, rowsPerPage);
    setVisibleRows(updatedRows);
    setDatasetLoading(false);
  }, [trainData])

  return (
    <div className="full-width">
      <div className= "left-message">
        {errorMessage === "" ?
          <Typography className = "prompt-success horizontal-box flex-start">
            <CheckCircleOutlineIcon/>&nbsp;&nbsp;Valid prompt
          </Typography>
          :
          <Typography className = "prompt-error horizontal-box flex-start">
            <ErrorOutlineIcon/>&nbsp;&nbsp;{errorMessage}
          </Typography>
        }
      </div>
      <div className='tiny-space' />
      <div className='full-width template-layout'>
        <TextField
          variant="outlined"
          className='template-box'
          value={templateString}
          onChange={(e) => handleTemplateChange(e.target.value)}
          multiline
          minRows = {8}
          maxRows = {15}
        />
        <div className = "template-options">
          <div className = "vertical-box">
            <Typography>Import template from a model:</Typography>
            <div className = "tiny-space" />
            <FormControl>
              <Select
                className="compact-select"
                value={templateModel}
                onChange={(e) => {
                  setTemplateModel(e.target.value);
                  handleTemplateChange(e.target.value.templateId.templateString)
                  setStopSequence(e.target.value.templateId.stopSequence)
                  setOutputColumn(e.target.value.templateId.outputColumn)
                }}
              >
                {models.map((d, i) => (
                  <MenuItem value={d} key={i}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <div>
            <Typography>Output column:</Typography>
            <div className = "tiny-space" />
            <FormControl>
              <Select
                className="compact-select"
                value={outputColumn}
                onChange={(e) => {
                  setOutputColumn(e.target.value);
                }}
                required
              >
                {headers.map((d, i) => (
                    <MenuItem value={d} key={i}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <div>
            <Typography>Stop sequence:</Typography>
            <div className = "tiny-space" />
            <TextField
              variant="outlined"
              className='small-text-field'
              size = "small"
              value={stopSequence}
              onChange={(e) => setStopSequence(e.target.value)}
            />
          </div>
          <div>
              <Typography sx={{textAlign:'center'}}>Headers: </Typography>
              <div className = "tiny-space" />
              <div className = "headers-container small-scrollbar" style={{justifyContent:'center', maxHeight:'170px'}}>
                {headers.map((h, i) =>
                  <Typography className='data-header' key={h}>
                    {h}
                  </Typography>
                )}
              </div >
          </div>
        </div>
      </div>
        <IconButton color="primary" onClick={() => {
              setDatasetLoading(true);
              shuffleData();
            }}>
          <BiShuffle />
        </IconButton>
        {datasetLoading ?
          <div className='horizontal-box' style={{height:'500px'}}><CircularProgress /></div>
          :
          <div className="shadow">
            <TableContainer>
              <Table stickyHeader sx={{ minWidth: 650}}>
                <TableHead>
                  <TableRow>
                    {["Input Prompt", "Completion"].map((header, i) => (
                      <TableCell
                        key={i}
                        align="center"
                        style={{
                          borderRight: i === headers.length - 1 ? 'none' : '1px dashed lightgrey',
                          borderBottom: '3px solid #9C2315',
                          borderTop: 'none',
                          fontSize: '16px', // Increase font size for the header row
                          fontWeight: 'bold',
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((row,i) => (
                    <TableRow
                      key={i}
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        overflow: 'auto',
                      }}
                    >
                      <TableCell
                        style={{
                          borderRight: '1px dashed lightgrey',
                          borderBottom: i === visibleRows.length - 1 ? '0px' : '1px dashed lightgrey',
                        }}
                        className = "half-table-cell"
                      >
                        <Typography className="cell-content small-scrollbar" style={{ maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap'}}>
                        {
                          templateTransform(row)
                        }
                        </Typography>
                      </TableCell>
                      <TableCell
                        style={{
                          borderBottom: i === visibleRows.length - 1 ? '0px' : '1px dashed lightgrey',
                          verticalAlign: 'top',
                        }}
                        className = "half-table-cell"
                      >
                        <Typography className="cell-content small-scrollbar" style={{ maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap'}}>
                        {outputColumn? row[outputColumn] : ""}
                        {outputColumn? <span style={{color:'lightgrey'}}>{stopSequence}</span>: null}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Divider/>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={trainData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </div>
        }
    </div>
  );
}

export default TemplateCreator;
