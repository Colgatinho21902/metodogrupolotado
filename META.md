# Medição EDA

Pixel fixo: 1794863211794229. A API de Conversões existente em api/meta.js foi preservada.

PageView e ViewContent são eventos padrão, uma vez por carregamento, com início automático. InitiateCheckout ocorre nos quatro CTAs e no fixo, com guarda global para clique duplo de 1s, um ID novo por interação legítima e navegação limitada a 250ms. A navegação não depende da resposta da Meta. Existe keepalive para o envio ao servidor. Nenhum mecanismo de navegador garante entrega em todos os bloqueadores ou falhas de rede.

O consentimento fica em eda_meta_consent: accepted ou denied. Ausência inicia medição automaticamente, conforme configuração solicitada pelo responsável. Não é gravado um aceite automático em localStorage. Recusa, revogação, DNT e GPC bloqueiam novos eventos no navegador e no servidor. fbevents.js e os cookies publicitários são iniciados automaticamente, exceto com recusa salva, DNT ou GPC. O payload novo usa measurement_allowed; o servidor aceita também consent:true de clientes da versão anterior durante atualização. Isso não comprova consentimento do visitante. A prévia Vercel e o endereço local não enviam eventos. O painel de preferências é aberto somente pelo rodapé.

Variáveis existentes na Vercel Production: META_ACCESS_TOKEN, opcional META_TEST_EVENT_CODE, opcional META_GRAPH_VERSION (padrão v25.0). O token nunca deve ir para dist ou GitHub. O GET /api/meta informa apenas a configuração. serverEnabled não comprova recebimento pela Meta.

Navegador e servidor usam o mesmo nome e ID de evento. A API agrega duplicatas na mesma instância por até dez minutos, sem fila durável ou armazenamento distribuído. A deduplicação real precisa ser confirmada no Gerenciador de Eventos.

A landing não dispara Purchase ou Lead. Purchase deve ser confirmado pela integração da Kiwify. O afid é preservado; a comissão depende das regras de atribuição e do pagamento aprovado, e não do Pixel.
