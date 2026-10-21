#!/usr/bin/env python3
"""Gera o og.jpg (1200x630) com a marca, a identidade visual e a foto real."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE = Path(__file__).resolve().parent.parent
FONTES = BASE / "fonts"
UP = Path("/tmp/arena-coding-uploads")

CREME = (247, 242, 232)
CREME_2 = (239, 230, 214)
MARROM = (45, 33, 27)
MARROM_CLARO = (74, 56, 46)
OURO = (178, 138, 55)
OURO_CLARO = (214, 178, 104)

L, C, R, M, B = 1200, 630, 45, 72, 48
LARGURA_TEXTO = 640


_CACHE = Path("/tmp/ingrid-beauty-fontes")
_CACHE.mkdir(exist_ok=True)


def fonte(nome, tamanho):
    """Converte o woff2 da marca em TTF (cache) e devolve a fonte."""
    destino = _CACHE / nome.replace(".ttf", ".ttf")
    if not destino.exists():
        from fontTools.ttLib import TTFont
        fonte_ttf = TTFont(str(FONTES / nome.replace(".ttf", ".woff2")))
        fonte_ttf.flavor = None
        fonte_ttf.save(str(destino))
    return ImageFont.truetype(str(destino), tamanho)


def gradiente(tam, topo, base):
    img = Image.new("RGB", tam)
    d = ImageDraw.Draw(img)
    for y in range(tam[1]):
        t = y / max(1, tam[1] - 1)
        d.line([(0, y), (tam[0], y)], fill=tuple(round(topo[i] + (base[i] - topo[i]) * t) for i in range(3)))
    return img


og = gradiente((L, C), CREME, CREME_2).convert("RGBA")

# brilho dourado suave no canto superior direito
brilho = Image.new("RGBA", (L, C), (0, 0, 0, 0))
bd = ImageDraw.Draw(brilho)
bd.ellipse((L - 520, -300, L + 180, 400), fill=(214, 178, 104, 60))
brilho = brilho.filter(ImageFilter.GaussianBlur(120))
og = Image.alpha_composite(og, brilho)

d = ImageDraw.Draw(og)

# ---------------- foto real (quadro arredondado, borda dourada) --------------
foto = Image.open(UP / "IMG_3553.jpeg").convert("RGB")
altura_foto = 520
largura_foto = int(foto.width * altura_foto / foto.height)
foto = foto.resize((largura_foto, altura_foto), Image.LANCZOS)
x_foto = L - largura_foto - R
y_foto = (C - altura_foto) // 2

moldura = Image.new("RGBA", (largura_foto + 8, altura_foto + 8), (0, 0, 0, 0))
ImageDraw.Draw(moldura).rounded_rectangle((0, 0, moldura.width - 1, moldura.height - 1), radius=26, fill=OURO + (255,))
og.alpha_composite(moldura, (x_foto - 4, y_foto - 4))

mascara = Image.new("L", foto.size, 0)
ImageDraw.Draw(mascara).rounded_rectangle((0, 0, foto.width, foto.height), radius=22, fill=255)
og.paste(foto, (x_foto, y_foto), mascara)

# ---------------- marca ------------------------------------------------------
logo = Image.open(BASE / "logo-ingrid-beauty.png").convert("RGBA")
largura_logo = 400
logo = logo.resize((largura_logo, round(logo.height * largura_logo / logo.width)), Image.LANCZOS)
og.alpha_composite(logo, (M, 86))

# frase
f_frase = fonte("cormorant-garamond-latin-400-italic.ttf", 40)
d.text((M, 288), "Há treze anos, fazendo o simples", font=f_frase, fill=MARROM_CLARO)
d.text((M, 334), "ficar extraordinário", font=f_frase, fill=MARROM_CLARO)

# especialidades
f_esp = fonte("manrope-latin-600-normal.ttf", 17)
d.text((M, 412), "S O B R A N C E L H A S   ·   C Í L I O S   ·   C U I D A D O S   F A C I A I S",
       font=f_esp, fill=OURO)

# linha dourada
d.rectangle((M, 458, M + 96, 460), fill=OURO)

# contatos
f_contato = fonte("manrope-latin-500-normal.ttf", 23)
d.text((M, 488), "(11) 91612-1318", font=f_contato, fill=MARROM)
d.text((M, 526), "@ingridbeauty.br", font=f_contato, fill=MARROM)

# marca em contorno no canto inferior esquerdo
f_contorno = fonte("cormorant-garamond-latin-600-normal.ttf", 30)
d.text((M + 2, 572), "I N G R I D   B E A U T Y", font=f_contorno, fill=(178, 138, 55))

og.convert("RGB").save(BASE / "og.jpg", "JPEG", quality=84, optimize=True, progressive=True)
print("og.jpg gerado:", (BASE / "og.jpg").stat().st_size // 1024, "KB")
