const axios = require('axios');

// Numeri generali dell'account: follower, numero di post
async function fetchAccountStats(account) {
  const { data } = await axios.get(`https://graph.facebook.com/v19.0/${account.external_id}`, {
    params: { fields: 'followers_count,media_count', access_token: account.access_token },
  });
  return {
    followers: data.followers_count,
    total_views: null, // Instagram non espone una "somma view totali" a livello di profilo
    total_posts: data.media_count,
  };
}

// Ultimi post/reel con le relative metriche (view, like, commenti)
async function fetchRecentMediaWithStats(account, limit = 25) {
  const { data: mediaList } = await axios.get(`https://graph.facebook.com/v19.0/${account.external_id}/media`, {
    params: {
      fields: 'id,caption,timestamp,media_type,like_count,comments_count',
      limit,
      access_token: account.access_token,
    },
  });

  const results = [];
  for (const item of mediaList.data) {
    let views = null;
    try {
      // Le insights (impressions/plays) sono disponibili solo per reel/video
      const { data: insights } = await axios.get(`https://graph.facebook.com/v19.0/${item.id}/insights`, {
        params: { metric: 'plays', access_token: account.access_token },
      });
      views = insights.data?.[0]?.values?.[0]?.value ?? null;
    } catch {
      // Post di tipo immagine: le insights "plays" non si applicano, si ignora l'errore
    }

    results.push({
      external_id: item.id,
      title: item.caption?.slice(0, 100) || '(senza didascalia)',
      published_at: item.timestamp,
      views,
      likes: item.like_count ?? 0,
      comments: item.comments_count ?? 0,
    });
  }
  return results;
}

module.exports = { fetchAccountStats, fetchRecentMediaWithStats };
