// ai.js — Handles AI question generation

/**
 * Generates a quiz for a given topic
 * Returns a Promise resolving to an array of questions:
 *   [{ question: string, answers: [string, ...], correct: number }]
 *
 */
async function generateQuiz(topic) {
    // To change the key, base64-encode your Groq API key and replace the string below.
    const KEY = atob('Z3NrXzkydWl4cFRNTzJKQWVsS2ppZTY2V0dkeWIzRllzdmJvUlZhU2RTTmxCb09wb1BrYjI3aTk=');
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const model = 'llama-3.1-8b-instant';

  // Prompt instructs the AI to generate unbiased, original, multiple-choice quiz questions
  const prompt = `Generate a JSON array of 3 original, unbiased, multiple-choice quiz questions about the topic: "${topic}".\n\nEach question should be an object with:\n- question: the question text\n- answers: an array of 4 answer choices\n- correct: the index (0-3) of the correct answer\n\nExample:\n[\n  {\n    "question": "What is the capital of France?",\n    "answers": ["Berlin", "London", "Paris", "Rome"],\n    "correct": 2\n  },\n  ...\n]\n\nOnly output the JSON array, nothing else.`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates unbiased quiz questions.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error('Groq error body:', errBody);
      throw new Error('Groq API error: ' + res.status + ' — ' + errBody);
    }
    const data = await res.json();
    // Extract the JSON array from the AI's response
    const text = data.choices?.[0]?.message?.content || '';
    // Try to parse the JSON array from the response
    const match = text.match(/\[.*\]/s);
    if (!match) throw new Error('No JSON array found in AI response');
    const quiz = JSON.parse(match[0]);
    // Validate and sanitize output
    if (!Array.isArray(quiz)) throw new Error('Quiz is not an array');
    return quiz.filter(q =>
      typeof q.question === 'string' &&
      Array.isArray(q.answers) &&
      typeof q.correct === 'number' &&
      q.answers.length === 4 &&
      q.correct >= 0 && q.correct < 4
    );
  } catch (err) {
    console.error('AI quiz generation failed:', err);
    return [];
  }
}

// Attach to window for use in quiz.js
window.generateQuiz = generateQuiz;
