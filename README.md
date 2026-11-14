# Canecaria Panda

Loja virtual e painel de gestão da Canecaria Panda (canecariapanda.com.br).

- **Loja:** página inicial com prévia da caneca personalizada, catálogo com busca e categorias, página do produto com campo de personalização, carrinho com cupom e entrega, envio do pedido pelo WhatsApp, chave Pix, acompanhamento do pedido pelo código e "Meus pedidos".
- **Painel (`/admin`):** visão geral, pedidos (status, pagamento, aviso ao cliente pelo WhatsApp, impressão), venda no balcão e encomendas, produtos com fotos, categorias, estoque com movimentações, clientes, cupons, financeiro (entradas, despesas, contas a pagar), relatórios e configurações (textos, contatos, entrega, Pix, serviços, acessos da equipe).

## Banco de dados (Supabase)

Os dados ficam no Supabase (Postgres), em tabelas com nomes em português: `produtos`, `categorias`, `clientes`, `pedidos`, `cupons`, `financeiro`, `movimentos_estoque`, `administradores` e `configuracoes`. As fotos dos produtos ficam no Storage, no bucket público `produtos`.

Toda gravação passa pela função `aplicar_alteracoes`, que grava várias tabelas numa transação só (por exemplo: pedido + baixa de estoque + entrada no financeiro) e recusa a gravação se outra chegou antes; a API então refaz a operação com os dados novos.

Para criar o banco: Supabase > SQL Editor > New query, cole `supabase/schema.sql` e clique em Run. Na primeira visita ao site, as tabelas recebem o catálogo de exemplo.

As tabelas têm RLS ligado e nenhuma política: só a API do site (com a chave secreta) lê e grava. Nada do banco fica exposto no navegador.

## Variáveis de ambiente (Vercel)

| Variável | Para quê |
|---|---|
| `SUPABASE_URL` | Project URL do Supabase (Settings > API). |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta: `service_role` ou `sb_secret_...` (Settings > API Keys). Nunca coloque no código. |
| `SESSION_SECRET` | Texto aleatório longo que assina o login do painel. |
| `ADMIN_EMAIL` | E-mail do primeiro administrador. |
| `ADMIN_PASSWORD` | Senha do primeiro acesso. Depois de entrar, troque a senha em Configurações. |

Sem Supabase configurado, a API ainda aceita `GITHUB_TOKEN` + `GITHUB_REPO` (dados em JSON na branch `dados`) e, sem nada, roda em modo de demonstração em memória.

## Desenvolvimento

```bash
npm install
npm run dev     # http://localhost:5173 (painel: /admin, senha de demonstração panda1234)
npm test        # testes da API
npm run build
```

Código: `src/` (React + Tailwind), `server/` (regras de negócio e armazenamento), `api/index.js` (função da Vercel).
