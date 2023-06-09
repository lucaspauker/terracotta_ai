
export function timestampToDateTime(timestamp) {
  const date = new Date(timestamp);
  const year = String(date.getFullYear()).substring(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = (hours % 12) || 12; // Convert to 12-hour format
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${month}/${day}/${year} at ${hours}:${minutes} ${ampm}`;
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
  const colors = [
      "#57bb8a", "#63b682", "#73b87e", "#84bb7b", "#94bd77",
      "#a4c073", "#b0be6e", "#c4c56d", "#d4c86a", "#e2c965",
      "#f5ce62", "#f3c563", "#e9b861", "#e6ad61", "#ecac67",
      "#e9a268", "#e79a69", "#e5926b", "#e2886c", "#e0816d",
      "#dd776e"
    ];

  const index = Math.round((1 - inputValue) * (colors.length - 1));
  return colors[index];
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

export const getPriceString = (price) => {
  if (price === null) {
    return "unavailable";
  } else if (price < 0.01) {
    return "<$0.01";
  } else {
    return "$" + price.toFixed(2);
  }
}

export const metricFormat = (metric) => {
  if (metric === 'f1') return 'F1';
  if (metric === 'auroc') return 'AUROC';
  if (metric === 'auprc') return 'AUPRC';
  if (metric === 'bleu') return 'BLEU';
  if (metric === 'rougel') return 'RougeL';
  if (metric === 'mauve') return 'MAUVE';
  if (metric === 'confusion') return 'Confusion Matrix';
  return toTitleCase(metric);
}

export const baseModelNamesDict = {
  'text-ada-001': 'GPT-3 Ada',
  'text-babbage-001': 'GPT-3 Babbage',
  'text-curie-001': 'GPT-3 Curie',
  'text-davinci-003': 'GPT-3 Davinci',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'generate-medium': 'Generate Medium',
  'generate-xlarge': 'Generate X-Large',
  //'classify-small': 'Classify Small',
  //'classify-large': 'Classify Large',
  //'classify-multilingual': 'Classify Multilingual',
}

export const classificationMetrics = ['accuracy', 'precision', 'recall', 'f1'];
export const multiclassClassificationMetrics = ['accuracy', 'weighted f1'];
export const generationMetrics = ['bleu', 'rougel'];

export function testElementsInList(A, B) {
  console.log(A,B);
  // Convert list B to a Set for efficient lookup
  const setB = new Set(B);

  // Check if each element in list A is in list B
  for (let i = 0; i < A.length; i++) {
    if (!setB.has(A[i])) {
      return false; // Element not found in list B
    }
  }

  return true; // All elements in list A are in list B
}

export const calculateMonochromeColor = (inputValue) => {
  const red = Math.round((1 - inputValue) * 255);
  const green = 255;
  const blue = Math.round((1 - inputValue) * 255);
  return `rgb(${red}, ${green}, ${blue})`;
};

export const joinWordsWithCommas = (wordList) => {
  if (wordList.length === 0) {
    return '';
  }

  let output = wordList[0];
  for (let i = 1; i < wordList.length; i++) {
    output += ', ' + wordList[i];
  }
  return output;
}


