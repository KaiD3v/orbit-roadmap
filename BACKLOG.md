# Backlog

Ideias avaliadas e guardadas para depois. Não estão planejadas; entram quando as funcionalidades atuais (desafios por área, progresso por link e revisão espaçada) estiverem prontas ou quando surgir demanda real.

## Vale depois

### Cards compartilháveis de conquistas ("instagramáveis")
Gera uma imagem bonita, pronta para postar no LinkedIn, Instagram ou X, nos momentos que valem comemorar. É divertido para quem usa e é a forma mais barata de divulgar o app.
- **Quando oferecer:** um botão "Compartilhar" no toast grande e no painel, depois de:
  - concluir um **desafio** (o card mostra o título e os critérios de pronto atendidos, que são a prova de que construiu algo);
  - concluir uma **área** ou uma **fase** (a constelação da fase com as estrelas acesas);
  - subir de **nível** e desbloquear uma **conquista** (a medalha);
  - e sob demanda: "Minha trilha até aqui", com a constelação inteira.
- **Formatos:** retrato 1080×1350 (feed do LinkedIn e do Instagram) e 1080×1920 (stories), escolhidos na hora de gerar.
- **Conteúdo:** visual da carta celeste (fundo estrelado, estrelas acesas, a lua), data, XP e o nome do app. Nome ou @ são **opcionais**, digitados na hora e salvos só no aparelho.
- **Implementação sem dependência:** desenho em `<canvas>` 2D a partir do progresso, esperando `document.fonts.ready` para as fontes saírem certas.
  - No celular: `navigator.share({ files: [png] })`, conferindo antes com `navigator.canShare`.
  - No desktop: download do PNG.
  - Uma legenda pronta vai para a área de transferência (ex.: "Concluí o desafio 'Fila de jobs com retry e DLQ' na trilha de Engenharia de Software com IA #orbit"). O LinkedIn não aceita imagem por link de compartilhamento, então o fluxo é baixar a imagem e colar a legenda.
- **Privacidade:** nada sai do aparelho; a imagem é gerada localmente.
- **Depende de:** desafios por área (F01) para o card de desafio. Os de fase, nível e conquista funcionam com o que já existe.
- Custo médio: o desenho no canvas é a parte trabalhosa. Vale começar só pelo card de desafio e pelo de fase.

## Pequenos ajustes anotados

- **QR code para o link de progresso:** só se o compartilhamento nativo do celular não bastar. Exigiria biblioteca ou um codificador próprio.

## Descartado por enquanto

- **Contas, login e ranking entre usuários:** exigem backend, custo e moderação, e competir com outras pessoas contradiz o objetivo de estudar sem pressão.
- **Tutor com IA dentro do app:** custo por uso e chave de API. Um link "Perguntar ao seu assistente" com um texto pronto para colar resolve com custo zero.
- **Trilhas personalizadas por objetivo:** trabalho grande de curadoria; só depois de saber como as pessoas usam a trilha atual.
