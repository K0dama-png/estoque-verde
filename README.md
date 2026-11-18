# LoteCerto Mobile

## GitHub e integração contínua

Este repositório contém a API em `backend` e o aplicativo Expo em `mobile`. A branch principal é `main`.

O workflow em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) instala as dependências com os lockfiles congelados, verifica os tipos dos dois projetos, compila a API e executa os testes existentes. Ele é acionado por pushes e pull requests para `main` ou manualmente pela aba Actions. Os arquivos `.env` reais ficam apenas no ambiente de execução.

Para desenvolvimento, use Node.js 22, pnpm 10 e uma instância Oracle compatível. Os arquivos `.env.example` apresentam somente valores de exemplo. O repositório não inclui dependências instaladas, dados de mercados nem os pacotes locais do Windows.

Aplicativo mobile de gestão de estoque para pequenos mercados, criado a partir dos requisitos do TCC **Desenvolvimento de um Sistema de Controle de Estoque Mobile**.

## Funcionalidades

- React Native com Expo e TypeScript.
- Identidade visual em verde e branco.
- Login com perfis de gerente e funcionário.
- Estrutura multiempresa, com isolamento de dados por mercado.
- Autocadastro de mercado: o próprio gerente cria a empresa e recebe acesso administrativo.
- Gestão de equipe: somente o gerente cadastra, inativa e reativa funcionários do próprio mercado.
- Troca obrigatória da senha temporária no primeiro acesso do funcionário.
- Controle de estoque por lote, com validade e quantidade independentes e baixa FEFO nas saídas.
- Notificações locais para gerentes sobre estoque mínimo e lotes vencendo em até 30 dias.
- Geração e compartilhamento de relatórios PDF de estoque por lote e movimentações.
- Filtros de movimentações por hoje, últimos 7 dias, mês atual ou período personalizado.
- Saída de estoque com vários produtos, baixa FEFO atômica e motivo obrigatório.
- Cadastro de fornecedores por mercado, com inativação e rastreabilidade de lotes.
- Categorias próprias por mercado, gerenciadas somente pelo gerente, com edição, ativação e inativação segura.
- Entradas vinculadas a fornecedor e preço de compra, com custo médio por lote.
- Painel com indicadores, ações rápidas e alertas.
- Listagem, busca, filtro, cadastro, consulta e inativação de produtos.
- Registro de entradas e saídas com atualização imediata do saldo.
- Histórico de movimentações.
- Relatório visual de estoque e movimentações para o gerente.
- Alertas de estoque mínimo e validade próxima.

## Executar

Primeiro configure o Oracle e inicie a API conforme o [guia do backend](./backend/README.md). Depois, no diretório `mobile`, copie `.env.example` para `.env` e ajuste a URL:

```env
EXPO_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:3333/api
```

Em um aparelho físico, o celular e o computador precisam estar na mesma rede. Use o endereço IPv4 do computador, não `localhost`. No emulador Android, a URL padrão sem `.env` é `http://10.0.2.2:3333/api`.

```bash
cd mobile
pnpm install
pnpm start
```

Para abrir uma prévia no navegador durante o desenvolvimento, execute `pnpm web`. No navegador, a sessão usa armazenamento temporário da própria aba; no Android e iOS, o token continua protegido pelo `expo-secure-store`.

No primeiro uso, selecione **Cadastrar meu mercado**. O gerente criado poderá cadastrar os funcionários e todo o estoque do próprio mercado.

## Backend Oracle

A API TypeScript está em [`backend`](./backend) e inclui:

- autenticação por token e senhas protegidas com `scrypt`;
- sessão persistida de forma segura no dispositivo com `expo-secure-store`;
- isolamento multiempresa aplicado no banco e nas rotas;
- permissões de gerente e funcionário;
- schema Oracle para mercados, usuários, categorias, fornecedores, produtos, lotes e movimentações;
- entrada por lote e saída atômica de vários produtos usando FEFO;
- histórico, alertas e consultas para relatórios.

Consulte [`backend/README.md`](./backend/README.md) para preparar o Oracle e executar a API. O aplicativo não utiliza dados demonstrativos: cadastros e movimentações são carregados e persistidos pela API Oracle.

## Executar em outro computador

Clone este repositório, instale Node.js e pnpm, prepare o Oracle conforme o guia do backend e configure os arquivos `.env` a partir dos exemplos. Execute a API e o aplicativo seguindo os comandos acima.
