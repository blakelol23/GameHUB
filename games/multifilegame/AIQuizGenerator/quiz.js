// quiz.js — Handles quiz flow and UI

import { generateQuiz } from './ai.js';

const setupSection = document.getElementById('setup-section');
const quizSection = document.getElementById('quiz-section');
const resultSection = document.getElementById('result-section');
const topicInput = document.getElementById('topic-input');
const generateBtn = document.getElementById('generate-btn');
const questionContainer = document.getElementById('question-container');
const answersContainer = document.getElementById('answers-container');
const nextBtn = document.getElementById('next-btn');
const feedback = document.getElementById('feedback');
const scoreDiv = document.getElementById('score');
const restartBtn = document.getElementById('restart-btn');

let quiz = [];
let current = 0;
let score = 0;

function showSection(section) {
  setupSection.hidden = section !== 'setup';
  quizSection.hidden = section !== 'quiz';
  resultSection.hidden = section !== 'result';
}

function startQuiz(quizData) {
  quiz = quizData;
  current = 0;
  score = 0;
  showSection('quiz');
  showQuestion();
}

function showQuestion() {
  const q = quiz[current];
  questionContainer.textContent = q.question;
  answersContainer.innerHTML = '';
  feedback.textContent = '';
  nextBtn.hidden = true;
  q.answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = ans;
    btn.onclick = () => selectAnswer(i);
    answersContainer.appendChild(btn);
  });
}

function selectAnswer(idx) {
  const q = quiz[current];
  const correct = q.correct;
  const btns = answersContainer.querySelectorAll('.answer-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add('selected');
  });
  if (idx === correct) {
    feedback.textContent = 'Correct!';
    score++;
  } else {
    feedback.textContent = `Incorrect. Correct answer: ${q.answers[correct]}`;
  }
  nextBtn.hidden = false;
}

function nextQuestion() {
  current++;
  if (current < quiz.length) {
    showQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  showSection('result');
  scoreDiv.textContent = `Score: ${score} / ${quiz.length}`;
}

generateBtn.onclick = async () => {
  const topic = topicInput.value.trim();
  if (!topic) return;
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';
  const quizData = await generateQuiz(topic);
  generateBtn.disabled = false;
  generateBtn.textContent = 'Generate Quiz';
  if (quizData && quizData.length) {
    startQuiz(quizData);
  } else {
    alert('Failed to generate quiz. Try another topic.');
  }
};

nextBtn.onclick = nextQuestion;
restartBtn.onclick = () => {
  showSection('setup');
  topicInput.value = '';
};

showSection('setup');
