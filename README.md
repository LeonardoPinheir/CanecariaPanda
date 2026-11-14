# Canecaria Panda

Loja virtual e painel de gestão da Canecaria Panda (canecariapanda.com.br).

- **Loja:** página inicial com prévia da caneca personalizada, catálogo com busca e categorias, página do produto com campo de personalização, carrinho com cupom e entrega, envio do pedido pelo WhatsApp, chave Pix, acompanhamento do pedido pelo código e "Meus pedidos".
- **Painel (`/admin`):** visão geral, pedidos (status, pagamento, aviso ao cliente pelo WhatsApp, impressão), venda no balcão e encomendas, produtos com fotos, categorias, estoque com movimentações, clientes, cupons, financeiro (entradas, despesas, contas a pagar), relatórios e configurações (textos, contatos, entrega, Pix, serviços, acessos da equipe).

## Como os dados são guardados

Não há banco de dados. Os dados ficam em arquivos JSON na branch **`dados`** deste repositório (`data/*.json`) e as fotos em `files/`. Cada alteração feita no painel ou pedido do site vira um commit nessa branch. A branch é criada sozinha no primeiro acesso, com o catálogo de exemplo.

Sem `GITHUB_TOKEN`, o site roda com dados de demonstração em memória (nada é salvo).

## Variáveis de ambiente (Vercel)

| Variável | Para quê |
|---|---|
| `GITHUB_TOKEN` | Token do GitHub com permissão **Contents: Read and write** neste repositório (fine-grained). |
| `GITHUB_REPO` | `LeonardoPinheir/CanecariaPanda` |
| `DATA_BRANCH` | `dados` |
| `SESSION_SECRET` | Texto aleatório longo que assina o login do painel. |
| `ADMIN_EMAIL` | E-mail do primeiro administrador. |
| `ADMIN_PASSWORD` | Senha do primeiro acesso. Depois de entrar, troque a senha em Configurações. |

## Desenvolvimento

```bash
npm install
npm run dev     # http://localhost:5173 (painel: /admin, senha de demonstração panda1234)
npm test        # testes da API
npm run build
```

Código: `src/` (React + Tailwind), `server/` (regras de negócio e armazenamento), `api/index.js` (função da Vercel).
