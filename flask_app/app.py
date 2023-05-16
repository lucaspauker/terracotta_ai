import nltk
import numpy as np

from rouge_score import rouge_scorer
from flask import Flask, jsonify, request
app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/evaluate_nlp', methods=["POST"])
def nlp_metrics():
    test = False
    if test:
        completions = ["Tu as l'air bête.", 'Tout ce qui est inventé est vrai.', 'J’ai passé tout l’après-midi à bavarder avec des amis.', "Je ne sais pas si je l'ai encore.", "J'en ai marre de manger du fast-food."]
        reference = [{'prompt': 'You look stupid.', 'completion': "T'as l'air stupide.\n"}, {'prompt': 'All that which is invented, is true.', 'completion': 'Tout ce qui est inventé est vrai.\n'}, {'prompt': 'I spent the whole afternoon chatting with friends.', 'completion': 'J’ai passé tout l’après-midi à bavarder avec des amis.\n'}, {'prompt': "I don't know if I still have it.", 'completion': "Je ne sais pas si je l'ai encore.\n"}, {'prompt': "I'm tired of eating fast food.", 'completion': "J'en ai marre de manger du fast-food.\n"}]
    else:
        json_data = request.get_json()
        completions = json_data['completions']
        reference = json_data['reference']

    hypothesis_completions = [x.strip().split(' ') for x in completions]
    reference_completions = [[x['completion'].strip().split(' ')] for x in reference]
    bleu_score = nltk.translate.bleu_score.corpus_bleu(reference_completions, hypothesis_completions)

    scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
    rouge_scores = []
    for c, r in zip(completions, reference):
        scores = scorer.score(c.strip(), r['completion'].strip())
        rouge_scores.append(scores['rougeL'].fmeasure)
    rouge_score = np.mean(rouge_scores)

    metric_results = {'bleu': bleu_score, 'rougel': rouge_score}
    return jsonify({"metric_results": metric_results})

