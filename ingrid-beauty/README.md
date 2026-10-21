# Ingrid Beauty — site institucional + agenda (WhatsApp)

Site único, estático, em português do Brasil, para a **Ingrid Beauty** (Ingrid Ferreira).
Identidade visual premium (marrom profundo, creme, dourado), tipografia Cormorant Garamond + Manrope,
carregamento inicial animado, catálogo com 9 procedimentos, agenda de procedimentos com total em centavos,
escolha de dia/período/horário dentro dos horários reais e envio da solicitação pelo WhatsApp.

---

## 1. Arquivos entregues

| Arquivo | Para que serve |
| --- | --- |
| `index.html` | **Site completo em arquivo único** (HTML + CSS + JS + imagens em base64 + fontes embutidas). 1,64 MB. É este que vai para a raiz do site. |
| `logo-ingrid-beauty.png` | Logo só com o nome, fundo transparente (canal alfa real), 640 px de largura. |
| `logo-ingrid-beauty-com-frase.png` | Logo com o nome **e** a frase “Há treze anos, fazendo o simples ficar extraordinário”, fundo transparente. |
| `favicon.png` | Favicon 128×128 — inicial “I” isolada da própria marca (sem símbolo inventado). |
| `og.jpg` | Imagem de compartilhamento 1200×630 (marca + identidade visual + foto real). |
| `versao-imagens/` | **Versão alternativa** com as imagens na pasta `img/` (index.html + img/*). |
| `ingrid-beauty-versao-imagens.zip` | ZIP da versão alternativa (pronto para subir no GitHub). |
| `img/` | Todos os arquivos de imagem usados pela versão alternativa. |
| `screenshots/` | Capturas de tela no desktop e no mobile. |
| `scripts/` | Scripts de build (opcional, só para manutenção futura). |

### Pastas para publicar
- **Publicação simples:** envie `index.html` + `og.jpg` + `favicon.png` (o site funciona sozinho, sem outras pastas).
- **Publicação com a pasta `img/`:** use `versao-imagens/` (envie a pasta inteira).

---

## 2. O que já está pronto

- Carregamento inicial (1,5 s) com a logo, a frase e brilho dourado — só no primeiro acesso do navegador.
- Header fixo translúcido, menu mobile em tela cheia com animação circular, ícones de Instagram e de agenda com contador.
- Hero com logo, selo giratório “Ingrid Beauty · Beleza natural”, foto real da Ingrid e etiquetas.
- Marquee com os procedimentos em destaque.
- Seção “Oi, eu sou a Ingrid.” com destaque do texto durante a rolagem e 3 diferenciais.
- Catálogo com filtros (Todos · Sobrancelhas · Cílios · Pele e depilação · Avaliação), 9 procedimentos, modal de detalhes e “Adicionar à agenda”.
- Bloco “Conheça também minhas especialidades” (recuperação de fios naturais, remoção a laser, cuidados pós-operatórios) com botão de consulta pelo WhatsApp.
- Seção do espaço com a foto real e lightbox.
- Passo a passo de como agendar + aviso de que o horário é confirmado pela Ingrid.
- FAQ com as 6 perguntas solicitadas.
- Contato com WhatsApp, Instagram, tabela completa de horários e botão “Solicitar localização”.
- CTA final, rodapé com a marca em contorno e ano automático.
- Botão flutuante do WhatsApp com foto da Ingrid e balão dispensável + barra mobile com quantidade, total e “Ver minha agenda”.
- **Pagamento via Pix** (chave `11916121318`) dentro do modal e da agenda, com botão de copiar a chave — o pagamento é feito **após** a confirmação do agendamento e o comprovante é enviado pelo WhatsApp.

### Regras já implementadas no código
- Valores calculados em centavos; avaliação aparece como **“A consultar”** e soma apenas os valores conhecidos, exibindo “+ avaliação com valor a confirmar”.
- Se a agenda tiver **somente a avaliação**, o total aparece como **“Total a consultar”** (nunca R$ 0,00).
- Sem duplicar procedimento; a agenda fica salva no `localStorage` (se o navegador bloquear, o fluxo continua funcionando na sessão).
- Datas no fuso **America/Sao_Paulo**: não aceita datas passadas nem domingos; segunda-feira só à tarde; terça a sábado, manhã ou tarde; nenhum período noturno; os três períodos de quinta-feira (9h30–11h30, 13h30–14h30 e 16h30–17h30) são preservados.
- O horário sugerido respeita os intervalos e a duração total dos serviços escolhidos — e é sempre tratado como **preferência**, nunca como vaga confirmada.
- Nenhum link abre o WhatsApp sozinho: só após clique, em nova aba com `noopener`.
- O site nunca mostra “agendamento confirmado”; ele apenas prepara a solicitação.

---

## 3. Dados que ainda precisam de confirmação

| Item | Situação atual no site |
| --- | --- |
| **Endereço completo** | **[A CONFIRMAR]** — não foi informado. O site pede o endereço pelo WhatsApp (sem mapa genérico e sem coordenadas fictícias). |
| **Bairro e cidade** | **[A CONFIRMAR]** — não deduzido pelo DDD. |
| **Formas de pagamento** | **[A CONFIRMAR]** — a FAQ orienta a consultar pelo WhatsApp; o Pix já está liberado. |
| **Preço da avaliação** | **[A CONFIRMAR]** — aparece como “A consultar” (não foi anunciado como gratuito). |
| **Domínio definitivo** | **[A CONFIRMAR]** — o build usa `https://ingrid-beauty.vercel.app` como placeholder. Troque em 2 lugares (veja abaixo). |

**Onde trocar o domínio (2 pontos):**
1. `scripts/build.py` → constante `SITE_URL` (e rode `python3 scripts/build.py` para reconstruir), **ou**
2. direto no `index.html` gerado: procure `https://ingrid-beauty.vercel.app` e troque pelo domínio final (3 ocorrências: `og:url`, `og:image`, `canonical` + o JSON-LD `url`).

Depois de publicar, a imagem de compartilhamento deve usar a URL pública absoluta, por exemplo:
`https://www.seudominio.com.br/og.jpg` (nunca base64).

**Quando o endereço chegar**, dá para acrescentar: link “Como chegar” no Google Maps, endereço no bloco de Contato, `address` no JSON-LD e a cidade no SEO (title/description).

---

## 4. Preço sugerido para a criação do site

**R$ 1.200,00** para o site institucional completo com catálogo, agenda de procedimentos, escolha de dia/horário, envio por WhatsApp, pagamento via Pix e layout responsivo (entrega em arquivo único + versão com pasta de imagens + imagens da marca tratadas + imagem de compartilhamento).

Condições opcionais:
- R$ 250,00 —_updates_ (novos procedimentos, novos valores, novos prints de depoimentos, ajuste de textos/horários) nos primeiros 90 dias, via WhatsApp.
- R$ 150,00 — atualização trimestral de fotos e do catálogo.
- Hospedagem: Vercel (plano gratuito) / domínio ~R$ 40–60/ano, em nome da profissional.

---

## 5. Passo a passo de publicação

### GitHub
1. Abra o repositório no GitHub.
2. Clique em **Add file → Upload files**.
3. Envie `index.html`, `og.jpg` e `favicon.png` (e, se quiser a versão com imagens, envie a pasta `versao-imagens` inteira).
4. Clique em **Commit changes** (escreva algo como “Ingrid Beauty — site”).
5. Repita o processo para cada arquivo necessário (o GitHub permite subir vários arquivos de uma vez).

### Vercel
1. Entre em [vercel.com](https://vercel.com) e conecte a conta do GitHub.
2. **Add New → Project → Import** e escolha o repositório.
3. Em **Root Directory**, aponte para a pasta que contém o `index.html` (ex.: `ingrid-beauty` ou `versao-imagens`).
4. Em **Framework Preset**, deixe **Other** (site estático) — não é preciso comando de build.
5. Clique em **Deploy**. Em poucos segundos o site fica no ar (URL `.vercel.app`).
6. Depois: **Settings → Domains**, adicione o domínio definitivo e o `og:image`/`og:url` passam a usar `https://www.seudominio.com.br`.

> Para publicar pelo iPad: abra o Vercel no navegador, importe o repositório e faça o deploy pelos botões — não é preciso terminal.

---

## 6. Como regerar o site (opcional)

```bash
cd ingrid-beauty
python3 scripts/preparar-imagens.py   # logos, favicon, fotos redimensionadas
python3 scripts/gerar-og.py            # imagem de compartilhamento
python3 scripts/build.py               # gera index.html, versao-imagens/ e o ZIP
```

Os preços, durações e descrições dos procedimentos ficam em uma lista única em `scripts/build.py`
(bloco `PROCEDIMENTOS`) — é só editar lá e rodar o build.

---

## 7. Validações executadas

- JavaScript sem erros (Chrome headless, desktop e mobile) — 0 erros de console/página.
- Nenhuma imagem quebrada: 15/15 imagens com fundo aplicado, nas duas versões.
- Transparência real (canal alfa) nos PNGs, sem retângulo de fundo e sem halo nas bordas.
- 9 procedimentos com valores e durações exatamente como enviados (incluindo **R$ 189,90** do Combo Glow Facial).
- Horários exatamente iguais aos fornecidos.
- Filtros, agenda, remoção, cálculo do total, “A consultar” da avaliação e bloqueio de datas passadas/domingos testados.
- Links do WhatsApp com número **5511916121318** e mensagens no formato pedido.
- Sem rolagem horizontal no celular (390 px) e loader sempre encerrado (inclusive sem JavaScript).
- Modais, lightbox, drawer e menu fecham com ESC, com foco preso e foco visível.
- Sem depoimentos e sem qualquer dado inventado.
