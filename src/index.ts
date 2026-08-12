import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analytics.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'RAM SEO Backend is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 RAM SEO Backend running on http://localhost:${PORT}`);
});
