// O www.pokotowood.pt vai para pokotowood.pt (301, o mesmo caminho e a mesma pesquisa).
// Tudo o resto são os ficheiros do site (_site/), servidos pelo binding ASSETS, com a
// 404.html quando a morada não existe. É o único código do site: sem ele, o www
// mostrava o site inteiro numa segunda morada.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.pokotowood.pt') {
      url.hostname = 'pokotowood.pt';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
