// backend/src/index.ts
import express from 'express';
import OpenAI from 'openai';
import { Request, Response } from 'express';
import path from 'path';
import axios from 'axios';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import { config } from 'dotenv';
config();
config({ path: path.resolve(__dirname, './.env') });


const app = express();
const port = 3000;
const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend/public directory
app.use(express.static(path.join(__dirname, '../../frontend/public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

app.post('/chat', async (req: Request, res: Response) => {
  const { conversation } = req.body;
  const userMessage = req.body.prompt;
  conversation.push({ role: "user", content: userMessage });
  try {
      const response = await openai.chat.completions.create({
          model: "gpt-4-turbo-2024-04-09",
          messages: conversation
      });
      conversation.push({ role: "assistant", content: response.choices[0].message.content });
      res.json({ reply: response.choices[0].message.content, conversation });
  } catch (error: any) {
      res.status(500).json({ error: error.message });
  }
});

app.post('/chat_stream', async (req: Request, res: Response) => {
  const { conversation } = req.body;
  const userMessage = req.body.prompt;
  conversation.push({ role: "user", content: userMessage });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await openai.chat.completions.create({
      model: "gpt-4o-2024-05-13",
      messages: conversation,
      stream: true,
  });

  try {
      for await (const chunk of stream) {
          if (chunk.choices[0]?.delta?.content) {
              res.write(`${chunk.choices[0].delta.content}\n\n`);
          }
      }
      res.end();
  } catch (error) {
      res.status(500).json({ error: "Stream was interrupted" });
  }
});


app.post('/audio', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', req.file.buffer, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      params: { model: 'whisper-1' }
    });

    const transcribed_text = response.data.text;

    // Simulate calling the chat function internally
    const chatResponse = await axios.post(`http://localhost:${port}/chat`, {
      conversation: [],
      prompt: transcribed_text
    });

    res.json(chatResponse.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route to serve GeoTIFF files
app.get('/geoTIFF/:filename', (req, res) => {
  const filename = req.params.filename;
  const options: {
    root: string;
    dotfiles: "deny" | "allow" | "ignore";  // Corrected type
    headers: {
      'x-timestamp': number;
      'x-sent': boolean;
    };
  } = {
    root: path.join(__dirname, '../../frontend/public/geotiff'),
    dotfiles: 'deny',  // Correct value
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  };
  //http://localhost:3000/geoTIFF/n19_w156_1arc_v3.tif

  res.sendFile(filename, options, (err) => {
    if (err) {
      console.log(err);
      res.status(500).end();
    }
  });
});



app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}/`);
});
