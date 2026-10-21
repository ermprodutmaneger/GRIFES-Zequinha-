#!/usr/bin/env python3
"""Validacao final das entregas da Ingrid Beauty."""
import base64
import json
import re
import struct
import zipfile
from pathlib import Path
from PIL import Image

BASE = Path(__file__).resolve().parent.parent
ok = True


def check(nome, condicao, detalhe=""):
    global ok
    marca = "OK " if condicao else "FALHA"
    if not condicao:
        ok = False
    print(f"[{marca}] {nome}" + (f" — {detalhe}" if detalhe else ""))


html = (BASE / "index.html").read_text(encoding="utf-8")

# 1. tokens / placeholders
check("sem tokens pendentes", not re.findall(r"\{\{.*?\}\}", html))
check("sem 'A CONFIRMAR' na interface", "A CONFIRMAR" not in html)

# 2. tamanho
tam = (BASE / "index.html").stat().st_size
check("index.html abaixo de 6 MB", tam < 6 * 1024 * 1024, f"{tam/1024/1024:.2f} MB")

# 3. PNGs com alfa real
for nome in ("logo-ingrid-beauty.png", "logo-ingrid-beauty-com-frase.png", "favicon.png"):
    im = Image.open(BASE / nome)
    rgba = im.convert("RGBA")
    alfa = rgba.getchannel("A")
    corners = [alfa.getpixel((0, 0)), alfa.getpixel((im.width - 1, 0)),
               alfa.getpixel((0, im.height - 1)), alfa.getpixel((im.width - 1, im.height - 1))]
    transparentes = alfa.getextrema()[0] == 0
    tem_alfa = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    check(f"{nome} tem canal alfa real", tem_alfa and transparentes,
          f"{im.size} {im.mode} cantos={corners}")
    check(f"{nome} sem fundo opaco", max(corners) == 0)

# 4. logos: texto preservado (dimensoes das artes originais) e frase presente
logo = Image.open(BASE / "logo-ingrid-beauty.png")
check("logo com nome tem 640px de largura", logo.width == 640, f"{logo.width}x{logo.height}")
frase = Image.open(BASE / "logo-ingrid-beauty-com-frase.png")
check("logo com frase tem 640px de largura", frase.width == 640, f"{frase.width}x{frase.height}")
check("logo com frase e mais alta que a logo so com nome", frase.height > logo.height)

# 5. favicon = inicial I isolada
fav = Image.open(BASE / "favicon.png").convert("RGBA")
bbox = fav.getchannel("A").getbbox()
check("favicon com a inicial recortada", bbox is not None and bbox[2] - bbox[0] < fav.width * 0.8,
      f"bbox={bbox}")

# 6. og.jpg 1200x630
og = Image.open(BASE / "og.jpg")
check("og.jpg em 1200x630", og.size == (1200, 630), str(og.size))

# 7. conteudo obrigatorio
obrigatorios = {
    "WhatsApp 5511916121318": "wa.me/5511916121318",
    "telefone exibido": "(11) 91612-1318",
    "instagram": "instagram.com/ingridbeauty.br",
    "chave pix": "11916121318",
    "titulo SEO": "Ingrid Beauty — Sobrancelhas e cuidados Namely",
    "description SEO": "Conheça a Ingrid Beauty: design de sobrancelhas",
    "json-ld BeautySalon": '"@type": "BeautySalon"',
    "frase do loader": "Há treze anos, fazendo o simples ficar extraordinário",
    "titulo hero": "Realce seu olhar.",
    "especialidade fios": "Recuperação de fios naturais",
    "especialidade laser": "Remoção a laser",
    "especialidade pos-op": "Cuidados pós-operatórios",
    "aviso de confirmacao": "O atendimento será confirmado pela Ingrid após verificar a disponibilidade",
    "menu sem depoimentos": "Depoimentos",
}
for nome, alvo in obrigatorios.items():
    if nome == "menu sem depoimentos":
        check("sem secao de depoimentos", alvo not in html)
    elif nome == "titulo SEO":
        check(nome, "<title>Ingrid Beauty — Sobrancelhas e cuidados estéticos</title>" in html)
    else:
        check(nome, alvo in html)

# 8. nove procedimentos com valores e duracoes
esperados = {
    "Avaliação": ("A consultar", "15 minutos"),
    "Brow Lamination": ("R$ 150,00", "1 hora e 30 minutos"),
    "Buço com linha": ("R$ 18,00", "10 minutos"),
    "Combo Glow Facial": ("R$ 189,90", "1 hora e 30 minutos"),
    "Depilação facial na linha — rosto completo": ("R$ 35,00", "30 minutos"),
    "Design + Henna + Buço com linha": ("R$ 75,00", "30 minutos"),
    "Design + Spa das Sobrancelhas": ("R$ 70,00", "40 minutos"),
    "Micropigmentação Shadow": ("R$ 430,00", "1 hora e 10 minutos"),
    "Remoção de cílios": ("R$ 65,00", "30 minutos"),
}
dados = json.loads(re.search(r"var PROCEDIMENTOS = (\[.*?\]);", html, re.S).group(1))
check("nove procedimentos cadastrados", len(dados) == 9, str(len(dados)))
for p in dados:
    preco = "A consultar" if p["preco"] is None else "R$ " + f"{p['preco']/100:.2f}".replace(".", ",")
    exp = esperados[p["nome"]]
    check(f"{p['nome']}: {exp[0]} / {exp[1]}", preco == exp[0] and p["duracaoTexto"] == exp[1],
          f"obtido {preco} / {p['duracaoTexto']}")

# 9. horarios exatos
tabela = re.findall(r"<tr[^>]*><th scope=\"row\">([^<]+)</th><td>([^<]+)</td></tr>", html)
check("tabela de horarios com 7 dias", len(tabela) == 7, str(len(tabela)))
horarios_esperados = [
    ("Segunda-feira", "14h às 17h"),
    ("Terça-feira", "9h às 11h30 e 13h30 às 17h30"),
    ("Quarta-feira", "9h30 às 11h30 e 13h30 às 17h"),
    ("Quinta-feira", "9h30 às 11h30, 13h30 às 14h30 e 16h30 às 17h30"),
    ("Sexta-feira", "9h às 11h30 e 13h30 às 17h30"),
    ("Sábado", "8h30 às 16h"),
    ("Domingo", "Fechado"),
]
for (dia, h), (dia_e, h_e) in zip(tabela, horarios_esperados):
    check(f"horario {dia}", dia == dia_e and h == h_e, f"{dia} | {h}")

# 10. versao com pasta img/ + zip
check("versao-imagens/index.html existe", (BASE / "versao-imagens" / "index.html").exists())
check("pasta img/ com os arquivos", len(list((BASE / "versao-imagens" / "img").glob("*"))) >= 14,
      str(len(list((BASE / "versao-imagens" / "img").glob("*")))))
with zipfile.ZipFile(BASE / "ingrid-beauty-versao-imagens.zip") as z:
    nomes = z.namelist()
check("zip com index.html e img/", any(n.endswith("index.html") for n in nomes) and
      sum(1 for n in nomes if "/img/" in n) >= 14, f"{len(nomes)} arquivos")

# 11. capturas de tela
shots = list((BASE / "screenshots").glob("*.jpg"))
check("capturas desktop e mobile", len([s for s in shots if s.name.startswith("desktop")]) >= 8 and
      len([s for s in shots if s.name.startswith("mobile")]) >= 6, f"{len(shots)} capturas")

print("\nRESULTADO:", "TUDO OK" if ok else "HOUVE FALHAS")
