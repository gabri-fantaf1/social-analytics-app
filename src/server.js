require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { runDailySnapshot } = require('./jobs/dailySnapshot');

const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.redirect('/dashboard.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
});

cron.schedule('0 3 * * *', () => {
  console.log('Avvio snapshot giornaliero...');
  runDailySnapshot().catch((err) => console.error('Errore snapshot giornaliero:', err));
});
