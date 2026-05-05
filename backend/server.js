
const client=require("prom-client")
const path = require('path');
const dotenv = require('dotenv');
// Load env variables from backend/.env explicitly (works even if server started from repo root)
dotenv.config({ path: path.join(__dirname, '.env') });
if (process.env.NODE_ENV !== 'production') {
    console.log(`[config] GOOGLE_CLIENT_ID loaded: ${Boolean(process.env.GOOGLE_CLIENT_ID)}`);
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const expertRoutes = require('./routes/expertRoutes');
const artisanRoutes = require('./routes/artisanRoutes');
const manufacturerRoutes = require('./routes/manufacturerRoutes');
const productRoutes = require('./routes/productRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const projectRoutes = require('./routes/projectRoutes');
const offerRoutes = require('./routes/offerRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const workLogRoutes = require('./routes/workLogRoutes');
const taskClassifierRoutes = require('./routes/taskClassifierRoutes');
const aiRoutes = require('./routes/aiRoutes');
const faceRoutes = require('./routes/faceRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({ register });

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Enhanced metrics endpoint with application-level details
app.get("/api/metrics", async (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
    },
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      external: Math.round(memoryUsage.external / 1024 / 1024) + " MB",
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB"
    },
    database: {
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      readyState: mongoose.connection.readyState
    },
    process: {
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    }
  });
});

const PORT = process.env.PORT || 5000;

// Allow multiple origins (dev previews, localhost, deployed frontends)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173').split(',').map((o) => o.trim());
app.use(
    cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error(`Not allowed by CORS: ${origin}`));
        },
    })
);
const JSON_LIMIT = '15mb';
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentRoutes.handleStripeWebhook);
app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_LIMIT }));

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
    res.send('Backend MERN fonctionne !');
});

app.get('/api/health', (req, res) => {
    res.json({ message: 'API OK \u2705' });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', userRoutes);
app.use('/api/experts', expertRoutes);
app.use('/api/assignments', artisanRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/worklog', workLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/task-classifier', taskClassifierRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
