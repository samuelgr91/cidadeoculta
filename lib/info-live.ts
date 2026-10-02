type InfoPage = { ptTitle: string; enTitle: string; pt: [string, string][]; en: [string, string][] };

const support = 'WhatsApp +55 31 99621-5276';

export const liveInfo: Record<string, InfoPage> = {
  'como-funciona': {
    ptTitle: 'Siga a curiosidade.', enTitle: 'Follow your curiosity.',
    pt: [
      ['1. Explore o mapa', 'Escolha um lugar ou uma história. Os pontos usam coordenadas aproximadas e a vista ilustrada não substitui um mapa de navegação.'],
      ['2. Leia e confira', 'Histórias abertas não exigem cadastro. Algumas são liberadas após informar seu e-mail; as histórias premium exigem o City Pass. As classificações editoriais distinguem documentos, tradição oral, versões disputadas e ficção.'],
      ['3. Libere a cidade', 'O City Pass Ouro Preto é uma compra única feita no checkout da Kiwify. Depois da confirmação do pagamento, entre com o mesmo e-mail usado na compra para acessar a coleção premium. A confirmação por Pix ou boleto pode levar mais tempo.'],
      ['Precisa de ajuda?', `Fale com Hidden Atlas pelo ${support}. A plataforma funciona de qualquer lugar e não exige GPS nem visita presencial.`],
    ],
    en: [
      ['1. Explore the map', 'Choose a place or story. Pins use approximate coordinates and the illustrated view is not a navigation map.'],
      ['2. Read and verify', 'Open stories need no account. Some unlock after you enter an email; premium stories require the City Pass. Editorial labels distinguish documented facts, oral tradition, disputed versions and fiction.'],
      ['3. Unlock the city', 'The Ouro Preto City Pass is a one-time purchase through Kiwify. After payment is confirmed, sign in with the same email used at checkout to access the premium collection. Pix or bank slip confirmation may take longer.'],
      ['Need help?', `Contact Hidden Atlas on ${support}. You can explore from anywhere; no GPS or in-person visit is required.`],
    ],
  },
  privacidade: {
    ptTitle: 'Seus dados, com clareza.', enTitle: 'Your data, clearly explained.',
    pt: [
      ['Responsável e contato', `Hidden Atlas opera Cidade Oculta. Para dúvidas ou pedidos sobre seus dados, fale pelo ${support}.`],
      ['Dados e finalidade', 'Nos formulários de localização, guardamos e-mail e telefone opcional, a história solicitada, origem da campanha, horário, autorizações separadas para e-mail e WhatsApp e resultado do envio. Esses dados entregam o material solicitado e permitem comunicações futuras somente quando autorizadas. Guardamos o e-mail informado para liberar histórias gratuitas, enviar códigos de acesso e associar compras ao City Pass. Registramos cidade, idioma, consentimento opcional para novidades, origem da campanha, eventos de navegação, progresso, pedidos e status de pagamento para operar o serviço, medir seu uso e atender solicitações. Não recebemos dados de cartão.'],
      ['Sessões e comunicações', 'Cookies necessários identificam a sessão de leitura por até 90 dias e a conta autenticada por até 30 dias. Códigos de acesso são enviados por e-mail. Com autorização separada, inicialmente desmarcada, enviamos até três pistas e ofertas nos dias seguintes ao cadastro, previstas para os dias 1, 3 e 5. Cada mensagem permite cancelar; interrompemos a sequência quando uma compra paga com o mesmo e-mail e cidade é identificada. O cadastro gratuito não obriga a receber a sequência. A audiência usa uma identificação aleatória do navegador por até 90 dias para contar páginas, visitas, horários, origem (somente domínio), tipo de dispositivo, sistema e navegador. O painel mostra caminhos anônimos de navegação; não guarda IP, parâmetros de URL, modelo exato do aparelho ou trilhas de GPS. Limpar cookies ou trocar de aparelho cria outra identificação.'],
      ['Serviços utilizados', 'A Kiwify processa o pagamento e envia eventos de compra ao nosso servidor. Resend entrega e-mails; Netlify hospeda o site; Turso armazena os dados. O mapa usa OpenFreeMap e OpenStreetMap; fontes podem carregar do Google Fonts. Cada serviço pode receber os dados necessários à sua função.'],
      ['Seus pedidos', `Você pode solicitar acesso, correção ou exclusão de dados pelo ${support}. Algumas informações de compra podem precisar ser preservadas para obrigações legais e atendimento. Confirmaremos a titularidade antes de revelar dados de uma conta.`],
    ],
    en: [
      ['Operator and contact', `Hidden Atlas operates Cidade Oculta. For questions or requests about your data, contact us on ${support}.`],
      ['Data and purpose', 'Location forms store email and optional phone, requested story, campaign source, time, separate email and WhatsApp permissions, and delivery status. These records deliver the requested material and allow future communications only when authorized. We keep your email to unlock free stories, send sign-in codes and associate purchases with a City Pass. We record city, language, optional updates consent, campaign source, navigation events, progress, orders and payment status to operate the service, measure usage and handle requests. We do not receive card details.'],
      ['Sessions and messages', 'Necessary cookies identify the reading session for up to 90 days and the signed-in account for up to 30 days. Sign-in codes are sent by email. With separate, initially unchecked permission, we send up to three mystery clues and offers over the next few days, planned for days 1, 3 and 5. Each message offers cancellation; the sequence stops when a paid purchase with the same email and city is identified. Free access does not require the sequence. Audience measurement uses a random browser identifier for up to 90 days to count pages, visits, times, referral domain, device type, operating system and browser. The dashboard shows anonymous navigation paths; it does not store IP addresses, URL parameters, exact device models or GPS trails. Clearing cookies or changing devices creates a new identifier.'],
      ['Services', 'Kiwify processes payments and sends purchase events to our server. Resend delivers emails; Netlify hosts the site; Turso stores data. Maps use OpenFreeMap and OpenStreetMap; fonts may load from Google Fonts. Each service may receive the data needed for its function.'],
      ['Your requests', `You can request access, correction or deletion of data via ${support}. Some purchase records may need to be kept for legal obligations and support. We verify account ownership before disclosing private data.`],
    ],
  },
  termos: {
    ptTitle: 'Antes de continuar.', enTitle: 'Before you continue.',
    pt: [
      ['O que está sendo vendido', 'Hidden Atlas oferece produtos digitais de compra única e sem assinatura. O City Pass Ouro Preto libera as histórias premium publicadas no mapa. O Livro das Assombrações de Ouro Preto é um e-book em PDF com 40 páginas. O conteúdo incluído em cada produto aparece na respectiva página de venda antes da compra.'],
      ['Preço e entrega', 'O preço final, os meios de pagamento e a forma de entrega são mostrados antes da conclusão da compra. O City Pass fica vinculado ao e-mail usado no pagamento e é liberado após a confirmação enviada pela Kiwify. Para produtos em PDF, siga as instruções de entrega exibidas no checkout e na confirmação da compra. Pagamentos por Pix ou boleto podem depender de compensação.'],
      ['Conteúdo e visitas', 'Tradição oral, versões disputadas e ficção são identificadas e não equivalem a fatos históricos comprovados. Imagens geradas por IA são ilustrações. Os produtos digitais não incluem ingresso, visita guiada, transporte ou acesso físico a imóveis. Coordenadas e localidades são apresentadas com os limites editoriais e de segurança indicados em cada conteúdo.'],
      ['Arrependimento, reembolso e suporte', `Você pode solicitar reembolso em até 7 dias após a compra pelos canais da Kiwify ou pelo ${support}. Quando a Kiwify confirmar reembolso ou chargeback de um passe, o acesso correspondente será desativado. Para problemas de acesso ou entrega, informe o e-mail usado na compra ao suporte, sem enviar códigos de login ou dados de cartão.`],
    ],
    en: [
      ['What you are buying', 'Hidden Atlas offers one-time digital products with no subscription. The Ouro Preto City Pass unlocks the premium stories published on the map. The Livro das Assombrações de Ouro Preto is a 40-page Portuguese-language PDF e-book. The contents of each product appear on its sales page before purchase.'],
      ['Price and delivery', 'The final price, payment methods and delivery method are shown before purchase is completed. The City Pass is linked to the email used at checkout and is released after Kiwify confirms the purchase. For PDF products, follow the delivery instructions shown at checkout and in the purchase confirmation. Pix or bank slip payments may require settlement time.'],
      ['Content and visits', 'Oral tradition, disputed versions and fiction are labelled and are not proven historical facts. AI-generated images are illustrations. Digital products do not include admission, a guided tour, transport or physical access to buildings. Coordinates and locations are presented with the editorial and safety limits stated in each product.'],
      ['Refunds and support', `You can request a refund within 7 days of purchase through Kiwify or ${support}. When Kiwify confirms a refund or chargeback for a pass, the corresponding access is deactivated. For access or delivery issues, provide the email used at checkout; never send sign-in codes or card details.`],
    ],
  },
};
