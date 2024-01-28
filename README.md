# Terracotta AI

## Introduction
Terracotta is a free tool designed for fine-tuning and evaluating LLMs. [Here](https://lucaspauker.com/articles/llms-unleashed-the-power-of-fine-tuning) is a blog post about why fine-tuning is important.

Here is what Terracotta can do:
- Training: Easily upload your dataset and fine-tune various OpenAI LLMs within minutes using our intuitive training dashboard. No more complex setup or coding—just focus on optimizing your models for your specific tasks.
- Qualitative Evaluation: Our playground allows you to compare prompting base models from OpenAI and Cohere against fine-tuned models, empowering you to assess the impact of your fine-tuning efforts and make informed decisions about model selection.
- Quantitative Evaluation: Experience our powerful evaluation tool that enables you to run inference on your dataset with any model in just a few clicks. Compare multiple models across different metrics relevant to your task, providing you with valuable insights and performance comparisons.

## Tutorial
[https://www.loom.com/share/da4ad333a5744f02852407997dfda181?sid=bc72296d-2a1e-4218-888a-9697c3870e74](https://www.loom.com/share/da4ad333a5744f02852407997dfda181?sid=bc72296d-2a1e-4218-888a-9697c3870e74)

## How to run code
There are two parts needed to run Terracotta: a React app and a Flask app. These are kept in separate folders

For the React app:
- Navigate to `nextjs_app` directory
- Do `npm install` to install all the dependencies
- Then, to run the frontend do `npm run dev`

For the Flask app:
- Navigate to the `flask_app` directory
- Do `pip -r requirements.txt` to install the dependencies
- To run the app, do `flask run`
