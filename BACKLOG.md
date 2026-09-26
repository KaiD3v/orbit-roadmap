# Backlog

Ideias avaliadas e guardadas para depois. Não estão planejadas; entram quando as funcionalidades atuais (desafios por área, progresso por link e revisão espaçada) estiverem prontas ou quando surgir demanda real.

## Vale depois

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

## Pequenos ajustes anotados

- **QR code para o link de progresso:** só se o compartilhamento nativo do celular não bastar. Exigiria biblioteca ou um codificador próprio.

## Descartado por enquanto

- **Contas, login e ranking entre usuários:** exigem backend, custo e moderação, e competir com outras pessoas contradiz o objetivo de estudar sem pressão.
- **Tutor com IA dentro do app:** custo por uso e chave de API. Um link "Perguntar ao seu assistente" com um texto pronto para colar resolve com custo zero.
- **Trilhas personalizadas por objetivo:** trabalho grande de curadoria; só depois de saber como as pessoas usam a trilha atual.
