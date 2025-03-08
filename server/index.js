// server/index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const port = 5000;

app.post('/api/chat', async (req, res) => {
  const message = req.body.message;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4', // or 'gpt-3.5-turbo'
        messages: [{ role: 'user', content: message }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error communicating with OpenAI API:', error.message);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});