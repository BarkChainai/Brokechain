export async function onRequest(context) {
  const { env } = context;
  const PERM_KEY = 'perm';
  // Check if permanent hall-of-fame exists
  let perm = await env.BROKECHAIN_SCORES.get(PERM_KEY);
  let lb = [];
  if (!perm) {
    // fallback to the current leaderboard top 3
    const raw = await env.BROKECHAIN_SCORES.get('leaderboard');
    if (raw) {
      try {
        lb = JSON.parse(raw);
      } catch {}
    }
    lb = lb.slice(0, 3);
  } else {
    try {
      lb = JSON.parse(perm) || [];
    } catch {
      lb = [];
    }
  }
  return new Response(JSON.stringify({ top: lb }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
  });
}
