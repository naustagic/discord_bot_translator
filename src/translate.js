const axios = require('axios');

async function translateText(text, targetLanguage) {
    try {
        const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
            params: {
                client: 'gtx',
                sl: 'auto',
                tl: targetLanguage,
                dt: 't',
                q: text
            }
        });

        const translatedText = response.data[0][0][0];
        return translatedText;
    } catch (error) {
        console.error('Error translating text:', error);
        return 'Error translating text';
    }
}

module.exports = translateText;
