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

    // Split the SSML text into manageable segments
    const voiceSegments = ssmlText.match(/<voice name=".*?">[\s\S]*?<\/voice>/g);
    if (!voiceSegments || voiceSegments.length < 1) {
      return res.status(400).json({ error: 'SSML must contain at least one voice segment.' });
    }

    const audioContents = [];

    for (const segment of voiceSegments) {
      const voiceNameMatch = segment.match(/<voice name="(.*?)">/);
      if (!voiceNameMatch) {
        return res.status(400).json({ error: 'Voice name not found in segment.' });
      }
      const voiceName = voiceNameMatch[1];
      const segmentSSML = `<speak>${segment}</speak>`;

      const request = {
        input: { ssml: segmentSSML },
        voice: {
          languageCode: 'en-IN',
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          effectsProfileId: ['headphone-class-device'],
        },
      };

      // Generate audio for each segment
      const [response] = await client.synthesizeSpeech(request);
      audioContents.push(Buffer.from(response.audioContent, 'base64'));
    }

    // Concatenate all audio segments into a single audio file
    const concatenatedAudio = Buffer.concat(audioContents).toString('base64');

    res.json({
      success: true,
      audioContent: concatenatedAudio,
    });
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate audio',
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});









