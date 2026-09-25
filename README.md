# Orbit — roadmap de Engenharia de Software com IA

Aplicação em React, TypeScript e Vite. O mapa mantém 60 áreas, 557 tópicos, materiais de estudo, busca, filtros, progresso, XP e conquistas.

## Rodar

```powershell
pnpm install
pnpm dev
```

Para conferir a versão de produção: `pnpm build` e `pnpm preview`. O código também passa em `pnpm lint`.

## Organização

- `src/data/`: conteúdo e metadados do roadmap.
- `src/domain/progress.ts`: cálculos puros de progresso, sem dependência do React ou do navegador.
- `src/store/progress.ts`: marcações e dias de estudo no Zustand, persistidos em `localStorage`.
- `src/App.tsx`: mapa, painel de tópicos, busca, filtros, importação e exportação.

O armazenamento usa a chave `orbit-roadmap-react-v1`. Se a versão anterior tiver sido aberta **na mesma origem**, o estado de `orbit-roadmap-v1` é lido na primeira execução. Como `file://` e `http://localhost` usam armazenamentos separados, para migrar o progresso da versão HTML aberta como arquivo local, exporte `orbit-progresso.json` nela e use **Importar** na versão React. O formato do backup continua o mesmo.
