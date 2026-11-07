# EDA Elite — cópia para afiliado

Cópia da página publicada em https://escoladeafiliados.online/, mantendo os textos, identidade, módulos, oferta, imagens, perguntas e funcionamento dos componentes.

Link fornecido pelo usuário e configurado nos quatro CTAs iniciais e no botão fixo dinâmico:

https://pay.kiwify.com.br/povy39E?afid=Z4HTVvAl

O teste de clique confirmou que o parâmetro `afid` é preservado quando o comportamento original acrescenta UTMs. Nenhuma compra foi feita e a comissão não foi validada por uma transação.

## Mobile

- Verificação no navegador em 320, 390 e 483 px, sem overflow horizontal, e em desktop 1366 px.
- Botões de compra com 52 px de altura no celular.
- Controles do carrossel com área mínima de 44 px no celular.
- Mesmo vídeo original, carregado somente depois do toque.
- Mesmas fontes, agora servidas localmente.
- Mesmas imagens de depoimentos convertidas para WebP, com versões 480 e 960 px, sem alterar seus conteúdos.
- As sete versões de 480 px totalizam 391.168 bytes; as imagens originais totalizavam 1.846.035 bytes. Redução de aproximadamente 79% nesse conjunto de imagens, não no peso total da página.
- Movimento do carrossel respeita a preferência de redução de movimento.

## Medição

O Pixel do produtor `1854019762707116` e os scripts do provedor original não foram instalados nesta cópia. O Pixel próprio do afiliado ainda não foi informado. `metaPixelId` em `config.json` está vazio e é apenas uma pendência documentada; editar esse campo sozinho não instala um Pixel.

Esta entrega não promete aprovação de anúncio, percentual de conversão, nota no PageSpeed nem resultado financeiro. Não foi executado Lighthouse ou teste em hardware físico nesta etapa. Os tamanhos de celular foram emulados no navegador e as evidências estão em `evidence/` no pacote.

## Arquivos

- `dist/`: site estático pronto para servir por HTTP/HTTPS; não exige Node no servidor.
- `config.json`: link do afiliado e parâmetros documentados.
- `build.py`: captura e preparação reproduzível do frontend publicado.
- `verify.py`: verifica preservação dos textos, links, recursos, sintaxe e imagens.
- `asset-report.json`: tamanhos dos arquivos de imagem.
- `evidence/`: capturas e relatório do teste no navegador, incluídos no ZIP de entrega.

Para conferir localmente:

```sh
python -m http.server 5194 --directory dist
```

Abra http://localhost:5194/ . Abrir `index.html` por `file://` não executa os módulos corretamente.

Para reconstruir, é necessário Python com Pillow, Node para a checagem opcional de sintaxe e acesso ao site original. O build usa o cache privado `referencia/` quando disponível. Se os nomes dos bundles da publicação original mudarem, o script interrompe para revisão em vez de produzir uma cópia parcial silenciosamente.

## Uso no Lovable

O ZIP contém uma captura estática funcional do frontend publicado, não o repositório original editável do produtor. Os módulos JavaScript distribuídos já estão compilados. Para integrar a outro projeto Lovable, use a pasta `dist/` como referência e disponibilize seus assets locais; não substitua APIs ou painéis existentes. O vínculo GitHub/Lovable e a publicação de um projeto Lovable são operações separadas desta cópia.

No Sites, a entrega permanece privada para revisão. Tornar acessível para visitantes de anúncios exige alteração explícita do acesso ou hospedagem pública do pacote.
