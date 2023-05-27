
export function timestampToDateTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function timestampToDateTimeShort(timestamp) {
  const date = new Date(timestamp);
  const year = String(date.getFullYear()).substring(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${month}/${day}/${year}`;
}

export function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export const calculateColor = (inputValue) => {
  const red = Math.round((1 - inputValue) * 255);
  const green = Math.round(inputValue * 255);
  const blue = Math.min(120, Math.round(inputValue * 255));
  return `rgb(${red}, ${green}, ${blue})`;
};

export const formatTextForTypography = (text) => {
  if (!text) return undefined;
  return text.split('\n').map((line, index) => {
    if (line === '') {
      return <br key={index} />;
    } else {
      return <p key={index}>{line}</p>;
    }
  });
};

export const metricFormat = (metric) => {
  if (metric === 'f1') return 'F1';
  if (metric === 'auroc') return 'AUROC';
  if (metric === 'auprc') return 'AUPRC';
  if (metric === 'bleu') return 'BLEU';
  if (metric === 'rougel') return 'RougeL';
  if (metric === 'mauve') return 'MAUVE';
  return toTitleCase(metric);
}

export const baseModelNamesDict = {
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

export const classificationMetrics = ['accuracy', 'precision', 'recall', 'f1'];
export const generationMetrics = ['bleu', 'rougel', 'mauve'];

