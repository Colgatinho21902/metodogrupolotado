# Publicar na Vercel

1. Na Vercel, escolha **Add New → Project** e importe o repositório `Colgatinho21902/metodogrupolotado`.
2. Mantenha **Root Directory** na raiz do repositório (`./`).
3. O `vercel.json` já define **Framework Preset: Other**, nenhum comando de instalação ou build e **Output Directory: dist**.
4. Não é necessário cadastrar variáveis de ambiente para a página e o link de afiliado funcionarem.
5. Clique em **Deploy** na sua conta Vercel.

O conteúdo pronto está versionado em `dist/`. A Vercel não precisa baixar o site original nem executar Python. As referências, capturas e arquivos de execução do Sites ficam fora da publicação.

Link configurado em todos os botões:

https://pay.kiwify.com.br/povy39E?afid=Z4HTVvAl

Confirme o link em um clique de teste depois da publicação. O código preserva o parâmetro `afid` quando acrescenta UTMs.

As imagens, fontes e scripts da página são locais. O vídeo do YouTube precisa de internet e só é carregado após o toque. O Pixel próprio do afiliado ainda não foi configurado.

Ao atualizar a página, envie os arquivos atualizados de `dist/` junto com a alteração de código. Não configure a Vercel para executar `build.py` automaticamente: esse script serve para reconstrução local a partir da publicação de referência.

Referência: https://vercel.com/docs/project-configuration/vercel-json
