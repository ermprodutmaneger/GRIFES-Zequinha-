#!/usr/bin/env python3
"""
Otimizacao dos assets da Ingrid Beauty (foco em mobile).

  - logos: PNG quantizado (192 cores) -> mesma aparencia, ~4x menor
  - fotos: reamostradas e recomprimidas
  - fontes: 3 arquivos variaveis (Manrope + Cormorant Garamond normal/italico)
"""
from pathlib import Path
from PIL import Image

BASE = Path(__file__).resolve().parent.parent
IMG = BASE / "img"
UP = Path("/tmp/arena-coding-uploads")
TMP = Path("/tmp/ingrid-otim")
TMP.mkdir(exist_ok=True)

# --- logos: quantiza mantendo alfa ---------------------------------------
def otimiza_logo(origem: Path, destino: Path, max_w: int = 640):
    im = Image.open(origem).convert("RGBA")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    q = im.quantize(colors=192, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
    q.save(destino, "PNG", optimize=True)
    return destino


art = Image.open(UP / "image-1.png").convert("RGBA")
logo_nome = art.crop((95, 140, 1445, 735))
logo_frase = art.crop((70, 140, 1465, 940))
letra_i = art.crop((135, 150, 266, 420))

TMP.joinpath("logo-original.png").write_bytes(b"")  # placeholder
logo_nome.save(TMP / "logo-original.png")
logo_frase.save(TMP / "logo-frase-original.png")
letra_i.save(TMP / "letra-i-original.png")

otimiza_logo(TMP / "logo-original.png", BASE / "logo-ingrid-beauty.png")
otimiza_logo(TMP / "logo-frase-original.png", BASE / "logo-ingrid-beauty-com-frase.png")
IMG.joinpath("logo-ingrid-beauty.png").write_bytes((BASE / "logo-ingrid-beauty.png").read_bytes())
IMG.joinpath("logo-ingrid-beauty-com-frase.png").write_bytes((BASE / "logo-ingrid-beauty-com-frase.png").read_bytes())

# --- favicon: inicial I da propria marca ---------------------------------
caixa = 128
canvas = Image.new("RGBA", (caixa, caixa), (0, 0, 0, 0))
alt = 104
li = letra_i.resize((max(1, round(letra_i.width * alt / letra_i.height)), alt), Image.LANCZOS)
canvas.paste(li, ((caixa - li.width) // 2, (caixa - li.height) // 2), li)
canvas = canvas.quantize(colors=192, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
canvas.save(BASE / "favicon.png", "PNG", optimize=True)
IMG.joinpath("favicon.png").write_bytes((BASE / "favicon.png").read_bytes())


# --- fotos ---------------------------------------------------------------
def jpeg(origem: Path, destino: Path, max_w: int, qualidade: int = 74):
    im = Image.open(origem).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(destino, "JPEG", quality=qualidade, optimize=True, progressive=True)
    return destino


jpeg(UP / "IMG_3553.jpeg", IMG / "ingrid-hero-700.jpg", 700, 74)
jpeg(UP / "IMG_3553.jpeg", IMG / "ingrid-hero-1000.jpg", 900, 74)
jpeg(UP / "IMG_3558.jpeg", IMG / "ingrid-espaco.jpg", 800, 74)

print("assets otimizados")
for p in sorted(BASE.glob("*.png")) + sorted(IMG.glob("*.jpg")):
    print(f"  {p.name:38s} {p.stat().st_size/1024:8.1f} KB")
