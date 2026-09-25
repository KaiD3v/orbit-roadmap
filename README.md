# Orbit — roadmap de Engenharia de Software com IA

Aplicação em React, TypeScript e Vite. O mapa mantém 60 áreas, 557 tópicos, materiais de estudo, busca, filtros, progresso, XP e conquistas.

## Rodar

```powershell
pnpm install
pnpm dev
```

Para conferir a versão de produção: `pnpm build` e `pnpm preview`. Execute `pnpm lint` e `pnpm test` para verificar código e migração de progresso.

## Organização

- `src/data/areas.ts` e `src/types/content.ts`: conteúdo tipado do roadmap (áreas, tópicos com IDs estáveis e materiais). Tipo de material, fase e URL `https://` inválidos quebram o `tsc`. Nunca renomeie IDs de tópicos: o progresso salvo depende deles.
- `src/data/roadmap.ts`: fases e índices derivados (`orderedAreas`, `areasByPhase`, `stepLabel`).
- `src/domain/`: regras puras, sem dependência do React ou do navegador — `progress.ts` (percentuais, XP, sequência de estudo, conquistas), `filter.ts` (busca e filtros do mapa) e `backup.ts` (validação e migração de progresso importado/legado).
- `src/store/progress.ts` e `src/types/progress.ts`: marcações e dias de estudo no Zustand, persistidos em `localStorage`.
- `src/components/`: seções da interface — `Hero`, `StatsBar`, `Journey`, `MapToolbar`, `RoadmapMap`, `AreaDialog`, `Achievements`, `SectionHeading`, `Sidebar`, `BackupControls` e `Toast`.
- `src/styles/`: estilos globais e por área da interface (`index.css` importa os demais arquivos).
- `src/App.tsx`: composição da aplicação.

O armazenamento usa a chave `orbit-roadmap-react-v1` com esquema versão 2. O progresso já salvo nessa chave é migrado automaticamente para IDs estáveis dos tópicos. Se a versão HTML anterior tiver sido aberta **na mesma origem**, o estado de `orbit-roadmap-v1` é lido na primeira execução. Como `file://` e `http://localhost` usam armazenamentos separados, para migrar o progresso da versão HTML aberta como arquivo local, exporte `orbit-progresso.json` nela e use **Importar** na versão React. Backups antigos (v1) continuam aceitos; novas exportações são v2.
