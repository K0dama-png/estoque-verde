# API LoteCerto

Backend REST em TypeScript e Oracle SQL para persistir os dados do aplicativo mobile. A API é multiempresa: o `market_id` vem do token autenticado e é aplicado nas consultas, atualizações e chaves estrangeiras compostas.

## Requisitos

- Node.js 20 ou mais recente.
- Oracle Database 19c ou mais recente. Para desenvolvimento, pode ser usado o Oracle Database Free com o serviço `FREEPDB1`.
- Um usuário/schema Oracle próprio para a aplicação.

O driver `node-oracledb` é usado no modo Thin, portanto não é necessário instalar o Oracle Instant Client.

## Configuração

1. Crie um schema Oracle vazio e conceda `CREATE SESSION`, `CREATE TABLE`, `CREATE SEQUENCE`, `CREATE TRIGGER` e espaço no tablespace usado.
2. Execute [sql/001_schema.sql](./sql/001_schema.sql) conectado nesse schema.
3. Copie `.env.example` para `.env` e preencha as credenciais.
4. Instale e inicie:

```bash
pnpm install
pnpm dev
```

A saúde da API pode ser conferida em `GET http://localhost:3333/api/health`.

## Fluxo inicial

1. `POST /api/auth/register-market` cria o mercado, o gerente e cinco categorias iniciais.
2. `POST /api/auth/login` devolve o token Bearer e os dados do mercado.
3. O gerente cadastra funcionários, fornecedores, categorias e produtos. Quando informado, o lote inicial do produto é salvo na mesma transação do cadastro.
4. Gerente ou funcionário registra entradas em `/api/inventory/entries`.
5. Gerente ou funcionário registra uma saída com vários produtos em `/api/inventory/exits`.

As saídas são atômicas e baixam primeiro os lotes com validade mais próxima (FEFO). Se faltar saldo em qualquer item, toda a operação é revertida.

## Rotas principais

| Área | Rotas |
| --- | --- |
| Autenticação | `POST /api/auth/register-market`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password` |
| Funcionários | `GET/POST /api/users`, `PATCH /api/users/:id/status`, `POST /api/users/:id/reset-password` |
| Categorias | `GET/POST /api/categories`, `PUT /api/categories/:id`, `PATCH /api/categories/:id/status` |
| Fornecedores | `GET/POST /api/suppliers`, `PUT /api/suppliers/:id`, `PATCH /api/suppliers/:id/status` |
| Produtos | `GET/POST /api/products`, `GET/PUT /api/products/:id`, `PATCH /api/products/:id/status` |
| Estoque | `POST /api/inventory/entries`, `POST /api/inventory/exits` |
| Histórico | `GET /api/movements` |
| Relatórios | `GET /api/reports/stock`, `GET /api/reports/alerts`, `GET /api/reports/dashboard` |

As rotas de cadastro e relatórios gerenciais exigem o perfil `ADMIN`. Os dois perfis podem consultar produtos e registrar movimentações.

## Exemplo: saída de estoque

```json
{
  "reason": "LOSS",
  "notes": "Embalagens danificadas",
  "items": [
    { "productId": 10, "quantity": 2 },
    { "productId": 21, "quantity": 1 }
  ]
}
```

Motivos disponíveis: `SALE`, `LOSS`, `EXPIRY`, `DAMAGE`, `INTERNAL_USE` e `ADJUSTMENT`. `SALE` é somente um motivo de baixa; a API não possui carrinho financeiro, pagamentos ou fechamento de venda.
