# Orbit — roadmap de Engenharia de Software com IA

Aplicação em React, TypeScript e Vite. O mapa mantém 60 áreas, 557 tópicos, materiais de estudo, busca, filtros, progresso, XP e conquistas.

## Rodar

```powershell
pnpm install
pnpm dev
```

Para conferir a versão de produção: `pnpm build` e `pnpm preview`. Execute `pnpm lint` e `pnpm test` para verificar código e migração de progresso.

## Organização

- `src/data/` e `src/types/content.ts`: conteúdo, IDs estáveis e tipos do roadmap.
- `src/domain/progress.ts`: regras e cálculos de progresso, sem dependência do React ou do navegador.
- `src/store/progress.ts` e `src/types/progress.ts`: marcações e dias de estudo no Zustand, persistidos em `localStorage`.
- `src/components/`: mapa, painel de tópicos, navegação e controles de backup.
- `src/styles/`: estilos globais e por área da interface.
- `src/App.tsx`: composição da aplicação.

O armazenamento usa a chave `orbit-roadmap-react-v1` com esquema versão 2. O progresso já salvo nessa chave é migrado automaticamente para IDs estáveis dos tópicos. Se a versão HTML anterior tiver sido aberta **na mesma origem**, o estado de `orbit-roadmap-v1` é lido na primeira execução. Como `file://` e `http://localhost` usam armazenamentos separados, para migrar o progresso da versão HTML aberta como arquivo local, exporte `orbit-progresso.json` nela e use **Importar** na versão React. Backups antigos (v1) continuam aceitos; novas exportações são v2.
