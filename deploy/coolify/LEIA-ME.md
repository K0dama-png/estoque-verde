# Publicação no Coolify

Os arquivos desta pasta preparam dois serviços: a API Node.js e a versão web do aplicativo Expo. O nome atual do aplicativo no código é LoteCerto. Os Dockerfiles usam o código de `backend` e `mobile`, sem alterar as regras do aplicativo.

O contexto de build deve ser a raiz deste projeto nos dois serviços. O Node.js 22 e o pnpm 10 são instalados nas imagens de build. Os lockfiles existentes são preservados. Arquivos `.env`, dependências locais e documentos estão excluídos pelo `.dockerignore`.

## 1. Banco Oracle

A API precisa de um Oracle Database acessível pelo servidor Coolify e com o esquema de `backend/sql/001_schema.sql` já criado. A imagem não instala Oracle nem executa migrações automaticamente.

Use a conexão de rede do banco, como `servidor-oracle:1521/FREEPDB1`. `localhost` dentro do container aponta para o próprio container, não para o notebook ou outro serviço. O driver usa o modo Thin, sem Oracle Instant Client. Preserve os dados do banco existente.

## 2. API

Crie uma aplicação no Coolify com build por Dockerfile, configurando:

- Contexto/base directory: raiz do repositório.
- Dockerfile: `deploy/coolify/backend.Dockerfile`.
- Porta interna: `3333`.
- Domínio: uma URL HTTPS própria para a API.
- Health check: `GET /api/health`, porta `3333`.

Cadastre estas variáveis de runtime pelo painel do Coolify:

```env
NODE_ENV=production
PORT=3333
JWT_SECRET=GERAR_UM_SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
JWT_EXPIRES_IN=8h
ORACLE_USER=USUARIO_DO_BANCO
ORACLE_PASSWORD=SENHA_DO_BANCO
ORACLE_CONNECT_STRING=HOST_ORACLE:1521/FREEPDB1
ORACLE_POOL_MIN=1
ORACLE_POOL_MAX=10
ORACLE_POOL_INCREMENT=1
CORS_ORIGIN=https://DOMINIO_DO_APLICATIVO
```

Os valores acima são identificadores de preenchimento, não credenciais de produção. Gere um `JWT_SECRET` aleatório. Não envie credenciais ao repositório nem as configure como argumentos de build.

Publique e confirme que `https://DOMINIO_DA_API/api/health` responde. A API só abre a porta depois de inicializar o pool Oracle; um banco indisponível impede sua inicialização.

## 3. Aplicativo web

Crie uma segunda aplicação com:

- Contexto/base directory: raiz do repositório.
- Dockerfile: `deploy/coolify/web.Dockerfile`.
- Porta interna: `80`.
- Domínio: uma URL HTTPS própria para o aplicativo.
- Health check: `GET /healthz`, porta `80`.

Configure este argumento de build no Coolify:

```env
EXPO_PUBLIC_API_URL=https://DOMINIO_DA_API/api
```

Essa URL é pública e fica gravada nos arquivos JavaScript durante o build Expo. Ela deve usar HTTPS para evitar bloqueio de conteúdo misto no navegador. Ao mudar a URL da API, faça um novo build do aplicativo web. Não basta alterar uma variável de runtime do Nginx.

O Nginx serve os arquivos exportados e encaminha rotas da interface para `index.html`. As chamadas da API usam diretamente a URL configurada no build. O HTTPS é terminado pelo proxy do Coolify.

## 4. Verificação após publicar

Abra o domínio do aplicativo, confira a tela de login e teste a conexão com uma conta do seu mercado. Confirme as permissões de gerente e funcionário e o carregamento dos produtos. As funções nativas podem ter comportamento diferente no navegador, conforme o suporte das bibliotecas Expo.

Esta configuração publica a versão web. O aplicativo nativo continua sendo executado ou compilado com Expo e deve receber a mesma URL pública da API.

## Build local opcional

Com Docker instalado, execute a partir da raiz:

```powershell
docker build -f deploy/coolify/backend.Dockerfile -t lotecerto-api .
docker build -f deploy/coolify/web.Dockerfile --build-arg EXPO_PUBLIC_API_URL=https://DOMINIO_DA_API/api -t lotecerto-web .
```

Para iniciar a API localmente em Docker, forneça as variáveis de runtime de forma segura. Nenhum arquivo de credenciais é incluído nas imagens.
