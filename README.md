# Pokóto Wood — o site

Loja da **Pokóto Wood** (Sandro Hora e Célia Marques, Vila Nova de Famalicão): torres de
aprendizagem, peças Pikler e mobiliário Montessori em madeira, feitos à mão e personalizados.

**Não há pagamentos no site.** O carrinho junta os artigos, mostra os portes da zona escolhida
(levantamento grátis, Portugal Continental, Madeira e Açores, Espanha) e acaba no WhatsApp, com a
encomenda escrita numa mensagem. A encomenda fica feita quando a Pokóto a confirma por lá.

- Pré-visualização: https://renatovalente5.github.io/pokoto-wood/ (fechada aos motores de busca)
- Referência de desenho escolhida pela cliente: https://atoca.pt/
- Plano, decisões e perguntas em aberto: [`docs/PLANO.md`](docs/PLANO.md)

## Como se constrói

Node 22 e Python 3 com Pillow. Sem dependências npm.

```bash
node scripts/build.mjs                        # local → _site/ (servir em http://localhost:4810)
python3 -m http.server 4810 --directory _site
node scripts/build.mjs --base=/pokoto-wood     # a pré-visualização do GitHub Pages
node scripts/build.mjs --producao              # o domínio final (recusa dados legais por preencher)
```

O GitHub Actions (`.github/workflows/publicar.yml`) constrói e publica a cada push e todos os
dias à meia-noite de Lisboa (as promoções e o aviso do topo têm data de fim).

## Onde está cada coisa

| | |
|---|---|
| `content/site.json` | marca, contactos, dados legais, aviso do topo, zonas de entrega, prazos, pagamento |
| `content/produtos/*.json` | um ficheiro por artigo (o nome do ficheiro é o endereço) |
| `content/categorias.json` | as quatro categorias |
| `content/inicio.json` | os textos e as fotografias da página inicial |
| `content/paginas/*.md` | páginas de texto (sobre nós, personalização, legais…), com marcadores `{{…}}` |
| `content/fotos.json` | texto alternativo e ponto de foco de cada fotografia |
| `media/fotos/` | as fotografias que o site usa (as versões web faz o `scripts/imagens.py`) |
| `media/video/` | vídeos (MP4 sem som) e a imagem de capa de cada um |
| `media/legal/` | o aviso oficial da garantia da Comissão Europeia — **não se edita** |
| `src/` | modelos das páginas, CSS, JavaScript (carrinho incluído) e letras |
| `scripts/preparar-fotos.py` | só num Mac: tira o fundo às fotografias de produto (Vision) e corta as colagens |

O material do cliente (conversa do WhatsApp, fotografias originais, áudios) está em `_cliente/`,
fora do git.

## Regras que o gerador faz cumprir

- Os dados legais (identificação, NIF, morada, WhatsApp, prazos, pagamento) vêm só de
  `content/site.json`, por marcadores — nunca escritos à mão nas páginas. Em pré-visualização o que
  falta aparece marcado «[por confirmar: …]»; em produção a construção pára.
- Sem alegações ambientais genéricas («ecológico», «sustentável»…) nem certificações que não
  temos (CE, EN 71, FSC): a construção pára (Diretiva (UE) 2024/825).
- Toda a ligação interna, imagem e cartão de partilha tem de existir; nenhuma página sai com
  `undefined`, `NaN` ou `{{`.
- O preço de uma promoção acaba sozinho na data de fim (no site e no carrinho, com a mesma regra).
