import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Slider from '@mui/material/Slider';
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import axios from 'axios';

import styles from '@/styles/Data.module.css'

const providers = ['openai', 'cohere'];
const baseModelNamesDict = {
  'text-ada-001': 'GPT-3 Ada',
  'text-babbage-001': 'GPT-3 Babbage',
  'text-curie-001': 'GPT-3 Curie',
  'text-davinci-003': 'GPT-3 Davinci',
  'generate-medium': 'Generate Medium',
  'generate-xlarge': 'Generate X-Large',
  'classify-small': 'Classify Small',
  'classify-large': 'Classify Large',
  'classify-multilingual': 'Classify Multilingual',
}
const providerNameDict = {'openai':'OpenAI','cohere':'Cohere'}

export default function Playground() {
  const [provider, setProvider] = useState('openai');
  const [finetunedModels, setFinetunedModels] = useState([]);
  const [baseModels, setBaseModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState({});
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const [project, setProject] = useState('');
  const [checked, setChecked] = useState({'text-ada-001': true});
  const [baseModelsList, setBaseModelsList] = useState([]);
  const [temperature, setTemperature] = useState(0.75);
  const [maxTokens, setMaxTokens] = useState(100);
  const promptRef = useRef();

  const storeOutput = (id, text) => {
    setOutput({...output, [id]: text});
  }

  const submit = () => {
    // This function handles calling the API for every checked model
    let hyperParams = {
      "temperature": temperature,
      "maxTokens": maxTokens,
    }
    for (let i=0; i<baseModelsList.length; i++) {
      let m = baseModelsList[i];
      if (checked[m.completionName]) {
        console.log("Sending request for " + m.completionName);
        axios.post("/api/infer/" + m.provider.toLowerCase(), {
            provider: m.provider.toLowerCase(),
            modelName: m.completionName,
            prompt: promptRef.current.value,
            projectName: project,
            hyperParams: hyperParams,
          }).then((res) => {
            if (res.data !== "No data found") {
              storeOutput(m.completionName, res.data.choices[0].text);
            }
          }).catch((error) => {
            console.log(error);
          });
      }
    }

    for (let i=0; i<finetunedModels.length; i++) {
      let m = finetunedModels[i];
      if (checked[m._id]) {
        console.log("Sending request for " + m.name);
        axios.post("/api/infer/" + m.provider.toLowerCase(), {
            provider: m.provider.toLowerCase(),
            modelName: m.providerModelId,
            prompt: promptRef.current.value,
            projectName: project,
            hyperParams: hyperParams,
          }).then((res) => {
            if (res.data !== "No data found") {
              storeOutput(m._id, res.data.choices[0].text);
            }
          }).catch((error) => {
            console.log(error);
          });
      }
    }
  }

  const clear = () => {
    let updatedOutput = Object.assign({}, output);
    for (let i=0; i<baseModelsList.length; i++) {
      let m = baseModelsList[i];
      if (checked[m.completionName]) {
        updatedOutput[m.completionName] = '';
      }
    }
    setOutput(updatedOutput);
    promptRef.current.value = '';
  }

  const groupByProviders = (models) => {
    let result = {"openai":[],"cohere":[]};
    for (let i = 0; i < models.length; i++) {
      result[models[i].provider].push(models[i]);
    }
    return result;
  }

  const toggleCheckedById = (id) => {
    let updatedChecked = Object.assign({}, checked);
    updatedChecked[id] = !checked[id];
    setChecked(updatedChecked);
  }

  const handlePaperClick = (event, id) => {
    event.stopPropagation();
    toggleCheckedById(id);
  };

  const isCheckedById = (id) => {
    if (!(id in checked)) {
      let updatedChecked = Object.assign({}, checked);
      updatedChecked[id] = false;
      setChecked(updatedChecked);
    }
    return checked[id];
  }

  useEffect(() => {
    setLoading(true);
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
      setProject(projectName);
    }

    axios.post("/api/model/list", {projectName: projectName}).then((res) => {
      if (res.data !== "No data found") {
        let data = res.data;
        setFinetunedModels(data);
      }
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });

    axios.get("/api/providers/list").then((res) => {
      const temp = groupByProviders(res.data);
      setBaseModels(temp);
      let baseModelsList = [];
      for (let i=0; i<providers.length; i++) {
        baseModelsList = baseModelsList.concat(temp[providers[i]]);
      }
      setBaseModelsList(baseModelsList);
      console.log("base models");
      console.log(temp);
    }).catch((error) => {
      console.log(error);
    });

    window.addEventListener("storage", () => {
      setLoading(true);
      let projectName = '';
      if (localStorage.getItem("project")) {
        projectName = localStorage.getItem("project");
        setProject(projectName);
      }
      axios.post("/api/model/list", {projectName: projectName}).then((res) => {
        console.log(res.data);
        if (res.data !== "No data found") {
          let data = res.data;
          setFinetunedModels(data);
        }
        setLoading(false);
      }).catch((error) => {
        console.log(error);
      });
    });
  }, []);

  if (loading) {
    return <div className='main vertical-box'><CircularProgress /></div>
  }

  return (
    <div className='main'>
      <div className='horizontal-box full-width'>
        <Typography variant='h4' className='page-main-header'>
          Playground
        </Typography>
      </div>
      <div className='medium-space' />

      <div className='leftright'>
        <div className='left'>
          <Typography variant='body1'>
            Prompt
          </Typography>
          <div className='tiny-space' />
          <TextField
            label="Summarize the article..."
            multiline
            rows={4}
            className='prompt white'
            inputRef={promptRef}
          />
          <div className='tiny-space' />
          <Button color='secondary' variant='contained' onClick={clear}>Clear</Button>
          <Button className='button-margin' variant='contained' color="success" onClick={submit}>Submit</Button>
          <div className='medium-space' />

          <div className='model-output'>
            {baseModelsList.map((m, i) => (
              checked[m.completionName] ?
                <div key={m._id} className="output-box">
                  <Typography variant='body1'>
                    {providerNameDict[m.provider]}&nbsp;
                    {baseModelNamesDict[m.completionName]}
                  </Typography>
                  <div className='tiny-space' />
                  <TextField
                    multiline
                    InputProps={{
                      readOnly: true,
                    }}
                    rows={8}
                    className="output-text-box white"
                    value={output[m.completionName]}
                  />
                </div>
              : null
            ))}
            {finetunedModels.map((m, i) => (
              checked[m._id] ?
                <div key={m._id} className="output-box">
                  <Typography variant='body1'>
                    {m.name}
                  </Typography>
                  <div className='tiny-space' />
                  <TextField
                    multiline
                    InputProps={{
                      readOnly: true,
                    }}
                    rows={8}
                    className="output-text-box white"
                    value={output[m._id]}
                  />
                </div>
              : null
            ))}
          </div>
        </div>

        <div className='right'>
          <Typography>Parameters</Typography>
          <div className='tiny-space'/>
          <Paper variant='outlined' className='card horizontal-box'>
            <div className='vertical-box full-width'>
              <Typography>Temperature: {temperature.toFixed(2)}</Typography>
              <div className='horizontal-box full-width'>
                <Typography sx={{marginRight:2}}>0</Typography>
                <Slider
                    value={temperature}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={e => setTemperature(e.target.value)}
                  />
                <Typography sx={{marginLeft:2}}>1</Typography>
              </div>
              <div className='small-space' />

              <Typography>Max tokens:</Typography>
              <TextField
                className='prompt'
                type="number"
                value={maxTokens}
                onChange={e => setMaxTokens(e.target.value)}
              />
            </div>
          </Paper>
          <div className='medium-space'/>

          <Typography>Add models here</Typography>
          <div className='tiny-space'/>

          <div className='tiny-space' />
          <FormControl className="full-width">
            <InputLabel id="provider-label">Provider</InputLabel>
              <Select
                labelId="provider-label"
                className='full-width white'
                variant='outlined'
                label="Provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
               >
                {providers.map(p => (
                  <MenuItem key={p} value={p}>{providerNameDict[p]}</MenuItem>
                ))}
                <MenuItem value={'Finetuned'}>Finetuned</MenuItem>
              </Select>
          </FormControl>
          <div className='tiny-space'/>

          {provider === "Finetuned" ?
            finetunedModels.map((m) => (
              <Paper
                variant='outlined'
                className='card horizontal-box model-select-box'
                onClick={(event) => handlePaperClick(event, m._id)}
                key={m._id}
              >
                <Checkbox checked={isCheckedById(m._id)} />
                <Typography>
                  {m.name}
                </Typography>
              </Paper>
            ))
            :
            baseModels[provider] ?
              baseModels[provider].map((m) => (
                <Paper
                  variant='outlined'
                  className='card horizontal-box model-select-box'
                  onClick={(event) => handlePaperClick(event, m.completionName)}
                  key={m._id}
                >
                  <Checkbox checked={isCheckedById(m.completionName)} />
                  <Typography>
                    {baseModelNamesDict[m.completionName]}
                  </Typography>
                </Paper>
              ))
            : null
          }
        </div>
      </div>
    </div>
  )
}
