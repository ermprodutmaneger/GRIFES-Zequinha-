# PROMPT — Site institucional INGRID BEAUTY (copiar e colar) — v2 com Pix por QR Code

> Cole o bloco abaixo inteiro em um modelo de IA de código (Claude Code, ChatGPT, Cursor, etc.).
> Ele contém todos os dados reais, a estrutura, o design, as regras de agenda e o **sistema de
> pagamento via Pix instantâneo (QR Code dinâmico + Pix Copia e Cola)**.
> Substitua apenas o que estiver marcado como `[A CONFIRMAR]`.

---

```text
Crie um site institucional premium, em arquivo único `index.html`, para a INGRID BEAUTY
(brand de beleza da profissional Ingrid Ferreira), em português do Brasil, no estilo
"Apple" elegante / feminino / premium, com animações bem feitas e foco absoluto em
carregamento rápido no celular.

O site NÃO usa gateway, checkout de cartão ou qualquer processamento de pagamento online:
o Pix é gerado no próprio navegador (BRCode/EMV em JS puro, sem API externa) e a confirmação
do pedido acontece pelo WhatsApp com o comprovante.

====================================================================
1. DADOS REAIS (usar exatamente — não inventar nada além disso)
====================================================================

- Marca: INGRID BEAUTY
- Profissional: Ingrid Ferreira
- Nome da agenda: "Ingrid Ferreira Beauty"
- Área: beleza, sobrancelhas, cuidados estéticos
- WhatsApp: +55 11 91612-1318
  → exibir como (11) 91612-1318
  → link: https://wa.me/5511916121318  (usar encodeURIComponent em toda mensagem)
- Instagram: @ingridbeauty.br  → link https://instagram.com/ingridbeauty.br
- Agenda de referência: https://maapp.com.br/ingridbeauty
- Bio (usar esta redação, com "treze anos" e "pós-operatório"):
  "Expert em Recuperação de fios naturais / Remoção a laser / Especialista em pós-operatório /
   Há treze anos fazendo o simples ficar extraordinário"

DADOS QUE NÃO TENHO → [A CONFIRMAR] (apenas no relatório final, NUNCA no site público):
- Endereço completo e cidade/UF
- Formas de pagamento aceitas
- Preço da avaliação (no site aparece "A consultar")
- Domínio definitivo
- Nome do titular da conta que recebe o Pix
- Cidade do titular da conta Pix (obrigatória no BRCode)

REGRAS ABSOLUTAS DE CONTEÚDO:
- NÃO inventar formação, certificações, registro profissional, número de clientes,
  resultados, depoimentos, endereço, mapa, coordenadas, faixas de preço ou etapas do Spa.
- NÃO calcular ano de fundação a partir de "13 anos". Nunca mencionar "desde 2012/2013".
- NÃO usar a palavra "Depoimentos" em nenhum lugar (nem seção, nem link de menu).
- Avaliação NUNCA é "grátis" — é sempre "A consultar".
- Não prometer resultado, nem anonymity, nem duração do efeito.
- Onde faltar dado público (endereço), usar wording de consulta por WhatsApp.
- Sugestão de preço e pendências vão só no relatório final, nunca no site.

====================================================================
2. ORDEM EXATA DAS SEÇÕES
====================================================================

A) HEADER FIXO TRANSLÚCIDO
   Logo (PNG transparente, só o nome), navegação Sobre / Procedimentos / Espaço / Contato,
   ícone do Instagram, ícone da agenda com contador de itens, botão WhatsApp (CTA),
   menu mobile fullscreen animado (abrir/fechar animado, ESC fecha).

B) HERO
   Logo grande, linha "SOBRANCELHAS · CÍLIOS · CUIDADOS FACIAIS",
   título em 3 linhas com a última em itálico dourado, parágrafo, 2 CTAs,
   foto real com máscara animada, selo circular giratório "Ingrid Beauty · Beleza natural",
   3 tags.

C) MARQUEE (faixa rolando infinitamente)
   Brow Lamination · Design de Sobrancelhas · Henna · Glow Facial ·
   Micropigmentação Shadow · Depilação com Linha

D) SOBRE — "Quem cuidou de você"
   Texto, foto real, efeito de scroll highlight, 3 destaques.

E) CATÁLOGO — "Procedimentos & valores"
   Filtros: Todos · Sobrancelhas · Cílios · Pele e depilação · Avaliação
   9 cards com: nome, descrição, duração, preço, botões "Detalhes" e "Adicionar" (adicionar → agenda).
   Modal de detalhes por card.
   Bloco de especialidades com CTA de WhatsApp por especialidade (mensagem personalizada).

F) ESPAÇO
   Foto real + lightbox, legenda "Um detalhe do espaço Ingrid Beauty."

G) COMO AGENDAR
   3 passos + aviso de que a disponibilidade precisa de confirmação. Layout em 2 colunas com imagem.

H) DEPOIMENTOS → OMITIR (seção inexistente, sem link no menu)

I) FAQ — 6 perguntas e respostas

J) CONTATO
   WhatsApp, Instagram, tabela de horários EXATA, botão "Solicitar localização",
   card marrom com logo + CTA.

K) CTA FINAL — "Seu olhar merece esse cuidado."

L) RODAPÉ
   Logo, frase, navegação, contatos, ano automático, wordmark "INGRID BEAUTY" em contorno.

M) ELEMENTOS FLUTUANTES
   Botão flutuante do WhatsApp com foto redonda + balão dispensável;
   barra mobile de "agendar" que aparece após a 1ª seleção na agenda.

====================================================================
3. CATÁLOGO — 9 PROCEDIMENTOS (exatos)
====================================================================

| Procedimento                                   | Preço       | Duração | Categoria            |
|------------------------------------------------|-------------|---------|----------------------|
| Avaliação                                      | A consultar | 15 min  | Avaliação            |
| Brow Lamination                                | R$ 150,00   | 1h30    | Sobrancelhas         |
| Buço com linha                                 | R$ 18,00    | 10 min  | Pele e depilação     |
| Combo Glow Facial                              | R$ 189,90   | 1h30    | Pele e depilação     |
| Depilação facial na linha (rosto completo)     | R$ 35,00    | 30 min  | Pele e depilação     |
| Design + Henna + Buço com linha                | R$ 75,00    | 30 min  | Sobrancelhas         |
| Design + Spa das Sobrancelhas                   | R$ 70,00    | 40 min  | Sobrancelhas         |
| Micropigmentação Shadow                        | R$ 430,00   | 1h10    | Sobrancelhas         |
| Remoção de cílios                              | R$ 65,00    | 30 min  | Cílios               |

- "Combo Glow Facial" só pode descrever: "Limpeza de pele + peeling ultrassônico + máscara + LED calmante".
- "Design + Spa das Sobrancelhas": NÃO inventar as etapas do Spa.
- Formatar preços em pt-BR (R$ 150,00).
- Nos cálculos de Pix, os valores são usados em centavos (inteiros) e convertidos para string
  com 2 casas decimais no payload ("150.00"), nunca com vírgula.

====================================================================
4. HORÁRIOS (exatos, em America/Sao_Paulo)
====================================================================

Segunda:    14h00 – 17h00
Terça:      9h00 – 11h30  e  13h30 – 17h30
Quarta:     9h30 – 11h30  e  13h30 – 17h30
Quinta:     9h30 – 11h30,  13h30 – 14h30  e  16h30 – 17h30   (3 intervalos, preservar)
Sexta:      9h00 – 11h30  e  13h30 – 17h30
Sábado:     8h30 – 16h00
Domingo:    Fechado

Regras do formulário de data:
- Bloquear datas passadas e domingos.
- Segunda só aceita período da tarde.
- Terça a sábado: manhã e/ou tarde (sem noite).
- Quinta mantém os 3 intervalos.
- A disponibilidade é PREFERÊNCIA, sujeita a confirmação — nunca "horário garantido".
- Nunca exibir a frase "Agendamento confirmado" nem "Pagamento confirmado" automático.

====================================================================
5. AGENDA (drawer lateral acessível)
====================================================================

- Drawer com: procedimentos escolhidos (preço e duração individuais), remover item,
  total estimado, dia preferido, período preferido, horário de preferência, nome, observação opcional
  e a pergunta "Como prefere pagar?".
- Horários de preferência: slots de 30 min gerados a partir dos intervalos reais de cada dia
  e da duração total dos procedimentos (respeitando os intervalos de quinta).
- Persistência em localStorage, com fallback funcional se o storage estiver bloqueado.
- Dinheiro sempre em CENTAVOS internamente (evitar erro de float).
- Avaliação: preço "A consultar" → no total exibir "+ avaliação com valor a confirmar".
- Só avaliação selecionada → total mostra "Total a consultar" (nunca "R$ 0,00").
- "Adicionar" atualiza o contador + animação de voo do card até o ícone da agenda +
  glow dourado + toast de confirmação, sem criar duplicatas.
- Ao enviar, abrir em NOVA ABA, com `rel="noopener"`, e SOMENTE por ação do usuário.

TEMPLATE DA MENSAGEM DE AGENDA (exatamente esta estrutura):

Olá, Ingrid! Vim pelo site da Ingrid Beauty e gostaria de agendar um atendimento.

Procedimentos:
- {procedimento} — {preço} ({duração})

Dia preferido: {data}
Período: {manhã|tarde}
Horário de preferência: {hora}

Nome: {nome}
Observação: {observação}      ← omitir a linha inteira se estiver vazio

Total estimado: R$ {valor}
Avaliação: valor a confirmar.

Pode me confirmar a disponibilidade?

Demais mensagens (usar encodeURIComponent, número 5511916121318):
- Geral (CTA WhatsApp):
  "Olá, Ingrid! Vim pelo site da Ingrid Beauty e gostaria de saber mais sobre os procedimentos e agendar um atendimento."
- Localização:
  "Olá, Ingrid! Vim pelo site e gostaria de receber o endereço e a localização do espaço."
- Botões de especialidade: mensagem personalizada por especialidade, no mesmo tom.

====================================================================
6. SISTEMA DE PAGAMENTO VIA PIX INSTANTÂNEO (QR Code + Copia e Cola)
====================================================================

6.1 — DADOS DO RECEBEDOR (colocar no topo do JS, em um objeto de configuração único e fácil de editar)

| Campo                        | Valor                                      |
|------------------------------|--------------------------------------------|
| Nome do Estabelecimento      | INGRID BEAUTY                              |
| WhatsApp para comprovantes   | 5511916121318                              |
| Chave Pix                    | 11916121318                                |
| Tipo da Chave                | Telefone                                   |
| Nome do Titular da Conta     | INGRID FERREIRA → [A CONFIRMAR]            |
| Cidade                       | [A CONFIRMAR] (obrigatória no BRCode; campo 60) |

  → Deixe essas constantes no topo do script (objeto `PIX`), com comentário indicando o que
  trocar. Se a cidade ainda não estiver confirmada, usar temporariamente "SAO PAULO" APENAS
  como valor funcional do BRCode e listar no relatório final como pendência de confirmação.
  → A chave Pix exibida ao cliente é `11916121318`; o campo 26 do BRCode leva a chave
    no formato aceito pelo tipo "Telefone" (55 + DDD + número: 5511916121318).

6.2 — TABELA DE SERVIÇOS E VALORES PARA O PIX
  Usar EXATAMENTE os 9 procedimentos da seção 3, com os mesmos valores em centavos:
  15000 (Brow Lamination) · 1800 (Buço com linha) · 18990 (Combo Glow Facial) ·
  3500 (Depilação facial na linha) · 7500 (Design + Henna + Buço) · 7000 (Design + Spa) ·
  43000 (Micropigmentação Shadow) · 6500 (Remoção de cílios) · Avaliação = sem valor fixo.

6.3 — OPÇÃO DE PAGAMENTO NO FORMULÁRIO
  Dentro do drawer da agenda, adicionar a pergunta "Como prefere pagar?" com duas opções:

  - Opção A (PADRÃO): "Pagar no local (presencial)"
      → o botão principal continua sendo "Solicitar agendamento pelo WhatsApp" e envia
        direto a mensagem de agenda (template da seção 5).

  - Opção B: "Pagar agora online via Pix"
      → o botão se transforma em "Pagar e Garantir Vaga (R$ [valor total])"
        e abre o MODAL DE CHECKOUT PIX (6.4).
      → Se o total for "Total a consultar" (somente avaliação), a Opção B fica desabilitada
        com o aviso: "O valor da avaliação é definido com a Ingrid — solicite pelo WhatsApp."
      → Se o total incluir avaliação + outros procedimentos, o Pix é gerado com o subtotal
        conhecido e o modal mostra a observação: "Avaliação: valor a confirmar (somado
        após a confirmação da Ingrid)."

6.4 — MODAL DE CHECKOUT (Pix) — requisitos
  a) Modal moderno, fundo escuro com blur (backdrop), foco preso dentro do modal,
     ESC fecha, botão de fechar visível, rolagem interna em telas pequenas.
  b) Resumo do pedido no topo: NOME DO CLIENTE, SERVIÇO(S) e VALOR EM DESTAQUE.
  c) QR CODE DINÂMICO DO PIX, gerado na hora, com o valor exato já embutido.
     Renderizar em SVG (vetor, nítido em qualquer tela) com alta taxa de contraste
     (módulo escuro em fundo branco) e "quiet zone" de 4 módulos.
  d) CÓDIGO PIX COPIA E COLA: campo read-only com o payload completo + botão
     "Copiar código Pix" que muda para "✅ Copiado!" por ~2 s (usar
     `navigator.clipboard.writeText` com fallback `document.execCommand('copy')`
     para navegador antigo/inalcançável).
  e) CARD DE CHAVE DIRETA: exibir a chave Pix `11916121318` com botão "Copiar Chave",
     copiando o texto exato da chave.
  f) CONTADOR REGRESSIVO de 15 minutos: "Este código expira em 14:59 min", atualizando a cada
     segundo; ao zerar, mostrar "Código expirado" + botão "Gerar novo código"
     (o botão verde de confirmação continua disponível). Deixar claro, em texto pequeno,
     que a validade real do QR é definida pelo banco emissor.
  g) PASSO A PASSO SIMPLES (numerado, com ícones):
       1. Abra o app do seu banco e escolha Pix.
       2. Escaneie o QR Code ou cole o código Copia e Cola.
       3. Confirme o valor para [Nome do Titular] e toque no botão abaixo para enviar o comprovante.
  h) BOTÃO GRANDE VERDE: "Já paguei via Pix! Confirmar no WhatsApp" — abre o WhatsApp
     com a mensagem pronta (6.5). Sem gateway, sem cartão, sem formulário de cartão.

6.5 — MENSAGEM DE CONFIRMAÇÃO NO WHATSAPP (formato exato)

Olá! Vim pelo site e realizei o pagamento online via Pix:
Nome: [Nome do cliente]
Serviço: [Serviço] (R$ [Valor])
Data/Horário: [Data e Hora se houver]
Pagamento: Pago via Pix (Pedido #PED-XXXX)
Poderia confirmar o meu pedido/horário?

  → Gerar um ID de pedido no formato PED-XXXX (4 caracteres alfanuméricos) por checkout.
  → Incluir data/horário preferidos quando já informados; omitir a linha se não houver.
  → Abrir em nova aba, `rel="noopener"`, somente por ação do usuário, via
    `https://wa.me/5511916121318?text=` + encodeURIComponent.

6.6 — REGRAS TÉCNICAS OBRIGATÓRIAS DO PIX
  a) Usar o padrão oficial do Banco Central (BACEN / EMV BRCode) com cálculo de CRC16
     em JavaScript puro (polinômio 0x1021, init 0xFFFF, sem sinal, sobre o payload completo).
  b) Estrutura mínima do payload (modo byte, sempre com o campo de tamanho):
       00  01 "01"                                     (Payload Format Indicator)
       26  <len> "br.gov.bcb.pix" + "01" + <chave>   (Merchant Account Information)
       52  0000                                        (Merchant Category Code)
       53  986                                         (moeda BRL)
       54  <valor com ponto, ex. "150.00">            (se houver valor)
       58  BR                                          (país)
       59  <nome até 25 caracteres>                    (Merchant Name)
       60  <cidade até 15 caracteres>                  (Merchant City)
       62  05 03 "***"                                (Additional Data → txId estático)
       63  04 <CRC16 em 4 caracteres hex>              (CRC)
     - No campo 62 (txId), utilizar o padrão estático oficial "***" para garantir 100% de
       compatibilidade com qualquer banco (Nubank, Mercado Pago, Itaú, Bradesco, Inter, Caixa etc.),
       evitando erros de QR Code inválido. (Opcional: tornar o txId configurável para um ID
       alfanumérico do pedido, mantendo "***" como padrão.)
  c) O QR Code deve ser GERADO NO NAVEGADOR, em JS puro (Vanilla JS), leve, sem dependências
     externas pesadas: implementar o gerador da matriz de QR (modo byte, com level M e
     versão automática conforme o tamanho do payload) e renderizar como `<svg>` com um
     `<path>` por linha de módulos. Se usar biblioteca, ela deve ser embutida no HTML
     (sem CDN, sem chamada a API externa) e o site precisa funcionar 100% OFFLINE
     quanto à geração do código.
  d) NUNCA enviar o Pix para servidor ou API de terceiro: o payload é montado e validado
     localmente (conferir o CRC gerado).
  e) Nenhum dado de cartão, CVV ou credencial deve existir no site.
  f) O botão de confirmação do WhatsApp só abre a conversa — o site NÃO deve afirmar que o
     pagamento foi confirmado; a confirmação é da Ingrid. Nunca exibir "Pagamento confirmado".
  g) Testar o payload gerado: validar o CRC16, o tamanho dos campos e colar o código em um
     app de banco para leitura. Incluir no relatório o payload de exemplo gerado.

====================================================================
7. IDENTIDADE VISUAL
====================================================================
Paleta (usar exatamente):
  #2D211B  marrom quase preto (texto principal, cards)
  #F7F2E8  creme (fundos)
  #B28A37  dourado (acentos, itálico do título, ícones)
  #E9DCC9  bege (bordas, secundário)
  #FFFFFF  branco (cards, texto sobre marrom)

Tipografia:
  Títulos  → Cormorant Garamond (serifada elegante)
  Texto    → Manrope (sans-serif, geométrica)
  Fallback de sistema sempre declarado. De preferência fontes variáveis (woff2 único por família/peso),
  com `font-display: swap` e preload das críticas.

Tom: sofisticado, acolhedor, feminino, minimalista, muito espaço em branco,
cantos suaves, sombras discretas, nada de "template genérico".

Animações: revelação on-scroll (IntersectionObserver), micro-interações nos botões,
hover suave, marquee, selo giratório, contadores, transições suaves (200–600 ms).
SEMPRE respeitar `prefers-reduced-motion: reduce` (desabilitar/parar animações).

====================================================================
8. LOADER
====================================================================
- Só na 1ª visita (usar localStorage/sessionStorage), 1,2 a 1,8 s.
- Fundo creme, logo transparente + frase, varredura dourada, fade da frase.
- NÃO esperar o carregamento de todas as fotos.
- NUNCA bloquear o conteúdo se o JS falhar (o site tem que aparecer mesmo sem JS).
- Respeitar prefers-reduced-motion.

====================================================================
9. IMAGENS
====================================================================
- `logo-ingrid-beauty.png` → só o nome, fundo TRANSPARENTE (alfa real), ≤ 640 px de largura.
- `logo-ingrid-beauty-com-frase.png` → nome + frase exata, alfa real, sem halo,
  sem redesenho tipográfico, sem mudar letras/proporções/cores da marca.
- `favicon.png` → apenas a letra "I" isolada (não inventar símbolo), 128×128.
- `IMG_3553.jpeg` → preservar SEM retoque (sem recriação por IA, sem troca de fundo,
  sem retoque de aparência): só compressão/reframe responsivo.
- Imagens de serviço: still-life elegante gerado por IA na paleta da marca,
  SEM rostos e SEM prometer resultado; quando a foto do procedimento não existir,
  usar placeholder de inicial elegante da marca.
- NÃO usar fotos de banco.
- Nunca ampliar miniatura borrada.

====================================================================
10. ACESSIBILIDADE
====================================================================
- `alt` em todas as imagens; `role` + `aria-label` nos controles.
- Navegação 100% por teclado e foco visível.
- ESC fecha menu mobile, modal de detalhes, lightbox, drawer da agenda e modal Pix.
- Foco gerenciado: ao abrir, mover o foco para dentro; ao fechar, devolver ao gatilho.
- Bloquear interação com o fundo enquanto um overlay estiver aberto.
- Todo campo de formulário com label associado.
- Contraste adequado e texto legível.
- Botões de copiar (Pix) com feedback textual visível (não só ícone).

====================================================================
11. TÉCNICO / PERFORMANCE (prioridade mobile)
====================================================================
- Entrega: `index.html` ÚNICO, com CSS, JS, fontes e imagens embutidas (base64/data URI),
  sem libs pesadas, sem dependência de servidor, pronto para Vercel/Netlify.
- Tamanho final: MENOR que 6 MB (meta: ~1 MB). O gerador de QR Code em JS puro não pode
  inflar o bundle de forma relevante.
- Fotos: ~700 px na principal, versão ampliada ≤ 1000 px; logos ≤ 640 px.
- Imagens com carregamento sob demanda (lazy) + placeholder elegante.
- Fontes: 3 woff2 variáveis (~100 KB) fora do HTML quando usar pasta de imagens.
- `netlify.toml` com cache de 1 ano (immutable) para `/img/*` e `/fonts/*`.
- Meta de teste em 390 px: ≤ 10 requisições na carga inicial, FCP < 200 ms,
  sem rolagem horizontal, 0 erros no console.
- Sem jQuery, sem Bootstrap, sem frameworks. JS vanilla, bem organizado.

====================================================================
12. SEO / METADADOS
====================================================================
- `<title>`: "Ingrid Beauty — Sobrancelhas e cuidados estéticos"
- `<meta name="description">` com a descrição definida (sem cidade até confirmação).
- Favicon, canonical, Open Graph e Twitter Card.
- JSON-LD `BeautySalon` contendo SOMENTE: nome, imagem, telefone, url, instagram,
  areaServed, preçoRange, horário de funcionamento — SEM endereço, SEM reviews,
  SEM coordenadas, SEM faixa de preço inventada.
- A URL da og:image e a canonical devem ser ABSOLUTAS e PÚBLICAS
  (nunca base64). Use por padrão `https://<dominio>/og.jpg` e ajuste em runtime
  via JS para `window.location.origin` + '/og.jpg'.
- og.jpg: 1200×630, com a marca e a identidade visual.

====================================================================
13. ENTREGÁVEIS
====================================================================
1. `index.html` (tudo embutido, incluindo o gerador de Pix/QR Code)
2. `logo-ingrid-beauty.png`, `logo-ingrid-beauty-com-frase.png`, `favicon.png`
3. `og.jpg` (1200×630)
4. Versão alternativa com pasta `img/` (mesma página, imagens externas)
5. ZIP completo pronto para Netlify/GitHub (index.html na raiz + img/ + fonts/ + og + favicon + netlify.toml)
6. ZIP de arquivo único
7. Capturas de tela desktop e mobile — incluindo o modal de checkout Pix aberto (QR + Copia e Cola)

====================================================================
14. RELATÓRIO FINAL (em português)
====================================================================
- Resumo do que foi entregue
- Pendências [A CONFIRMAR]: endereço completo, cidade/UF, formas de pagamento,
  preço da avaliação, domínio definitivo, nome do titular da conta Pix e cidade do titular
- Sugestão de preço do projeto (fora do site)
- Passo a passo de publicação: GitHub (repo NOVO, só do site) + Vercel, e Netlify via ZIP
- Como trocar a URL base64/placeholder pelo domínio final
- Como trocar chave Pix, titular e cidade (um único objeto de configuração no topo do JS)
- Payload Pix de exemplo gerado + validação do CRC16
- Resultado dos testes (peso, requisições, FCP, erros)

Comece pelo `index.html` final (não entregue arquivos soltos de demonstração),
depois gere os artefatos derivados, valide tudo e só então entregue.
```

---

## Como usar

1. Copie o bloco do prompt acima (do ` ```text ` ao ` ``` ` final).
2. Cole no Claude Code / ChatGPT / Cursor.
3. O modelo gera o site + o sistema de Pix (QR Code dinâmico + Copia e Cola + confirmação no WhatsApp).
4. Publique: Netlify (*Deploy manually* arrastando o ZIP) ou GitHub (repo novo) + Vercel.

**Observação:** a chave Pix (`11916121318`) e o WhatsApp (`5511916121318`) já estão preenchidos
no prompt. Só o **nome do titular** e a **cidade** do titular da conta ficam como `[A CONFIRMAR]`
— são dois campos do BRCode (59 e 60) e ficam em um único objeto de configuração no topo do JS.
