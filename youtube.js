const { google } = require('googleapis');

function buildAuthedClient(accessToken, refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YT_CLIENT_ID,
    process.env.YT_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return oauth2Client;
}

// Numeri generali del canale: iscritti, view totali, numero video
async function fetchChannelStats(account) {
  const auth = buildAuthedClient(account.access_token, account.refresh_token);
  const youtube = google.youtube({ version: 'v3', auth });

  const { data } = await youtube.channels.list({ part: 'statistics', id: account.external_id });
  const stats = data.items[0].statistics;

  return {
    followers: Number(stats.subscriberCount),
    total_views: Number(stats.viewCount),
    total_posts: Number(stats.videoCount),
  };
}

// Ultimi video pubblicati con le relative statistiche (views, like, commenti)
async function fetchRecentVideosWithStats(account, maxResults = 25) {
  const auth = buildAuthedClient(account.access_token, account.refresh_token);
  const youtube = google.youtube({ version: 'v3', auth });

  const searchRes = await youtube.search.list({
    part: 'id,snippet',
    channelId: account.external_id,
    order: 'date',
    maxResults,
    type: 'video',
  });

  const videoIds = searchRes.data.items.map((item) => item.id.videoId).join(',');
  if (!videoIds) return [];

  const statsRes = await youtube.videos.list({ part: 'statistics,snippet', id: videoIds });

  return statsRes.data.items.map((v) => ({
    external_id: v.id,
    title: v.snippet.title,
    published_at: v.snippet.publishedAt,
    views: Number(v.statistics.viewCount || 0),
    likes: Number(v.statistics.likeCount || 0),
    comments: Number(v.statistics.commentCount || 0),
  }));
}

module.exports = { fetchChannelStats, fetchRecentVideosWithStats };
