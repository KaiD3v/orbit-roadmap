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

### Recomendação de materiais mais completa
Hoje cada área tem 4 materiais fixos (Material, Curso, Vídeo e Livro), com um em destaque. A ideia é transformar isso num guia de estudo de verdade.
- **Materiais por tópico, não só por área:** quem trava em "idempotência" encontra o que ler sobre idempotência, sem garimpar a área inteira.
- **Mais contexto em cada material:** nível (iniciante/intermediário/avançado), idioma (PT/EN), gratuito ou pago, duração ou tamanho estimado e uma frase de "por que este" (o que você vai conseguir fazer depois).
- **Ordem sugerida:** "comece por este, depois este", no lugar de uma lista solta. Casa com o "Comece por este" que já existe no painel.
- **Marcar como lido/assistido:** registro local, no mesmo modelo dos tópicos, que pode valer um pouco de XP.
- **Uma página ou visão "Biblioteca":** todos os materiais com filtros por tipo, nível, idioma e gratuito. Hoje o app não tem rotas; dá para fazer como uma visão por hash (`#biblioteca`) ou um painel grande, sem router.
- **Modelo de dados:** campos opcionais em `Resource` (`level`, `lang`, `free`, `duration`, `why`, `topics?: string[]`). Os materiais atuais continuam válidos sem os campos novos.
- **Manutenção:** um script (fora dos testes normais, rodado de vez em quando) que confere se os links ainda respondem, porque curadoria com link quebrado perde a confiança rápido.
- Custo: o código é médio; a **curadoria do conteúdo é a parte grande**. Vale começar pelos tópicos essenciais da fase 1.

### Meta semanal
"3 tópicos por semana" no lugar da sequência diária, ou junto com ela. Para quem trabalha, uma meta semanal desanima menos do que perder uma sequência de dias.
- Os dados já existem (`days`). É uma regra nova em `domain/progress.ts` e uma linha no card de próximo passo.
- Custo baixo.

## Pequenos ajustes anotados

- **QR code para o link de progresso:** só se o compartilhamento nativo do celular não bastar. Exigiria biblioteca ou um codificador próprio.

## Descartado por enquanto

- **Contas, login e ranking entre usuários:** exigem backend, custo e moderação, e competir com outras pessoas contradiz o objetivo de estudar sem pressão.
- **Tutor com IA dentro do app:** custo por uso e chave de API. Um link "Perguntar ao seu assistente" com um texto pronto para colar resolve com custo zero.
- **Trilhas personalizadas por objetivo:** trabalho grande de curadoria; só depois de saber como as pessoas usam a trilha atual.
