#!/usr/bin/env python3
"""Imagens do site: versões para a web, cartões de partilha e ícones.

Lê:
  media/fotos/*.jpg        as fotografias (cada uma tem de estar em content/fotos.json, com o
                           texto alternativo e o ponto de foco)
  media/video/*.jpg        a imagem de capa de cada vídeo
  media/marca/logo.png     o logótipo de cor, com transparência (recortado do ficheiro que a Pokóto mandou)
  content/produtos/*.json  para saber a primeira fotografia de cada artigo (o cartão de partilha)

Escreve em .cache/imagens/ (fica entre publicações; cada ficheiro leva no nome um resumo do
original, por isso só se refaz o que mudou) e um manifesto, .cache/imagens/manifesto.json, que o
scripts/build.mjs lê para escrever os <picture> e copia para _site/assets/img/.

    python3 scripts/imagens.py              # faz o que falta
    python3 scripts/imagens.py --verificar  # só confere que fotos.json e media/fotos batem certo
"""
import glob
import hashlib
import json
import os
import shutil
import sys

from PIL import Image, ImageOps, features

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FOTOS = os.path.join(RAIZ, 'media', 'fotos')
VIDEO = os.path.join(RAIZ, 'media', 'video')
MARCA = os.path.join(RAIZ, 'media', 'marca')
INDICE = os.path.join(RAIZ, 'content', 'fotos.json')
PRODUTOS = os.path.join(RAIZ, 'content', 'produtos')
CACHE = os.path.join(RAIZ, '.cache', 'imagens')

LARGURAS = [360, 540, 720, 960, 1280, 1600]
QUALIDADE_AVIF = 55
QUALIDADE_WEBP = 80
PARTILHA = (1200, 630)
CREME = (246, 238, 227)          # --creme: o mesmo fundo dos recortes
FORMATOS = ('avif', 'webp') if features.check('avif') else ('webp',)
VERSAO = f'v1-{LARGURAS}-{QUALIDADE_AVIF}-{QUALIDADE_WEBP}-{PARTILHA}'


def resumo(*caminhos, extra=''):
    h = hashlib.sha256((VERSAO + extra).encode())
    for c in caminhos:
        with open(c, 'rb') as f:
            h.update(f.read())
    return h.hexdigest()[:10]


def abrir(caminho):
    im = Image.open(caminho)
    im = ImageOps.exif_transpose(im)
    return im


def guardar(im, destino, formato):
    if os.path.exists(destino):
        return
    tmp = destino + '.tmp'
    if formato == 'avif':
        im.save(tmp, 'AVIF', quality=QUALIDADE_AVIF, speed=6)
    elif formato == 'webp':
        im.save(tmp, 'WEBP', quality=QUALIDADE_WEBP, method=6)
    elif formato == 'png':
        im.save(tmp, 'PNG', optimize=True)
    else:
        im.save(tmp, 'JPEG', quality=84, optimize=True, progressive=True)
    os.replace(tmp, destino)


def versoes(nome, origem):
    """AVIF + WebP nas larguras que a fotografia aguenta (nunca se aumenta)."""
    im = abrir(origem).convert('RGB')
    h = resumo(origem)
    larguras = [w for w in LARGURAS if w < im.width] + [im.width]
    for w in larguras:
        alto = round(im.height * w / im.width)
        reduzida = im if w == im.width else im.resize((w, alto), Image.LANCZOS)
        for fmt in FORMATOS:
            guardar(reduzida, os.path.join(CACHE, f'{nome}-{h}-{w}.{fmt}'), fmt)
    return {'largura': im.width, 'altura': im.height, 'resumo': h, 'larguras': larguras,
            'formatos': list(FORMATOS)}


def cartao_produto(nome, origem):
    """Cartão de partilha de um artigo: a fotografia num quadrado ao centro, sobre o creme.
    O WhatsApp mostra a miniatura QUADRADA e cortada ao centro (x 285–915 num 1200×630): o
    artigo tem de caber aí inteiro. Os recortes já vêm em creme, por isso fundem-se no fundo."""
    h = resumo(origem, __file__, extra='cartao')
    destino = os.path.join(CACHE, f'{nome}-{h}-partilha.jpg')
    if not os.path.exists(destino):
        im = abrir(origem).convert('RGB')
        lado = PARTILHA[1]
        # corta ao centro um quadrado e reduz a 630×630
        menor = min(im.width, im.height)
        x = (im.width - menor) // 2
        y = (im.height - menor) // 2
        quadrado = im.crop((x, y, x + menor, y + menor)).resize((lado, lado), Image.LANCZOS)
        cartao = Image.new('RGB', PARTILHA, CREME)
        cartao.paste(quadrado, ((PARTILHA[0] - lado) // 2, 0))
        guardar(cartao, destino, 'jpg')
    return os.path.basename(destino)


def cartao_logotipo(logo):
    """O cartão da página inicial e das páginas sem artigo: só o logótipo, ao centro."""
    h = resumo(logo, __file__, extra='cartao-logo')
    destino = os.path.join(CACHE, f'pokoto-wood-{h}-partilha.jpg')
    if not os.path.exists(destino):
        marca = Image.open(logo).convert('RGBA')
        alto = min(460, marca.height)   # nunca aumentar o logótipo (o original de cor tem 312 px)
        largo = round(marca.width * alto / marca.height)
        marca = marca.resize((largo, alto), Image.LANCZOS)
        cartao = Image.new('RGBA', PARTILHA, CREME + (255,))
        cartao.alpha_composite(marca, ((PARTILHA[0] - largo) // 2, (PARTILHA[1] - alto) // 2))
        guardar(cartao.convert('RGB'), destino, 'jpg')
    return os.path.basename(destino)


def logotipo(logo):
    """O logótipo em PNG e WebP a 64/128/256 px de altura, e os ícones da aba e do ecrã inicial."""
    h = resumo(logo, extra='logo')
    marca = Image.open(logo).convert('RGBA')
    saida = {'resumo': h, 'altura': {}, 'icones': {}}
    for alto in (64, 128, 256):
        largo = round(marca.width * alto / marca.height)
        r = marca.resize((largo, alto), Image.LANCZOS)
        for fmt in ('webp', 'png'):
            nome = f'logo-{h}-{alto}.{fmt}'
            guardar(r, os.path.join(CACHE, nome), fmt)
        saida['altura'][alto] = {'largura': largo, 'webp': f'logo-{h}-{alto}.webp', 'png': f'logo-{h}-{alto}.png'}
    # ícones quadrados: o círculo do logótipo sobre transparente (aba) e sobre creme (iPhone)
    lado = max(marca.width, marca.height)
    quadrado = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    quadrado.alpha_composite(marca, ((lado - marca.width) // 2, (lado - marca.height) // 2))
    for px in (32, 48, 192):
        nome = f'icone-{h}-{px}.png'
        guardar(quadrado.resize((px, px), Image.LANCZOS), os.path.join(CACHE, nome), 'png')
        saida['icones'][px] = nome
    maca = Image.new('RGBA', (180, 180), CREME + (255,))
    pequeno = quadrado.resize((152, 152), Image.LANCZOS)
    maca.alpha_composite(pequeno, (14, 14))
    nome = f'icone-{h}-apple.png'
    guardar(maca.convert('RGB'), os.path.join(CACHE, nome), 'png')
    saida['icones']['apple'] = nome
    return saida


def verificar():
    indice = json.load(open(INDICE, encoding='utf-8'))
    ficheiros = {os.path.splitext(f)[0] for f in os.listdir(FOTOS) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))}
    erros = []
    for nome in sorted(ficheiros - set(indice)):
        erros.append(f'media/fotos/{nome}: falta em content/fotos.json (texto alternativo)')
    for nome in sorted(set(indice) - ficheiros):
        erros.append(f'content/fotos.json: «{nome}» não tem ficheiro em media/fotos/')
    for nome, d in indice.items():
        if not (d.get('alt') or '').strip():
            erros.append(f'content/fotos.json: «{nome}» sem texto alternativo')
    return erros


def principal():
    erros = verificar()
    if erros:
        print('\n'.join(erros), file=sys.stderr)
        sys.exit(1)
    if '--verificar' in sys.argv:
        print('fotografias conferidas:', len(json.load(open(INDICE, encoding='utf-8'))))
        return
    os.makedirs(CACHE, exist_ok=True)
    manifesto = {'fotos': {}, 'posters': {}, 'partilha': {}, 'logo': None}
    origens = {}
    for f in sorted(os.listdir(FOTOS)):
        nome, ext = os.path.splitext(f)
        if ext.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            continue
        origens[nome] = os.path.join(FOTOS, f)
        manifesto['fotos'][nome] = versoes(nome, origens[nome])
    for f in sorted(glob.glob(os.path.join(VIDEO, '*.jpg'))):
        nome = 'video-' + os.path.splitext(os.path.basename(f))[0]
        manifesto['posters'][nome] = versoes(nome, f)
    # cartões de partilha: um por artigo (a primeira fotografia dele)
    for f in sorted(glob.glob(os.path.join(PRODUTOS, '*.json'))):
        slug = os.path.splitext(os.path.basename(f))[0]
        p = json.load(open(f, encoding='utf-8'))
        fotos = p.get('fotos') or []
        if fotos and fotos[0] in origens:
            manifesto['partilha'][slug] = cartao_produto(slug, origens[fotos[0]])
    logo = os.path.join(MARCA, 'logo.png')   # o de cor (o de traço, logo-traco.png, fica para o painel e os emails)
    if os.path.exists(logo):
        manifesto['logo'] = logotipo(logo)
        manifesto['partilha']['_site'] = cartao_logotipo(logo)
    # tira da cache o que já não é de nenhuma versão actual (fotografias trocadas ou apagadas)
    vivos = set()
    for grupo in ('fotos', 'posters'):
        for nome, d in manifesto[grupo].items():
            for w in d['larguras']:
                for fmt in d['formatos']:
                    vivos.add(f'{nome}-{d["resumo"]}-{w}.{fmt}')
    vivos.update(manifesto['partilha'].values())
    if manifesto['logo']:
        for d in manifesto['logo']['altura'].values():
            vivos.update([d['webp'], d['png']])
        vivos.update(manifesto['logo']['icones'].values())
    for f in os.listdir(CACHE):
        if f != 'manifesto.json' and f not in vivos:
            os.remove(os.path.join(CACHE, f))
    with open(os.path.join(CACHE, 'manifesto.json'), 'w', encoding='utf-8') as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=1)
    print(f'imagens: {len(manifesto["fotos"])} fotografias, {len(manifesto["posters"])} capas de vídeo, '
          f'{len(manifesto["partilha"])} cartões de partilha')


if __name__ == '__main__':
    principal()
