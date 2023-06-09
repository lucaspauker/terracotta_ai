
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

export const getReturnText = (template, completionText) => {
  // Gets the text you should return after getting the completion.
  // Really just asserts that for classification projects the output is
  // in the correct classes. Also, applies the classMap transformation.
  if (template.classes) {
    if (template.classMap) {
      if (template.classMap.has(completionText)) {
        return template.classMap.get(completionText);
      } else {
        return "NOT IN CLASSES";
      }
    } else {
      if (template.classes.includes(completionText)) {
        return completionText;
      } else {
        return "NOT IN CLASSES";
      }
    }
  } else {
    return completionText;
  }
}
