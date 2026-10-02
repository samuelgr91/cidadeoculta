# Funil direto para o mapa

## Envio manual

- Oratório: https://hiddenatlas.site/l/oratorio
- Morro da Queimada: https://hiddenatlas.site/l/morro-da-queimada
- Inglês: https://hiddenatlas.site/en/l/morro-da-queimada
- Exemplo com origem: https://hiddenatlas.site/l/morro-da-queimada?utm_source=instagram&utm_medium=direct&utm_campaign=morro-da-queimada&utm_content=video-op008

Envie o link manualmente no direct depois do comentário. Ele abre o mapa geográfico com o ponto do vídeo selecionado, endereço e Google Maps disponíveis sem formulário. O enquadramento reserva espaço para o cartão no desktop e no celular. Qualquer história publicada pode usar /l/SLUG-PT ou /en/l/SLUG-PT. Só UTM e ref passam ao mapa; não há e-mail, telefone, tokens ou permissões no link. Selecionar outro ponto atualiza ?story=ID.

O Morro é uma referência aproximada do sítio, com orientação oficial de visita, sem prometer ruína exata ou trilha demarcada. Imagens editoriais não substituem coordenadas cartográficas. Não exige GPS. OP-008 mantém texto e fontes premium em PT-BR/EN e importação idempotente que preserva o CMS.

## Acesso e oferta

Todas as localizações são públicas. A história aberta do Oratório permanece livre. As duas histórias LEAD são liberadas neste navegador com apenas e-mail, sem telefone, senha ou saída do mapa. Esse cadastro não autentica titularidade de e-mail nem recupera compras.

O botão de história premium abre o paywall: preço atual do CMS, quantidade publicada e compra única. Pix é principal e cartão é alternativa. Não exige cadastro nem consumir todas as histórias gratuitas antes de comprar. A rota /[locale]/ouro-preto/comprar?method=pix usa os parâmetros oficiais Kiwify hideCard=true&hideBoleto=true; o checkout coleta os dados necessários e emite o Pix. O site não gera QR nem recebe cartão. A compra comum mantém os outros métodos.

Liberação premium continua dependendo de webhook válido e verificação do mesmo e-mail da compra. Cadastro gratuito, parâmetros e retorno do checkout nunca concedem acesso pago.

## Três pistas opcionais

Uma opção inicialmente desmarcada permite receber três pistas com a oferta do City Pass. Não há inscrição retroativa dos contatos antigos. O fluxo map não envia imediatamente uma cópia da localização: ela já foi entregue na tela.

Envios em 1, 3 e 5 dias após consentimento, na próxima execução horária. Histórias: cabeça de Tiradentes (disputado), Morro da Queimada (documentado) e tesouro Vira-Saia (tradição oral). Cada mensagem contém título, gancho público, classificação, ponto no mapa e oferta, em PT-BR/EN. Texto premium nunca vai para e-mail gratuito.

Antes de cada envio: verificar compra paga do mesmo e-mail/cidade, cancelamento, allowlist administrativa e publicação editorial. Compradores deixam de receber as próximas pistas. Cancelamento por link assinado, com confirmação na página ou comando do provedor, preserva login/compra e impede reinscrição automática.

## Operação Netlify

Migração 0008 cria inscrições, mensagens e supressões. Build remoto aplica 0006/0007/0008 e importações idempotentes. Turso, Resend, remetente e segredo de assinatura ficam exclusivamente no servidor.

netlify/functions/funnel-clues.mts executa a cada hora somente em produção. Functions → funnel-clues exibe logs, agendamento e execução manual. Não há endpoint público para disparar a campanha. Lotes de até seis mensagens; limite da sequência de quarenta por dia UTC deixa margem para login. Monitore também a cota total Resend e os créditos Netlify.

Claims e idempotência evitam duplicatas. Falha tenta novamente após uma hora, até três tentativas. Entrega ambígua além de 23 horas fica em revisão em vez de reenvio cego. Atrasos mantêm 36 horas entre pistas. Enviado significa aceito pelo provedor, sem provar caixa de entrada ou abertura.

O painel /admin/painel mantém origem, contatos, consentimento e associação de compras e acrescenta contagens pendentes, em envio, enviadas, ignoradas, canceladas e revisão. Cadastros deste fluxo aparecem como Cadastro no mapa. Associação por e-mail não prova atribuição exclusiva ao vídeo.

Eventos: map_direct_entry, map_free_unlock, map_pin_open, location_maps_click e cliques de compra. UTM permanece na exploração. Compare entradas, desbloqueios e compras para medir conversão: o desenho não garante aumento.

Testes: npm run test:funnel, npm run test:sequence, npm run test:analytics e npm run build:netlify. Compra real e reembolso ainda exigem um teste financeiro controlado pelo proprietário.

