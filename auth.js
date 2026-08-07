const express = require('express');
const { google } = require('googleapis');
const { pool } = require('../db/db');

const router = express.Router();

function getYoutubeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.YT_CLIENT_ID,
    process.env.YT_CLIENT_SECRET,
    `${process.env.BASE_URL}/auth/youtube/callback`
  );
}

// Step 1: manda l'utente al consenso Google
router.get('/youtube/start', (req, res) => {
  const oauth2Client = getYoutubeOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // necessario per ottenere il refresh_token
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ],
  });
  res.redirect(url);
});

// Step 2: Google torna qui con un "code", lo scambiamo per i token
router.get('/youtube/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Codice mancante nella callback.');

  try {
    const oauth2Client = getYoutubeOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Recupero i dati base del canale collegato
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelRes = await youtube.channels.list({ part: 'snippet', mine: true });
    const channel = channelRes.data.items[0];

    await pool.query(
      `INSERT INTO accounts (platform, external_id, display_name, access_token, refresh_token, token_expires_at)
       VALUES ('youtube', $1, $2, $3, $4, to_timestamp($5 / 1000.0))
       ON CONFLICT (platform, external_id) DO UPDATE
       SET access_token = EXCLUDED.access_token,
           refresh_token = COALESCE(EXCLUDED.refresh_token, accounts.refresh_token),
           token_expires_at = EXCLUDED.token_expires_at`,
      [channel.id, channel.snippet.title, tokens.access_token, tokens.refresh_token, tokens.expiry_date]
    );

    res.send(`Canale YouTube "${channel.snippet.title}" collegato con successo. Puoi chiudere questa pagina.`);
  } catch (err) {
    console.error('Errore OAuth YouTube:', err);
    res.status(500).send('Errore durante il collegamento del canale.');
  }
});

// ================== INSTAGRAM ==================
// Richiede: account Instagram convertito in Business/Creator + collegato a una Pagina Facebook

router.get('/instagram/start', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.IG_APP_ID,
    redirect_uri: `${process.env.BASE_URL}/auth/instagram/callback`,
    scope: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement',
    response_type: 'code',
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
});

router.get('/instagram/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Codice mancante nella callback.');

  try {
    const axios = require('axios');

    // 1. Scambio il code per un access token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.IG_APP_ID,
        client_secret: process.env.IG_APP_SECRET,
        redirect_uri: `${process.env.BASE_URL}/auth/instagram/callback`,
        code,
      },
    });
    const accessToken = tokenRes.data.access_token;

    // 2. Trovo la Pagina Facebook collegata e il relativo account Instagram Business
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { access_token: accessToken },
    });
    const page = pagesRes.data.data[0];
    if (!page) throw new Error('Nessuna Pagina Facebook trovata su questo account.');

    const igRes = await axios.get(`https://graph.facebook.com/v19.0/${page.id}`, {
      params: { fields: 'instagram_business_account', access_token: accessToken },
    });
    const igAccountId = igRes.data.instagram_business_account?.id;
    if (!igAccountId) throw new Error('Nessun account Instagram Business collegato a questa Pagina.');

    const profileRes = await axios.get(`https://graph.facebook.com/v19.0/${igAccountId}`, {
      params: { fields: 'username', access_token: accessToken },
    });

    await pool.query(
      `INSERT INTO accounts (platform, external_id, display_name, access_token, refresh_token, token_expires_at)
       VALUES ('instagram', $1, $2, $3, NULL, NULL)
       ON CONFLICT (platform, external_id) DO UPDATE
       SET access_token = EXCLUDED.access_token`,
      [igAccountId, profileRes.data.username, accessToken]
    );

    res.send(`Account Instagram "@${profileRes.data.username}" collegato con successo. Puoi chiudere questa pagina.`);
  } catch (err) {
    console.error('Errore OAuth Instagram:', err.response?.data || err.message);
    res.status(500).send('Errore durante il collegamento dell\'account Instagram.');
  }
});

// ================== TIKTOK ==================
// In modalità sviluppo funziona subito con il tuo account; per uso su larga scala
// TikTok richiede una review dell'app (vedi README)

router.get('/tiktok/start', (req, res) => {
  const params = new URLSearchParams({
    client_key: process.env.TT_CLIENT_KEY,
    redirect_uri: `${process.env.BASE_URL}/auth/tiktok/callback`,
    scope: 'user.info.basic,user.info.stats,video.list',
    response_type: 'code',
    state: 'social-analytics-app',
  });
  res.redirect(`https://www.tiktok.com/v2/auth/authorize?${params.toString()}`);
});

router.get('/tiktok/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Codice mancante nella callback.');

  try {
    const axios = require('axios');

    const tokenRes = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: process.env.TT_CLIENT_KEY,
        client_secret: process.env.TT_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BASE_URL}/auth/tiktok/callback`,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token, open_id, expires_in } = tokenRes.data;

    const infoRes = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      headers: { Authorization: `Bearer ${access_token}` },
      params: { fields: 'display_name' },
    });
    const displayName = infoRes.data.data.user.display_name;

    await pool.query(
      `INSERT INTO accounts (platform, external_id, display_name, access_token, refresh_token, token_expires_at)
       VALUES ('tiktok', $1, $2, $3, $4, now() + ($5 || ' seconds')::interval)
       ON CONFLICT (platform, external_id) DO UPDATE
       SET access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token, token_expires_at = EXCLUDED.token_expires_at`,
      [open_id, displayName, access_token, refresh_token, expires_in]
    );

    res.send(`Account TikTok "${displayName}" collegato con successo. Puoi chiudere questa pagina.`);
  } catch (err) {
    console.error('Errore OAuth TikTok:', err.response?.data || err.message);
    res.status(500).send('Errore durante il collegamento dell\'account TikTok.');
  }
});

module.exports = router;
