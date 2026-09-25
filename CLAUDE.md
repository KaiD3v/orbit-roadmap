# CLAUDE.md

O contexto do projeto (produto, arquitetura, regras de negócio e convenções) fica em um lugar só, compartilhado com outros agentes:

@AGENTS.md

## Notas específicas para o Claude Code

- **Ambiente:** Windows. O `pnpm` pode não estar no PATH; use os comandos `npx` do AGENTS.md. Envolva comandos longos em `timeout` (ex.: `timeout 100 npx tsc -b`) e nunca rode nada que espere entrada (`cat >` sem heredoc, `python -`).
- **Antes de dizer que terminou:** rode a validação completa. Se mexeu em algo visual, suba o Vite e **olhe** as capturas (1440px e 390px). Descreva o que viu, não o que esperava ver.
- **Progresso salvo:** qualquer mudança em `types/progress.ts`, `domain/backup.ts` ou `store/progress.ts` exige teste de migração em `tests/store.mjs`.
- **Git:** não commite nem faça merge sem o pedido explícito do usuário. Trabalhe numa branch; o `master` só avança por fast-forward.
- **Idioma:** converse com o usuário em português do Brasil.
