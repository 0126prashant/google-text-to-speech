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
    let { ssmlText } = req.body;

    if (!ssmlText) {
      return res.status(400).json({ error: 'SSML text is required' });
    }

    // Fix common SSML errors
    ssmlText = ssmlText
      // Fix unclosed emphasis tags
      .replace(/<\/em>/g, '</emphasis>')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Ensure proper SSML structure
      .trim();

    // Validate SSML structure
    if (!ssmlText.startsWith('<speak>') || !ssmlText.endsWith('</speak>')) {
      return res.status(400).json({ error: 'Invalid SSML format' });
    }

    const request = {
      input: { ssml: ssmlText },
      voice: {
        languageCode: 'en-IN'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        effectsProfileId: ['headphone-class-device'],
        // Enable SSML prosody marks
        enableTimePointing: ['SSML_MARK']
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

