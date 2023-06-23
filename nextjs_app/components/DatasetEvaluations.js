import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import Link from 'next/link';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CollapseIcon from '@mui/icons-material/Remove';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Tooltip from '@mui/material/Tooltip';
import ErrorIcon from '@mui/icons-material/Error';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import axios from 'axios';

import MenuComponent from "components/MenuComponent";
import { getPriceString, calculateColor, timestampToDateTimeShort, metricFormat, baseModelNamesDict } from '/components/utils';
import { FaArrowRight } from 'react-icons/fa';
import { BiInfoCircle } from 'react-icons/bi';
import { BsFillCircleFill } from 'react-icons/bs';
import {createCustomTooltip, CustomTooltip} from 'components/CustomToolTip.js';

function DatasetEvaluations({ datasetData, evaluations, refreshData, showTraining, setShowTraining, loading }) {
  const [expanded, setExpanded] = useState(datasetData);
  const router = useRouter()
  const [open, setOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const [projectType, setProjectType] = useState('');

  const doDelete = () => {
    axios.post("/api/evaluate/delete/" + idToDelete).then((res) => {
      setOpen(false);
      refreshData();
    }).catch((error) => {
      console.log(error);
    });
  }

  const handleExpandAll = () => {
    setExpanded(datasetData);
  };

  const handleCollapseAll = () => {
    setExpanded([]);
  };

  const handleChange = (input) => {
    if (expanded.includes(input)) {
      setExpanded(expanded.filter((name) => name !== input));
    } else {
      setExpanded([...expanded, input]);
    }
  };

  const handleEdit = (id) => {
    router.push("/evaluate/edit/" + id);
  };

  const handleOpen = (id) => {
    setIdToDelete(id);
  };

  const handleToggleShowTraining = () => {
    setShowTraining(!showTraining);
  }

  useEffect(() => {
    refreshData();
  }, [showTraining]);

  useEffect(() => {
    handleExpandAll();
  }, [datasetData]);

  useEffect(() => {
    if (idToDelete !== null) {
      setOpen(true);
    }
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
      axios.post("/api/project/by-name", {projectName: projectName}).then((res) => {
        setProjectType(res.data.type);
      }).catch((error) => {
        console.log(error);
      });
    }
  }, [idToDelete]);

  return (
    <div>
      <div>
        <Button onClick={handleCollapseAll} variant="outlined" color="primary">
          Collapse All
        </Button>
        <Button onClick={handleExpandAll} variant="outlined" color="primary" className='button-margin'>
          Expand All
        </Button>
        {projectType === 'classification' &&
          <FormControlLabel
            sx={{marginLeft: '16px'}}
            control={
              <Checkbox checked={showTraining} onChange={handleToggleShowTraining} />
            }
            label="Show training evaluations" />
        }
        {createCustomTooltip("Training evaluations are generated during fine-tuning by OpenAI using the validation dataset.")}
      </div>
      <div className='small-space' />
      {loading ?
        <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
        :
        datasetData.map((datasetDataPoint, index) => (
        <Box key={datasetDataPoint.id} marginBottom={2}>
          <Accordion
            expanded={expanded.includes(datasetDataPoint)}
            onChange={() => handleChange(datasetDataPoint)}
            defaultExpanded={true}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" onClick={e => e.stopPropagation()}>
                <Link className='link' href={"/data/" + datasetDataPoint.id}>
                  {datasetDataPoint.name}&nbsp;&nbsp;&nbsp;&nbsp;
                </Link>
              </Typography>
              <Button
                size="small"
                variant='outlined'
                color="secondary"
                component={Link}
                href={"/evaluate/by-dataset/" + datasetDataPoint.id}
                onClick={e => e.stopPropagation()}
                disabled={evaluations[datasetDataPoint.name].length <= 1}
              >
                Compare evaluations&nbsp;&nbsp; <FaArrowRight />
              </Button>
              {evaluations[datasetDataPoint.name].length <= 1 &&
                <CustomTooltip title="💡 Create another evaluation with the same dataset to compare evaluations.">
                  <IconButton disableRipple={true}>
                    <BiInfoCircle size={16} color='#9C2315'/>
                  </IconButton>
                </CustomTooltip>}
            </AccordionSummary>
            <AccordionDetails>
              <Paper variant="outlined">
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell className='table-cell'>Name</TableCell>
                        <TableCell className='table-cell'>Date created</TableCell>
                        <TableCell className='table-cell'>Model name</TableCell>
                        <TableCell className='table-cell'>Cost</TableCell>
                        <TableCell className='table-cell'>Metrics</TableCell>
                        <TableCell className='table-cell'></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {evaluations[datasetDataPoint.name].map((e) => (
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
                                <div><CircularProgress size={16} sx={{marginTop: 1}} /></div>
                              </div>
                            }
                          </TableCell>
                          <TableCell>{timestampToDateTimeShort(e.timeCreated)}</TableCell>
                          <TableCell>
                            {e.modelId ?
                              <Link className='link' href={"/models/" + e.modelId}>{e.modelName}</Link>
                              :
                              <>{baseModelNamesDict[e.providerCompletionName]}</>
                            }
                          </TableCell>
                          <TableCell>{e.trainingEvaluation ? "---" : "cost" in e ? getPriceString(e.cost): "pending"}</TableCell>
                          <TableCell>
                            {e.metricResults ?
                              <div className='metrics-cell'>
                                {e.metrics.map(m => (m !== 'confusion') &&
                                  <div key={m} className='horizontal-box flex-start'>
                                    <BsFillCircleFill  style={{color: calculateColor(e.metricResults[m]), marginTop: 1}} />
                                    <span className='metric-in-table-text'>
                                      {metricFormat(m)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              : null }
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
                </TableContainer>
              </Paper>
            </AccordionDetails>
          </Accordion>
        </Box>
      ))}
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
  );
}

export default DatasetEvaluations;

