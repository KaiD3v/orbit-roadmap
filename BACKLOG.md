# Backlog

Ideias avaliadas e guardadas para depois. Não estão planejadas; entram quando as funcionalidades atuais (desafios por área, progresso por link e revisão espaçada) estiverem prontas ou quando surgir demanda real.

## Vale depois

### Notas por tópico
Um campo curto para anotar o que aprendeu ou o link que ajudou. Faz do app um caderno de estudo.
- Salvo no próprio progresso (`notes: Record<topicId, string>`), com limite de tamanho por nota.
- Entra no backup em arquivo. **Não** entra no link de progresso, que precisa continuar curto.
- Custo baixo.

### Instalar como app (PWA)
Funciona offline e ganha ícone na tela inicial do celular. Combina com o fato de o app guardar tudo no aparelho.
- `manifest.webmanifest` + service worker simples (cache dos arquivos do build), sem dependência.
- Cuidado com o cache: a página precisa atualizar quando sair uma versão nova (estratégia "network first" para o HTML).
- Custo baixo a médio.

### Imagem da constelação para compartilhar
Gera uma imagem da sua trilha ("Fase 2 concluída", com as estrelas acesas) para postar.
- Desenho em `<canvas>` a partir do progresso, e download ou `navigator.share` com o arquivo.
- Divertido e ajuda a divulgar o app.
- Custo médio.

### Meta semanal
"3 tópicos por semana" no lugar da sequência diária, ou junto com ela. Para quem trabalha, uma meta semanal desanima menos do que perder uma sequência de dias.
- Os dados já existem (`days`). É uma regra nova em `domain/progress.ts` e uma linha no card de próximo passo.
- Custo baixo.

## Pequenos ajustes anotados

- **Busca por palavra inteira:** hoje "RAG" também encontra "sto*rag*e" e abre a fase 5. Avaliar busca por início de palavra.
- **QR code para o link de progresso:** só se o compartilhamento nativo do celular não bastar. Exigiria biblioteca ou um codificador próprio.

## Descartado por enquanto

- **Contas, login e ranking entre usuários:** exigem backend, custo e moderação, e competir com outras pessoas contradiz o objetivo de estudar sem pressão.
- **Tutor com IA dentro do app:** custo por uso e chave de API. Um link "Perguntar ao seu assistente" com um texto pronto para colar resolve com custo zero.
- **Trilhas personalizadas por objetivo:** trabalho grande de curadoria; só depois de saber como as pessoas usam a trilha atual.
