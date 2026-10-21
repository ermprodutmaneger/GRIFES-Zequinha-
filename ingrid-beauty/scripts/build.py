#!/usr/bin/env python3
"""
Monta o site Ingrid Beauty em duas versoes:

  1) index.html .................. arquivo unico com todas as imagens em base64
  2) versao-imagens/index.html .. versao alternativa com as imagens na pasta img/
  3) ingrid-beauty-versao-imagens.zip

Uso:  python3 scripts/build.py
"""
from __future__ import annotations

import base64
import json
import re
import shutil
import zipfile
from pathlib import Path
from urllib.parse import quote

from PIL import Image

BASE = Path(__file__).resolve().parent.parent
PARTES = BASE / "scripts" / "partes"
IMG = BASE / "img"
FONTES = BASE / "fonts"

# URL publica definitiva — TROQUE aqui e no <meta og:url> gerado pelo build.
SITE_URL = "https://ingrid-beauty.vercel.app"
WHATSAPP = "5511916121318"
PIX = "11916121318"

# ---------------------------------------------------------------- dados ----
# Valores em CENTAVOS. preco=None -> "A consultar" (avaliacao).
PROCEDIMENTOS = [
    dict(id="avaliacao", nome="Avaliação", categoria="avaliacao", cat="Avaliação",
         preco=None, min=15, duracao="15 minutos", img="servico-avaliacao.jpg",
         descricao="Atendimento inicial para conversar sobre seus objetivos e esclarecer dúvidas sobre os procedimentos."),
    dict(id="brow-lamination", nome="Brow Lamination", categoria="sobrancelhas", cat="Sobrancelhas",
         preco=15000, min=90, duracao="1 hora e 30 minutos", img="servico-brow-lamination.jpg",
         descricao="Procedimento de alinhamento e modelagem dos fios das sobrancelhas."),
    dict(id="buco-linha", nome="Buço com linha", categoria="pele", cat="Pele e depilação",
         preco=1800, min=10, duracao="10 minutos", img="servico-buco-linha.jpg",
         descricao="Remoção dos pelos da região do buço com a técnica de linha."),
    dict(id="combo-glow-facial", nome="Combo Glow Facial", categoria="pele", cat="Pele e depilação",
         preco=18990, min=90, duracao="1 hora e 30 minutos", img="servico-glow-facial.jpg",
         descricao="Limpeza de pele + peeling ultrassônico + máscara + LED calmante."),
    dict(id="depilacao-facial-linha", nome="Depilação facial na linha — rosto completo", categoria="pele",
         cat="Pele e depilação", preco=3500, min=30, duracao="30 minutos", img="servico-depilacao-linha.jpg",
         descricao="Depilação dos pelos faciais com linha, abrangendo o rosto completo."),
    dict(id="design-henna-buco", nome="Design + Henna + Buço com linha", categoria="sobrancelhas",
         cat="Sobrancelhas", preco=7500, min=30, duracao="30 minutos", img="servico-design-henna.jpg",
         descricao="Combinação de design das sobrancelhas, aplicação de henna e depilação do buço com linha."),
    dict(id="design-spa", nome="Design + Spa das Sobrancelhas", categoria="sobrancelhas", cat="Sobrancelhas",
         preco=7000, min=40, duracao="40 minutos", img="servico-spa-sobrancelhas.jpg",
         descricao="Design das sobrancelhas acompanhado do serviço de Spa das Sobrancelhas."),
    dict(id="micropigmentacao-shadow", nome="Micropigmentação Shadow", categoria="sobrancelhas", cat="Sobrancelhas",
         preco=43000, min=70, duracao="1 hora e 10 minutos", img="servico-micropigmentacao.jpg",
         descricao="Micropigmentação para criar um efeito sombreado nas sobrancelhas."),
    dict(id="remocao-cilios", nome="Remoção de cílios", categoria="cilios", cat="Cílios",
         preco=6500, min=30, duracao="30 minutos", img="servico-remocao-cilios.jpg",
         descricao="Serviço de retirada de extensões de cílios."),
]

# imagens geradas (pastas) — nome do arquivo dentro de img/
FONTES = {
    "manrope-400": "manrope-latin-400-normal.woff2",
    "manrope-500": "manrope-latin-500-normal.woff2",
    "manrope-600": "manrope-latin-600-normal.woff2",
    "manrope-700": "manrope-latin-700-normal.woff2",
    "cormorant-400": "cormorant-garamond-latin-400-normal.woff2",
    "cormorant-500": "cormorant-garamond-latin-500-normal.woff2",
    "cormorant-600": "cormorant-garamond-latin-600-normal.woff2",
    "cormorant-400-italic": "cormorant-garamond-latin-400-italic.woff2",
}

IMAGENS = {
    "svc-agendar": "servico-linhas.jpg",
    "logo": "logo-ingrid-beauty.png",
    "logo-frase": "logo-ingrid-beauty-com-frase.png",
    "favicon": "favicon.png",
    "hero": "ingrid-hero-700.jpg",
    "hero-big": "ingrid-hero-1000.jpg",
    "espaco": "ingrid-espaco.jpg",
}
for proc in PROCEDIMENTOS:
    IMAGENS["svc-" + proc["id"]] = proc["img"]


def brl(centavos: int) -> str:
    v = f"{centavos / 100:.2f}"
    partes = v.split(".")
    partes[0] = re.sub(r"\B(?=(\d{3})+(?!\d))", ".", partes[0])
    return "R$ " + partes[0] + "," + partes[1]


def wa(mensagem: str) -> str:
    return f"https://wa.me/{WHATSAPP}?text={quote(mensagem)}"


MENSAGENS = {
    "WA_GERAL": wa("Olá, Ingrid! Vim pelo site da Ingrid Beauty e gostaria de saber mais sobre os procedimentos e agendar um atendimento."),
    "WA_LOC": wa("Olá, Ingrid! Vim pelo site e gostaria de receber o endereço e a localização do espaço."),
    "WA_ESP_FIOS": wa("Olá, Ingrid! Vim pelo site da Ingrid Beauty e gostaria de saber mais sobre recuperação de fios naturais e agendar um atendimento."),
    "WA_ESP_LASER": wa("Olá, Ingrid! Vim pelo site da Ingrid Beauty e gostaria de saber mais sobre remoção a laser e agendar um atendimento."),
    "WA_ESP_POSOP": wa("Olá, Ingrid! Vim pelo site da Ingrid Beauty e gostaria de saber mais sobre cuidados pós-operatórios e agendar um atendimento."),
}


def otimizar_servicos() -> None:
    """Reduz as imagens de servico (900px, q76) para o site ficar leve."""
    for proc in PROCEDIMENTOS:
        caminho = IMG / proc["img"]
        if not caminho.exists():
            continue
        im = Image.open(caminho).convert("RGB")
        if im.width > 900:
            im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
        im.save(caminho, "JPEG", quality=76, optimize=True, progressive=True)


def data_uri(caminho: Path) -> str:
    mime = "image/png" if caminho.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(caminho.read_bytes()).decode("ascii")


def card_html(proc: dict) -> str:
    preco = "A consultar" if proc["preco"] is None else brl(proc["preco"])
    alt = f"Imagem ilustrativa de {proc['nome']}"
    return f"""
        <article class="card" data-id="{proc['id']}" data-categoria="{proc['categoria']}" data-reveal>
          <div class="card-media">
            <span class="img cover" style="--img:var(--img-svc-{proc['id']})" role="img" aria-label="{alt}"></span>
            <span class="card-cat">{proc['cat']}</span>
          </div>
          <div class="card-body">
            <h3>{proc['nome']}</h3>
            <p class="card-desc">{proc['descricao']}</p>
            <dl class="card-meta">
              <div><dt>Duração</dt><dd>{proc['duracao']}</dd></div>
              <div><dt>Valor</dt><dd>{preco}</dd></div>
            </dl>
            <div class="card-actions">
              <button class="btn btn-ghost btn-sm" type="button" data-detalhes>Detalhes</button>
              <button class="btn btn-primary btn-sm" type="button" data-add>Adicionar à agenda</button>
            </div>
          </div>
        </article>"""


def dados_js() -> str:
    dados = []
    for proc in PROCEDIMENTOS:
        dados.append({
            "id": proc["id"],
            "nome": proc["nome"],
            "categoria": proc["categoria"],
            "cat": proc["cat"],
            "preco": proc["preco"],
            "duracaoMin": proc["min"],
            "duracaoTexto": proc["duracao"],
            "descricao": proc["descricao"],
        })
    return json.dumps(dados, ensure_ascii=False, indent=2)


def construir(modo: str) -> str:
    """modo: 'single' (base64) ou 'pasta' (caminho relativo)."""
    html = "".join((PARTES / nome).read_text(encoding="utf-8") for nome in
                    ("01-head.html", "02-body.html", "03-script.html"))

    # --- variaveis de imagem (uma copia de cada arquivo) ---
    linhas = []
    for chave, arquivo in IMAGENS.items():
        caminho = IMG / arquivo
        if modo == "single":
            valor = f'url("{data_uri(caminho)}")'
        else:
            valor = f'url("img/{arquivo}")'
        linhas.append(f"  --img-{chave}:{valor};")
    html = html.replace("{{IMGS_VARS}}", "\n".join(linhas))

    # --- fontes (embutidas nos dois modos) ---
    for token_nome, arquivo in FONTES.items():
        token = "{{FONT:" + token_nome + "}}"
        fonte = BASE / "fonts" / arquivo
        if token not in html:
            continue
        payload = base64.b64encode(fonte.read_bytes()).decode("ascii")
        html = html.replace(token, payload)

    # --- favicon ---
    fav = data_uri(IMG / IMAGENS["favicon"]) if modo == "single" else f"img/{IMAGENS['favicon']}"
    html = html.replace("{{IMG:favicon}}", fav)

    # --- cards e dados ---
    html = html.replace("{{CARDS}}", "\n".join(card_html(p) for p in PROCEDIMENTOS))
    html = html.replace("{{DADOS}}", dados_js())

    # --- links e url ---
    for token, valor in MENSAGENS.items():
        html = html.replace("{{" + token + "}}", valor)
    html = html.replace("{{SITE_URL}}", SITE_URL)

    faltando = re.findall(r"\{\{[A-Z_0-9a-z\-]+\}\}", html)
    if faltando:
        raise SystemExit(f"Tokens nao substituidos: {sorted(set(faltando))}")
    return html


def main() -> None:
    otimizar_servicos()

    single = construir("single")
    (BASE / "index.html").write_text(single, encoding="utf-8")

    pasta = BASE / "versao-imagens"
    if (pasta / "img").exists():
        shutil.rmtree(pasta / "img")
    shutil.copytree(IMG, pasta / "img")
    (pasta / "index.html").write_text(construir("pasta"), encoding="utf-8")

    zip_path = BASE / "ingrid-beauty-versao-imagens.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for arquivo in sorted(pasta.rglob("*")):
            if arquivo.is_file():
                z.write(arquivo, Path("ingrid-beauty") / arquivo.relative_to(pasta))

    tamanho = (BASE / "index.html").stat().st_size
    print(f"index.html (arquivo unico): {tamanho/1024/1024:.2f} MB")
    print(f"versao-imagens/index.html : {(pasta/'index.html').stat().st_size/1024:.1f} KB")
    print(f"zip                       : {zip_path.stat().st_size/1024:.1f} KB")
    if tamanho > 6 * 1024 * 1024:
        raise SystemExit("ERRO: index.html passou de 6 MB")


if __name__ == "__main__":
    main()
