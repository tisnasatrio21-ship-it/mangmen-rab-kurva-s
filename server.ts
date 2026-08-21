import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleGeminiApi } from './src/server/apiRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// Handle Gemini API
app.post('/api/gemini/*', async (req, res) => {
  try {
    const result = await handleGeminiApi(req.originalUrl || req.url, req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Terjadi kesalahan saat memproses permintaan AI.',
    });
  }
});

// Serve frontend static build if available
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
