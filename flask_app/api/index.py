import nltk
import numpy as np
import logging
import json
# import mauve

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

        print(classes)

        metric_results = {}
        if len(classes) == 2: # Binary classification
            accuracy = accuracy_score(references, completions)

            # Change all completions to be in the classes for recall, precision, and F1
            completions = [x if x == classes[0] else classes[1] for x in completions]
            recall = recall_score(references, completions, pos_label=classes[0], zero_division=0)
            precision = precision_score(references, completions, pos_label=classes[0], zero_division=0)
            f1 = f1_score(references, completions, pos_label=classes[0], zero_division=0)
            metric_results = {'accuracy': accuracy, 'f1': f1, 'recall': recall, 'precision': precision}
        else: # Multiclass classification
            accuracy = accuracy_score(references, completions)

            # We will have a "misc" class that represents any completion that is not in one of the
            # input classes. This will make doing F1 and confusion matrix make more sense.
            misc_class_name = "NULL"
            if misc_class_name in classes: pass # Edge case

            # Note: we assume that the references are well formed (ie in the classes)
            is_misc_class = False
            for i in range(len(completions)):
                if completions[i] not in classes:
                    completions[i] = misc_class_name
                    is_misc_class = True

            weighted_f1 = f1_score(references, completions, zero_division=0, average='weighted')
            if is_misc_class:
                cm_classes = classes + [misc_class_name]
            else:
                cm_classes = classes
            cm = confusion_matrix(references, completions, labels=cm_classes).tolist()

            metric_results = {'accuracy': accuracy, 'weighted f1': weighted_f1, 'confusion': cm}

        app.logger.info("Found metrics: " + json.dumps(metric_results))
        return jsonify({"metric_results": metric_results})
    except Exception as e:
        print(e);
        app.logger.error(e)
        return jsonify({"error": str(e)})


if __name__ == "__main__":
    print(nlp_metrics(test=True))

