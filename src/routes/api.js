const express = require('express');
const { pool } = require('../db/db');

const router = express.Router();

router.get('/accounts', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id, a.platform, a.display_name,
        latest.followers, latest.total_views, latest.total_posts, latest.snapshot_date,
        first.followers AS followers_start
      FROM accounts a
      JOIN LATERAL (
        SELECT * FROM account_snapshots WHERE account_id = a.id ORDER BY snapshot_date DESC LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT * FROM account_snapshots WHERE account_id = a.id ORDER BY snapshot_date ASC LIMIT 1
      ) first ON true
      ORDER BY a.platform;
    `);
    res.json(rows);
  } catch (err) {
    console.error('Errore /api/accounts:', err.message);
    res.status(500).json({ error: 'Errore nel leggere gli account' });
  }
});

router.get('/accounts/:id/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT snapshot_date, followers, total_views
       FROM account_snapshots
       WHERE account_id = $1
       ORDER BY snapshot_date ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Errore /api/accounts/:id/history:', err.message);
    res.status(500).json({ error: 'Errore nel leggere lo storico' });
  }
});

router.get('/accounts/:id/videos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ci.id, ci.title, ci.published_at, cs.views, cs.likes, cs.comments, cs.shares, cs.snapshot_date
       FROM content_items ci
       JOIN LATERAL (
         SELECT * FROM content_snapshots WHERE content_item_id = ci.id ORDER BY snapshot_date DESC LIMIT 1
       ) cs ON true
       WHERE ci.account_id = $1
       ORDER BY cs.views DESC NULLS LAST
       LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Errore /api/accounts/:id/videos:', err.message);
    res.status(500).json({ error: 'Errore nel leggere i contenuti' });
  }
});

router.get('/history-all', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.platform, a.display_name, s.snapshot_date, s.followers
      FROM account_snapshots s
      JOIN accounts a ON a.id = s.account_id
      ORDER BY s.snapshot_date ASC;
    `);
    res.json(rows);
  } catch (err) {
    console.error('Errore /api/history-all:', err.message);
    res.status(500).json({ error: 'Errore nel leggere lo storico complessivo' });
  }
});

router.get('/videos/top', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.platform, a.display_name AS account_name,
        ci.title, ci.published_at,
        cs.views, cs.likes, cs.comments, cs.shares,
        CASE WHEN cs.views > 0
          THEN ROUND((COALESCE(cs.likes,0) + COALESCE(cs.comments,0))::numeric / cs.views * 100, 2)
          ELSE NULL
        END AS engagement_rate
      FROM content_items ci
      JOIN accounts a ON a.id = ci.account_id
      JOIN LATERAL (
        SELECT * FROM content_snapshots WHERE content_item_id = ci.id ORDER BY snapshot_date DESC LIMIT 1
      ) cs ON true
      ORDER BY cs.views DESC NULLS LAST
      LIMIT 10;
    `);
    res.json(rows);
  } catch (err) {
    console.error('Errore /api/videos/top:', err.message);
    res.status(500).json({ error: 'Errore nel leggere i contenuti migliori' });
  }
});

router.get('/engagement', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.platform,
        ROUND(AVG(
          CASE WHEN cs.views > 0
            THEN (COALESCE(cs.likes,0) + COALESCE(cs.comments,0))::numeric / cs.views * 100
            ELSE NULL
          END
        ), 2) AS avg_engagement_rate
      FROM content_items ci
      JOIN accounts a ON a.id = ci.account_id
      JOIN LATERAL (
        SELECT * FROM content_snapshots WHERE content_item_id = ci.id ORDER BY snapshot_date DESC LIMIT 1
      ) cs ON true
      GROUP BY a.platform;
    `);
    res.json(rows);
  } catch (err) {
    console.error('Errore /api/engagement:', err.message);
    res.status(500).json({ error: 'Errore nel leggere engagement' });
  }
});

module.exports = router;
