# AGENTS.md

Contexto para quem (pessoa ou agente de IA) vai trabalhar neste código. O que o produto é e como instalar está no [README.md](README.md).

## O produto em uma frase

Roadmap de estudo de Engenharia de Software com IA (60 áreas, 557 tópicos, 6 fases), 100% no navegador, cujo objetivo é **reduzir a carga cognitiva**. A pessoa vê um próximo passo por vez, não uma lista de tarefas, e é recompensada por avançar e por construir (desafios práticos).

Princípios que guiam as decisões:
- **Uma pergunta por tela:** "qual é o próximo passo?". A visão geral, os números e os extras existem, mas ficam recolhidos até a pessoa pedir.
- **Essencial antes de extra.** O progresso principal, o nível e o "próximo passo" consideram só os tópicos essenciais.
- **Sem backend, sem conta, sem custo recorrente.** Tudo local; o progresso é da pessoa.
- **Sem over engineering.** Poucos arquivos, nada de abstrações especulativas.

## Comandos

```bash
pnpm install
pnpm dev          # Vite
pnpm lint         # ESLint + formatação (@stylistic); `pnpm lint --fix` corrige
pnpm test         # node tests/domain.mjs && node tests/store.mjs
pnpm build        # tsc -b + vite build
pnpm check-links  # confere se as URLs dos materiais respondem 2xx/3xx; fora do `pnpm test`, roda de vez em quando
```

**Validação completa antes de concluir qualquer mudança:** `pnpm lint && pnpm build && pnpm test`.

Se o `pnpm` não estiver no PATH (acontece no Windows desta máquina), use o equivalente com `npx`:
`npx eslint . && npx tsc -b && node tests/domain.mjs && node tests/store.mjs && npx vite build`.
Para instalar dependências, use a mesma versão do lockfile: `npx pnpm@11.19.0 add …`. Nunca use `npm install`, que criaria um `package-lock.json` e bagunçaria o `node_modules` do pnpm.

## Arquitetura

```
src/
  main.tsx                 monta <App/> e importa styles/index.css
  App.tsx                  shell: tabela de rotas, sidebar, topbar, e as camadas globais (painel da área, toast,
                           card compartilhável, progresso por link) que ficam por cima de qualquer página
  router.ts                roteamento por hash (`#/caminho`): usePath, href, pathFromHash
  pages/                   uma página por rota; todas recebem PageProps (types.ts)
    HomePage.tsx           `/`: Hero, próximo passo, mapa (com o estado de busca e filtro) e conquistas
    LibraryPage.tsx        `/biblioteca`: Biblioteca de materiais (B06)
  data/
    areas.ts               CONTEÚDO: as 60 áreas (tópicos, materiais, desafios). Tipado.
    roadmap.ts             fases + índices derivados (orderedAreas, areasByPhase, stepLabel, validTopicKeys,
                           legacyTopicKeys, areasWithChallenge, resourceEntries, validResourceKeys)
  types/
    content.ts             Area, Topic, Resource (+ ResourceLevel), Challenge, ResourceType, PhaseNumber
    progress.ts            Done, Challenges, DoneAt, Reviews, ReviewStep, Notes, ResourcesRead, ProgressData,
                           ProgressBackup
  domain/                  REGRAS PURAS: sem React, sem DOM, sem localStorage
    progress.ts            XP (+ materialXp), níveis, conquistas, metas, meta semanal, próximo passo,
                           estados de fase/área, feedback
    filter.ts              busca e filtros do mapa
    backup.ts              validação, limpeza e migração de progresso (arquivo, localStorage, legado)
    share.ts               progresso por link: codifica/decodifica o hash e junta com o progresso local
    review.ts              revisão espaçada: Leitner de 3 degraus (pickReview, answerReview, timeAgo)
    shareCard.ts           cards compartilháveis (B05): monta os DADOS do card (challengeCard, phaseCard),
                           não desenha nada
    resources.ts           materiais (B06): normalizeResourceUrl (chave estável), resourcesForTopic,
                           resourceMeta (metadados discretos), LEVEL_LABEL, byLevel (ordena por nível)
  store/
    progress.ts            Zustand + persist (localStorage) e hooks (useMetrics, useWeek, useToggleTopic,
                           useToggleChallenge); `answerReview`/`setNote`/`toggleResourceRead` são lidas
                           direto via `useProgress(state => state.acao)`.
                           Exporta `Notification` (`Feedback` + `share?` opcional), anexado nas transições
                           de desafio, fase e nível concluídos para o botão "Compartilhar" do toast grande.
  components/              só exibição: leem o store e chamam o domínio
    NextStep.tsx           card "Seu próximo passo" (o elemento principal da tela), com o bloco de revisão espaçada e
                           a meta semanal no rodapé
    Hero.tsx               boas-vindas, só na primeira visita (depois vira um <h1> sr-only)
    Journey.tsx            seção do mapa: título, MapToolbar, RoadmapMap, lista vazia
    MapToolbar.tsx         busca, filtros e contagem de resultados
    RoadmapMap.tsx         fases (acordeão) e trilha em zigue-zague com caminho SVG; cabeçalho da fase
                           concluída ganha o botão "Compartilhar" (B05)
    AreaDialog.tsx         painel lateral da área: passos, desafio, extras, materiais; rola e destaca um tópico
                           quando aberto pelo "Rever" da revisão espaçada; cada tópico tem uma nota (B03) e,
                           se tiver material ligado, um "Onde estudar" (B06); desafio concluído ganha "Compartilhar"
    ResourceCard.tsx       um material: variante `panel` (painel da área/próximo passo — metadados, "por que",
                           marcar como lido) e variante `library` (o cartão-astro do observatório, sem
                           "depois, este"); e TopicResources (materiais de um tópico específico, atrás do
                           link "Onde estudar"). Usado por AreaDialog, NextStep e LibraryPage.
    ResourceBody.tsx       o astro de um material por tipo (L02): planeta com anel (Livro), estrela numa
                           órbita parada (Curso), cometa (Vídeo) ou estrela de quatro pontas (Material);
                           só currentColor, sem cor fixa no SVG — não lido = cor da fase, lido = ciano
    LibrarySky.tsx         fundo da Biblioteca (L01): o céu da Home (fundo fixo) + a grade de atlas, e
                           `LibraryHeaderFigures`, duas figuras de estudo (livro, lamparina) presas aos
                           cantos só do cabeçalho (`.library-top`, que nunca rola por baixo de nada —
                           por isso não colidem com títulos de área). Decorativo, `aria-hidden`, sem
                           nenhuma animação
    ShareCard.tsx          diálogo de compartilhamento (B05): pré-visualização do card em <canvas>,
                           formato (feed/stories), nome/@ opcional, compartilhar/baixar e copiar legenda
    share/drawCard.ts      desenha o ShareCardData num <canvas> 2D (fundo, título, constelação, anel de
                           nível, medalha de conquista ou checklist do desafio, rodapé); sem dependência
    Sidebar.tsx            navegação por fase (vira menu hambúrguer ≤820px), nível (com "Compartilhar") e
                           entrada da Biblioteca
    Achievements.tsx       conquistas (cada uma desbloqueada ganha "Compartilhar") e "Compartilhar minha
                           trilha até aqui"
    BackupControls.tsx, Toast.tsx
    icons/                 ícones SVG desenhados à mão, um por arquivo (BookIcon, PencilIcon); `currentColor`,
                           14px, `aria-hidden`
    ui/                    componentes de interface genéricos, sem regra do app (SectionHeading)
  styles/                  CSS puro: base (tokens, fundo), dashboard, map, dialog, share, library; index.css importa todos
public/                    servidos como estão, sem passar pelo build (ver "PWA" abaixo)
  favicon.svg, icon-192.png, icon-512.png, icon-maskable-512.png
  manifest.webmanifest, sw.js
scripts/
  check-links.mjs          confere as URLs dos materiais (HEAD, GET de reserva); `pnpm check-links`, fora do teste
tests/
  domain.mjs               regras puras
  store.mjs                integridade do conteúdo + hidratação/migração do store
```

**Fluxo:** o componente lê o estado com `useProgress(state => …)` ou `useMetrics()`, calcula a exibição com funções de `domain/` e dispara ações do store. O estado de tela compartilhado (toast, painel da área, card compartilhável) mora no `App` e chega às páginas pelo `PageProps` (`notify`, `openArea`, `openShare`); estado de uma página só (ex.: busca e filtro do mapa) fica na própria página.

**Rotas (`router.ts`):** hash no formato `#/caminho`, não caminho de URL, para funcionar em qualquer hospedagem estática e offline (PWA) sem configurar fallback. Só hash que começa com `#/` é rota; âncoras (`#fase-2`, `#inicio`) e o link de progresso (`#p=`) pertencem à página inicial (`pathFromHash` devolve `/`). Rota desconhecida cai na `/`. Ao trocar de rota, o `App` volta ao topo (ou rola até a âncora), leva o foco para o `<main>` e atualiza o título da aba e o breadcrumb com o `title` da rota.

**Página nova:**
1. `src/pages/NomePage.tsx`, exportando um componente que recebe `PageProps`.
2. Uma linha na tabela `routes` do `App.tsx`: `'/caminho': { title: 'Título', Page: NomePage }`.
3. Um link com `href('/caminho')` onde fizer sentido (a sidebar marca o ativo com `aria-current="page"`).

**Onde colocar código novo:**
- Regra de negócio → `src/domain/`, como função pura, **com teste** em `tests/domain.mjs`.
- Mudança no formato do progresso → `types/progress.ts` + `domain/backup.ts` + `store/progress.ts`, com teste de migração em `tests/store.mjs`.
- Conteúdo → `src/data/areas.ts`.
- Componente → só apresentação; se tiver um `if` de regra de negócio, ele provavelmente pertence ao domínio.
  - Ícone SVG → `components/icons/`, um arquivo por ícone, importado direto (sem `index.ts`).
  - Peça de interface usada em mais de um lugar e que não conhece o domínio (não importa de `domain/` nem de
    `store/`) → `components/ui/`. Componente ligado a uma funcionalidade fica na raiz de `components/`.

Não há Context, biblioteca de roteamento (o `router.ts` tem ~20 linhas), barrels (`index.ts`) nem biblioteca de UI. Não adicione sem necessidade real: rota com parâmetro, por exemplo, cabe no `router.ts` antes de justificar uma dependência.

## Conteúdo (`src/data/areas.ts`)

- `Area`: `id` (número estável), `title`, `phase` (1–6), `description`, `topics`, `resources`, `challenge?`.
- `Topic`: `id` no formato `a{área}-t{NN}` (ex.: `a1-t07`), `title`, `required` (essencial = `true`, extra = `false`).
- `Resource`: `type` ∈ `Material | Curso | Vídeo | Livro`, `title` e `url`, que **precisa** começar com `https://`. Os três quebram o `tsc` se estiverem errados. Toda área tem **pelo menos** os 4 tipos (verificado em `tests/store.mjs`); nada impede mais de um do mesmo tipo.
  - Campos opcionais (B06), todos undefined em materiais antigos sem curadoria: `level?: 'iniciante' | 'intermediario' | 'avancado'`, `lang?: 'pt' | 'en'`, `free?: boolean`, `duration?: string` (texto curto: `"2h"`, `"40 min"`, `"300 páginas"` — **não invente**; sem confirmação, omita), `why?: string` (uma frase, até ~140 caracteres, o que dá para fazer depois), `topics?: string[]` (ids de tópico **da mesma área**, verificado em `tests/store.mjs`).
  - **Ordem de exibição:** por nível (iniciante, intermediário, avançado, sem `level` por último) e, dentro do mesmo nível, a ordem do array (`byLevel` em `domain/resources.ts`, aplicada na exibição, sem reescrever os dados). O primeiro depois dessa ordenação é "Comece por este". Um item com `why` some como "depois, este" — sinaliza sequência sem numeração decorativa; sem `why`, aparece como hoje, sem selo.
- `Challenge` (opcional): `title` (imperativo, uma frase), `brief` (2–3 frases: contexto e escopo mínimo) e `done` (3–5 critérios objetivos de pronto). Por enquanto só as 14 áreas da fase 1 têm desafio.
- **Nunca renomeie nem reutilize IDs de tópico ou de área.** O progresso salvo e os backups dependem deles. Para adicionar um tópico, use o próximo número livre da área.
- A ordem de exibição é por fase e, dentro da fase, pela ordem do array (`orderedAreas`). O número da etapa ("Etapa 07") vem dessa ordem, não do `id`.

## Regras de negócio

### Progresso salvo (esquema v6)

```ts
ProgressData = {
  done: Record<topicId, true>,               // tópicos concluídos
  days: string[],                            // dias com estudo, 'YYYY-MM-DD' no fuso local
  challenges: Record<areaId, string>,        // desafios concluídos → dia da conclusão
  doneAt: Record<topicId, string>,           // dia em que cada tópico concluído foi marcado
  reviews: Record<topicId, {                 // última revisão espaçada de cada tópico
    at: string, step: 0 | 1 | 2 | 3          // 3 = já revisto três vezes (graduado, fora do ciclo)
  }>,
  notes: Record<topicId, string>,            // nota curta por tópico (B03), até NOTE_MAX caracteres
  resourcesRead: Record<resourceKey, string>, // material lido (B06) → dia em que marcou; ver seção abaixo
}
```

- Chave do `localStorage`: **`orbit-roadmap-react-v1`**, com `version: 6` no `persist` do Zustand. Não mude o nome da chave.
- Migração: tudo passa por `cleanProgress`, que descarta IDs inexistentes, datas inválidas e desafios de áreas sem desafio, e preenche campos ausentes com `{}` ou `[]`.
  - O v1 salvava os tópicos como `'{idDaÁrea}:{índice}'`; eles são convertidos para os IDs estáveis via `legacyTopicKeys`.
  - Progressos v2 não têm `challenges` e ganham `{}`.
  - Progressos anteriores ao v4 não têm `doneAt`/`reviews`: cada tópico já concluído ganha `doneAt` = **dia da migração** (nunca a data real de conclusão, perdida), e `reviews` começa `{}`. Por isso ninguém recebe uma revisão no dia em que atualiza o app; elas só aparecem semanas depois. `cleanProgress` aceita um `today` opcional (default `localDay()`) para isso ser testável.
  - Uma entrada de `reviews` só é aceita se o tópico correspondente estiver em `done`; senão é descartada (revisão de tópico não concluído não existe).
  - Progressos anteriores ao v5 não têm `notes` e ganham `{}`.
  - Progressos anteriores ao v6 não têm `resourcesRead` e ganham `{}`; chaves que não correspondem a nenhum material atual (`validResourceKeys`) são descartadas.
- Na primeira execução, o progresso da versão HTML antiga é lido da chave `orbit-roadmap-v1`, se existir na mesma origem.
- Backup: exporta `{ version: 6, ...ProgressData }` como `orbit-progresso.json`; importa versões **1 a 6** e **substitui** o progresso atual (com confirmação).
- **Toda mudança de formato:** sobe a versão (persist e backup), aceita as versões antigas e ganha teste de migração. Perder progresso de quem já usa é o pior bug possível aqui.

### Progresso por link (`domain/share.ts`)

Leva o progresso para outro aparelho sem arquivo: um link com tudo depois do `#`, parte do endereço que o navegador **nunca envia a um servidor** (privacidade de graça).

- Formato: `#p=1~<áreas>~<dias>~<desafios>`.
  - `1` é a versão do link. Essa é a primeira versão (a F02 foi implementada depois da F01, então já nasce com o campo de desafios; não existe link antigo sem esse campo para migrar).
  - `<áreas>`: um segmento por área com algum tópico concluído, `<idDaÁrea>.<bits em base64url>`, separados por `,` (não por `_`: o alfabeto base64url já usa `_`, então `_` não serve de separador). O bit *k* corresponde ao tópico com sufixo `-t{k+1}` (`topicIndex` em `data/roadmap.ts`, a mesma função usada por `legacyTopicKeys` — não duplique esse regex). Área sem tópico concluído não entra no link.
  - `<dias>`: bitset em base64url dos últimos 60 dias (bit 0 = hoje). Dias mais antigos não viajam no link; aceito, o bastante para preservar a sequência.
  - `<desafios>`: lista de ids de área com desafio concluído, separados por `,`. A data de conclusão não viaja (não é lida em nenhuma tela); quem importa ganha "hoje" como data.
- **Decodificação é tolerante:** área ou bit sem tópico correspondente é ignorado; um segmento adulterado (base64 ilegível) é descartado sem derrubar o resto do link. Só a forma geral do link (4 partes separadas por `~`, prefixo de versão reconhecido) lança erro — o resto sempre passa por `cleanProgress`.
- **Gerar:** botão "Copiar link de progresso" (`BackupControls`). Com `navigator.share`, abre o compartilhamento nativo; senão, `navigator.clipboard.writeText` com toast; se o clipboard falhar, um `window.prompt` com o link para copiar à mão.
- **Abrir:** ao montar o `App`, se `location.hash` começa com `#p=`, decodifica e **junta** com o progresso local (`mergeProgress`, união de `done`/`days`/`challenges` — nunca apaga nada, diferente de `importBackup`, que substitui e por isso pede confirmação). Toast "Progresso do link adicionado: +N tópicos" (ou "Este aparelho já tinha tudo desse link" se N = 0); em erro, "Esse link de progresso está incompleto ou é de outra versão" e o progresso local não é tocado. Nos dois casos o hash é limpo com `history.replaceState`, sem conflitar com as âncoras `#fase-N` do mapa.
- **Testes em `tests/domain.mjs`:** ida e volta com progresso completo (o teste imprime o tamanho real do link), área/tópico inexistente e prefixo de versão inválido. `tests/store.mjs` cobre a ação `mergeProgress` do store.
- **`doneAt`/`reviews` (F03) não viajam no link**, para ele continuar curto. Em `combineProgress`, um tópico que já existia no aparelho que recebe mantém seu `doneAt`; um tópico novo (que veio do link) ganha `doneAt` = hoje. `reviews` são só combinadas (união), já que o link nunca carrega revisões.
- **`notes` (B03) e `resourcesRead` (B06) também não viajam no link** — o link precisa continuar curto e ambos podem ter algo pessoal. `combineProgress` sempre fica com os do aparelho atual (`current.notes`/`current.resourcesRead`), nunca com os de `incoming` (que de todo modo nunca tem nenhum).

### Revisão espaçada (`domain/review.ts`)

Leitner de 3 degraus (sem lib de repetição espaçada: é resposta binária, algumas linhas de função pura resolvem; um FSRS pediria guardar um card inteiro — estabilidade, dificuldade, due, reps — por tópico, sem ganho aqui). De vez em quando, o card "Seu próximo passo" traz de volta um essencial concluído há semanas, para consolidar a memória em vez de deixar esquecer.

- `REVIEW_INTERVALS = [14, 30, 90]` (dias, um por degrau). `pickReview(data, today)` devolve o tópico elegível mais atrasado, ou `null`.
- **Elegível:** essencial concluído (`done[id]`) cuja última referência (`reviews[id].at` ou, se não houver, `doneAt[id]`) já passou de `REVIEW_INTERVALS[step]` dias. Extras nunca entram.
- **Degrau (`step`):** `0` (ainda não revisto) → `1` (revisto uma vez) → `2` (revisto duas vezes, intervalo de 90 dias) → `3`, interno, "graduado": depois de uma revisão lembrada no degrau 2, o tópico sai do ciclo de revisão para sempre (o plano original descrevia só `0 | 1 | 2`; o quarto valor foi a forma mais simples de representar "já passou por uma revisão de 90 dias" sem um campo à parte — decisão registrada aqui por não estar no plano).
- **No máximo uma revisão por dia:** se qualquer `reviews[*].at === today`, `pickReview` devolve `null` mesmo havendo outro tópico elegível.
- **Desempate determinístico:** o mais atrasado (mais dias desde a referência); empatado, o de menor id de área e depois de tópico (não a ordem lexicográfica da string, que erraria "a10" antes de "a2").
- **`answerReview(data, topicId, remembered, today)`:** "Lembro" avança o degrau (até o graduado); "Rever" volta ao degrau 0 — nunca desmarca o tópico, rever não é punição.
- **`timeAgo(dias)`:** "há 2 semanas", "há 1 mês", "há 3 meses" etc., usado no texto do card.
- **`toggleTopic`** grava `doneAt` ao marcar um tópico e remove `doneAt`/`reviews` ao desmarcar.
- **Interface:** bloco secundário dentro do card "Seu próximo passo" (aparece também com a trilha completa), com um ponto com cauda em CSS (não o glifo ☄) e os botões "Lembro"/"Rever". "Rever" registra a resposta e abre o painel da área com o tópico rolado à vista e destacado por 2s (`AreaDialog`, via `id="topic-{id}"` nos rótulos e `highlightTopicId`).
- **Testes em `tests/domain.mjs`:** elegibilidade em cada degrau, limite de uma revisão por dia, desempate, as duas respostas de `answerReview`, `timeAgo` e a migração que preenche `doneAt`. `tests/store.mjs` cobre `toggleTopic` e a ação `answerReview` do store, e a migração v3 → v4 via `safeProgress`.

### Notas por tópico (B03)

Um campo curto para anotar o que aprendeu ou um link que ajudou, por tópico. Não é uma funcionalidade de estudo à parte: ela só aparece encaixada onde o tópico já aparece (painel da área, bloco de revisão espaçada).

- `NOTE_MAX = 500` caracteres (`domain/backup.ts`). `cleanProgress` descarta chaves que não são um `topicId` válido (`validTopicKeys`) e valores que não são string, faz `trim` e corta no limite; nota vazia (após o trim) não é salva.
- **Nota não depende de o tópico estar concluído** — dá para anotar antes de terminar. **Desmarcar o tópico não apaga a nota** (`toggleTopic` só mexe em `done`/`doneAt`/`reviews`).
- **Ação do store:** `setNote(topicId, text)` (`store/progress.ts`) ignora `topicId` inválido, faz `trim` + corta em `NOTE_MAX`, e remove a chave quando o texto fica vazio. **Não registra dia de estudo** — anotar não é estudar, `days` não muda.
- **Interface no painel (`AreaDialog.tsx`):** cada tópico (essencial pendente, concluído e extra) ganha um botão "Anotar" ou, com nota salva, um ponto discreto + "Ver nota" — sempre **fora do `<label>`** do checkbox, para não competir com ele. Abrir mostra um `<textarea>` inline abaixo do tópico, com contador "N/500", salvando **ao sair do campo** (`onBlur`) e com Ctrl+Enter; "Pronto" fecha. Só uma nota aberta por vez (estado `openNote` guarda `{ areaId, topicId }`; trocar de área invalida o `topicId` guardado sem precisar de um efeito para resetar). **Esc fecha a nota, não o `<dialog>`** (`preventDefault` + `stopPropagation` no `keydown`, e salva antes de fechar).
- **Na revisão espaçada:** se o tópico em revisão tem nota, o bloco "Ainda lembra de X?" (`NextStep.tsx`) ganha um "Ver sua nota" que expande o texto — ajuda a lembrar sem precisar abrir o painel.
- **Link (F02) não carrega notas** — ver a regra em "Progresso por link" acima.
- **Testes:** `tests/domain.mjs` cobre a limpeza de notas em `cleanProgress` (id inexistente, valor não-string, corte no limite, vazia descartada, independente de `done`) e `combineProgress` preservando as notas locais. `tests/store.mjs` cobre a migração v4 → v5, `setNote` (salva/corta/remove) e que desmarcar o tópico não apaga a nota.

### Materiais de estudo (B06)

Cada área tem os 4 materiais de sempre (Material, Curso, Vídeo, Livro), mas agora podem ganhar contexto e se ligar a tópicos específicos; a curadoria de metadados e a ligação a tópicos, por ora, só cobre a **fase 1** (14 áreas) — o resto do roadmap continua com os 4 materiais "crus", que funcionam igual.

- **Metadados discretos:** `resourceMeta` (`domain/resources.ts`) monta uma linha só com os campos preenchidos — "Vídeo · Intermediário · EN · grátis · 40 min". Sem nenhum campo, sobra só o tipo (visual idêntico ao anterior à B06).
- **Ordenação por nível:** `byLevel` (`domain/resources.ts`) ordena uma lista de materiais por nível (iniciante → intermediário → avançado → sem `level` por último), mantendo a ordem da curadoria dentro do mesmo nível. Ordena só na exibição (painel da área, "Onde estudar" e Biblioteca), nunca reescreve `data/areas.ts`.
- **Onde estudar:** um tópico com pelo menos um material cujo `topics` o inclui ganha um botão discreto "Onde estudar" (`TopicResources`, em `AreaDialog.tsx`) que expande a lista desses materiais. Não aparece no card "Seu próximo passo", que fica só com "Já estudei" e "Ver área" (os materiais estão a um clique, no painel).
- **Marcar como lido:** cada material tem um botão "Marcar como lido"/"Lido" (`ResourceCard`). A chave é a **URL normalizada** (`normalizeResourceUrl`): sem barra final, sem parâmetros `utm_*`. Materiais não têm id próprio; **se a URL mudar na curadoria, o registro de "lido" se perde** (aceito). Um material citado em várias áreas (ex.: o mesmo livro) é uma chave só — marcar como lido em uma área marca em todas.
- **XP de material:** `+5` por material lido (`MATERIAL_XP`), com teto de `4` por área (`MATERIAL_XP_CAP_PER_AREA`, `materialXp` em `domain/progress.ts`) para não virar farm marcando os 4 tipos genéricos. Um material citado em várias áreas conta o teto **em cada uma** (é crédito por área, não por material). O **nível** continua baseado só nos essenciais — ler material não pula nível.
- **Marcar como lido não registra dia de estudo** — mesma lógica das notas (B03): ler não é a mesma coisa que estudar/concluir um tópico, e a ação já rende XP à parte.
- **Biblioteca, "o observatório" (`pages/LibraryPage.tsx`):** todos os materiais do roadmap, agrupados por fase e área (ordem de `orderedAreas`), com busca (mesma regra de início de palavra da B01, `domain/filter.ts`) e filtros por tipo, nível, idioma, gratuito e lido/não lido, em chips (o chip de tipo dobra como legenda do astro). É a rota **`#/biblioteca`**, uma página dentro da shell (a sidebar continua visível), com entrada pela sidebar. "Abrir área" abre o painel da área por cima da Biblioteca. **Paginação por fase:** mostra uma fase por vez, abrindo na fase atual da jornada (`nextArea`); o índice de fases (pílulas com a contagem de materiais, a aberta com `aria-current="page"`) e os botões "Fase anterior"/"Próxima fase" no fim trocam de página. Com busca ou filtro, fases sem resultado ficam desabilitadas e, se a fase aberta ficar vazia, a página cai na primeira que tem resultado (derivado no render, sem efeito). A fase aberta é estado local da página, não vai para o endereço.
  - **Linguagem visual:** cada área é uma **constelação** — um astro por material (`ResourceBody`, por tipo: planeta com anel = Livro, estrela numa órbita parada = Curso, cometa = Vídeo, estrela de quatro pontas = Material), ligados por uma linha na ordem de `byLevel`. Não lido = contorno na cor da fase; **lido = aceso em ciano** (a mesma regra de "concluído" do mapa); o primeiro da linha é "Comece por este" (substitui o "depois, este" do painel, que a linha já mostra). Em telas ≥820px a constelação é uma fileira que rola na horizontal quando não cabe; abaixo disso vira uma coluna vertical (astro à esquerda de cada cartão, como a trilha do mapa no mobile).
  - Fundo próprio (`LibrarySky.tsx`, L01): o mesmo céu da Home (estrelas, agora numa variável `--sky-stars` reaproveitada por `body`) com duas nebulosas próprias e uma grade de atlas — fixo, sem nenhuma animação. Duas figuras de estudo (livro aberto, lamparina) ficam só nos cantos do cabeçalho (`LibraryHeaderFigures`), nunca no fundo fixo da página inteira: um fundo fixo com figuras coladas a um ponto da tela acaba passando por baixo de conteúdos diferentes conforme a página rola.
  - Cores de fase em tokens `--phase-1` a `--phase-6` (`base.css`), usados tanto por `map.css` (mapa) quanto pela Biblioteca; nunca ciano.
- **Verificação de links:** `scripts/check-links.mjs` (`pnpm check-links`, fora do `pnpm test`) faz `HEAD` (e `GET` se o `HEAD` falhar) em cada URL única com limite de concorrência e timeout, e lista as que não respondem 2xx/3xx. Não conserta nada sozinho; alguns catálogos (ex.: `oreilly.com`) bloqueiam pedidos automatizados com 403 mesmo com a página existindo — trate isso como ruído conhecido, não prova de link quebrado.
- **Testes:** `tests/store.mjs` cobre `topics[]` restrito a tópicos da mesma área, limites de `why`/`duration`, a migração v5 → v6 e `toggleResourceRead`. `tests/domain.mjs` cobre `normalizeResourceUrl`, `resourcesForTopic`, `resourceMeta`, `byLevel` (ordem, estabilidade, sem nível por último, sem mutação) e o teto de `materialXp` (inclusive o crédito em mais de uma área para um material compartilhado).

### XP, níveis e sequência

- **XP** = tópicos concluídos × **10** + fases 100% concluídas × **100** + desafios concluídos × **50** + materiais lidos × **5** (com teto por área, ver "Materiais de estudo" acima).
- **Nível**, pelo percentual de **essenciais** concluídos: Explorador (<25%), Construtor (≥25%), Especialista (≥60%), Arquiteto orbital (100%).
- **Sequência:** dias consecutivos em `days` terminando hoje ou ontem (estudar hoje não é obrigatório para manter a sequência até o fim do dia). Marcar um tópico ou um desafio registra o dia.
- **Meta semanal (B02):** `weekProgress` (`domain/progress.ts`) conta, na semana de segunda a domingo (`weekStart`, fuso local), os tópicos concluídos (por `doneAt`) mais os desafios concluídos (por `challenges`, 1 cada) contra a meta fixa `WEEKLY_GOAL = 5`. Revisões não contam. Não depende de campo novo no esquema; configurar a meta fica para depois. O card "Seu próximo passo" mostra "**N** de 5 nesta semana" com 5 pontos (acesos em ciano); ao bater a meta no ato de marcar um tópico (transição 4 → 5), `toggleFeedback` devolve um toast "Meta da semana batida! +10 XP" — só nessa transição, nunca ao recarregar a página, e com prioridade abaixo de fase/nível/área concluídos.

### Duas definições de "fase concluída" (cuidado)

- **Navegação** (`phaseState`: mapa, sidebar, "Você está aqui"): uma fase está concluída quando a trilha já passou dela, isto é, quando todos os **essenciais** da fase estão feitos. A fase atual é a da `nextArea`.
- **Recompensa** (`countFinishedPhases`: bônus de +100 XP, conquista "Mestre de fase", toast "Fase concluída!"): exige **todos** os tópicos da fase, **extras incluídos**.

É intencional (a recompensa grande pede o esforço completo), mas qualquer mudança nessa área precisa manter as duas coerentes.

### Próximo passo

- `nextArea(done)`: a primeira área (na ordem da trilha) com essenciais pendentes; se não houver, a primeira com extras pendentes.
- `nextTopic(done, challenges)` (o card "Seu próximo passo"): percorre a trilha e retorna o **primeiro essencial pendente**. Se os essenciais de uma área acabaram e ela tem desafio pendente, retorna o **desafio** antes de seguir para a próxima área. Com tudo feito, retorna `null` e o card mostra "Trilha completa".
- O desafio **não trava** o mapa: a área conta como concluída (estrela acesa) com os essenciais feitos.

### Estados visuais

- **Área** (`areaState`): `done` (essenciais completos; numa área só de extras, todos os tópicos), `next` (a `nextArea`), `progress` (algum tópico feito) ou `todo`.
- **Fase** (`phaseState`): `done`, `current` ou `future`. Só a `current` abre por padrão; nenhuma fase é bloqueada.
- Com busca ou filtro ativo, as fases com resultados abrem e as áreas que não batem ficam escondidas (não só apagadas).

### Desafios

- Ficam **liberados** quando os essenciais da área estão completos. Antes disso, aparecem com "Libera quando você concluir os essenciais", mas marcar continua permitido (é orientação, não trava).
- Concluir vale +50 XP, mostra o toast grande, deixa um halo na estrela da área e dá a conquista "Mão na massa".

### Conquistas e metas

- **Conquistas:** Primeiro passo (1 tópico), Em movimento (10), Consistência (50), Mestre de fase (1 fase 100%), Mão na massa (1 desafio), Órbita completa (todos os tópicos).
- **`nextGoals`/`goalsLine`:** a meta mais próxima ("Falta 1 tópico para *Primeiro passo* · 64 essenciais para o nível *Construtor*"), com singular e plural corretos.

### Feedback (toasts)

`toggleFeedback` escolhe a mensagem mais importante do momento: **fase** > **nível** > **área** > **meta semanal batida** > **tópico**, e **desmarcar** ("Tópico desmarcado") à parte. Os desafios usam `toggleChallengeFeedback`. Os tipos `phase`, `level` e `challenge` usam o toast grande; `week` (meta semanal) usa o pequeno, como `topic`. Animações de comemoração só acontecem **na transição**, nunca ao recarregar a página.

### Busca

`matchesArea` procura, sem diferenciar maiúsculas nem acento (`normalizeQuery`: `toLocaleLowerCase('pt-BR')` + remoção de marcas diacríticas via NFD), no título da área e dos tópicos. É uma busca por início de palavra: o trecho precisa aparecer no começo do texto ou logo depois de um caractere que não é letra nem número, então "rag" encontra "RAG" mas não "sto*rag*e", e "memoria" encontra "memória". Consulta com espaço continua sendo um trecho único ("event sour" encontra "event sourcing"), não busca por palavras soltas. `queryMatcher(query)` compila a regex uma vez por consulta (não uma vez por área) e retorna a função de teste usada pelos componentes que filtram.

### Cards compartilháveis (B05)

Uma imagem 100% gerada no aparelho (`<canvas>` 2D, sem dependência) para postar um momento de progresso: desafio concluído, fase concluída, nível novo, conquista desbloqueada ou "Minha trilha até aqui" (a constelação do roadmap inteiro, sob demanda).

- **Dados vs. desenho:** `domain/shareCard.ts` monta os dados — `challengeCard(area, day)`, `phaseCard(phase, done, challenges, day)`, `levelCard(level, metrics, day)`, `badgeCard(badge, metrics, day)`, `journeyCard(done, challenges, day)`. `day` é sempre explícito, nunca `new Date()` interno, para as funções continuarem puras e testáveis, como `weekProgress`. `components/share/drawCard.ts` desenha esses dados num `<canvas>`; nenhum dos dois conhece o outro além do tipo `ShareCardData` (o campo `icon`, só usado por `badge`, carrega o mesmo glifo de `Achievements.tsx`/`BADGES`).
- **Formatos:** feed (1080×1350) e stories (1080×1920), escolhidos no diálogo (`ShareCard.tsx`).
- **Desenho por `kind`:** desafio = título + critérios de pronto como lista com marcas; fase e trilha = constelação (uma estrela por área, acesa em ciano); nível = anel de progresso com o percentual no centro; conquista = medalha com o glifo da conquista e a descrição embaixo. `journeyCard` usa a mesma regra visual do mapa para "acesa" (`areaState` === `'done'`, essenciais completos — não `isAreaDone`, que exigiria também os extras).
- **Fundo com semente fixa:** `drawCard` usa um PRNG determinístico (`mulberry32`) com semente constante para o céu de estrelas — gerar o mesmo card duas vezes produz a mesma imagem, byte a byte.
- **Conteúdo centralizado verticalmente:** `drawCard` mede o bloco (subtítulo + título + constelação/anel/medalha) antes de desenhar e o centraliza no espaço entre o cabeçalho e o rodapé — sem isso, um card com pouco conteúdo (ex.: nível com poucas áreas, ou uma fase pequena) sobra vazio embaixo, mais visível ainda no stories (bem mais alto que largo).
- **Fontes:** `drawCard` espera `document.fonts.load(...)` (Space Grotesk e DM Sans, nos pesos usados) e `document.fonts.ready` antes de desenhar qualquer texto, senão a primeira passada usa uma fonte genérica e as métricas de quebra de linha saem erradas.
- **Cores:** os hex de `styles/base.css`/`map.css` são duplicados numa constante `COLORS` em `drawCard.ts` (comentário aponta a origem) — um `<canvas>` não lê custom properties do CSS.
- **Nome ou @:** opcional, digitado no diálogo e salvo só em `localStorage['orbit-share-name']`, **fora** de `ProgressData`, do backup e do link de progresso — é preferência de exibição, não progresso.
- **Compartilhar:** `navigator.share({ files, text })` quando `navigator.canShare({ files })` é verdadeiro (celular); senão, baixa o PNG e copia a legenda para a área de transferência (desktop, e também o fluxo do LinkedIn, que não aceita imagem por link).
- **Pontos de entrada:** desafio concluído → "Compartilhar" em `AreaDialog`; fase e nível → botão no toast grande (`Toast.tsx`, via `Notification.share` anexado em `store/progress.ts`); fase concluída → também no cabeçalho da fase em `RoadmapMap.tsx`; conquista desbloqueada e "Minha trilha até aqui" → em `Achievements.tsx`; nível atual, a qualquer momento → em `Sidebar.tsx`. O toast grande com botão pausa o auto-close no hover/foco (`Toast` não fecha sozinho enquanto o ponteiro ou o foco estão nele).
- **Testes em `tests/domain.mjs`:** legenda exata (singular/plural de "área"/"áreas" via `pluralize`), contagens de `stats`/`stars`, formatação de data (`formatCardDate`) e o erro esperado ao pedir `challengeCard` de uma área sem desafio.

## Interface e texto

- **Linguagem visual, "carta celeste":** fundo estrelado; área concluída = estrela acesa em **ciano**; área atual = planeta na cor da fase, com uma lua em órbita (**a única animação contínua**); **violeta** = ação e atual. Cada fase tem uma cor (tokens `--phase-1` a `--phase-6` em `base.css`; `map.css` os aplica a `--phase-color` por `nth-child`), e nenhuma pode ser ciano, que é reservado para "concluído". A Biblioteca é o "observatório": mesma linguagem, cada área uma constelação de astros por tipo de material (ver "Materiais de estudo" acima).
- **Tokens** em `:root` (`styles/base.css`); fontes Space Grotesk (títulos) e DM Sans (texto).
- **Evite o visual genérico:** sem rótulo em caixa alta acima de títulos, sem emoji na interface, sem "→" em botões, sem destacar uma palavra do título com outra cor.
- **Texto em português do Brasil, direto e humano:** "essenciais" e "extras" (ou "Para ir além"), nunca "obrigatório" ou "nó". Botões dizem o que fazem ("Já estudei", "Baixar backup").
- **Acessibilidade mínima obrigatória:**
  - teclado funciona e a ordem do DOM segue a ordem da jornada;
  - números que saem da tela vão para o `aria-label`;
  - foco visível;
  - `prefers-reduced-motion` respeitado (a regra global em `dashboard.css` zera as animações; nenhum elemento pode depender de animação para aparecer);
  - títulos não podem ficar dentro de `<button>` (use `<h3><button>`).
- **Responsivo:** breakpoints em 1100, 1000, 820 (vira layout mobile com menu hambúrguer) e 580px.

## Convenções de código

- ESLint com `@stylistic`: 2 espaços, aspas simples, sem ponto e vírgula, `} catch {` na mesma linha, parênteses em arrow function só quando o corpo tem chaves. Limite de 120 colunas (aviso). `pnpm lint --fix` resolve quase tudo.
- **Armadilha do JSX:** não quebre texto e `{expressão}` em linhas diferentes. As quebras de linha no JSX engolem espaços ("Fase {n}" vira "Fase1"). A regra `jsx-one-expression-per-line` está desligada de propósito; mantenha texto misto na mesma linha.
- Sem dependências novas sem necessidade clara. Prefira recurso nativo (`<details>`, `<dialog>`, CSS) a biblioteca.
- Comentários em português, só quando explicam o porquê.
- Commits: Conventional Commits em inglês (`feat:`, `fix:`, `refactor:`, `docs:`). Trabalhe numa branch e integre no `master` por fast-forward.

## Testes e verificação

- Os testes são scripts Node com `node:assert`, que carregam o código TypeScript via `vite.createServer().ssrLoadModule`. Não há framework de teste; não adicione um sem necessidade.
- **Mudança visual precisa ser vista, não só compilada.** Rode o app e confira em 1440px e 390px, com e sem progresso. Em automação: Chrome headless via DevTools Protocol (sem dependências). Ao capturar depois de rolar a página, use `Page.captureScreenshot` **sem** `clip`, porque o recorte usa coordenadas do documento e a imagem sai em branco.
- A pasta `tasks/` (fora do git, pode não existir no seu clone) guarda planejamentos locais e um script de captura (`tasks/visual_planner/shots.mjs`).

## PWA (instalar como app, offline)

- **Sem dependência** (nada de `vite-plugin-pwa`): `public/manifest.webmanifest` e `public/sw.js` escritos à mão. Os ícones (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) foram gerados uma vez a partir do `favicon.svg` via Chrome headless e ficam versionados; não há passo de build para eles.
- **Registro** (`src/main.tsx`): só roda se `import.meta.env.PROD` e `'serviceWorker' in navigator`, no evento `load`. Em `pnpm dev` o service worker nunca é registrado (evita cache velho atrapalhando o Vite).
- **Estratégia de cache no `sw.js`:**
  - **Navegação (HTML): network first**, com o cache como reserva offline — assim uma versão nova do app aparece no primeiro acesso online, sem precisar limpar nada.
  - **Arquivos do build (`/assets/*`, com hash no nome) e demais estáticos same-origin (ícones, manifest): cache first.** O hash muda a cada build, então nunca ficam velhos.
  - **Fontes do Google** (`fonts.googleapis.com`/`fonts.gstatic.com`): stale-while-revalidate num cache à parte. Sem elas o app cai na fonte de reserva.
  - Outras origens: o service worker não intercepta (deixa o navegador seguir o caminho normal).
- **Sem pré-cache da lista de assets:** o cache enche na primeira visita online; o app funciona offline a partir da segunda. Se for preciso offline já na primeira visita, gerar a lista de assets no build fica como melhoria futura.
- **Versionar o cache:** os nomes `orbit-v1` (app) e `orbit-fonts-v1` (fontes) estão no topo do `sw.js`. **Toda vez que o `sw.js` mudar de um jeito que precise invalidar o cache antigo, suba o número** (`orbit-v1` → `orbit-v2`); o `activate` apaga qualquer cache com nome antigo.
- **Progresso por link (F02) funciona offline:** o `#p=…` não passa pelo service worker (é só parte da URL, lida em `App.tsx` depois que o JS carrega), então abrir o link com o app instalado e sem rede importa normalmente, desde que o app já tenha sido aberto ao menos uma vez online (para o `sw.js` cachear o HTML/JS).
- Sem aviso de "nova versão disponível": o network first no HTML resolve o caso comum.

## Onde está o quê além do código

- [BACKLOG.md](BACKLOG.md): ideias avaliadas e o que foi descartado, com o motivo.
- Implementadas: **progresso por link** (F02, `domain/share.ts`), **revisão espaçada** (F03, `domain/review.ts`), **meta semanal** (B02, `weekProgress`/`weekStart` em `domain/progress.ts`), **notas por tópico** (B03, `domain/backup.ts` + `AreaDialog.tsx`), **PWA/offline** (B04, ver "PWA" acima), **cards compartilháveis** (B05, `domain/shareCard.ts` + `components/share/`) e **materiais de estudo/Biblioteca** (B06, ver "Materiais de estudo" acima), ver "Regras de negócio" acima.
