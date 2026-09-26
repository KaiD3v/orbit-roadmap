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

### Cards compartilháveis de conquistas — parte 2 (nível, conquista, "Minha trilha até aqui")
A parte 1 (card de desafio concluído e de fase concluída) está implementada: `domain/shareCard.ts`, `components/share/drawCard.ts`, `components/ShareCard.tsx`, ver AGENTS.md ("Cards compartilháveis (B05)").
- **Falta:** `levelCard` (subir de nível), `badgeCard` (desbloquear uma conquista) e "Minha trilha até aqui" (a constelação inteira do roadmap, sob demanda — não amarrada a uma transição).
- **Pontos de entrada que faltam:** toast de nível (já existe o toast, falta o botão); sidebar/Conquistas (um botão "Compartilhar" por conquista desbloqueada e um "Minha trilha até aqui" geral).
- Reaproveita o `drawCard` e o diálogo `ShareCard` que já existem; o trabalho é novo `kind` nos dados (`domain/shareCard.ts`) e o desenho de uma medalha/constelação completa.

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
