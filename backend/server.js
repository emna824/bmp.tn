const path = require('path');
const dotenv = require('dotenv');
// Load env variables from backend/.env explicitly (works even if server started from repo root)
dotenv.config({ path: path.join(__dirname, '.env') });
console.log(`[config] GOOGLE_CLIENT_ID loaded: ${Boolean(process.env.GOOGLE_CLIENT_ID)}`);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const expertRoutes = require('./routes/expertRoutes');
const artisanRoutes = require('./routes/artisanRoutes');
const manufacturerRoutes = require('./routes/manufacturerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
    cors({
        origin: 'http://localhost:5173',
    })
);
const JSON_LIMIT = '15mb';
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

app.use('/api/users', userRoutes);
app.use('/api/experts', expertRoutes);
app.use('/api/assignments', artisanRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/notifications', notificationRoutes);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
