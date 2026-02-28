const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Configurer les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connecté avec succès !'))
    .catch((err) => console.error('❌ Erreur MongoDB :', err));

// Route test
app.get('/', (req, res) => {
    res.send('Backend MERN fonctionne ! 🚀');
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
// Après les middlewares
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);