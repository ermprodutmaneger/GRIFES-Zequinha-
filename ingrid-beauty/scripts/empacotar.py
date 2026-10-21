#!/usr/bin/env python3
"""
Empacota as entregas finais da Ingrid Beauty:

  1) ingrid-beauty-site-completo.zip  -> projeto pronto para Netlify/GitHub
  2) ingrid-beauty-netlify.zip         -> versao em arquivo unico (backup)
  3) pasta ../repo-para-github/        -> conteudo do repositorio dedicated
"""
import shutil
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
RAIZ = BASE.parent
STAGE = Path("/tmp/ingrid-pacote")

NETLIFY_TOML = """[build]
  publish = "."

# imagens e fontes: cache longo (arquivos nao mudam com o tempo)
[[headers]]
  for = "/img/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/fonts/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
"""


def limpar(destino: Path):
    if destino.exists():
        shutil.rmtree(destino)
    destino.mkdir(parents=True, exist_ok=True)


def main():
    # ---------- 1. ZIP completo (pronto para o Netlify) ----------
    stage = STAGE / "site"
    if STAGE.exists():
        shutil.rmtree(STAGE)
    stage.mkdir(parents=True, exist_ok=True)
    shutil.copytree(BASE / "versao-imagens", stage, dirs_exist_ok=True)
    shutil.copy(BASE / "og.jpg", stage / "og.jpg")
    shutil.copy(BASE / "favicon.png", stage / "favicon.png")
    shutil.copy(BASE / "logo-ingrid-beauty.png", stage / "logo-ingrid-beauty.png")
    shutil.copy(BASE / "logo-ingrid-beauty-com-frase.png", stage / "logo-ingrid-beauty-com-frase.png")
    shutil.copy(BASE / "README.md", stage / "LEIA-ME.md")
    (stage / "netlify.toml").write_text(NETLIFY_TOML, encoding="utf-8")
    # versao em arquivo unico, guardada numa subpasta (opcional)
    opcional = stage / "opcional-arquivo-unico"
    opcional.mkdir()
    shutil.copy(BASE / "index.html", opcional / "index.html")

    zip_completo = BASE / "ingrid-beauty-site-completo.zip"
    with zipfile.ZipFile(zip_completo, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for arquivo in sorted(stage.rglob("*")):
            if arquivo.is_file():
                z.write(arquivo, arquivo.relative_to(stage))

    # ---------- 2. ZIP de arquivo unico ----------
    zip_unico = BASE / "ingrid-beauty-netlify.zip"
    with zipfile.ZipFile(zip_unico, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.write(BASE / "index.html", "index.html")
        z.write(BASE / "og.jpg", "og.jpg")
        z.write(BASE / "favicon.png", "favicon.png")
        z.write(BASE / "README.md", "LEIA-ME.md")
        z.write(BASE / "logo-ingrid-beauty.png", "logo-ingrid-beauty.png")
        z.write(BASE / "logo-ingrid-beauty-com-frase.png", "logo-ingrid-beauty-com-frase.png")

    for arquivo in (zip_completo, zip_unico):
        print(f"{arquivo.name:42s} {arquivo.stat().st_size/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
