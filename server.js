
// Backend (app.js)
const express = require('express');
const cors = require('cors');
const textToSpeech = require('@google-cloud/text-to-speech');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

app.post('/api/generate-audio', async (req, res) => {
  try {
    const { ssmlText } = req.body;

    if (!ssmlText) {
      return res.status(400).json({ error: 'SSML text is required' });
    }

    // Validate SSML structure
    if (!ssmlText.trim().startsWith('<speak>') || !ssmlText.trim().endsWith('</speak>')) {
      return res.status(400).json({ error: 'Invalid SSML format' });
    }

    const request = {
      input: { ssml: ssmlText },
      voice: {
        languageCode: 'en-IN',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        pitch: 0,
        speakingRate: 1.0,
        volumeGainDb: 0,
        effectsProfileId: ['headphone-class-device'],
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    const audioContent = response.audioContent.toString('base64');
    
    res.json({
      success: true,
      audioContent: audioContent
    });

  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate audio',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

