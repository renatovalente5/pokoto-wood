#!/usr/bin/env python3
"""Prepara as fotografias do site a partir do material do cliente (_cliente/, fora do git).

Corre-se À MÃO, num Mac, quando chega material novo — não faz parte da publicação. O que
escreve em media/fotos/ é o que o site usa (e o que o backoffice mostra como «originais»);
as versões para a web (AVIF/WebP em várias larguras) são do scripts/imagens.py, na publicação.

Três tipos de fotografia:
  - «recorte»: o objecto tirado do fundo pelo Vision do macOS (o mesmo «isolar objecto» das
    Fotografias), pousado sobre o creme do site com uma sombra suave, num quadrado. Foi o que
    a Célia pediu no grupo (7 out 2026: «As fotos consegue editar as que tem fundos? Para
    ficarem limpas?») e o Renato combinou creme/bege, não branco.
  - «corte»: uma fotografia tirada de dentro de uma colagem (as colagens do Instagram trazem
    três a cinco fotografias cada).
  - «inteira»: a fotografia como veio.

    python3 scripts/preparar-fotos.py           # faz o que falta
    python3 scripts/preparar-fotos.py --tudo    # refaz tudo
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CLIENTE = os.path.join(RAIZ, '_cliente')
WA = os.path.join(CLIENTE, 'whatsapp', '2026-10-07', 'media')
RECORTES = os.path.join(CLIENTE, 'recortes')          # PNG com transparência, do Vision
SAIDA = os.path.join(RAIZ, 'media', 'fotos')
SWIFT = os.path.join(RAIZ, 'scripts', 'recortar.swift')
BINARIO = os.path.join(RAIZ, '.cache', 'recortar')

CREME = (246, 238, 227)      # --creme do site: o fundo dos cartões
SOMBRA = (92, 64, 38)

# nome final -> (tipo, ficheiro de origem, extra)
#   recorte: extra = {'encostar': 'direita'|'esquerda'|None, 'limpar_escuros': área mínima}
#   corte:   extra = (x0, y0, x1, y1) em píxeis da colagem
FOTOS = {
    # Torre / cadeira
    'torre-cadeira-recorte': ('recorte', '204137-53268.jpg', {}),
    'torre-cadeira-cozinha': ('corte', '204138-53269.jpg', (10, 20, 515, 1030)),
    'torre-cadeira-refeicao': ('corte', '204138-53269.jpg', (524, 20, 938, 498)),
    'torre-cadeira-fechada': ('corte', '204138-53269.jpg', (537, 527, 886, 1033)),
    # Torre / mesa
    'torre-mesa-recorte': ('recorte', '175629-53194.jpg', {'limpar_escuros': 15000}),
    'torre-mesa-cozinha': ('inteira', '204815-53277.jpg', None),
    'torre-mesa-crianca': ('corte', '204815-53278.jpg', (20, 27, 476, 798)),
    'torre-mesa-subir': ('corte', '204815-53278.jpg', (504, 215, 922, 915)),
    'torre-mesa-modo-mesa': ('corte', '204815-53278.jpg', (40, 848, 498, 1312)),
    # Triângulo Pikler
    'triangulo-recorte': ('recorte', '175628-53192.jpg', {}),
    'triangulo-coelho': ('inteira', '205113-53291.jpg', None),
    'triangulo-benedita': ('corte', '205113-53290.jpg', (17, 84, 531, 694)),
    'triangulo-nomes': ('corte', '205113-53290.jpg', (549, 74, 955, 690)),
    'triangulo-rampa-brincar': ('corte', '205113-53290.jpg', (42, 744, 916, 1328)),
    # Arco de Pikler (+ prancha)
    'arco-recorte': ('recorte', '175628-53191.jpg', {'encostar': 'direita'}),
    'arco-prancha': ('inteira', '205525-53296.jpg', None),
    'arco-mesa': ('corte', '205525-53297.jpg', (20, 24, 448, 450)),
    'arco-sentado': ('corte', '205525-53297.jpg', (469, 39, 868, 448)),
    'arco-quarto': ('corte', '205525-53297.jpg', (35, 480, 378, 930)),
    'arco-rampa': ('corte', '205525-53297.jpg', (438, 470, 856, 1314)),
    'arco-descanso': ('corte', '205525-53297.jpg', (30, 950, 426, 1298)),
    'trio-sala': ('inteira', '205927-53301.jpg', None),
    # Estante
    'estante-recorte': ('recorte', '175627-53190.jpg', {}),
    'estante-leitura': ('corte', '205953-53302.jpg', (14, 12, 436, 596)),
    'estante-dinossauro': ('corte', '205953-53302.jpg', (454, 4, 945, 594)),
    'estante-tapete': ('corte', '205953-53302.jpg', (39, 670, 419, 1144)),
    'estante-rafael': ('corte', '205953-53302.jpg', (449, 700, 958, 1156)),
    # Roupeiro
    'roupeiro-crianca': ('corte', '210141-53305.jpg', (70, 40, 505, 665)),
    'roupeiro-lateral': ('corte', '210141-53305.jpg', (542, 32, 923, 576)),
    'roupeiro-sofia': ('corte', '210141-53305.jpg', (26, 822, 416, 1268)),
    'roupeiro-amelia': ('corte', '210141-53305.jpg', (454, 717, 903, 1308)),
    # Régua de crescimento
    'regua-recorte': ('recorte', '210516-53307.jpg', {}),
    'regua-simao-carlota': ('inteira', '210516-53307.jpg', None),
}


def recortar(origem):
    """O PNG com transparência do Vision; compila e corre o recortar.swift se faltar (só macOS)."""
    os.makedirs(RECORTES, exist_ok=True)
    png = os.path.join(RECORTES, os.path.splitext(os.path.basename(origem))[0] + '.png')
    if not os.path.exists(png):
        if not os.path.exists(BINARIO):
            os.makedirs(os.path.dirname(BINARIO), exist_ok=True)
            subprocess.run(['swiftc', '-O', SWIFT, '-o', BINARIO], check=True)
        subprocess.run([BINARIO, origem, png], check=True)
    return Image.open(png).convert('RGBA')


def limpar_escuros(im, area_minima):
    """Tira manchas escuras grandes que o Vision deixou dentro do objecto (o fundo visto pelas
    aberturas de uma torre). As gravações são traços finos: nunca chegam à área mínima."""
    import cv2
    a = np.array(im)
    rgb = a[:, :, :3].astype(int)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    escuro = ((lum < 75) & (a[:, :, 3] > 0)).astype(np.uint8)
    n, rotulos, estat, _ = cv2.connectedComponentsWithStats(escuro, 8)
    tirar = np.zeros_like(escuro)
    for i in range(1, n):
        if estat[i, cv2.CC_STAT_AREA] > area_minima:
            tirar |= (rotulos == i).astype(np.uint8)
    tirar = cv2.dilate(tirar, np.ones((7, 7), np.uint8))
    a[:, :, 3] = np.where(tirar > 0, 0, a[:, :, 3])
    return Image.fromarray(a)


def pousar(objecto, encostar=None):
    """O objecto num quadrado creme, com uma sombra no chão. «encostar»: quando a fotografia
    original cortava o objecto num lado, o corte fica encostado a esse lado do quadrado (lê-se
    como o enquadramento de uma fotografia, não como uma peça partida)."""
    caixa = objecto.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    obj = objecto.crop(caixa)
    lado = int(max(obj.width, obj.height) * 1.2)
    tela = Image.new('RGBA', (lado, lado), CREME + (255,))
    if encostar == 'direita':
        x = lado - obj.width
    elif encostar == 'esquerda':
        x = 0
    else:
        x = (lado - obj.width) // 2
    y = (lado - obj.height) // 2
    # a sombra: uma elipse desfocada à altura dos pés, um pouco acima da base (a perspectiva
    # põe os pés de trás mais acima do que o da frente)
    mascara = Image.new('L', (lado, lado), 0)
    d = ImageDraw.Draw(mascara)
    cx = x + obj.width / 2
    base = y + obj.height
    d.ellipse([cx - obj.width * 0.46, base - obj.height * 0.06, cx + obj.width * 0.46, base + obj.height * 0.012], fill=70)
    mascara = mascara.filter(ImageFilter.GaussianBlur(lado * 0.018))
    sombra = Image.new('RGBA', (lado, lado), SOMBRA + (255,))
    sombra.putalpha(mascara)
    tela = Image.alpha_composite(tela, sombra)
    tela.alpha_composite(obj, (x, y))
    return tela.convert('RGB')


def main():
    tudo = '--tudo' in sys.argv
    os.makedirs(SAIDA, exist_ok=True)
    for nome, (tipo, ficheiro, extra) in FOTOS.items():
        destino = os.path.join(SAIDA, nome + '.jpg')
        if os.path.exists(destino) and not tudo:
            continue
        origem = os.path.join(WA, ficheiro)
        if tipo == 'recorte':
            im = recortar(origem)
            if extra.get('limpar_escuros'):
                im = limpar_escuros(im, extra['limpar_escuros'])
            final = pousar(im, extra.get('encostar'))
        else:
            im = ImageOps.exif_transpose(Image.open(origem)).convert('RGB')
            final = im.crop(extra) if tipo == 'corte' else im
        final.save(destino, 'JPEG', quality=92, optimize=True)
        print(f'{nome}.jpg  {final.width}×{final.height}  ← {ficheiro} ({tipo})')


if __name__ == '__main__':
    main()
