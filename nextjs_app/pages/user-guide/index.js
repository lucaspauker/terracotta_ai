import { useState, useEffect } from 'react';
import { getSession, useSession } from "next-auth/react"
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FunctionsIcon from '@mui/icons-material/Functions';
import PaletteIcon from '@mui/icons-material/Palette';
import { BsCheckLg } from 'react-icons/bs';

import ProjectInfo from '@/components/information/ProjectInfo';
import DataInfo from '@/components/information/DataInfo';
import ModelInfo from '@/components/information/ModelInfo';
import EvaluationInfo from '@/components/information/EvaluationInfo';

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

export default function Tutorial() {
  const [expanded, setExpanded] = useState('');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : '');
  };

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
           Tutorial video
        </Typography>
        <div/>
      </div>
      <div className='main-content'>
        <div style={{position: "relative", paddingBottom: "min(63.716814159292035%, 509.734513274px)", height: 0}}>
          <iframe src="https://www.loom.com/embed/da4ad333a5744f02852407997dfda181?sid=9fcb5f77-d94f-4e9a-be07-d84cff347a7a" frameBorder="0" allowFullScreen style={{position: "absolute", top: 0, left: 0, right: 0, marginRight: "auto", marginLeft: "auto", width: "100%", height: "100%", maxWidth: 800, maxHeight: 509.734513274}}></iframe>
        </div>
        <div className='medium-space'/>

      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
           User Guide
        </Typography>
        <div/>
      </div>
      <div className='tiny-space' />
        <Accordion expanded={expanded === 'project'} onChange={handleChange('project')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div className='horizontal-box'>
              <PaletteIcon />
              <Typography variant="h6">&nbsp;&nbsp;&nbsp;Projects</Typography>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <ProjectInfo />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'data'} onChange={handleChange('data')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div className='horizontal-box'>
              <TextSnippetIcon />
              <Typography variant="h6">&nbsp;&nbsp;&nbsp;Datasets</Typography>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <DataInfo />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'model'} onChange={handleChange('model')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div className='horizontal-box'>
              <LightbulbIcon />
              <Typography variant="h6">&nbsp;&nbsp;&nbsp;Models</Typography>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <ModelInfo />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'evaluation'} onChange={handleChange('evaluation')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div className='horizontal-box'>
              <FunctionsIcon />
              <Typography variant="h6">&nbsp;&nbsp;&nbsp;Evaluations</Typography>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <EvaluationInfo />
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  )
}
