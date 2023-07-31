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
import EvaluationInfo from 'components/information/EvaluationInfo';

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
  const [expanded, setExpanded] = useState([]);
  const [showTraining, setShowTraining] = useState(true);
  const { data: session } = useSession();
  const router = useRouter()

  // Auto page refresh
  const [refreshCount, setRefreshCount] = useState(0);
  const maxRefreshes = 10;
  const refreshInterval = 2000;

  useEffect(() => {
    if (refreshCount >= maxRefreshes) return;
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
    if (JSON.stringify(ddata) !== JSON.stringify(datasetData)) setDatasetData(ddata);
    return result;
  }

  const refreshData = (e, background=false) => {
    !background && setLoading(true);
    let p = project;
    if (localStorage.getItem("project")) {
      p = localStorage.getItem("project");
      if (p !== project) setProject(localStorage.getItem("project"));
    };
    axios.post("/api/evaluate", {
        projectName: p,
      }).then((res) => {
        if (showTraining) {
          const data = groupByDatasets(res.data);
          if (JSON.stringify(evals) !== JSON.stringify(data)) setEvals(data);
        } else {
          const data = groupByDatasets(res.data.filter(e => !e.trainingEvaluation));
          if (JSON.stringify(evals) !== JSON.stringify(data)) setEvals(data);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
  }

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
            showTraining={showTraining} setShowTraining={setShowTraining} loading={loading}
            expanded={expanded} setExpanded={setExpanded}
          />
          :
          <EvaluationInfo/>
        }
      </div>
    </div>
  )
}
