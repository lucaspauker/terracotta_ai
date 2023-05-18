import { useState, useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
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
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import Grow from '@mui/material/Grow';
import axios from 'axios';
import { BiCopy, BiInfoCircle } from 'react-icons/bi';
import { AiOutlineCloseCircle } from 'react-icons/ai';

import {CustomTooltip} from '/components/CustomTooltip.js';

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
  const [project, setProject] = useState('');
  const [baseModelsList, setBaseModelsList] = useState([]);
  const [output, setOutput] = useState({});
  const [checked, setChecked] = useState({'text-ada-001': true});
  const [loadingDict, setLoadingDict] = useState({'text-ada-001': false});
  const [temperature, setTemperature] = useState(0.75);
  const [maxTokens, setMaxTokens] = useState(100);
  const [baseModelsChecked, setBaseModelsChecked] = useState(1);
  const [finetunedModelsChecked, setFinetunedModelsChecked] = useState(0);
  const [differentPrompt, setDifferentPrompt] = useState(false);
  const [stripWhitespace, setStripWhitespace] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [finetunedPrompt, setFinetunedPrompt] = useState('');

  const storeOutput = (id, text) => {
    setOutput({...output, [id]: text});
    setLoadingDict(loadingDict => ({...loadingDict, [id]: false}));
  }

  const handleToggleSeparatePrompt = () => {
    if (!differentPrompt) {
      setFinetunedPrompt(prompt);
    }
    setDifferentPrompt(!differentPrompt);
    localStorage.setItem("differentPrompt", JSON.stringify(!differentPrompt));
  }

  const submit = () => {
    // This function handles calling the API for every checked model
    let hyperParams = {
      "temperature": temperature,
      "maxTokens": maxTokens,
    }

    let x = Object.assign({}, loadingDict);;
    for (let i=0; i<baseModelsList.length; i++) {
      let m = baseModelsList[i];
      if (checked[m.completionName]) {
        x[m.completionName] = true;
      }
    }
    for (let i=0; i<finetunedModels.length; i++) {
      let m = finetunedModels[i];
      if (checked[m._id]) {
        x[m._id] = true;
      }
    }

    setLoadingDict(x);
    for (let i=0; i<baseModelsList.length; i++) {
      let m = baseModelsList[i];
      if (checked[m.completionName]) {
        console.log("Sending request for " + m.completionName);
        axios.post("/api/infer/" + m.provider.toLowerCase(), {
            provider: m.provider.toLowerCase(),
            completionName: m.completionName,
            prompt: prompt,
            projectName: project,
            hyperParams: hyperParams,
          }).then((res) => {
            if (res.data !== "No data found") {
              let out = res.data;
              if (stripWhitespace) out = out.trim();
              storeOutput(m.completionName, out);
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
        let p = prompt;
        if (differentPrompt) p = finetunedPrompt;
        axios.post("/api/infer/" + m.provider.toLowerCase(), {
            model: m,
            prompt: p,
            projectName: project,
            hyperParams: hyperParams,
          }).then((res) => {
            if (res.data !== "No data found") {
              let out = res.data;
              if (stripWhitespace) out = out.trim();
              storeOutput(m._id, out);
            }
          }).catch((error) => {
            console.log(error);
          });
      }
    }
  }

  const clear = () => {
    localStorage.setItem("checked", JSON.stringify({'text-ada-001': true}));
    localStorage.setItem("temperature", JSON.stringify(0.75));
    localStorage.setItem("maxTokens", JSON.stringify(100));
    localStorage.setItem("baseModelsChecked", JSON.stringify(1));
    localStorage.setItem("finetunedModelsChecked", JSON.stringify(0));
    localStorage.setItem("differentPrompt", JSON.stringify(false));
    localStorage.setItem("stripWhitespace", JSON.stringify(true));
    localStorage.setItem("prompt", JSON.stringify(''));
    localStorage.setItem("finetunedPrompt", JSON.stringify(''));
    setOutput({});
    setChecked({'text-ada-001': true});
    setLoadingDict({'text-ada-001': false});
    setTemperature(0.75);
    setMaxTokens(100);
    setBaseModelsChecked(1);
    setFinetunedModelsChecked(0);
    setDifferentPrompt(false);
    setStripWhitespace(true);
    setPrompt('');
    setFinetunedPrompt('');
  }

  const copyText = (t) => {
    navigator.clipboard.writeText(t);
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
    localStorage.setItem("checked", JSON.stringify(updatedChecked));
  }

  const handlePaperClick = (event, id, baseOrFinetuned) => {
    event.stopPropagation();
    if (!isCheckedById(id)) {  // This will become checked
      if (baseOrFinetuned === "base") {
        localStorage.setItem("baseModelsChecked", JSON.stringify(baseModelsChecked + 1));
        setBaseModelsChecked(baseModelsChecked + 1);
      } else if (baseOrFinetuned === "finetuned") {
        localStorage.setItem("finetunedModelsChecked", JSON.stringify(finetunedModelsChecked + 1));
        setFinetunedModelsChecked(finetunedModelsChecked + 1);
      }
    } else {
      if (baseOrFinetuned === "base") {
        localStorage.setItem("baseModelsChecked", JSON.stringify(baseModelsChecked - 1));
        setBaseModelsChecked(baseModelsChecked - 1);
      } else if (baseOrFinetuned === "finetuned") {
        localStorage.setItem("finetunedModelsChecked", JSON.stringify(finetunedModelsChecked - 1));
        setFinetunedModelsChecked(finetunedModelsChecked - 1);
      }
    }
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

    axios.post("/api/models", {projectName: projectName}).then((res) => {
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
      axios.post("/api/models", {projectName: projectName}).then((res) => {
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

    // Load data from localstorage
    const checkedLocal = JSON.parse(localStorage.getItem("checked"));
    if (checkedLocal !== null) setChecked(checkedLocal);
    const tempLocal = JSON.parse(localStorage.getItem("temperature"));
    if (tempLocal !== null) setTemperature(tempLocal);
    const maxTokensLocal = JSON.parse(localStorage.getItem("maxTokens"));
    if (maxTokensLocal !== null) setMaxTokens(maxTokensLocal);
    const promptLocal = JSON.parse(localStorage.getItem("prompt"));
    if (promptLocal !== null) setPrompt(promptLocal);
    const finetunedPromptLocal = JSON.parse(localStorage.getItem("finetunedPrompt"));
    if (finetunedPromptLocal !== null) setFinetunedPrompt(finetunedPromptLocal);
    const differentPromptLocal = JSON.parse(localStorage.getItem("differentPrompt"));
    if (differentPromptLocal !== null) setDifferentPrompt(differentPromptLocal);
    const baseModelsCheckedLocal = JSON.parse(localStorage.getItem("baseModelsChecked"));
    if (baseModelsCheckedLocal !== null) setBaseModelsChecked(baseModelsCheckedLocal);
    const finetunedModelsCheckedLocal = JSON.parse(localStorage.getItem("finetunedModelsChecked"));
    if (finetunedModelsCheckedLocal !== null) setFinetunedModelsChecked(finetunedModelsCheckedLocal);
    const stripWhitespaceLocal = JSON.parse(localStorage.getItem("stripWhitespace"));
    if (stripWhitespaceLocal !== null) setStripWhitespace(stripWhitespaceLocal);
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
            label="Your prompt here..."
            multiline
            rows={6}
            className='prompt white'
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              localStorage.setItem("prompt", JSON.stringify(e.target.value));
            }}
          />
          <div className='tiny-space' />
          {differentPrompt &&
            <Grow in={differentPrompt}>
              <TextField
                label="Your finetuned models prompt here..."
                multiline
                rows={6}
                className='prompt white'
                value={finetunedPrompt}
                onChange={(e) => {
                  setFinetunedPrompt(e.target.value);
                  localStorage.setItem("finetunedPrompt", JSON.stringify(e.target.value));
                }}
              />
            </Grow>
          }
          <div className='tiny-space' />
          <div className='horizontal-box full-width flex-start'>
            <Button color='secondary' variant='contained' onClick={clear}>Clear</Button>
            <Button className='button-margin' variant='contained' color="success" onClick={submit}>Submit</Button>
            {baseModelsChecked > 0 && finetunedModelsChecked > 0 ?
              <div className='horizontal-box pointer' onClick={() => handleToggleSeparatePrompt()}>
                <Checkbox className='small-checkbox' checked={differentPrompt} />
                <Typography>
                  Different prompt for finetuned models
                </Typography>
              </div> : null}
          </div>
          <div className='tiny-space' />

          <div className='model-output'>
            {baseModelsList.map((m, i) => (
              checked[m.completionName] ?
                <div key={m._id} className="output-box">
                  <div className='horizontal-box full-width'>
                    <Typography variant='body1'>
                      {providerNameDict[m.provider]}&nbsp;
                      {baseModelNamesDict[m.completionName]}
                    </Typography>
                    <div className='horizontal-box'>
                      <IconButton className='horizontal-box copy' onClick={() => copyText(output[m.completionName])}>
                        <BiCopy size={20} />
                      </IconButton>
                      <IconButton className='copy' onClick={() => toggleCheckedById(m.completionName)}>
                        <AiOutlineCloseCircle size={20} />
                      </IconButton>
                    </div>
                  </div>
                  {loadingDict[m.completionName] ?
                    <TextField
                      multiline
                      InputProps={{ readOnly: true, }}
                      rows={10}
                      className="output-text-box white"
                      value={'Loading...'}
                    />
                    :
                    <TextField
                      multiline
                      InputProps={{ readOnly: true, }}
                      rows={10}
                      className="output-text-box white"
                      value={output[m.completionName]}
                    />
                  }
                </div>
              : null
            ))}
            {finetunedModels.map((m, i) => (
              checked[m._id] ?
                <div key={m._id} className="output-box">
                  <div className='horizontal-box full-width'>
                    <Typography variant='body1'>
                      {m.name}
                    </Typography>
                    <div className='horizontal-box'>
                      <IconButton className='horizontal-box copy' onClick={() => copyText(output[m._id])}>
                        <BiCopy size={20} />
                      </IconButton>
                      <IconButton className='copy' onClick={() => toggleCheckedById(m._id)}>
                        <AiOutlineCloseCircle size={20} />
                      </IconButton>
                    </div>
                  </div>
                  {loadingDict[m._id] ?
                    <TextField
                      multiline
                      InputProps={{ readOnly: true, }}
                      rows={10}
                      className="output-text-box white"
                      value={'Loading...'}
                    />
                    :
                    <TextField
                      multiline
                      InputProps={{ readOnly: true, }}
                      rows={10}
                      className="output-text-box white"
                      value={output[m._id]}
                    />
                  }
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
              <div className='horizontal-box'>
                <Typography>Temperature: {temperature.toFixed(2)}</Typography>
                <CustomTooltip title="💡 Higher temperature means more random output while lower temperature means more accurate output" className='tooltip'>
                  <IconButton disableRipple={true}>
                    <BiInfoCircle size={16} color='#9C2315'/>
                  </IconButton>
                </CustomTooltip>
              </div>
              <div className='horizontal-box full-width'>
                <Typography sx={{marginRight:2}}>0</Typography>
                <Slider
                    value={temperature}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={e => {
                      setTemperature(e.target.value);
                      localStorage.setItem("temperature", JSON.stringify(e.target.value));
                    }}
                  />
                <Typography sx={{marginLeft:2}}>1</Typography>
              </div>
              <div className='small-space' />

              <div className='horizontal-box'>
                <Typography>Max tokens:</Typography>
                <CustomTooltip title="💡 One word is 2-3 tokens" className='tooltip'>
                  <IconButton disableRipple={true}>
                    <BiInfoCircle size={16} color='#9C2315'/>
                  </IconButton>
                </CustomTooltip>
              </div>
              <TextField
                className='prompt'
                type="number"
                value={maxTokens}
                onChange={e => {
                  setMaxTokens(e.target.value);
                  localStorage.setItem("maxTokens", JSON.stringify(e.target.value));
                }}
              />

              <div className='small-space' />
              <div className='horizontal-box pointer' onClick={() => {
                localStorage.setItem("stripWhitespace", JSON.stringify(!stripWhitespace));
                setStripWhitespace(!stripWhitespace)
              }}>
                <Checkbox checked={stripWhitespace} />
                <Typography>Strip output whitespace</Typography>
              </div>
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
                onClick={(event) => handlePaperClick(event, m._id, "finetuned")}
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
                  onClick={(event) => handlePaperClick(event, m.completionName, "base")}
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
