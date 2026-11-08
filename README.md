# Revisão da landing page EDA — prévia para aprovação

A versão em produção não foi alterada. Pixel 1794863211794229, checkout com afid=Z4HTVvAl, preço R$157,90 e garantia de 7 dias preservados.

## Alterações
- Uma única fonte externa do rastreador (`tracking/browser.js`, copiada para `dist/assets/tracking.js`), sem duas cópias inline do snippet.
- Eventos padrão via track; PageView e ViewContent uma vez por carregamento, com início automático. InitiateCheckout por interação legítima, com guarda global de clique duplo e navegação em até 250ms.
- API existente preservada, com eventID/event_id coincidente. Nenhum Purchase ou Lead na landing page. Configuração e token continuam exclusivamente na Vercel.
- UTMs e fbclid recebidos são mantidos em sessionStorage, protegidos por try/catch e enviados em todos os CTAs. Sem valores inventados. Sem campanhas na sessão, o checkout permanece exatamente no link fixo.
- Medição automática por padrão, sem aviso inicial de aceite; desativação e reativação disponíveis no rodapé. Recusas salvas permanecem respeitadas. DNT/GPC respeitados. As compras funcionam sem medição.
- Vídeo permanece sob demanda, com a mesma capa convertida em WebP. Testado no navegador, com reprodução após o clique.
- Estilos e fontes declarados no HTML para evitar requisições bloqueantes de CSS; os arquivos de hidratação não são mais preloaded sobre a capa. Fontes continuam locais. O botão funciona antes da hidratação via delegação.
- Rodapé identifica a divulgação independente. Páginas de Privacidade e Termos adicionadas. Responsável e contato identificados na Política de Privacidade.
- Sete provas sem autorização confirmada retiradas da exibição e de dist. Materiais guardados em review-only, excluído do deploy. Comentários CONFIRMAR ORIGEM e CONFIRMAR COM O PRODUTOR nos pontos apropriados.
- Botões de 52px no mobile, sem overflow horizontal em 320/390/483px e desktop 1366px; botão fixo e preferência de movimento preservados.

## Validação
`node --test tracking/tracking.test.cjs`: 7 testes passaram com transportes simulados, sem envio real à Meta. `python verify.py`: textos de venda preservados, checkout e assets verificados, sintaxe JavaScript válida.

Lighthouse mobile local com os dois exports servidos pelo mesmo servidor gzip, mesma máquina e configuração: performance 85 → 92, FCP 1,1s → 0,8s, LCP 4,3s → 3,0s, TBT 70ms → 180ms, CLS 0,02 → 0. São execuções pontuais e apresentam variação. A meta de LCP abaixo de 2,5s ainda não foi demonstrada; a confirmação final depende de medir a hospedagem da Vercel após aprovação. Não são medições em um celular físico.

Foi registrada separadamente a produção antes: performance 60, LCP 4,0s, TBT 1680ms, com alertas de timeout e CPU lenta. Esses resultados não foram usados como comparação controlada com localhost. Relatórios completos em evidence/.

## Reproduzir
A pasta source contém os inputs imutáveis da exportação anterior. `python build.py` aplica a migração com asserts, sem baixar a página do produtor. Requer Python com Pillow (o script usa a instalação local .tools/image-opt quando disponível). `dist/` contém os arquivos prontos; a Vercel permanece sem build e serve dist mais api/meta.js.

A revisão está separada de main; não fazer merge antes de revisar a prévia. O comportamento real de recebimento/deduplicação na Meta deve ser conferido em Eventos de teste após publicação. Não foi feita compra e não há validação de comissão por transação.

A inicialização automática foi solicitada pelo responsável. O código não registra um aceite fictício nem certifica a adequação jurídica dessa escolha. Os relatórios Lighthouse anteriores à alteração de inicialização não medem o custo do Pixel automático.
