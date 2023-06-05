
export const templateTransform = (templateString, inputData) => {
  const regex = /{{.*}}/g;
  const matches = templateString.match(regex);

  let result = templateString;
  matches.forEach((match) => {
    const strippedMatch = match.substring(2, match.length - 2);
    if (strippedMatch in inputData) {
      result = result.replace(match, inputData[strippedMatch]);
    } else {
      result = result.replace(match, '');
    }
  });
  return result;
}

