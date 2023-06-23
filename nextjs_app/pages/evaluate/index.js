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
import DatasetEvaluations from 'components/DatasetEvaluations';

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
  const [evals, setEvals] = useState({});
  const [datasetData, setDatasetData] = useState(null);
  const [project, setProject] = useState('');
  const router = useRouter()
  const [page, setPage] = useState(0);
  const [visibleRows, setVisibleRows] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showTraining, setShowTraining] = useState(true);
  const { data: session } = useSession();

  // Auto page refresh
  const [refreshCount, setRefreshCount] = useState(0);
  const maxRefreshes = 10;
  const refreshInterval = 2000;
  useEffect(() => {
    const checkEvaluationChange = () => {
      refreshData(null, true);

      // Schedule the next refresh
      const nextRefreshInterval = refreshInterval * 1.5;
      const timeout = setTimeout(() => {
        setRefreshCount(prevCount => prevCount + 1);
      }, nextRefreshInterval);

      return () => clearTimeout(timeout); // Clean up the timeout on unmount
    };

    checkEvaluationChange();
  }, [refreshCount]);

  const groupByDatasets = (data) => {
    let result = {};
    let ddata = [];
    for (let i = 0; i < data.length; i++) {
      const dname = data[i].datasetName;
      const id = data[i].datasetId;
      if (dname in result) {
        result[dname].push(data[i]);
      } else {
        result[dname] = [data[i]];
        ddata.push(
          {name: dname, id: id}
        );
      }
    }
    setDatasetData(ddata);
    return result;
  }

  const refreshData = (e, background=false) => {
    !background && setLoading(true);
    let p = project;
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
      setProject(localStorage.getItem("project"));
    };
    axios.post("/api/evaluate", {
        projectName: p,
      }).then((res) => {
        if (showTraining) {
          setEvals(groupByDatasets(res.data));
        } else {
          setEvals(groupByDatasets(res.data.filter(e => !e.trainingEvaluation)));
        }
        setPage(0);
        const newPage = 0;
        const updatedRows = res.data.slice(
          newPage * rowsPerPage,
          newPage * rowsPerPage + rowsPerPage,
        );
        setVisibleRows(updatedRows);
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
    refreshData();

    window.addEventListener("storage", () => {
      refreshData();
    });
  }, []);

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
          <Button variant='contained' color="secondary" component={Link} href="/evaluate/evaluate-select">
            + New evaluation
          </Button>
        </div>
      </div>
      <div className='tiny-space' />

      <div>
        {!datasetData ?
          <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
          : datasetData.length > 0 ?
          <DatasetEvaluations datasetData={datasetData} evaluations={evals} refreshData={refreshData}
            showTraining={showTraining} setShowTraining={setShowTraining} loading={loading}/>
          :
          <>
          <Paper variant='outlined' className='info-box'>
            <Typography variant='h4'>
              What is an evaluation?
            </Typography>
            <Typography variant='body1'>
              A dataset is your data that you can use to fine-tune a large language model (LLM).
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
    </div>
  )
}
