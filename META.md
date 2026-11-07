# Meta — Pixel 1794863211794229

O site envia PageView, ViewContent e InitiateCheckout. O valor de R$157,90 é o preço anunciado do curso, não receita confirmada ou valor de um lead. Purchase e Lead não são disparados na landing page. Os quatro CTAs e o CTA fixo usam o mesmo rastreador, com um InitiateCheckout por carregamento da página. Abrir o checkout não aguarda a medição.

## Ativar o envio pelo servidor

Na Vercel, abra o projeto → Settings → Environment Variables. Adicione somente no ambiente Production:

- `META_ACCESS_TOKEN`: token da API de Conversões do Pixel 1794863211794229.
- `META_TEST_EVENT_CODE`: opcional, código da aba Eventos de teste da Meta. Remova após validar.
- `META_GRAPH_VERSION`: opcional; padrão `v25.0`. Ajuste quando migrar a versão da Graph API.

Faça um Redeploy após salvar. Nunca coloque o token no config.json, no código, no chat ou em arquivos versionados. Nenhum token é entregue ao navegador; o cabeçalho de autorização é usado apenas na função da Vercel. GET `/api/meta` informa se o envio está configurado, sem revelar o token.

Sem token, o Pixel funciona no navegador em produção e a API fica desativada. Com token, navegador e servidor compartilham event_name e event_id/eventID para deduplicação na Meta. A função também agrega requisições repetidas na mesma instância por dez minutos; essa memória não é uma garantia de armazenamento distribuído. Uma entrega com erro retorna 502, sem informar sucesso indevidamente. Não há fila durável para recuperar falhas externas.

## Privacidade e escopo

Prévia e localhost não enviam eventos. A configuração é liberada pelo ambiente de produção da Vercel. Recusa salva (`eda_meta_consent=denied` no localStorage), DNT e Global Privacy Control bloqueiam o rastreador. O servidor também verifica DNT e GPC. Os identificadores _fbp e _fbc são utilizados quando disponíveis; _fbc só é criado com fbclid real. Nenhum email, telefone ou formulário é coletado. IP e user agent seguem para a Meta pelo servidor. A URL enviada é limitada à origem e caminho, sem parâmetros de busca.

O endpoint aceita somente eventos da página `https://escoladeafiliados.vercel.app/`; ao trocar o domínio, ajuste ALLOWED_ORIGIN em api/meta.js. Não possui endpoint de Purchase público.

## Compras

Configure o mesmo Pixel e a API de Conversões na sua afiliação/produto na Kiwify, quando a plataforma disponibilizar essa opção. A compra deve ser registrada por confirmação de pagamento da Kiwify, não pelo clique da landing page. A integração da Kiwify precisa ser validada separadamente; esta entrega não comprova recebimento de Purchase.

## Validação

`node --test tracking/tracking.test.cjs` testa o navegador e a função com transportes simulados, sem enviar eventos reais. `python verify.py` verifica os arquivos estáticos. Para validar a conexão real, salve o token, configure o código de teste, faça redeploy e confira no Gerenciador de Eventos: PageView, ViewContent e um InitiateCheckout no toque, com IDs coincidentes para navegador/servidor. Verifique também as respostas da função e o diagnóstico de deduplicação. Código pronto não significa que a Meta já recebeu os eventos pelo servidor.
