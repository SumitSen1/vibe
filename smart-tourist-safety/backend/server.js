import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import zoneRoutes from './routes/zones.js';
import alertRoutes from './routes/alerts.js';

// Connect to Database
connectDB();

const app = express();

// ── Security Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://your-production-domain.com']
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

// ── General Middleware ─────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/alerts', alertRoutes);

// ── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🛡️ Smart Tourist Safety System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── 404 Handler ────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});