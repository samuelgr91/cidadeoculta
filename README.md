# Cidade Oculta

Vertical slice de Ouro Preto com React/TypeScript e MapLibre. A produção em hiddenatlas.site usa Next.js na Netlify e Turso; Vinext/D1 é o piloto original. Leia ARCHITECTURE.md para as etapas e os limites, e ANALYTICS.md para o painel de audiência e exclusão de visitas próprias.

## Cópia do projeto e hospedagem

O ZIP de código-fonte contém a aplicação, mídia, migrações, seed e documentação. Não contém `node_modules`, arquivos de build, credenciais nem os dados atuais do banco hospedado. Para trabalhar localmente, extraia o ZIP, instale Node 22.13 ou superior, execute `npm run install:ci`, inicialize o banco pelas instruções de migração abaixo e inicie com `npm run dev`. Abra `http://localhost:5173/pt-br/ouro-preto`.

A URL `*.chatgpt.site` é uma publicação gerenciada pelo Sites, privada para o proprietário e ligada ao banco D1 atual. O ZIP não inclui os dados hospedados. `.openai/hosting.json` identifica apenas essa publicação; a Vercel usa `vercel.json` e um banco Turso separado. Não trate a implantação na Vercel como migração dos dados: exportação, importação e conferência são etapas próprias.

## Caminho para Vercel + Turso

O código já tem um adapter Turso e um build Next.js nativo (`npm run build:vercel`). É possível verificar o esquema e as consultas locais com `npm run test:turso`. Para criar o banco remoto, configure `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` no ambiente de servidor (veja `.env.example`) e execute `npm run db:migrate:turso` uma vez. A migração registra a versão aplicada e não deve ser reexecutada manualmente por SQL. No painel da Vercel, conecte o repositório, configure as duas variáveis e `APP_ORIGIN` com o endereço HTTPS final; `vercel.json` seleciona o build correto.

### Cópia dos dados atuais

No Site atual, entre no **Estúdio editorial** e use **Baixar cópia dos dados**. O arquivo inclui o texto integral das histórias e dados de leads e pedidos: mantenha-o privado e fora do Git. Apenas um editor autenticado pode baixar; a exportação ignora cookies, sessões e códigos de login e substitui IDs de sessão em leads/eventos por identificadores sem acesso.

Crie um banco Turso **novo e vazio**. Configure `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` em variáveis de ambiente locais. Se preferir, copie `.env.example` para `.env.local`, preencha esses dois valores e execute:

```sh
node --env-file=.env.local scripts/migrate-turso.mjs --apply
npm run db:import:turso -- caminho/arquivo.json
node --env-file=.env.local --experimental-strip-types scripts/import-d1-to-turso.mjs caminho/arquivo.json --apply
```

O segundo comando só confere o arquivo. O terceiro compara contagens e conteúdo depois da escrita e recusa um banco que já tenha dados editoriais. Se uma importação falhar no meio, descarte esse banco de destino e recomece em outro vazio. Quando as variáveis já estão carregadas no terminal, também pode usar `npm run db:migrate:turso` e `npm run db:import:turso -- caminho/arquivo.json --apply`.

A cópia preserva os pedidos e passes sob os IDs antigos `chatgpt:<id>`, para auditoria. Eles **não** são liberados automaticamente para uma conta nova por coincidência de e-mail; a rota `/pt-br/ouro-preto/transferir` exige prova de titularidade nas duas contas. O Site publicado continua sendo a origem ativa, então faça uma exportação final perto da mudança de hospedagem.

### Atualizar a cópia D1 no Turso

Guarde a exportação inicial e baixe uma exportação nova no estúdio editorial. Com `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` configurados apenas no servidor/localmente, confira primeiro sem escrever:

```sh
node --env-file=.env.local --experimental-strip-types scripts/reconcile-d1-to-turso.mjs exportacao-inicial.json exportacao-atual.json
```

Se a prévia não apontar conflitos e as contagens estiverem corretas, repita acrescentando `--apply`. O procedimento preserva contas e registros exclusivos da Vercel; nunca apaga linhas automaticamente. Conflitos exigem revisão antes de qualquer escrita. Mantenha os dois arquivos JSON fora do repositório.

**Estado em 23/09/2026:** uma cópia do Site foi importada e conferida no Turso de teste (101 registros; 3 histórias e 1 passe incluídos). A aplicação Next.js nativa abriu landing PT/EN, mapa, catálogo e entrada usando esse banco; o conteúdo premium permaneceu protegido. Não repita o comando `--apply` no mesmo banco: ele já contém dados. Para a sincronização final, use outro banco vazio ou um processo incremental revisado. O token está em `.env.local`, ignorado pelo Git e excluído do ZIP; renove-o antes de produção porque foi compartilhado na conversa.

**Estado em 27/09/2026:** a aplicação Next.js está publicada na Netlify Free em `https://hiddenatlas.site` e `https://cidade-oculta-hiddenatlas.netlify.app`. O DNS da Hostinger aponta o domínio raiz para a Netlify e `www` para o subdomínio Netlify. O runtime Next.js foi habilitado no deploy manual, com uma função publicada e rotas dinâmicas funcionando. O ambiente Production usa `PAYMENT_MODE=live`, `PAYMENT_PROVIDER=kiwify`, o catálogo de Ouro Preto a R$ 29,90, Turso `cidade-oculta-prod`, Resend e os segredos de autenticação, passe e webhook. Landing PT/EN, mapa, catálogo, passe e `robots.txt` respondem; a API de catálogo retorna `mode=live`. A emissão do certificado Let’s Encrypt ainda aparece como aguardando propagação no painel da Netlify. Ainda não há repositório Git conectado nem deploy automático. Faça uma compra controlada e um reembolso antes de divulgar o checkout.

**A versão Vercel ainda não está pronta para compradores.** O login próprio já funciona no domínio final: Resend verificou `hiddenatlas.site`, a Vercel recebeu uma chave restrita a esse domínio, o e-mail de teste foi entregue e a conta autorizada abriu `/admin` e `/admin/painel` em 26/09/2026. O código de 8 dígitos vale 10 minutos. A mesma conta pode ser recuperada pedindo novo código; a sessão pode ser encerrada em `/api/auth/logout`. Recuperação e transferência de passe ainda precisam de teste ponta a ponta. O lead gate das histórias não autentica nem recupera compras. O Site atual continua com identidade ChatGPT e seus passes no D1. Não associe passes antigos à nova conta pelo e-mail sem migração e prova de titularidade.

Para testes pessoais sem cobrança, o Hobby da Vercel pode ser usado dentro de seus termos. [A Vercel limita o Hobby a uso pessoal não comercial](https://vercel.com/docs/plans/hobby); antes de vender o City Pass, escolha um plano que permita uso comercial. [Turso publica seu plano gratuito e cotas atuais](https://turso.tech/pricing), que devem ser conferidas quando o projeto for criado.

### Alternativa gratuita para vendas: Netlify

[A Netlify permite projetos comerciais no plano Free](https://www.netlify.com/blog/introducing-netlify-free-plan/) e [suporta Next.js App Router pelo adaptador OpenNext](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). `netlify.toml` e `npm run build:netlify` preparam a aplicação para essa hospedagem; o build local passou. O limite atual é de [300 créditos por mês](https://www.netlify.com/pricing/), compartilhados entre deploys, funções, tráfego e requisições. Ao esgotar o limite, o site gratuito pausa até o ciclo seguinte. Hospedagem gratuita não elimina as taxas da Kiwify nem o custo anual do domínio.

A Netlify Free está conectada e validada. As variáveis privadas são mantidas no painel, o domínio foi migrado da Vercel, o webhook Kiwify foi registrado no domínio final e o deploy de produção publica as funções Next.js. [A Netlify aplica variáveis de ambiente às funções no deploy](https://docs.netlify.com/build/functions/environment-variables/), portanto cada mudança exige nova publicação. O próximo teste operacional é uma compra controlada seguida de reembolso.

A landing mantém a vista ilustrada de Ouro Preto gerada por IA e comprimida em WebP. Ela é uma abertura editorial, não cartográfica. A página `/mapa` abre no mapa geográfico MapLibre/OpenFreeMap: arraste, amplie, selecione pontos distantes ou use “Ver todos os locais” para enquadrá-los. A vista editorial usa pontos dourados e uma cena específica da história; a opção “Mapa simples” retira os efeitos e a foto. O modo escolhido entra na URL como `?view=editorial` ou `?view=simple`.

Para mudar o padrão de toda a página, configure `MAP_DEFAULT_VIEW=simple` no ambiente de hospedagem e publique novamente. Sem essa variável, a vista editorial é o padrão. O link com `?view=` sempre prevalece. O CMS permite definir uma “Cena do mapa” e seu crédito para cada história; sem ela, o cartão usa a imagem de capa. O mapa mantém as coordenadas do local independentemente da imagem. A visualização 3D editorial usa os polígonos de edifícios dos tiles; conexões lentas, economia de dados e aparelhos com pouca memória ficam em 2D. O mapa simples é sempre 2D. Na landing, o mapa geográfico só carrega quando a pessoa o escolhe.

## Desenvolvimento

Node >=22.13, instalar com npm run install:ci. No Windows, se o shim npm falhar, invoque o npm-cli.js do Node diretamente. npm run dev inicia a prévia na porta 5173.

Migrações: npm run db:generate; npm run build; node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_special_frog_thor.sql. Não reaplicar uma migração já aplicada.

Acesse /pt-br/ouro-preto, /en/ouro-preto, /admin. O runtime de desenvolvimento simula a autenticação em /signin-with-chatgpt?return_to=/admin. Em produção só a allowlist ADMIN_EMAILS pode administrar.

## O que funciona

- CMS de cidades, locais e histórias com fontes, blocos, imagem de capa, cena editorial do mapa, áudio HTTPS, SEO, roteiro de Short, publicação por idioma e exportação integral autorizada para migração.
- Vista ilustrada na landing e mapa geográfico navegável com enquadramento de locais distantes, filtros, vista editorial e modo simples; leitor com fontes, leitura pelo dispositivo e progresso.
- Cadastro sem senha libera LEAD na sessão. Não verifica titularidade do email e não recupera compras por email.
- City Pass ligado à identidade autenticada da hospedagem. Demonstração de pedido, aprovação e entitlement persistente; demo nunca equivale a compra real.
- APIs protegem conteúdo premium e rascunhos no servidor. Admin com allowlist, validação, histórico editorial.
- Analytics first-party, UTM/ref, canonical/hreflang, sitemap, classificação editorial e proteção de indexação na demonstração.

## Pagamentos e ativação

O fluxo público em produção é **Liberar a cidade → checkout Kiwify → acessar com o e-mail da compra**. A landing e as histórias usam `/[locale]/[city]/comprar`, que redireciona direto ao checkout sem exigir login nem criar pedido pendente para visitantes. Quem já tem passe ativo volta ao conteúdo. A página `/pass` permanece disponível para detalhes e recuperação, com compra sem cadastro prévio. A compra externa é registrada pelo webhook como `paid_unclaimed` quando ainda não há conta; verificar o mesmo e-mail vincula o passe automaticamente. O retorno da Kiwify e os parâmetros da URL nunca concedem acesso. Os cliques de compra continuam registrados nos analytics.

`PAYMENT_MODE=demo` é o padrão. Na Vercel, `PAYMENT_PROVIDER=kiwify` e `KIWIFY_PRODUCTS_JSON` mapeiam a cidade ao produto e checkout oficiais. Com `PAYMENT_MODE=live`, o site cria um pedido pendente e redireciona ao checkout Kiwify. O webhook `/api/payments/kiwify` exige `KIWIFY_WEBHOOK_TOKEN`, assinatura HMAC, produto, BRL e preço-base correto; compra aprovada libera acesso após login com o e-mail da compra, reembolso/chargeback revoga, e repetição não duplica o passe. O site não coleta cartão. O adapter Mercado Pago permanece como legado isolado, sem uso no caminho Kiwify.

`PUBLIC_INDEXING_ENABLED=false` é independente da cobrança. Após a revisão editorial e comercial, altere para `true` e faça novo deploy para permitir indexação; o valor padrão é `false`. A cópia comercial das páginas de funcionamento, privacidade e termos aparece somente no modo live. O contato público é o WhatsApp da Hidden Atlas configurado nessas páginas.

ADMIN_EMAILS deve conter apenas editores autorizados. MAP_STYLE_URL permite trocar provedor. MAP_DEFAULT_VIEW controla a apresentação inicial da página do mapa.
O Site atual usa ChatGPT por compatibilidade com a hospedagem. Na Vercel, o login por código usa o Resend. Um e-mail transacional de teste foi entregue à conta administradora; não há campanha ativa.

Antes de divulgar: verificar a emissão do certificado HTTPS, conferir a identidade do vendedor e o canal de suporte no checkout, fazer compras controladas de cartão e Pix com reembolso e revisar conteúdo/traduções e pins. As 3 histórias atuais são um piloto editorial; a ampliação do catálogo e a narração profissional continuam pendentes.

## Testes

node tests/vertical-slice.mjs executa contratos HTTP com servidor local em funcionamento; somente banco local. `npm run test:turso`, `npm run test:auth` e `npm run test:migration` validam o adapter, o login e a cópia completa em banco local. Tipos: node node_modules/typescript/bin/tsc --noEmit. Builds: `npm run build` (Sites) e `npm run build:vercel` (Vercel).

## Funil para os vídeos — atualização de 28/09/2026

Os links `/l/oratorio` e `/l/morro-da-queimada` abrem diretamente o mapa com o ponto selecionado e localização pública, sem formulário inicial. E-mail libera as histórias LEAD no navegador; conteúdo premium abre o paywall com Pix Kiwify e alternativa de cartão. As três pistas opcionais são programadas para dias 1, 3 e 5 pela função horária Netlify `funnel-clues`; compras pagas e cancelamentos interrompem a sequência. Não inscreve contatos antigos. Catálogo atual: nove histórias, uma aberta, duas LEAD e seis premium. Operação, consentimento, limites e testes em [LOCATION-FUNNEL.md](./LOCATION-FUNNEL.md).

## Mídia e fontes

Créditos completos em /pt-br/ouro-preto/editorial. Fotografias licenciadas do Wikimedia Commons; cópias adaptadas da panorâmica sob CC BY-SA 4.0. Conteúdo piloto resumido a partir de Prefeitura de Ouro Preto, Paróquia da Conceição/Museu Aleijadinho e Biblioteca Nacional. Vira-Saia é tradição oral, nunca fato criminal comprovado.
