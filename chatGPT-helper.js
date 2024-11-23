const axios = require('axios');

const askChatGPT = async (prompt) => {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/completions',
            {
                model: 'text-davinci-003',
                prompt,
                max_tokens: 150,
            },
            {
                headers: {
                    'Authorization': `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`,
                    'Content-Type': 'application/json',
                },t
            }
        );
        console.log(response.data.choices[0].text.trim());
    } catch (error) {
        console.error('Error querying ChatGPT:', error);
    }
};

