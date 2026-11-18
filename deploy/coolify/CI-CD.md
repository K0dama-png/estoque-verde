# CI/CD com GitHub Actions e Coolify

O arquivo `.github/workflows/ci-cd.yml` verifica o código e, depois da aprovação dos testes, pode solicitar a entrega das duas aplicações no Coolify. A API e a versão web do aplicativo são construídas no próprio Coolify a partir dos Dockerfiles deste diretório. O workflow não cria um servidor, não instala o Oracle e não publica uma versão nativa na loja de aplicativos.

## 1. Preparar os recursos no Coolify

Antes de habilitar a entrega, siga `deploy/coolify/LEIA-ME.md`. São necessários um servidor conectado ao Coolify, um banco Oracle acessível e inicializado e duas aplicações com origem no mesmo repositório e na branch `main`:

| Aplicação | Dockerfile | Diretório de construção | Porta interna |
| --- | --- | --- | --- |
| API | `/deploy/coolify/backend.Dockerfile` | `/` | `3333` |
| Aplicativo web | `/deploy/coolify/web.Dockerfile` | `/` | `80` |

Configure as variáveis do banco e de autenticação apenas na aplicação da API. O valor de `CORS_ORIGIN` deve ser a origem HTTPS do aplicativo web, sem caminho. Não envie os arquivos `.env` para o GitHub.

Na aplicação web, cadastre `EXPO_PUBLIC_API_URL` como variável disponível durante a construção, por exemplo `https://api.seu-dominio.com/api`. Esse endereço deve ser o da API publicada e acessível pelo navegador do usuário. O Expo incorpora o valor no JavaScript gerado; alterar apenas uma variável em tempo de execução não atualiza o endereço. Se a URL mudar, salve o novo valor e reconstrua a aplicação web. Essa variável é pública e não deve conter senhas ou tokens.

Realize uma primeira entrega manual de cada aplicação e verifique a conexão com o Oracle, os logs e os domínios HTTPS. A API precisa abrir o pool do Oracle para iniciar. Os testes do workflow não substituem essa verificação do ambiente.

Desative o **Auto Deploy** dos dois recursos no Coolify para que um push não provoque uma entrega independente dos testes. Quando a integração estiver habilitada, o GitHub Actions será responsável por solicitar as entregas após a aprovação do job `ci`.

## 2. Conectar o GitHub ao Coolify

1. No Coolify instalado no seu servidor, abra **Settings > Advanced** e habilite o acesso à API. Em Coolify Cloud, a API já fica habilitada.
2. Em **Keys & Tokens > API Tokens**, crie um token para esta integração com permissão **Deploy**. Desmarque a permissão **Read**, que pode vir selecionada. Copie o valor e mantenha-o protegido.
3. Abra a aplicação da API, acesse **Webhooks** e copie a URL do **Deploy webhook** autenticado.
4. Repita a cópia na aplicação web. Cada recurso tem seu próprio webhook.
5. No GitHub, abra **Settings > Secrets and variables > Actions > Secrets**. Crie os três secrets de repositório abaixo.

| Secret | Conteúdo |
| --- | --- |
| `COOLIFY_API_DEPLOY_WEBHOOK` | Webhook HTTPS de entrega da aplicação da API. |
| `COOLIFY_WEB_DEPLOY_WEBHOOK` | Webhook HTTPS de entrega da aplicação web. |
| `COOLIFY_TOKEN` | Token de API do Coolify com permissão de entrega para os recursos usados. |

6. Na aba **Variables**, crie a variável de repositório `COOLIFY_DEPLOY_ENABLED` com o texto exato `true` somente quando os dois recursos estiverem prontos. Deixe-a ausente ou com `false` para executar apenas a integração contínua.

Os endereços e o token são lidos dos secrets em tempo de execução. O workflow usa o cabeçalho `Authorization: Bearer` e não imprime os valores nem o corpo da resposta. Não coloque esses valores no YAML, em commits ou em capturas de tela do manual.

## 3. O que cada job executa

O job `ci` é executado em pushes para `main`, em pull requests destinados a `main` e pelo botão **Run workflow**. Ele obtém o código, prepara Node.js 22 e pnpm 10, instala as dependências de `backend` e `mobile` com `--frozen-lockfile`, verifica os tipos TypeScript dos dois projetos, compila a API e executa seus testes existentes com `node --test dist/tests/*.test.js`, dentro de `backend`. Esse comando usa o runner nativo do Node 22 sem a opção `--test-isolation=none` do script local, que pertence a uma versão posterior do Node. O lockfile congelado faz a instalação falhar se as dependências declaradas estiverem inconsistentes com o arquivo versionado.

Os testes atuais verificam a criação e validação de hashes de senha e a seleção de lotes implementada no serviço de estoque. Eles não abrem conexão com um Oracle real nem confirmam o funcionamento das telas publicadas. O job também não exporta a versão web; essa etapa ocorre no Dockerfile do Coolify com a URL real da API.

O job `deploy` depende da conclusão bem-sucedida de `ci`. Ele só executa em `main`, após push ou execução manual, e quando `COOLIFY_DEPLOY_ENABLED` é `true`. Pull requests não disparam entregas. Antes das chamadas, o job confere se os três secrets existem e se os webhooks usam HTTPS.

São feitas duas requisições `POST` autenticadas: primeiro para o recurso da API e depois para o recurso web. Os webhooks atuais do Coolify rejeitam `GET` com HTTP 405. O Coolify busca o código da branch configurada e constrói as imagens. O workflow não envia uma imagem pronta nem garante que o código publicado corresponda ao SHA de uma execução antiga se a branch avançar durante a entrega. Para a demonstração, aguarde a conclusão de uma entrega antes de enviar outro commit.

Uma resposta HTTP de sucesso significa que a solicitação foi aceita; o job não espera o término da construção nem comprova que os serviços ficaram saudáveis. Consulte **Deployments** no Coolify e teste a URL pública antes de registrar a entrega como concluída.

## 4. Executar e demonstrar

1. Envie uma alteração de código para uma branch e abra um pull request para `main`. Na aba **Actions**, acompanhe as etapas de verificação. O job de entrega ficará sem execução nesse evento.
2. Depois da aprovação das verificações, integre a alteração em `main`. O push executará novamente `ci` e, com a variável habilitada, solicitará as duas entregas.
3. Para repetir a verificação sem alterar arquivos, abra **Actions > CI e entrega no Coolify > Run workflow** e selecione `main`.
4. No Coolify, acompanhe a construção e a inicialização de cada recurso. Confirme o estado saudável e a ausência de erros do Oracle.
5. Abra `https://SUA_API/api/health` e a URL HTTPS do aplicativo web. Use os endereços reais cadastrados no Coolify; os nomes deste exemplo não são links de uma aplicação já publicada.
6. Faça login, abra o estoque e confirme que as requisições usam a API publicada. Para evidenciar a atualização, compare a mudança enviada ao GitHub com o resultado que aparece na aplicação.

Para o manual, capture as telas reais do repositório, da execução dos jobs, das configurações dos recursos sem credenciais, dos logs de entrega e da aplicação na URL publicada. Enquanto servidor, domínio, banco e conta não forem configurados e testados, esses passos representam um procedimento a executar, e não uma comprovação de publicação.

## 5. Resolver falhas comuns

| Situação | Verificação |
| --- | --- |
| `deploy` aparece como ignorado | Confira branch `main`, evento e variável `COOLIFY_DEPLOY_ENABLED=true`. |
| Erro de secret ausente | Confira os três nomes em **Secrets and variables > Actions > Secrets**. |
| HTTP 401 ou 403 no webhook | Confira validade e permissão do token e acesso à API do Coolify. |
| Falha ao conectar ao webhook | O Coolify precisa estar acessível por HTTPS a partir do runner do GitHub. |
| API não inicia | Confira variáveis Oracle, conectividade, serviço do banco, esquema e logs da aplicação. |
| Tela abre, mas não carrega estoque | Confira `EXPO_PUBLIC_API_URL` na construção web e `CORS_ORIGIN` na API; reconstrua após corrigir a URL. |
| Push publica mesmo com testes em andamento | Desative o Auto Deploy do Coolify para os dois recursos. |

## Referências técnicas

- [actions/checkout: documentação oficial](https://github.com/actions/checkout): versão principal 7, usada para obter o código sem persistir credenciais neste workflow.
- [actions/setup-node: documentação oficial](https://github.com/actions/setup-node): versão principal 7, com `node-version: '22'` para o runtime do projeto. A versão interna da action e a versão de Node.js selecionada para a aplicação são configurações distintas.
- [pnpm/action-setup: documentação oficial](https://github.com/pnpm/action-setup): versão principal 6, com pnpm 10 explícito para coincidir com os Dockerfiles e cache baseado nos dois lockfiles.
- [GitHub Actions no Coolify](https://coolify.io/docs/applications/sources/github/actions): acesso à API, token, webhook autenticado e armazenamento de credenciais como secrets do repositório. Neste projeto, a construção ocorre no Coolify; não é usada a alternativa de publicar imagens em um registro no GitHub Actions.
- [Webhooks de entrega no Coolify](https://coolify.io/docs/core/automation/deploy-webhooks): método `POST`, token com permissão `deploy` e verificação da entrega após a aceitação da solicitação.
