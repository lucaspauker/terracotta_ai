
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

export const templateTransform = (templateString, finetuneInputData) => {
  const regex = /{{.*}}/g;
  const matches = templateString.match(regex);

  let result = templateString;
  matches.forEach((match) => {
    const strippedMatch = match.substring(2, match.length - 2);
    if (strippedMatch in finetuneInputData) {
      result = result.replace(match, finetuneInputData[strippedMatch]);
    } else {
      result = result.replace(match, '');
    }
  });
  return result;
}

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

