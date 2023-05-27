
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

