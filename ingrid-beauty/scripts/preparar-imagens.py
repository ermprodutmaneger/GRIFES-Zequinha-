#!/usr/bin/env python3
"""
Preparacao dos arquivos de imagem da Ingrid Beauty.

Entradas (uploads do usuario):
  - image-1.png      -> arte da marca INGRID BEAUTY + frase (ja com canal alfa)
  - IMG_3553.jpeg   -> foto da Ingrid sentada no estudio (foto principal)
  - IMG_3558.jpeg   -> foto da Ingrid no espaco / estudio

Saidas (pasta ingrid-beauty/):
  logo-ingrid-beauty.png            (nome, transparente, largura <= 640px)
  logo-ingrid-beauty-com-frase.png  (nome + frase, transparente, largura <= 640px)
  favicon.png                       (inicial "I" isolada da propria marca)
  og.jpg                            (1200x630)
  img/*                             (assets da versao alternativa com pasta img/)
"""
from pathlib import Path
import shutil
from PIL import Image, ImageFilter

BASE = Path(__file__).resolve().parent.parent          # ingrid-beauty/
UP = Path("/tmp/arena-coding-uploads")
IMG = BASE / "img"
IMG.mkdir(parents=True, exist_ok=True)

CREAM = (247, 242, 232)
BROWN = (45, 33, 27)
GOLD = (178, 138, 55)


def save_png(im: Image.Image, path: Path, max_w: int = 640) -> Path:
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    im.save(path, "PNG", optimize=True)
    return path


def save_jpg(im: Image.Image, path: Path, quality: int = 76, max_w: int | None = None) -> Path:
    if max_w and im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    im = im.convert("RGB")
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return path


# ---------------------------------------------------------------- marca ----
art = Image.open(UP / "image-1.png").convert("RGBA")

# recorte apenas do nome (INGRID / BEAUTY)
logo_nome = art.crop((95, 140, 1445, 735))
save_png(logo_nome, BASE / "logo-ingrid-beauty.png", 640)
save_png(logo_nome, IMG / "logo-ingrid-beauty.png", 640)

# recorte com nome + frase
logo_frase = art.crop((70, 140, 1465, 940))
save_png(logo_frase, BASE / "logo-ingrid-beauty-com-frase.png", 640)
save_png(logo_frase, IMG / "logo-ingrid-beauty-com-frase.png", 640)

# favicon: inicial "I" isolada da propria marca (sem simbolo inventado)
letra_i = art.crop((135, 150, 266, 420))
caixa = 128
canvas = Image.new("RGBA", (caixa, caixa), (0, 0, 0, 0))
alt = 96
letra_i = letra_i.resize((max(1, round(letra_i.width * alt / letra_i.height)), alt), Image.LANCZOS)
canvas.paste(letra_i, ((caixa - letra_i.width) // 2, (caixa - letra_i.height) // 2), letra_i)
canvas.save(BASE / "favicon.png", "PNG", optimize=True)
canvas.save(IMG / "favicon.png", "PNG", optimize=True)

# ---------------------------------------------------------------- fotos ----
hero = Image.open(UP / "IMG_3553.jpeg").convert("RGB")
save_jpg(hero, IMG / "ingrid-hero-700.jpg", 76, 700)
save_jpg(hero, IMG / "ingrid-hero-1000.jpg", 76, 1000)

espaco = Image.open(UP / "IMG_3558.jpeg").convert("RGB")
save_jpg(espaco, IMG / "ingrid-espaco.jpg", 76, 820)

# ---------------------------------------------------------------- og.jpg ---
og = Image.new("RGB", (1200, 630), CREAM)
# faixa dourada + fundo creme
og.paste(Image.new("RGB", (1200, 630), (233, 220, 201)), (0, 0, 1200, 630))
# foto real (lado direito, em moldura arredondada simples)
foto = espaco.copy()
foto.thumbnail((470, 470), Image.LANCZOS)
mask = Image.new("L", foto.size, 0)
from PIL import ImageDraw
ImageDraw.Draw(mask).rounded_rectangle((0, 0, foto.size[0], foto.size[1]), radius=28, fill=255)
og.paste(foto, (1200 - foto.width - 60, (630 - foto.height) // 2), mask)
# logo (nome) no alto a esquerda
lg = Image.open(BASE / "logo-ingrid-beauty.png").convert("RGBA")
lg_w = 520
lg = lg.resize((lg_w, round(lg.height * lg_w / lg.width)), Image.LANCZOS)
og.paste(lg, (70, 120), lg)
# frase
from PIL import ImageDraw, ImageFont
d = ImageDraw.Draw(og)
def fonte(caminho, tamanho):
    try:
        return ImageFont.truetype(caminho, tamanho)
    except Exception:
        return ImageFont.load_default()

serif = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
f_frase = fonte(serif, 30)
f_titulo = fonte(serif, 44)
d.text((72, 300), "Realce seu olhar. Valorize sua beleza natural.", font=f_frase, fill=(90, 66, 40))
d.text((72, 350), "Sobrancelhas  ·  Cílios  ·  Cuidados faciais", font=f_frase, fill=(120, 92, 55))
d.text((72, 420), "(11) 91612-1318", font=f_frase, fill=(45, 33, 27))
d.text((72, 470), "@ingridbeauty.br", font=f_frase, fill=(45, 33, 27))
# linha dourada
d.rectangle((70, 262, 70 + 120, 266), fill=GOLD)
og.save(BASE / "og.jpg", "JPEG", quality=82, optimize=True, progressive=True)
shutil.copy(BASE / "og.jpg", IMG / "og.jpg")

print("assets gerados em", BASE)
for p in sorted(BASE.glob("*.png")) + sorted(BASE.glob("*.jpg")):
    print(f"  {p.name}: {p.stat().st_size/1024:.1f} KB")
for p in sorted(IMG.glob("*")):
    print(f"  img/{p.name}: {p.stat().st_size/1024:.1f} KB")
