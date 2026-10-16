# GRIFES Zequinha — loja de demonstração com Checkout Transparente (Mercado Pago)

E-commerce **estático** (HTML + CSS + JS, sem framework) feito para rodar no **Cloudflare Pages** com
pagamento via **Checkout Transparente do Mercado Pago**:

- **Payment Brick** (`sdk.mercadopago.com/js/v2`) renderizando cartão, Pix e boleto dentro do site;
- **Orders API** (`POST /v1/orders` e `GET /v1/orders/{id}`) no backend;
- **Cloudflare Pages Functions** (`functions/`) como backend mínimo — é onde o `ACCESS_TOKEN` vive;
- **Credenciais por variável de ambiente** (`MP_PUBLIC_KEY` + `MP_ACCESS_TOKEN`), nunca no código;
- **Modo de teste sinalizado em todas as telas** (faixa amarela fixa, rodapé, avisos no checkout);
- **MODO SIMULAÇÃO** automático enquanto não houver credenciais — a loja inteira funciona e nenhum
  pedido é enviado ao Mercado Pago (útil para revisar o layout antes de colar as chaves).

> ⚠️ **Loja de teste.** Produtos, preços, imagens, estoque e frete são **fictícios**. Toda a jornada de
> pagamento é feita com **credenciais de teste** do Mercado Pago: **nenhum valor real é cobrado**.

---

## 1. O que já está pronto

| Tela | Arquivo | O que faz |
| --- | --- | --- |
| Home | `public/index.html` | Vitrine com destaques, banner, explicação do fluxo |
| Catálogo | `public/catalogo.html` | Busca, filtro por categoria e ordenação |
| Produto | `public/produto.html` | Ficha completa, tamanho, quantidade, relacionados |
| Carrinho | `public/carrinho.html` | Quantidades, frete **simulado** por CEP, resumo |
| Checkout | `public/checkout.html` | Dados do comprador + entrega + **Payment Brick** |
| Confirmação | `public/confirmacao.html` | Status da ordem, QR Code do Pix, boleto, reconsulta |
| Diagnóstico | `public/diagnostico.html` | Checklist das credenciais, passo a passo, cartões de teste |
| 404 | `public/404.html` | Página de erro do Pages |

Backend (Pages Functions):

| Endpoint | Arquivo | Papel |
| --- | --- | --- |
| `GET /api/config` | `functions/api/config.js` | Devolve a **public key** e o modo (teste/simulação). Nunca devolve o access token |
| `GET /api/produtos` | `functions/api/produtos.js` | Catálogo (fonte única de preços) |
| `POST /api/frete` | `functions/api/frete.js` | Frete **fictício** por CEP + peso |
| `POST /api/orders` | `functions/api/orders.js` | Recalcula valores e chama `POST /v1/orders` |
| `GET /api/orders/{id}` | `functions/api/orders/[id].js` | Consulta `GET /v1/orders/{id}` |
| `GET /api/diagnostico` | `functions/api/diagnostico.js` | Checklist + teste real de `GET /users/me` |
| `POST /api/webhook` | `functions/api/webhook.js` | Notificações do Mercado Pago (assinatura + log) |

Bibliotecas internas: `functions/_lib/catalogo.js` (produtos e validação),
`functions/_lib/frete.js` (frete simulado), `functions/_lib/mercado-pago.js`
(credenciais, payload da Orders API, normalização de status, simulação).

---

## 2. Rodar localmente

```bash
npm install
cp .dev.vars.example .dev.vars     # depois cole as credenciais de TESTE
npm run dev                        # http://localhost:8788
```

Sem credenciais o site abre em **MODO SIMULAÇÃO**: você navega, calcula frete e "paga" com o painel de
simulação (resultado **aprovado / pendente / recusado**) para validar as telas de confirmação.

```bash
npm run check      # confere estrutura, assets, credenciais e vazamentos antes do deploy
```

---

## 3. Onde colocar as credenciais de teste (os "campos" para preencher depois)

> 🔐 **Nunca** coloque `MP_ACCESS_TOKEN` em `public/` (HTML/JS/CSS) nem o comite: ele é lido somente
> pelas Pages Functions, via variável de ambiente (`.dev.vars` local ou *Secret* no Cloudflare).
> Se uma credencial vazar (print, chat, commit), rotacione-a no painel do Mercado Pago.

### 3.1 Localmente — arquivo `.dev.vars` (ignorado pelo Git)

```ini
MP_PUBLIC_KEY="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MP_ACCESS_TOKEN="TEST-xxxxxxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx"
```

`cp .dev.vars.example .dev.vars` e cole os valores. **Não** versione esse arquivo.

### 3.2 Em produção — Cloudflare Pages

Dashboard da Cloudflare → **Workers & Pages** → projeto → **Settings** → **Variables and Secrets**:

| Variável | Tipo | Onde é usada |
| --- | --- | --- |
| `MP_PUBLIC_KEY` | Text | Enviada ao navegador (`/api/config`) para o Payment Brick |
| `MP_ACCESS_TOKEN` | **Secret (encrypted)** | Somente nas Functions; nunca chega ao navegador |
| `MP_WEBHOOK_SECRET` | **Secret** (opcional) | Valida a assinatura `x-signature` do webhook |
| `MP_MODO` | Text | `auto` (padrão), `teste` ou `producao` |

Depois de salvar, **refaça o deploy** — Functions só leem variáveis novas em um novo deployment.

### 3.3 Onde pegar as credenciais

Painel do Mercado Pago → **Suas integrações** (ou *Seu negócio → Configurações → Gerenciar integrações e
aplicações*) → selecione a aplicação → aba **Credenciais de teste**:

- **Public Key de teste** → começa com `TEST-`
- **Access Token de teste** → começa com `TEST-` (contas/aplicações novas podem mostrar `APP_USR-`;
  nesse caso as credenciais são *de teste* mesmo sem o prefixo — marque `MP_CREDENCIAL_TESTE=true`
  para a faixa de aviso continuar aparecendo)

> Rode `npm run check` ou abra `/diagnostico.html` depois de colar: a página mostra o que está OK,
> o que falta e o resultado real do `GET /users/me` com a sua credencial.

### 3.4 Validar as credenciais em 1 comando

```bash
npm run testar:mp                       # bateria completa (cartão aprovado/recusado/pendente, Pix e boleto)
npm run testar:mp -- --cenario=pix
npm run testar:mp -- --cenario=recusado --verbose
npm run testar:mp -- --cancelar        # cancela os pedidos pendentes criados no teste
npm run testar:mp -- --frete-como-item # testa o fallback do frete como linha de item
```

O script (`scripts/testar-mercado-pago.mjs`) usa **o mesmo código de produção da loja** para montar e
ler os pedidos e executa, em ordem:

| Passo | O que prova |
| --- | --- |
| 1 | `MP_PUBLIC_KEY` e `MP_ACCESS_TOKEN` foram carregados (mascarados na saída) |
| 2 | `GET /users/me` — access token válido + qual conta/aplicação está respondendo |
| 3 | `GET /v1/payment_methods` — cartão (visa/master), **pix** e **boleto** ativos |
| 4 | `POST /v1/card_tokens` — public key válida e cartão de teste tokenizado (`live_mode`) |
| 5 | `POST /v1/orders` — **cria uma ordem real de teste** com o payload idêntico ao do site |
| 6 | `GET /v1/orders/{id}` — reconsulta e a normalização usada na tela de confirmação |

O resultado esperado por cenário (nome do titular controla o desfecho):

| Cenário | Cartão / meio | Resultado esperado |
| --- | --- | --- |
| `aprovado` | 5031 4332 1540 6351, titular **APRO** | `approved` / `accredited` |
| `recusado` | mesmo cartão, titular **OTHE** | `rejected` / `cc_rejected_other_reason` |
| `pendente` | mesmo cartão, titular **CONT** | `pending` / `in_process` |
| `pix` | `pix` (sem token) | `pending` + `qr_code` no retorno |
| `boleto` | `bolbradesco` | `pending` + `ticket_url`/linha digitável |

> ⚠️ O script precisa de **saída de rede para `api.mercadopago.com`**. Ele não funciona em
> sandboxes/ambientes com egress bloqueado (nesse caso ele avisa e sai com erro) — rode na sua máquina
> ou direto no Cloudflare Pages.

**Ver o dinheiro (de teste) no painel:** entre em `mercadopago.com.br` com o **usuário de teste**
(ex.: `TESTUSER3608931920570283869`, senha e código de verificação fornecidos no painel de contas de
teste) para acompanhar as ordens e pagamentos criados com essas credenciais.

---

## 4. Deploy no Cloudflare Pages

**Opção A — integração com Git**
1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → repositório.
2. Build command: *(vazio)* · Build output directory: `public`.
3. Adicione as variáveis da seção 3.2 e faça o deploy.

**Opção B — Wrangler (CLI)**

```bash
npm run deploy          # branch de produção
npm run deploy:preview  # deploy de preview
```

`wrangler.toml` já configura `pages_build_output_dir = "public"` e as variáveis públicas
(`MP_MODO`, `MP_LOJA_NOME`, etc.). **Segredos não ficam no `wrangler.toml`** — use
`wrangler pages secret put MP_ACCESS_TOKEN` ou o painel.

---

## 5. Como o pagamento funciona (fluxo real do código)

```
1. Navegador  ──GET /api/config──────────────►  Pages Function devolve public key + modo (teste/simulação)
2. Navegador  ──POST /api/frete──────────────►  frete FICTÍCIO por CEP + peso (economico/expresso/retirada)
3. Navegador  ──Payment Brick (sdk.mercadopago.com)──►  tokeniza o cartão com a PUBLIC_KEY
4. Navegador  ──POST /api/orders  {itens, frete_id, cliente, entrega, pagamento:{token,...}}──►
5. Function   ──recalcula preços DO CATÁLOGO──► total = itens + frete
6. Function   ──POST https://api.mercadopago.com/v1/orders (Bearer ACCESS_TOKEN)
                 { type: online, processing_mode: automatic, capture_mode: automatic_async,
                   total_amount, external_reference, payer, items, shipment, transactions.payments[] } ──►
7. Mercado Pago devolve id/status/payment_method (inclui qr_code do Pix ou ticket_url do boleto)
8. Navegador  ──redireciona──►  /confirmacao.html?id=ORD...  ──GET /api/orders/{id}──► GET /v1/orders/{id}
```

Decisões de segurança aplicadas:

- o preço **nunca** vem do navegador: `functions/_lib/catalogo.js` é a fonte única e o total é
  recalculado no servidor (testado: mandar `preco_unitario: 1` no corpo é ignorado);
- `X-Idempotency-Key` único por pedido, evitando cobrança duplicada em reenvio;
- o `ACCESS_TOKEN` só existe dentro das Functions (o navegador recebe apenas a public key);
- a confirmação de valores é registrada em `aviso_valor` quando `total_amount` divergir do total calculado;
- o front-end compara `formData.transaction_amount` com o total do servidor e avisa no console se divergir.

---

## 6. Testando no modo de teste

**Cartões de teste (Brasil)** — o nome do titular define o resultado:

| Titular | Resultado | Observação |
| --- | --- | --- |
| `APRO` | Aprovado | `status_detail: accredited` |
| `OTHE` | Recusado | `cc_rejected_other_reason` |
| `CONT` | Pendente | `pending_waiting_payment` |

| Bandeira | Número | CVV | Validade |
| --- | --- | --- | --- |
| Mastercard | 5031 4332 1540 6351 | 123 | 11/30 |
| Visa | 4235 6477 2802 5682 | 123 | 11/30 |

> A lista oficial e atualizada fica em
> <https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/test/cards>

**Pix / boleto:** gere como comprador de teste; a tela de confirmação mostra o *copia e cola* / linha
digitável e reconsulta o status a cada 15 segundos.

**Checklist sugerido de testes**
0. `npm run testar:mp` → valida credenciais, tokenização e criação/reconsulta de ordens na API real.
1. Cartão aprovado → confirmação verde com valor pago e itens.
2. Cartão recusado → confirmação vermelha com o motivo (`status_detail`) e opção de tentar de novo.
3. Pix pendente → QR Code / copia e cola exibidos; status muda depois do pagamento de teste.
4. Frete: trocar entre econômico/expresso/retirada e conferir o valor no resumo.
5. Frete grátis: subtotal ≥ `MP_FRETE_GRATIS_ACIMA_DE` (padrão R$ 299,90) zera o frete econômico.
6. CEP inválido, CPF inválido, carrinho vazio → mensagens de validação em português.
7. Webhook: `npm run tail` (ou `wrangler pages deployment tail`) enquanto paga uma ordem de teste.

---

## 7. Modo de teste sempre visível

- **Faixa fixa no topo** em todas as páginas: "Modo de teste" ou "Modo simulação" (`public/js/layout.js`);
- **Rodapé** com o aviso "Modo de teste (sandbox) — nenhuma cobrança real";
- **Checkout**: aviso antes do Brick e explicação de como o pagamento é processado;
- **Confirmação**: selo de ambiente de teste e, em pedidos simulados, aviso explícito de que nada foi
  enviado ao Mercado Pago;
- **`/diagnostico.html`**: mostra `MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN` (mascarado), modo detectado e a
  resposta real de `GET /users/me`.

Para esconder a faixa em produção real: use credenciais de produção e `MP_MODO="producao"`.

---

## 8. Frete fictício

`functions/_lib/frete.js` calcula por **faixa de CEP** (prefixo) × **peso** do carrinho:

| Modalidade | Valor | Prazo |
| --- | --- | --- |
| Entrega Econômica | R$ 14,90 + R$ 4,20/kg + R$ 6,00 × multiplicador da região — **grátis** acima de `MP_FRETE_GRATIS_ACIMA_DE` | +2 a +7 dias por região |
| Entrega Expressa | econômico × 1,9 | 2 a 4 dias úteis |
| Retirar no Atelier | R$ 0,00 | 1 a 2 dias úteis |

Nenhuma transportadora é consultada. Para trocar por um cálculo real, substitua apenas
`calcularOpcoesDeFrete()` mantendo o mesmo formato de retorno — o checkout e a Orders API não mudam.

---

## 9. Variáveis de ambiente (referência)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `MP_PUBLIC_KEY` | Sim (para o Brick) | Public key **de teste**. Vai para o navegador |
| `MP_ACCESS_TOKEN` | Sim (para cobrar) | Access token **de teste**. Só no servidor — configure como *Secret* |
| `MP_MODO` | Não (`auto`) | `auto` \| `teste` \| `producao` |
| `MP_SIMULACAO` | Não | `true` força simulação mesmo com credenciais |
| `MP_CREDENCIAL_TESTE` | Não | `true` quando a credencial de teste vem sem prefixo `TEST-` (ex.: apps criados dentro de uma **conta de teste**, que usam `APP_USR-`) |
| `MP_EMAIL_COMPRADOR_TESTE` | Não | E-mail do comprador de teste — aparece como dica e pré-preenche o campo no checkout |
| `MP_APP_ID` / `MP_USER_ID` | Não | Apenas exibição no `/diagnostico.html` e conferência com o script de teste |
| `MP_WEBHOOK_SECRET` | Não | Assinatura secreta do webhook (`x-signature`) |
| `MP_FRETE_GRATIS_ACIMA_DE` | Não (`299.90`) | Subtotal que zera o frete econômico |
| `MP_MAX_ITENS_POR_PEDIDO` | Não (`10`) | Limite de linhas por pedido |
| `MP_LOJA_NOME` | Não | Nome exibido no diagnóstico |
| `MP_FRETE_COMO_ITEM` | Não | `true` manda o frete como linha de item (fallback se a Orders API recusar `shipment.cost`) |
| `MP_ENVIAR_ISSUER_ID` | Não | `true` envia `issuer_id` dentro de `payment_method` (a Orders API costuma dispensar: o emissor vem do token) |

Aliases aceitos para quem usa outro padrão de nomes:
`MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_ACCESS_TOKEN`, `PUBLIC_KEY`, `ACCESS_TOKEN`.

---

## 10. Webhook (notificações)

1. Painel do Mercado Pago → **Suas integrações** → sua aplicação → **Webhooks** → URL de produção:
   `https://SEU-DOMINIO.pages.dev/api/webhook` → evento **Order** (Orders API).
2. Cole a *assinatura secreta* em `MP_WEBHOOK_SECRET` para validarmos o `x-signature` (HMAC-SHA256).
3. Cada notificação consulta a ordem no Mercado Pago e grava no log do deployment:

```bash
npm run tail     # wrangler pages deployment tail
```

Como o Pages não tem banco de dados, o status é apenas logado. Para persistir pedidos, troque o
`console.log` de `functions/api/webhook.js` por **Cloudflare KV** (bind em `wrangler.toml`) ou **D1**.

---

## 11. Estrutura de arquivos

```
.
├── functions/                     # backend (Cloudflare Pages Functions)
│   ├── _lib/
│   │   ├── catalogo.js            # produtos + validação + formatação de valores
│   │   ├── frete.js               # frete fictício por CEP/peso
│   │   ├── mercado-pago.js        # credenciais, payload da Orders API, simulação
│   │   └── respostas.js           # helpers de JSON/erro/CORS
│   └── api/
│       ├── config.js  produtos.js  frete.js  diagnostico.js  webhook.js
│       └── orders.js + orders/[id].js
├── public/                        # site estático (raiz do Pages)
│   ├── index.html  catalogo.html  produto.html  carrinho.html
│   ├── checkout.html  confirmacao.html  diagnostico.html  404.html
│   ├── _headers                   # segurança + cache (CSP libera sdk/iframe do MP)
│   ├── robots.txt                 # noindex (loja de teste)
│   ├── css/estilos.css
│   ├── img/logo-grifes-zequinha.svg · favicon.svg · banner-atelier.webp · produtos/*.webp
│   └── js/
│       ├── api.js  carrinho.js  formato.js  layout.js
│       ├── componentes/card.js
│       └── paginas/{catalogo,produto,carrinho,checkout,confirmacao,diagnostico}.js
├── scripts/
│   ├── verificar-configuracao.mjs       # npm run check
│   └── testar-mercado-pago.mjs          # npm run testar:mp (bateria completa na API de teste)
├── .dev.vars.example              # modelo das credenciais locais (copie para .dev.vars)
├── .env.example                   # referência das variáveis
├── wrangler.toml                  # Pages + variáveis públicas
└── package.json
```

---

## 12. Problemas comuns

| Sintoma | Causa provável / solução |
| --- | --- |
| Faixa "Modo simulação" não sai | `MP_PUBLIC_KEY`/`MP_ACCESS_TOKEN` vazios ou deploy antigo — rode a seção 3 e refaça o deploy |
| Brick não aparece no checkout | Public key inválida/ausente, ou CSP bloqueando `sdk.mercadopago.com` — veja o console do navegador e `/diagnostico.html` |
| `credencial_invalida` (HTTP 401/403) | Access token errado, expirado ou de outra aplicação — copie novamente as *Credenciais de teste* |
| "Token do cartão ausente" | O Brick não gerou o token: confira a public key e preencha os dados do cartão no formulário do MP |
| Erro de `shipment` na Orders API | Ative `MP_FRETE_COMO_ITEM="true"` (o frete passa a ser uma linha de item; o total não muda) |
| Erro de emissor de cartão | Ative `MP_ENVIAR_ISSUER_ID="true"` |
| Pedido aprovado mas sem e-mail de notificação | Em modo de teste o Mercado Pago não envia e-mails reais |
| "O servidor desta prévia não alcança o Mercado Pago" (`falha_rede`) | O ambiente onde o site está hospedado não tem saída para `api.mercadopago.com` (comum em sandbox/preview fechado). O Brick renderiza, mas a ordem é criada no servidor: rode `npm run dev` na sua máquina ou faça o deploy no Cloudflare Pages |
| Diagnóstico mostra "Não conseguiu alcançar api.mercadopago.com" com status de atenção | Mesmo caso acima: é limitação de rede do ambiente, **não** é credencial inválida. Valide com `npm run testar:mp` localmente |
| Erro `payer` na criação da ordem | Use o e-mail do comprador de teste (defina `MP_EMAIL_COMPRADOR_TESTE`) e um CPF válido |

---

## 13. Próximos passos sugeridos

- Persistir pedidos em **Cloudflare KV / D1** (hoje o status vive no log + no `localStorage` do comprador);
- Cupons de desconto e cálculo por `marketplace_fee` (o total já é recalculado no servidor);
- 3-D Secure: a confirmação já trata `redirect_url`; pode ser habilitado em `config.online.transaction_security`;
- Trocar o frete fictício por API real (Correios/Melhor Envio) — basta reimplementar `calcularOpcoesDeFrete`;
- E-mails transacionais (Resend/SendGrid) a partir do webhook.

---

## 14. Licença e avisos

MIT. Projeto de **demonstração**: use apenas com credenciais de **teste**. Nunca comite
`.dev.vars`, `.env` ou chaves de produção — as páginas do site e o `scripts/verificar-configuracao.mjs`
(`npm run check`) ajudam a detectar vazamentos antes do deploy.
