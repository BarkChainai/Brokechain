const MAX_SCORE = 100000;
const RATE_LIMIT_WINDOW = 20; // seconds
const SCORE_KEY = 'leaderboard';
const PERM_KEY = 'hall';

export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = context.request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  try {
    const { handle, score, nonce } = await request.json();
    if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
      return bad('invalid score');
    }
    const cleanHandle = String(handle || '')
      .replace(/[^\w@.\-]/g, '')
      .slice(0, 24);
    if (!cleanHandle) {
      return bad('invalid handle');
    }
    // nonce check (single use)
    const nonceKey = `nonce:${nonce}`;
    const had = await env.BROKECHAIN_SCORES.get(nonceKey);
    if (!had) {
      return bad('invalid nonce');
    }
    await env.BROKECHAIN_SCORES.delete(nonceKey);
    // rate limit per IP
    const rlKey = `rl:${ip}`;
    const rl = await env.BROKECHAIN_SCORES.get(rlKey);
    if (rl) {
      return bad('too many submissions');
    }
    await env.BROKECHAIN_SCORES.put(rlKey, '1', { expirationTtl: RATE_LIMIT_WINDOW });
    // load leaderboard
    const raw = await env.BROKECHAIN_SCORES.get(SCORE_KEY);
    const now = Date.now();
    let lb = [];
    if (raw) {
      try {
        lb = JSON.parse(raw);
      } catch (e) {}
    }
    // update best score per handle
    const idx = lb.findIndex((e) => e.handle === cleanHandle);
    if (idx >= 0) {
      if (score > lb[idx].score) {
        lb[idx] = { handle: cleanHandle, score, ts: now };
      }
    } else {
      lb.push({ handle: cleanHandle, score, ts: now });
    }
    lb.sort((a, b) => b.score - a.score || a.ts - b.ts);
    lb = lb.slice(0, 50);
    await env.BROKECHAIN_SCORES.put(SCORE_KEY, JSON.stringify(lb));
    // permanent hall-of-fame
    let perm = await env.BROKECHAIN_SCORES.get(PERM_KEY);
    if (!perm) {
      const top3 = lb.slice(0, 3);
      await env.BROKECHAIN_SCORES.put(PERM_KEY, JSON.stringify(top3));
      perm = JSON.stringify(top3);
    }
    const top = JSON.parse(perm);
    return json({ ok: true, top });
  } catch (e) {
    return bad('bad request');
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}
function bad(msg) {
  return json({ ok: false, error: msg }, 400);
}
