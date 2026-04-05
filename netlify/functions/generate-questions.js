// netlify/functions/generate-questions.js
// Calls Claude API to generate personalized interview questions

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

exports.handler = async function(event) {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured' }),
    };
  }

  let input;
  try {
    input = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  const { name, relationship, background, topics, avoid } = input;

  if (!name || !background) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Name and background are required' }),
    };
  }

  const prompt = `You are a world-class interview question designer for ForeverSaid, a family storytelling podcast preservation service. Your job is to create deeply personal, thoughtful interview questions that draw out meaningful life stories.

A customer has provided the following information about their storyteller:

NAME: ${name}
RELATIONSHIP TO CUSTOMER: ${relationship || 'Not specified'}
BACKGROUND: ${background}
IMPORTANT TOPICS/STORIES: ${topics || 'Not specified'}
TOPICS TO AVOID: ${avoid || 'None specified'}

Based on this information, create a personalized set of interview questions organized into 5 themed episodes. Each episode should have 6-8 questions.

CRITICAL RULES:
1. Questions must be deeply personal and specific to this storyteller — reference their actual background, career, relationships, and experiences mentioned above.
2. Do NOT use generic questions like "What is your earliest memory?" unless you tie it to something specific about their life.
3. Weave in the specific topics and stories the customer mentioned as important.
4. Respect any topics they asked you to avoid — do not include questions that touch on those areas.
5. Questions should be conversational and warm — the kind of thing a loving family member would ask over a long dinner, not a journalist conducting an interview.
6. Include a mix of factual questions (what happened), emotional questions (how did that feel), and wisdom questions (what did you learn).
7. Each episode should have a natural arc — start easy and warm, go deeper in the middle, and end with something reflective or forward-looking.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (plain text, no markdown):

EPISODE 1 — [THEME TITLE]

1. [Question]
2. [Question]
3. [Question]
4. [Question]
5. [Question]
6. [Question]
7. [Question]

EPISODE 2 — [THEME TITLE]

1. [Question]
2. [Question]
...and so on for all 5 episodes.

End with:

BONUS QUESTIONS

1. [2-3 bonus questions that don't fit neatly into a theme but are too good to skip]

Do not include any preamble, explanation, or commentary. Start directly with EPISODE 1.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Claude API error:', response.status, errorBody);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to generate questions. Please try again.' }),
      };
    }

    const data = await response.json();
    const questions = data.content[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ questions }),
    };
  } catch (err) {
    console.error('Error calling Claude API:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An error occurred. Please try again.' }),
    };
  }
};
