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
pnpm dev        # Vite
pnpm lint       # ESLint + formatação (@stylistic); `pnpm lint --fix` corrige
pnpm test       # node tests/domain.mjs && node tests/store.mjs
pnpm build      # tsc -b + vite build
```

**Validação completa antes de concluir qualquer mudança:** `pnpm lint && pnpm build && pnpm test`.

Se o `pnpm` não estiver no PATH (acontece no Windows desta máquina), use o equivalente com `npx`:
`npx eslint . && npx tsc -b && node tests/domain.mjs && node tests/store.mjs && npx vite build`.
Para instalar dependências, use a mesma versão do lockfile: `npx pnpm@11.19.0 add …`. Nunca use `npm install`, que criaria um `package-lock.json` e bagunçaria o `node_modules` do pnpm.

## Arquitetura

```
src/
  main.tsx                 monta <App/> e importa styles/index.css
  App.tsx                  composição + estado de tela (área aberta, busca, filtro, toast)
  data/
    areas.ts               CONTEÚDO: as 60 áreas (tópicos, materiais, desafios). Tipado.
    roadmap.ts             fases + índices derivados (orderedAreas, areasByPhase, stepLabel,
                           validTopicKeys, legacyTopicKeys, areasWithChallenge)
  types/
    content.ts             Area, Topic, Resource, Challenge, ResourceType, PhaseNumber
    progress.ts            Done, Challenges, DoneAt, Reviews, ReviewStep, ProgressData, ProgressBackup
  domain/                  REGRAS PURAS: sem React, sem DOM, sem localStorage
    progress.ts            XP, níveis, conquistas, metas, próximo passo, estados de fase/área, feedback
    filter.ts              busca e filtros do mapa
    backup.ts              validação, limpeza e migração de progresso (arquivo, localStorage, legado)
    share.ts               progresso por link: codifica/decodifica o hash e junta com o progresso local
    review.ts              revisão espaçada: Leitner de 3 degraus (pickReview, answerReview, timeAgo)
  store/
    progress.ts            Zustand + persist (localStorage) e hooks (useMetrics, useToggleTopic, useToggleChallenge);
                           a ação `answerReview` é lida direto via `useProgress(state => state.answerReview)`
  components/              só exibição: leem o store e chamam o domínio
    NextStep.tsx           card "Seu próximo passo" (o elemento principal da tela), com o bloco de revisão espaçada
    Hero.tsx               boas-vindas, só na primeira visita (depois vira um <h1> sr-only)
    Journey.tsx            seção do mapa: título, MapToolbar, RoadmapMap, lista vazia
    MapToolbar.tsx         busca, filtros e contagem de resultados
    RoadmapMap.tsx         fases (acordeão) e trilha em zigue-zague com caminho SVG
    AreaDialog.tsx         painel lateral da área: passos, desafio, extras, materiais; rola e destaca um tópico
                           quando aberto pelo "Rever" da revisão espaçada
    Sidebar.tsx            navegação por fase (vira menu hambúrguer ≤820px) e nível
    Achievements.tsx, BackupControls.tsx, Toast.tsx, SectionHeading.tsx
  styles/                  CSS puro: base (tokens, fundo), dashboard, map, dialog; index.css importa todos
tests/
  domain.mjs               regras puras
  store.mjs                integridade do conteúdo + hidratação/migração do store
```

**Fluxo:** o componente lê o estado com `useProgress(state => …)` ou `useMetrics()`, calcula a exibição com funções de `domain/` e dispara ações do store. O toast é o único estado de tela compartilhado: `App` passa `notify` para quem precisa.

**Onde colocar código novo:**
- Regra de negócio → `src/domain/`, como função pura, **com teste** em `tests/domain.mjs`.
- Mudança no formato do progresso → `types/progress.ts` + `domain/backup.ts` + `store/progress.ts`, com teste de migração em `tests/store.mjs`.
- Conteúdo → `src/data/areas.ts`.
- Componente → só apresentação; se tiver um `if` de regra de negócio, ele provavelmente pertence ao domínio.

Não há Context, roteador, barrels (`index.ts`) nem biblioteca de UI. Não adicione sem necessidade real.

## Conteúdo (`src/data/areas.ts`)

- `Area`: `id` (número estável), `title`, `phase` (1–6), `description`, `topics`, `resources`, `challenge?`.
- `Topic`: `id` no formato `a{área}-t{NN}` (ex.: `a1-t07`), `title`, `required` (essencial = `true`, extra = `false`).
- `Resource`: `type` ∈ `Material | Curso | Vídeo | Livro`, `title` e `url`, que **precisa** começar com `https://`. Os três quebram o `tsc` se estiverem errados. Toda área tem os 4 tipos (verificado em `tests/store.mjs`).
- `Challenge` (opcional): `title` (imperativo, uma frase), `brief` (2–3 frases: contexto e escopo mínimo) e `done` (3–5 critérios objetivos de pronto). Por enquanto só as 14 áreas da fase 1 têm desafio.
- **Nunca renomeie nem reutilize IDs de tópico ou de área.** O progresso salvo e os backups dependem deles. Para adicionar um tópico, use o próximo número livre da área.
- A ordem de exibição é por fase e, dentro da fase, pela ordem do array (`orderedAreas`). O número da etapa ("Etapa 07") vem dessa ordem, não do `id`.

## Regras de negócio

### Progresso salvo (esquema v4)

```ts
ProgressData = {
  done: Record<topicId, true>,               // tópicos concluídos
  days: string[],                            // dias com estudo, 'YYYY-MM-DD' no fuso local
  challenges: Record<areaId, string>,        // desafios concluídos → dia da conclusão
  doneAt: Record<topicId, string>,           // dia em que cada tópico concluído foi marcado
  reviews: Record<topicId, {                 // última revisão espaçada de cada tópico
    at: string, step: 0 | 1 | 2 | 3          // 3 = já revisto três vezes (graduado, fora do ciclo)
  }>,
}
```

- Chave do `localStorage`: **`orbit-roadmap-react-v1`**, com `version: 4` no `persist` do Zustand. Não mude o nome da chave.
- Migração: tudo passa por `cleanProgress`, que descarta IDs inexistentes, datas inválidas e desafios de áreas sem desafio, e preenche campos ausentes com `{}` ou `[]`.
  - O v1 salvava os tópicos como `'{idDaÁrea}:{índice}'`; eles são convertidos para os IDs estáveis via `legacyTopicKeys`.
  - Progressos v2 não têm `challenges` e ganham `{}`.
  - Progressos anteriores ao v4 não têm `doneAt`/`reviews`: cada tópico já concluído ganha `doneAt` = **dia da migração** (nunca a data real de conclusão, perdida), e `reviews` começa `{}`. Por isso ninguém recebe uma revisão no dia em que atualiza o app; elas só aparecem semanas depois. `cleanProgress` aceita um `today` opcional (default `localDay()`) para isso ser testável.
  - Uma entrada de `reviews` só é aceita se o tópico correspondente estiver em `done`; senão é descartada (revisão de tópico não concluído não existe).
- Na primeira execução, o progresso da versão HTML antiga é lido da chave `orbit-roadmap-v1`, se existir na mesma origem.
- Backup: exporta `{ version: 4, ...ProgressData }` como `orbit-progresso.json`; importa versões **1, 2, 3 e 4** e **substitui** o progresso atual (com confirmação).
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

### XP, níveis e sequência

- **XP** = tópicos concluídos × **10** + fases 100% concluídas × **100** + desafios concluídos × **50**.
- **Nível**, pelo percentual de **essenciais** concluídos: Explorador (<25%), Construtor (≥25%), Especialista (≥60%), Arquiteto orbital (100%).
- **Sequência:** dias consecutivos em `days` terminando hoje ou ontem (estudar hoje não é obrigatório para manter a sequência até o fim do dia). Marcar um tópico ou um desafio registra o dia.

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

`toggleFeedback` escolhe a mensagem mais importante do momento: **fase** > **nível** > **área** > **tópico**, e **desmarcar** ("Tópico desmarcado") à parte. Os desafios usam `toggleChallengeFeedback`. Os tipos `phase`, `level` e `challenge` usam o toast grande. Animações de comemoração só acontecem **na transição**, nunca ao recarregar a página.

### Busca

`matchesArea` procura, sem diferenciar maiúsculas nem acento (`normalizeQuery`: `toLocaleLowerCase('pt-BR')` + remoção de marcas diacríticas via NFD), no título da área e dos tópicos. É uma busca por início de palavra: o trecho precisa aparecer no começo do texto ou logo depois de um caractere que não é letra nem número, então "rag" encontra "RAG" mas não "sto*rag*e", e "memoria" encontra "memória". Consulta com espaço continua sendo um trecho único ("event sour" encontra "event sourcing"), não busca por palavras soltas. `queryMatcher(query)` compila a regex uma vez por consulta (não uma vez por área) e retorna a função de teste usada pelos componentes que filtram.

## Interface e texto

- **Linguagem visual, "carta celeste":** fundo estrelado; área concluída = estrela acesa em **ciano**; área atual = planeta na cor da fase, com uma lua em órbita (**a única animação contínua**); **violeta** = ação e atual. Cada fase tem uma cor (`--phase-color`, definida por `nth-child` em `map.css`), e nenhuma pode ser ciano, que é reservado para "concluído".
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

## Onde está o quê além do código

- [BACKLOG.md](BACKLOG.md): ideias avaliadas (notas por tópico, PWA, cards compartilháveis, recomendação de materiais mais completa, meta semanal) e o que foi descartado, com o motivo.
- Implementadas: **progresso por link** (F02, `domain/share.ts`) e **revisão espaçada** (F03, `domain/review.ts`), ver "Regras de negócio" acima.
