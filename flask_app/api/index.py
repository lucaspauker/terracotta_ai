import nltk
import numpy as np
import logging
import json
import csv
from io import BytesIO
import boto3
import re
import cohere
# import mauve

from cohere.custom_model_dataset import InMemoryDataset  
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
from rouge_score import rouge_scorer
from flask import Flask, jsonify, request
app = Flask(__name__)

if __name__ != '__main__':
    gunicorn_logger = logging.getLogger('gunicorn.error')
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/evaluate_nlp', methods=["POST"])
def nlp_metrics(test=False):
    try:
        if test:
            completions = ["Tu as l'air bête.", 'Tout ce qui est inventé est vrai.', 'J’ai passé tout l’après-midi à bavarder avec des amis.', "Je ne sais pas si je l'ai encore.", "J'en ai marre de manger du fast-food."]
            reference = ["Tu as l'air bête.", 'Tout ce qui est inventé est vrai.', 'J’ai passé tout l’après-midi à bavarder avec des amis.', "Je ne sais pas si je l'ai encore.", "J'en ai marre de manger du fast-food."]
            metrics = ['bleu', 'rougel', 'mauve']
        else:
            json_data = request.get_json()
            completions = json_data['completions']
            reference = json_data['references']
            metrics = json_data['metrics']

        metric_results = {}

        # BLEU
        if 'bleu' in metrics:
            hypothesis_completions = [x.strip().split(' ') for x in completions]
            reference_completions = [[x.strip().split(' ')] for x in reference]
            bleu_score = nltk.translate.bleu_score.corpus_bleu(reference_completions, hypothesis_completions)
            metric_results['bleu'] = bleu_score

        # ROUGE-L
        if 'rougel' in metrics:
            scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
            rouge_scores = []
            for c, r in zip(completions, reference):
                scores = scorer.score(c.strip(), r.strip())
                rouge_scores.append(scores['rougeL'].fmeasure)
            rouge_score = np.mean(rouge_scores)
            metric_results['rougel'] = rouge_score

        # if 'mauve' in metrics:
        #     mauve_score = mauve.compute_mauve(p_text=completions, q_text=reference, verbose=False).mauve
        #     metric_results['mauve'] = mauve_score

        app.logger.info("Found metrics: " + json.dumps(metric_results))
        return jsonify({"metric_results": metric_results})
    except Exception as e:
        app.logger.error(e)
        return jsonify({"error": str(e)})

@app.route('/evaluate_classification', methods=["POST"])
def classification_metrics():
    try:
        json_data = request.get_json()
        completions = json_data['completions']
        references = json_data['references']
        classes = json_data['classes']

        completions_with_misc = []
        # We will have a "misc" class that represents any completion that is not in one of the
        # input classes. This will make doing F1 and confusion matrix make more sense.
        misc_class_name = "MISC"
        if misc_class_name in classes: pass # Edge case

        # Note: we assume that the references are well formed (ie in the classes)
        is_misc_class = False
        for i in range(len(completions)):
            if completions[i] not in classes:
                completions_with_misc.append(misc_class_name)
                is_misc_class = True
            else:
                completions_with_misc.append(completions[i])

        metric_results = {}
        if len(classes) == 2: # Binary classification
            accuracy = accuracy_score(references, completions)

            # Note: we assume that the references are well formed (ie in the classes)
            is_misc_class = False
            for i in range(len(completions)):
                if completions[i] not in classes:
                    completions[i] = classes[1]
                    is_misc_class = True

            recall = recall_score(references, completions, pos_label=classes[0], zero_division=0)
            precision = precision_score(references, completions, pos_label=classes[0], zero_division=0)
            f1 = f1_score(references, completions, pos_label=classes[0], zero_division=0)

            if is_misc_class: classes = classes + [misc_class_name]
            cm = confusion_matrix(references, completions_with_misc, labels=classes).tolist()
            if is_misc_class: cm = cm[:-1]

            # Get class distributions
            class_distribution = [{}, {}]  # [ for references, for completions ]
            for c in classes:
                class_distribution[0][c] = 0
                class_distribution[1][c] = 0
            for reference in references:
                class_distribution[0][reference] += 1
            for completion in completions_with_misc:
                class_distribution[1][completion] += 1

            metric_results = {'accuracy': accuracy, 'f1': f1, 'recall': recall,
                              'precision': precision, 'confusion': cm,
                              'class_distribution': class_distribution}
        else: # Multiclass classification

            if is_misc_class: classes = classes + [misc_class_name]

            accuracy = accuracy_score(references, completions)
            weighted_f1 = f1_score(references, completions_with_misc, zero_division=0, average='weighted')

            cm = confusion_matrix(references, completions_with_misc, labels=classes).tolist()
            if is_misc_class: cm = cm[:-1]

            # Get class distributions
            class_distribution = [{}, {}]  # [ for references, for completions ]
            for c in classes:
                class_distribution[0][c] = 0
                class_distribution[1][c] = 0
            for reference in references:
                class_distribution[0][reference] += 1
            for completion in completions_with_misc:
                class_distribution[1][completion] += 1

            metric_results = {'accuracy': accuracy, 'weighted f1': weighted_f1, 'confusion': cm,
                              'class_distribution': class_distribution}

        app.logger.info("Found metrics: " + json.dumps(metric_results))
        print(metric_results)
        return jsonify({"metric_results": metric_results})
    except Exception as e:
        app.logger.error(e)
        return jsonify({"error": str(e)})
    
@app.route('/finetune_cohere', methods=["POST"])
def finetune_cohere():
    try:
        json_data = request.get_json()
        template_string = json_data['templateString']
        stop_sequence = json_data["stopSequence"]
        output_column = json_data["outputColumn"]
        train_file_name = json_data["trainFileName"]
        val_file_name = json_data["valFileName"]
        project_type = json_data["projectType"]

        co = cohere.Client("zSrNtUZMj86mjTZtv4K6R3Su7S08WfE6aOdVWP4K")
        
        regex = r"{{.*?}}"
        matches = re.findall(regex, template_string)

        
        val_file_present = val_file_name and val_file_name is not None

        # Download files from S3
        s3 = boto3.client("s3")

        params = {"Bucket": 'canopy-ai-labs', "Key": "raw_data/" + train_file_name}
        s3_response = s3.get_object(**params)
        stream = s3_response["Body"]
        train_json = list(csv.DictReader(BytesIO(stream.read().decode())))

        val_json = []
        if val_file_present:
            params = {"Bucket": 'canopy-ai-labs', "Key": "raw_data/" + val_file_name}
            s3_response = s3.get_object(**params)
            stream = s3_response["Body"]
            val_json = list(csv.DictReader(BytesIO(stream.read().decode())))

        classes = []

        def template_transform(row):
            global classes
            if project_type == "classification":
                classes.append(row[output_column])
            prompt = template_string
            for match in matches:
                prompt = prompt.replace(match, row[match[2:-2]])
            return {"prompt": prompt, "completion": row[output_column] + stop_sequence}

        train_data = [template_transform(row) for row in train_json]

        val_data = []
        if val_file_present:
            val_data = [template_transform(row) for row in val_json]

        # Get unique classes
        classes = list(set(classes))

        # Create map of classes to ids
        class_map = {}
        reverse_class_map = {}
        for i, c in enumerate(classes):
            tok = " " + str(i)
            class_map[tok] = c
            reverse_class_map[c] = tok

        # Go through trainData and replace completions with classMapped strings
        if len(classes) > 0:
            train_data = [{"prompt":row["prompt"], "completion": reverse_class_map[row["completion"][:-len(stop_sequence)]] + stop_sequence} for row in train_data]
            if val_file_present:
                val_data = [{"prompt":row["prompt"], "completion": reverse_class_map[row["completion"][:-len(stop_sequence)]] + stop_sequence} for row in val_data]

        finetune_dataset = InMemoryDataset(training_data = [(row["prompt"],row["completion"]) for row in train_data],
                                     eval_data= [(row["prompt"],row["completion"]) for row in val_data] if val_file_present else None)
        
        finetune = co.create_custom_model("prompt-completion-ft", dataset=finetune_dataset, model_type="GENERATIVE" if project_type == "generative" else "CLASSIFY")

        return jsonify({"finetuneInfo": finetune})
        
    except Exception as e:
        app.logger.error(e)
        return jsonify({"error": str(e)})


if __name__ == "__main__":
    print(nlp_metrics(test=True))

