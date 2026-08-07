const axios = require('axios');

// Numeri generali dell'account: follower, numero video
async function fetchAccountStats(account) {
  const { data } = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
    headers: { Authorization: `Bearer ${account.access_token}` },
    params: { fields: 'follower_count,video_count,likes_count' },
  });
  const user = data.data.user;
  return {
    followers: user.follower_count,
    total_views: null, // non esposto a livello aggregato dalla Display API
    total_posts: user.video_count,
  };
}

// Ultimi video con le relative metriche (view, like, commenti, condivisioni)
async function fetchRecentVideosWithStats(account, maxCount = 20) {
  const { data } = await axios.post(
    'https://open.tiktokapis.com/v2/video/list/',
    { max_count: maxCount },
    {
      headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json' },
      params: { fields: 'id,title,create_time,view_count,like_count,comment_count,share_count' },
    }
  );

  return data.data.videos.map((v) => ({
    external_id: v.id,
    title: v.title || '(senza titolo)',
    published_at: new Date(v.create_time * 1000).toISOString(),
    views: v.view_count,
    likes: v.like_count,
    comments: v.comment_count,
    shares: v.share_count,
  }));
}

module.exports = { fetchAccountStats, fetchRecentVideosWithStats };
