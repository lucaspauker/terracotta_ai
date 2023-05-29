import { useState, useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import Box from '@mui/material/Box';
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
import Modal from '@mui/material/Modal';
import Backdrop from '@mui/material/Backdrop';
import axios from 'axios';
import { BiDetail, BiCopy, BiInfoCircle } from 'react-icons/bi';
import { AiOutlineCloseCircle } from 'react-icons/ai';
import { ImWarning } from 'react-icons/im';

import {CustomTooltip} from '../../components/CustomToolTip.js';
import {baseModelNamesDict} from '/components/utils';

const providers = ['openai', 'cohere'];
const providerNameDict = {'openai':'OpenAI','cohere':'Cohere'}
const initialModelState = {};

export default function Playground() {
  const [provider, setProvider] = useState('openai');
  const [finetunedModels, setFinetunedModels] = useState([]);
  const [baseModels, setBaseModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState('');
  const [baseModelsList, setBaseModelsList] = useState([]);
  const [output, setOutput] = useState({});
  const [checked, setChecked] = useState(initialModelState);
  const [loadingDict, setLoadingDict] = useState(initialModelState);
  const [temperature, setTemperature] = useState(0.75);
  const [maxTokens, setMaxTokens] = useState(100);
  const [baseModelsChecked, setBaseModelsChecked] = useState(0);
  const [finetunedModelsFields, setFinetunedModelsFields] = useState([]);
  const [finetuneData, setFinetuneData] = useState({});
  const [stripWhitespace, setStripWhitespace] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [popupText, setPopupText] = useState('');
  const [popupTextTitle, setPopupTextTitle] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState({});

  const handleTemplateButtonClick = (text, title) => {
    setIsOpen(true);
    setPopupText(text);
    setPopupTextTitle(title);
  };

  const handleTemplateClose = () => {
    setIsOpen(false);
    setPopupText('');
    setPopupTextTitle('');
  };

  const storeOutput = (id, text) => {
    setOutput({...output, [id]: text});
    setLoadingDict(loadingDict => ({...loadingDict, [id]: false}));
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
        axios.post("/api/infer/" + m.provider.toLowerCase(), {
            model: m,
            prompt: p,
            projectName: project,
            hyperParams: hyperParams,
            finetuneInputData: finetuneData,
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
    localStorage.setItem("checked", JSON.stringify(initialModelState));
    localStorage.setItem("temperature", JSON.stringify(0.75));
    localStorage.setItem("maxTokens", JSON.stringify(100));
    localStorage.setItem("baseModelsChecked", JSON.stringify(0));
    localStorage.setItem("finetuneData", JSON.stringify({}));
    localStorage.setItem("finetunedModelsFields", JSON.stringify([]));
    localStorage.setItem("stripWhitespace", JSON.stringify(true));
    localStorage.setItem("prompt", JSON.stringify(''));
    setOutput({});
    setChecked(initialModelState);
    setLoadingDict(initialModelState);
    setTemperature(0.75);
    setMaxTokens(100);
    setStripWhitespace(true);
    setPrompt('');
    setBaseModelsChecked(0);
    setFinetuneData({});
    setFinetunedModelsFields([]);
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
    setChecked(prevChecked => {
      const updatedChecked = { ...prevChecked, [id]: !prevChecked[id] };
      localStorage.setItem("checked", JSON.stringify(updatedChecked));
      return updatedChecked;
    });
  }

  const handlePaperClick = (event, m, baseOrFinetuned) => {
    event.stopPropagation();
    let id;
    if (baseOrFinetuned === "base") {
      id = m.completionName;
    } else if (baseOrFinetuned === "finetuned") {
      id = m._id;
    }
    if (!isCheckedById(id)) {  // This will become checked
      if (baseOrFinetuned === "finetuned") {
        const updatedFields = [...new Set([...finetunedModelsFields, ...m.templateId.fields])];
        setFinetunedModelsFields(updatedFields);
        localStorage.setItem("finetunedModelsFields", JSON.stringify(updatedFields));
      } else {
        localStorage.setItem("baseModelsChecked", JSON.stringify(baseModelsChecked + 1));
        setBaseModelsChecked(baseModelsChecked + 1);
      }
    } else {  // Will become unchecked
      if (baseOrFinetuned === "finetuned") {
        // We have to iterate through all the models and construct the set
        let array = [];
        for (let i=0; i<finetunedModels.length; i++) {
          let mFinetuned = finetunedModels[i];
          if (checked[mFinetuned._id] && m._id !== mFinetuned._id) {
            array = [...array, ...mFinetuned.templateId.fields];
          }
        }
        const updatedFields = [...new Set(array)];
        setFinetunedModelsFields(updatedFields);
        localStorage.setItem("finetunedModelsFields", JSON.stringify(updatedFields));
      } else {
        localStorage.setItem("baseModelsChecked", JSON.stringify(baseModelsChecked - 1));
        setBaseModelsChecked(baseModelsChecked - 1);
      }
    }
    toggleCheckedById(id);
  };

  const handleFieldChange = (field, value) => {
    setFinetuneData(prevData => {
      const updatedData = {
        ...prevData,
        [field]: value
      };
      localStorage.setItem('finetuneData', JSON.stringify(updatedData));
      return updatedData;
    });
  };

  const isCheckedById = (id) => {
    if (!(id in checked)) {
      let updatedChecked = Object.assign({}, checked);
      updatedChecked[id] = false;
      setChecked(updatedChecked);
    }
    return checked[id];
  }

  const refreshModels = () => {
    setLoading(true);
    let projectName = '';
    if (localStorage.getItem("project")) {
      projectName = localStorage.getItem("project");
      setProject(projectName);
    }
    axios.post("/api/models", {projectName: projectName}).then((res) => {
      if (res.data !== "No data found") {
        let data = res.data.filter(x => x.status === "succeeded");
        setFinetunedModels(data);
      }
      setLoading(false);
    }).catch((error) => {
      console.log(error);
    });
  }

  useEffect(() => {
    axios.get("/api/user",).then((res) => setUser(res.data)).catch((error) => console.log(error));
    refreshModels();
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
      refreshModels();
      clear();
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
    const stripWhitespaceLocal = JSON.parse(localStorage.getItem("stripWhitespace"));
    if (stripWhitespaceLocal !== null) setStripWhitespace(stripWhitespaceLocal);
    const baseModelsCheckedLocal = JSON.parse(localStorage.getItem("baseModelsChecked"));
    if (baseModelsCheckedLocal !== null) setBaseModelsChecked(baseModelsCheckedLocal);
    const finetuneDataLocal = JSON.parse(localStorage.getItem("finetuneData"));
    if (finetuneDataLocal !== null) setFinetuneData(finetuneDataLocal);
    const finetunedModelsFieldsLocal = JSON.parse(localStorage.getItem("finetunedModelsFields"));
    if (finetunedModelsFieldsLocal !== null) setFinetunedModelsFields(finetunedModelsFieldsLocal);
    console.log(finetunedModelsFieldsLocal);
  }, []);

  if (loading) {
    return (
      <div className='main'>
        <div className='horizontal-box full-width'>
          <Typography variant='h4' className='page-main-header'>
            Playground
          </Typography>
        </div>
        <div className='vertical-box' style={{height:500}}><CircularProgress /></div>
      </div>
    );
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
          {baseModelsChecked ?
            <>
              <Typography variant='h6'>
                Base model prompt
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
              <div className='small-space' />
            </> : null}
          {finetunedModelsFields.length > 0 &&
            <>
            <Typography variant="h6">Finetuned prompt inputs</Typography>
            </>}
          {finetunedModelsFields.map((f) => (
            <div key={f}>
              <div className='tiny-space' />
              <div className="horizontal-box flex-start">
                <Typography>{f}:&nbsp;&nbsp;</Typography>
                <TextField
                  size='small'
                  sx={{width: '100%'}}
                  className='white'
                  label=""
                  value={finetuneData[f] || ''}
                  onChange={e => handleFieldChange(f, e.target.value)}
                />
              </div>
            </div>
          ))}

          {baseModelsChecked || finetunedModelsFields.length ?
            <>
              <div className='small-space' />
              <div className='horizontal-box full-width flex-start'>
                <Button color='secondary' variant='contained' onClick={clear}>Reset</Button>
                <Button className='button-margin' variant='contained' color="success" onClick={submit}>Submit</Button>
              </div>
              <div className='tiny-space' />
            </>
            :
            <Box className='vertical-box' sx={{height: 500}}>
              <Typography sx={{color:'grey',marginTop:4}} className="horizontal-box">
                <ImWarning size={20}/>&nbsp;&nbsp; Check a model on the right to get started.
              </Typography>
            </Box>
          }

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
                      <Tooltip title="Copy output">
                        <IconButton className='horizontal-box copy' onClick={() => copyText(output[m.completionName])}>
                          <BiCopy size={20} />
                        </IconButton>
                      </Tooltip>
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
                      <Tooltip title="Show template">
                        <IconButton className='copy' onClick={() => handleTemplateButtonClick(m.templateId.templateString, m.name)}>
                          <BiDetail size={20} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copy output">
                        <IconButton className='horizontal-box copy' onClick={() => copyText(output[m._id])}>
                          <BiCopy size={20} />
                        </IconButton>
                      </Tooltip>
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
            <Modal open={isOpen} onClose={handleTemplateClose} closeAfterTransition BackdropComponent={Backdrop}>
              <div className="modal">
                <Paper className="popup">
                  <IconButton className="closeButton copy" onClick={handleTemplateClose}>
                    <AiOutlineCloseCircle size={20} />
                  </IconButton>
                  <div className="content">
                    <Typography sx={{fontWeight: 'bold', marginBottom: 2}}>
                      <i>{popupTextTitle}</i>&nbsp;&nbsp;template
                    </Typography>
                    <Typography>
                      {popupText.split('\n').map((line, index) => {
                        if (line === '') {
                          return <br key={index} />;
                        } else {
                          return <p key={index}>{line}</p>;
                        }
                      })}
                    </Typography>
                  </div>
                </Paper>
              </div>
            </Modal>
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

          <Typography>Add models</Typography>
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

          {provider === "Finetuned" && finetunedModels.length > 0 ?
            finetunedModels.map((m) => (
              <Paper
                variant='outlined'
                className='card horizontal-box model-select-box'
                onClick={(event) => handlePaperClick(event, m, "finetuned")}
                key={m._id}
              >
                <Checkbox checked={isCheckedById(m._id)} />
                <Typography>
                  {m.name}
                </Typography>
              </Paper>
            ))
            : provider === "Finetuned" ?
              <Link href="/models">
                <Typography sx={{color:'grey',marginTop:4}} className="horizontal-box">
                  <ImWarning size={20}/>&nbsp;&nbsp; Finetune a model
                </Typography>
              </Link>
            : provider === "cohere" && !user.cohereKey ?
              <Link href="/settings">
                <Typography sx={{color:'grey',marginTop:4}} className="horizontal-box">
                  <ImWarning size={20}/>&nbsp;&nbsp; Upload Cohere API key
                </Typography>
              </Link>
            : provider === "openai" && !user.openAiKey ?
              <Link href="/settings">
                <Typography sx={{color:'grey',marginTop:4}} className="horizontal-box">
                  <ImWarning size={20}/>&nbsp;&nbsp; Upload OpenAI API key
                </Typography>
              </Link>
            : baseModels[provider] ?
              baseModels[provider].map((m) => (
                <Paper
                  variant='outlined'
                  className='card horizontal-box model-select-box'
                  onClick={(event) => handlePaperClick(event, m, "base")}
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
