# Orbit: roadmap de Engenharia de Software com IA

Orbit é um roadmap interativo para quem quer construir sistemas com IA de verdade, e não só chamar uma API. Ele organiza **60 áreas e 557 tópicos**, dos fundamentos de engenharia de software até sistemas multiagente, numa trilha em 6 fases, e mostra sempre **qual é o seu próximo passo**.

## O problema

Roadmaps de estudo costumam ser listas gigantes. Diante de centenas de itens, a pessoa não sabe por onde começar, perde a noção do quanto já avançou e desiste. Estudar sem construir nada também faz o conhecimento evaporar rápido.

O Orbit ataca isso de três formas:

- **Um passo de cada vez.** A tela inicial responde uma pergunta só: "o que eu estudo agora?". Você marca o tópico ali mesmo e o próximo aparece. O resto do mapa fica recolhido até você pedir.
- **Essencial primeiro.** Cada área separa os tópicos **essenciais** (a base para construir e operar uma aplicação) dos **extras** (alternativas e aprofundamento, para depois). O progresso principal conta só os essenciais.
- **Aprender construindo.** Cada área pode ter um **desafio prático** ("Construa isto"), com critérios objetivos de pronto. Estudar é o caminho; construir é a prova.

Para a jornada não virar obrigação, o progresso é visual e recompensado: o mapa é uma carta celeste em que cada área concluída vira uma estrela acesa, com XP, níveis, sequência de dias de estudo e conquistas.

## Funcionalidades

- **Card "Seu próximo passo":** mostra o próximo tópico essencial (ou o desafio pendente da área) e permite marcar como feito sem abrir nada.
- **Mapa por fases:** só a fase atual fica aberta, como uma trilha. As outras mostram uma estrela por área.
- **Painel da área:** mostra os essenciais como uma sequência de passos, os extras recolhidos, o desafio prático e os materiais de estudo, com um deles em destaque.
- **Busca e filtros** por área ou tópico.
- **Recompensas:** XP, níveis (Explorador, Construtor, Especialista, Arquiteto orbital), conquistas, sequência de dias e a meta mais próxima ("Falta 1 tópico para…").
- **Revisão espaçada:** de vez em quando, um tópico essencial concluído há semanas volta no card "Seu próximo passo" para relembrar ("Ainda lembra de…?"), num ciclo de 14/30/90 dias.
- **Backup:** baixe e restaure o seu progresso em JSON.
- **Progresso por link:** copie um link com o seu progresso e abra no outro aparelho para juntar (sem apagar o que já estava lá).
- **Responsivo**, com menu hambúrguer no celular. As animações respeitam a preferência do sistema por menos movimento.

## Privacidade

Não há conta, servidor nem rastreamento. O progresso fica **só no seu navegador** (`localStorage`). Para levar o progresso para outro navegador ou aparelho, use **Baixar backup**/**Restaurar backup** ou **Copiar link de progresso**: o link carrega o progresso depois do `#`, uma parte do endereço que o navegador nunca envia a nenhum servidor.

## Instalação

Requisitos: **Node.js 22 ou mais recente** e **pnpm** (o projeto usa o `pnpm-lock.yaml`).

```bash
# se o pnpm não estiver instalado
corepack enable

pnpm install
pnpm dev
```

O Vite mostra o endereço local no terminal (por padrão, http://localhost:5173).

### Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento com recarga automática |
| `pnpm build` | Checagem de tipos (`tsc -b`) e build de produção em `dist/` |
| `pnpm preview` | Serve o build de produção localmente |
| `pnpm lint` | ESLint, incluindo a formatação (`pnpm lint --fix` corrige) |
| `pnpm test` | Testes das regras de progresso, da integridade do conteúdo e das migrações |

O resultado de `pnpm build` é um site estático (HTML, CSS e JS). Pode ser publicado em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## Tecnologias

React 19, TypeScript, Vite e Zustand (estado com persistência em `localStorage`). O CSS é escrito à mão, sem framework de UI.

## Para quem vai contribuir

- [AGENTS.md](AGENTS.md): arquitetura, regras de negócio e convenções do código (também usado por agentes de IA).
- [BACKLOG.md](BACKLOG.md): ideias avaliadas para o futuro.

### Vindo da versão HTML antiga

Se a versão HTML anterior tiver sido aberta **no mesmo endereço**, o progresso dela é lido automaticamente na primeira execução. Endereços diferentes (por exemplo, `file://` e `http://localhost`) guardam dados separados. Nesse caso, exporte `orbit-progresso.json` na versão HTML e use **Restaurar backup** aqui.
