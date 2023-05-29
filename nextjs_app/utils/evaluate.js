export function calculateClassificationMetrics(completions, json_output, metrics, positiveClass) {
  const total = completions.length;
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const metricResults = {};

  for (let i = 0; i < total; i++) {
    const prediction = completions[i];
    const actual = json_output[i].completion;
    if (actual === positiveClass) {
      if (prediction === positiveClass) {
        tp++;
      } else {
        fn++;
      }
    } else {
      if (prediction === positiveClass) {
        fp++;
      } else {
        tn++;
      }
    }
  }

  console.log(tp, fp, tn, fn);
  for (let i = 0; i < metrics.length; i++) {
    if (metrics[i] === "accuracy") {
      metricResults["accuracy"] = (tp + tn) / total;
    }
    if (metrics[i] === "precision") {
      if (tp + fp === 0) {
        metricResults["precision"] = 0;
      } else {
        metricResults["precision"] = tp / (tp + fp);
      }
    }
    if (metrics[i] === "recall") {
      metricResults["recall"] = tp / (tp + fn);
    }
    if (metrics[i] === "f1") {
      const precision = tp / (tp + fp);
      const recall = tp / (tp + fn);
      metricResults["f1"] = (2 * precision * recall) / (precision + recall);
    }
  }

  return metricResults;
}

