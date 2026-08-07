require('dotenv').config();
const { pool } = require('../db/db');
const youtube = require('../routes/youtube');
const instagram = require('../routes/instagram');
const tiktok = require('../routes/tiktok');

// Funzione generica: salva uno snapshot dell'account e dei suoi contenuti,
// qualunque sia la piattaforma (basta passargli le funzioni giuste)
async function snapshotAccount(account, { fetchAccountStats, fetchRecentContent }) {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Snapshot generale (follower, view totali dove disponibile)
  const stats = await fetchAccountStats(account);
  await pool.query(
    `INSERT INTO account_snapshots (account_id, snapshot_date, followers, total_views, total_posts)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (account_id, snapshot_date) DO UPDATE
     SET followers = EXCLUDED.followers, total_views = EXCLUDED.total_views, total_posts = EXCLUDED.total_posts`,
    [account.id, today, stats.followers, stats.total_views, stats.total_posts]
  );

  // 2. Snapshot dei singoli contenuti (per capire quali vanno meglio/peggio)
  const items = await fetchRecentContent(account);
  for (const item of items) {
    const { rows } = await pool.query(
      `INSERT INTO content_items (account_id, external_id, title, published_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (account_id, external_id) DO UPDATE SET title = EXCLUDED.title
       RETURNING id`,
      [account.id, item.external_id, item.title, item.published_at]
    );
    const contentItemId = rows[0].id;

    await pool.query(
      `INSERT INTO content_snapshots (content_item_id, snapshot_date, views, likes, comments, shares)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (content_item_id, snapshot_date) DO UPDATE
       SET views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments, shares = EXCLUDED.shares`,
      [contentItemId, today, item.views, item.likes, item.comments, item.shares ?? null]
    );
  }

  console.log(`Snapshot salvato per ${account.platform} "${account.display_name}"`);
}

const PLATFORM_ADAPTERS = {
  youtube: {
    fetchAccountStats: youtube.fetchChannelStats,
    fetchRecentContent: youtube.fetchRecentVideosWithStats,
  },
  instagram: {
    fetchAccountStats: instagram.fetchAccountStats,
    fetchRecentContent: instagram.fetchRecentMediaWithStats,
  },
  tiktok: {
    fetchAccountStats: tiktok.fetchAccountStats,
    fetchRecentContent: tiktok.fetchRecentVideosWithStats,
  },
};

async function runDailySnapshot() {
  const { rows: accounts } = await pool.query(`SELECT * FROM accounts`);

  for (const account of accounts) {
    const adapter = PLATFORM_ADAPTERS[account.platform];
    if (!adapter) continue;

    try {
      await snapshotAccount(account, adapter);
    } catch (err) {
      console.error(`Errore snapshot per account ${account.id} (${account.platform}):`, err.response?.data || err.message);
    }
  }
}

// Permette di lanciare il job manualmente con: npm run snapshot:now
if (require.main === module) {
  runDailySnapshot()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runDailySnapshot };
