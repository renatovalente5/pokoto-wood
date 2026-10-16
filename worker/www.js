// O www.pokotowood.pt vai para pokotowood.pt (301, o mesmo caminho e a mesma pesquisa).
// Tudo o resto são os ficheiros do site (_site/), servidos pelo binding ASSETS, com a
// 404.html quando a morada não existe. É o único código do site: sem ele, o www
// mostrava o site inteiro numa segunda morada.
//
// OS VÍDEOS PRECISAM DE PEDIDOS POR INTERVALOS (os das fichas e o da oficina, em
// /assets/video/; acrescentado a 16 out 2026, como na Mimices). Os ficheiros estáticos de
// um Worker ignoram o cabeçalho Range: a um «bytes=0-1» respondem 200 com o ficheiro
// inteiro. O Safari do iPhone abre um vídeo exactamente com esse pedido, e a Apple manda os
// servidores de media responderem por intervalos; sem isso os vídeos podem não tocar no
// iPhone (fica a imagem de capa). Como no ithos (worker/intervalos.js): lê-se o ficheiro
// pelo ASSETS (com os cabeçalhos do _headers) e corta-se o intervalo pedido. Um só
// intervalo por pedido; vários, ou um mal escrito, recebem o ficheiro inteiro, que a norma
// permite (RFC 9110, 14.2).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.pokotowood.pt') {
      url.hostname = 'pokotowood.pt';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    const res = await env.ASSETS.fetch(request);
    if (!url.pathname.startsWith('/assets/video/') || res.status !== 200) return res;
    return porIntervalos(request, env, res);
  },
};

async function porIntervalos(request, env, res) {
  const metodo = request.method;
  if (metodo !== 'GET' && metodo !== 'HEAD') return res;
  const h = new Headers(res.headers);
  h.set('accept-ranges', 'bytes');
  const pedido = request.headers.get('range');
  const m = pedido ? /^bytes=(\d*)-(\d*)$/.exec(pedido.trim()) : null;
  if (!m || (m[1] === '' && m[2] === '')) return new Response(metodo === 'HEAD' ? null : res.body, { status: 200, headers: h });
  // Um HEAD não traz corpo para medir: pede-se o ficheiro.
  const cheio = metodo === 'HEAD' ? await env.ASSETS.fetch(new Request(request.url, { headers: request.headers })) : res;
  const corpo = await cheio.arrayBuffer();
  const total = corpo.byteLength;
  let ini; let fim;
  if (m[1] === '') { ini = Math.max(0, total - Number(m[2])); fim = total - 1; } else {
    ini = Number(m[1]);
    fim = m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1);
  }
  if (ini > fim || ini >= total) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${total}`, 'accept-ranges': 'bytes' } });
  h.set('content-range', `bytes ${ini}-${fim}/${total}`);
  h.set('content-length', String(fim - ini + 1));
  return new Response(metodo === 'HEAD' ? null : corpo.slice(ini, fim + 1), { status: 206, headers: h });
}
