import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import axios from 'axios';
import { getSession, useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from 'next/router'
import { FaArrowLeft, FaCopy } from 'react-icons/fa';
import { BiCopy } from 'react-icons/bi';
import {CustomTooltip} from '../../components/CustomTooltip.js';
import { BiInfoCircle } from 'react-icons/bi';

const steps = ['Dataset and model', 'Metrics', 'Review'];

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

const libraries = ['curl', 'python', 'node.js'];

export default function Deploy() {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('');
  const [library, setLibrary] = useState('curl');
  const [prompt, setPrompt] = useState('input your prompt here');
  const router = useRouter()

  const copyText = () => {
    navigator.clipboard.writeText(apiCode);
  }

  const pythonApiCode = (modelName, inputPrompt) => {
    return `import os
import openai
openai.api_key = os.getenv("OPENAI_API_KEY")
openai.Completion.create(
    model="${modelName}",
    prompt="${inputPrompt}" + "###",
    max_tokens=7,
    temperature=0
)`;
  }

  const nodeApiCode = (modelName, inputPrompt) => {
    return `const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const response = await openai.createCompletion({
  model: "${modelName}",
  prompt: "${inputPrompt}" + "###",
  max_tokens: 7,
  temperature: 0,
});`
  }

  const curlApiCode = (modelName, inputPrompt) => {
    return `curl https://api.openai.com/v1/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{
    "model": "${modelName}",
    "prompt": "${inputPrompt}" + "###",
    "max_tokens": 7,
    "temperature": 0
  }'`
}

  const [apiCode, setApiCode] = useState(curlApiCode(''));

  const getApiCode = (m, l, p) => {
    if (l === 'python') {
      return pythonApiCode(m, p);
    } else if (l === 'node.js') {
      return nodeApiCode(m, p);
    } else if (l === 'curl') {
      return curlApiCode(m, p);
    }
  }

  const handleModelChange = (newModelName) => {
    setModel(newModelName);
    setApiCode(getApiCode(newModelName, library, prompt));
  }

  const handleLibraryChange = (newLibraryName) => {
    setLibrary(newLibraryName);
    setApiCode(getApiCode(model, newLibraryName, prompt));
  }

  const handlePromptChange = (newPrompt) => {
    setPrompt(newPrompt);
    setApiCode(getApiCode(model, library, newPrompt));
  }

  

  useEffect(() => {
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
    }
    axios.post("/api/models", {projectName: projectName}).then((res) => {
      setModels(res.data);
      if (res.data[0]) {
        const m = res.data[0].providerData.modelId;
        setModel(m);
        setApiCode(getApiCode(m, library));
      }
    }).catch((error) => {
      console.log(error);
    });

    window.addEventListener("storage", () => {
      let projectName = '';
      if (localStorage.getItem("project")) {
        projectName = localStorage.getItem("project");
      }
      axios.post("/api/models", {projectName: projectName}).then((res) => {
        setModels(res.data);
        if (res.data[0]) {
          const m = res.data[0].providerData.modelId;
          setModel(m);
          setApiCode(getApiCode(m, library));
        }
      }).catch((error) => {
        console.log(error);
      });
    });
  }, []);

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
          Deploy
        </Typography>
      </div>
      <div className='small-space' />

      <div className='main-content'>
        <Paper className='card vertical-box' variant='outlined'>
          <div className='horizontal-box full-width'>
            <FormControl>
              <InputLabel id="model-label">Model</InputLabel>
              <Select
                labelId="model-label"
                className="simple-select"
                label="Model"
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {models.map((m) => (
                  <MenuItem key={m._id} value={m.providerData.modelId}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="library-label">Library</InputLabel>
              <Select
                labelId="library-label"
                className="simple-select"
                label="Library"
                value={library}
                onChange={(e) => handleLibraryChange(e.target.value)}
              >
                {libraries.map((l) => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <div>
            <TextField
                label="Input prompt"
                variant="outlined"
                value={prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
            />
            <CustomTooltip title="Any additional characters visible in the prompt field in the code block are required for proper model response." className='tooltip'>
              <IconButton disableRipple={true}>
                <BiInfoCircle size={16} color='#9C2315'/>
              </IconButton>
            </CustomTooltip>
            </div>
            <IconButton className='horizontal-box copy' onClick={copyText}>
              <BiCopy size={20} />
            </IconButton>
          </div>
          <div className='tiny-space' />
          <TextField
            multiline
            InputProps={{
              readOnly: true,
            }}
            rows={11}
            className="output-text-box output-code-box"
            value={apiCode}
          />
        </Paper>
      </div>
    </div>
  )
}

