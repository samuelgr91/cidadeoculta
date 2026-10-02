# Audiência própria

O painel `/admin/painel` mostra visitas, páginas vistas e visitantes anônimos, páginas populares, plataforma aproximada, domínio de origem, horários em Brasília e caminhos de navegação. O filtro seleciona um dia; o gráfico diário cobre os 30 dias anteriores incluindo esse dia. Totais financeiros continuam independentes desse filtro.

`PageAnalytics` envia um único evento por navegação pública após 700 ms, ou ao sair da página antes disso, com `sendBeacon` e fallback `fetch keepalive`. Falhas não bloqueiam a interface. Não usa SDK, replay de sessão, fingerprinting, polling ou biblioteca de gráficos. Os gráficos são HTML/CSS renderizados no servidor somente no admin.

Cookie HttpOnly `co_visitor`: identificador aleatório por até 90 dias, independente da autenticação. O banco recebe apenas sua derivação SHA-256. Visita: identificador na aba, renovado após 30 minutos sem navegação. Navegadores/aparelhos diferentes não são ligados à mesma pessoa. Rotas privadas, busca, parâmetros, fragmentos, IPs e user agent completo não são armazenados. Dispositivo/sistema/navegador são categorias aproximadas; robôs identificáveis pelo user agent são ignorados. Bloqueadores e falhas de rede podem gerar subcontagem.

Administradores são excluídos no servidor ao enviar evento, entrar na conta ou abrir o painel. A lista de exclusão retira também páginas anteriores do mesmo identificador dos relatórios. O cookie de exclusão persiste por até 90 dias após logout. Cada aparelho/janela anônima precisa ser identificado separadamente. Visitas anônimas anteriores a esta atualização não podem ser reconstruídas nem atribuídas ao administrador.

Atualização de 29/09/2026: revisões sem login usam `/nao-contar-visitas`. O botão ativa uma exclusão persistente para o navegador atual via POST JSON de mesma origem. Não aceita identificador de outra pessoa, não abre relatórios nem concede acesso administrativo. A tabela de exclusões retira retroativamente dos totais, horas, dias, páginas, plataformas e jornadas as visitas reconhecíveis desse navegador, preservando os dados originais. Identificadores já perdidos não são atribuídos por suposição.

O servidor ignora User-Agents identificados de Codex/Playwright/Puppeteer e verificações HiddenAtlas, o cabeçalho `X-Co-Internal-Test: 1`, desenvolvimento/testes e deploys de prévia. Automação que expõe `navigator.webdriver` também pede a exclusão do próprio navegador. O cookie de exclusão faz o layout omitir a coleta; a marca local de testes evita envio mesmo em navegação com layout reaproveitado. Nenhum SDK ou consulta extra é acrescentado ao caminho de uma visita normal.

Procedimento obrigatório para novas verificações em produção está em `AGENTS.md`: ativar o modo no navegador antes de navegar e marcar requisições HTTP. Esse procedimento cobre navegadores de automação que usam um User-Agent comum e não expõem webdriver.

`analytics_page_views` tem índices por data, visitante/data e visita. Os relatórios têm limites explícitos: 100 páginas populares, 50 visitantes recentes, 100 visualizações por visitante, 50 plataformas e 30 origens por dia. Os totais não são truncados. IDs de evento únicos evitam duplicação; o endpoint limita 30 eventos/minuto por visitante. Nenhuma autenticação ou permissão é alterada pela medição.

Aplicar migrações com `npm run db:migrate:turso` antes de publicar (inclui `0006_omniscient_thor.sql`). O build Netlify aplica essa migração aditiva automaticamente usando os segredos privados do ambiente de build; uma falha impede a nova publicação. `--only=0006_omniscient_thor.sql` seleciona uma migração conhecida no journal. Testes: `npm run test:analytics`, `npm run test:auth`, `npm run test:kiwify`, `npm run build:netlify`.
