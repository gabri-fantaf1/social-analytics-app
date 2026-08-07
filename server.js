require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const authRoutes = require('./routes/auth');
const { runDailySnapshot } = require('./jobs/dailySnapshot');

const app = express();

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send(
    'Social analytics app attiva. Vai su /auth/youtube/start per collegare un canale YouTube.'
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
});

// Ogni giorno alle 03:00 salva uno snapshot dei dati di tutti gli account collegati
cron.schedule('0 3 * * *', () => {
  console.log('Avvio snapshot giornaliero...');
  runDailySnapshot().catch((err) => console.error('Errore snapshot giornaliero:', err));
});
