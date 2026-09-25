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
    progress.ts            Done, Challenges, ProgressData, ProgressBackup
  domain/                  REGRAS PURAS: sem React, sem DOM, sem localStorage
    progress.ts            XP, níveis, conquistas, metas, próximo passo, estados de fase/área, feedback
    filter.ts              busca e filtros do mapa
    backup.ts              validação, limpeza e migração de progresso (arquivo, localStorage, legado)
  store/
    progress.ts            Zustand + persist (localStorage) e hooks (useMetrics, useToggleTopic, useToggleChallenge)
  components/              só exibição: leem o store e chamam o domínio
    NextStep.tsx           card "Seu próximo passo" (o elemento principal da tela)
    Hero.tsx               boas-vindas, só na primeira visita (depois vira um <h1> sr-only)
    Journey.tsx            seção do mapa: título, MapToolbar, RoadmapMap, lista vazia
    MapToolbar.tsx         busca, filtros e contagem de resultados
    RoadmapMap.tsx         fases (acordeão) e trilha em zigue-zague com caminho SVG
    AreaDialog.tsx         painel lateral da área: passos, desafio, extras, materiais
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

### Progresso salvo (esquema v3)

```ts
ProgressData = {
  done: Record<topicId, true>,          // tópicos concluídos
  days: string[],                       // dias com estudo, 'YYYY-MM-DD' no fuso local
  challenges: Record<areaId, string>,   // desafios concluídos → dia da conclusão
}
```

- Chave do `localStorage`: **`orbit-roadmap-react-v1`**, com `version: 3` no `persist` do Zustand. Não mude o nome da chave.
- Migração: tudo passa por `cleanProgress`, que descarta IDs inexistentes, datas inválidas e desafios de áreas sem desafio, e preenche campos ausentes com `{}` ou `[]`.
  - O v1 salvava os tópicos como `'{idDaÁrea}:{índice}'`; eles são convertidos para os IDs estáveis via `legacyTopicKeys`.
  - Progressos v2 não têm `challenges` e ganham `{}`.
- Na primeira execução, o progresso da versão HTML antiga é lido da chave `orbit-roadmap-v1`, se existir na mesma origem.
- Backup: exporta `{ version: 3, ...ProgressData }` como `orbit-progresso.json`; importa versões **1, 2 e 3** e **substitui** o progresso atual (com confirmação).
- **Toda mudança de formato:** sobe a versão (persist e backup), aceita as versões antigas e ganha teste de migração. Perder progresso de quem já usa é o pior bug possível aqui.

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

`matchesArea` procura, sem diferenciar maiúsculas, no título da área e dos tópicos (`toLocaleLowerCase('pt-BR')`). É uma busca por trecho: "rag" também encontra "sto*rag*e" (anotado no backlog).

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
- Planejadas e ainda não implementadas: **progresso por link** (o progresso vai depois do `#` do endereço, sem servidor) e **revisão espaçada** (14, 30 e 90 dias). Os detalhes estão em `tasks/features_planner/`, quando a pasta existir.
