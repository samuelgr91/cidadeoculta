# Importação editorial OP-001 a OP-006

As seis histórias completas foram recebidas em Markdown, preservadas integralmente em português e traduzidas para inglês. Os blocos separam narrativa, núcleo documentado e tradição/pontos não estabelecidos, com fontes e nota editorial.

- OP-001: aberto. Atualiza `oratorio-vira-saia`, preservando URLs e imagens existentes.
- OP-002, OP-003, OP-004 e OP-005: City Pass.
- OP-006: e-mail.
- As duas histórias anteriores de São Francisco e Casa dos Contos permanecem no catálogo.
- O segundo documento contém nove pautas, exibidas na aba Pautas do CMS. Não são histórias publicadas. OP-007 não foi fornecida.

## Manutenção

Editar conteúdo corrente no CMS `/admin`. Não modificar o identificador do lote para reaplicar textos: isso substituiria alterações editoriais posteriores.

`node --experimental-strip-types scripts/prepare-editorial-batch.mjs` prepara os dados a partir das cópias em `content/ouro-preto/`.
`node --experimental-strip-types scripts/import-editorial-batch.mjs` valida sem escrever.
`npm run test:editorial` verifica o texto integral, acesso, preservação, backup, repetição segura e rollback.

A publicação Netlify aplica o lote uma única vez usando segredos de build, sem credenciais no pacote. A aplicação é transacional. As tabelas operacionais `editorial_imports` e `editorial_import_backups` registram o lote e uma cópia do JSON anterior de cada história substituída. São criadas idempotentemente pelo importador. Builds posteriores preservam as edições do CMS.

## Localização e mídia

Coordenadas são referências aproximadas do patrimônio. Histórias sobre tesouro ou assombrações não representam descobertas ou aparições confirmadas. Os cinco relatos do entorno do Vira-Saia compartilham um marcador com seleção de narrativa, sem deslocamentos fictícios.

Imagens novas neste lote reutilizam panorama licenciado e ilustração contextual da cidade, explicitamente identificados. Não foi produzida imagem documental dos locais nem áudio gravado. A narrativa em inglês segue o conteúdo fornecido e conserva as ressalvas editoriais. A documentação municipal do sobrado informa fechamento para reformas; o conteúdo não promete entrada.

As tabelas de pedidos, acessos e usuários não são modificadas pela importação.

## Publicação conferida

28/09/2026: publicado na Netlify (`6abac77618fa3dcb673ff8ac`). Verificação no domínio final confirmou catálogo com 8 histórias, 12 rotas editoriais PT/EN, texto aberto integral, blocos lead/premium ausentes para visitantes sem acesso (API e HTML), fontes presentes, painel protegido e arquivo de importação inacessível publicamente. Prévia responsiva validada em 390 px, com quatro marcadores para oito histórias e seletor dos cinco relatos do entorno do Vira-Saia. Evidência local: `outputs/editorial-live-verification.json` e `outputs/historia-publicada-op001.png`.
