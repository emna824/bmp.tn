const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
    cors({
        origin: 'http://localhost:5173',
    })
);
app.use(express.json());

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

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
