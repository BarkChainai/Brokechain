export async function onRequest(context) {
  const { env } = context;
  const nonce = crypto.randomUUID();
  // TTL 5 minutes
  await env.BROKECHAIN_SCORES.put(`nonce:${nonce}`, '1', { expirationTtl: 300 });
  return new Response(JSON.stringify({ nonce }), {
    headers: { 'content-type':'application/json', 'access-control-allow-origin':'*' }
  });
}
