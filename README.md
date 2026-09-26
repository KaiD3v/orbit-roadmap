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
- **Materiais com contexto:** nível, idioma, gratuito ou pago, duração e uma frase de "por que este" (quando a curadoria tiver esse dado). Um tópico com material ligado a ele ganha um link "Onde estudar" (ou "Onde estudar isto" no card de próximo passo); marcar como lido rende XP, até um teto por área.
- **Biblioteca de materiais:** todos os materiais do roadmap numa só tela, com busca e filtros por tipo, nível, idioma, gratuito e lido/não lido, entrando pela sidebar.
- **Notas por tópico:** anote o que aprendeu ou um link que ajudou, direto no painel da área. A nota reaparece no bloco de revisão espaçada, para lembrar sem precisar reabrir o painel.
- **Busca e filtros** por área ou tópico.
- **Recompensas:** XP, níveis (Explorador, Construtor, Especialista, Arquiteto orbital), conquistas, sequência de dias, meta semanal (5 tópicos ou desafios por semana) e a meta mais próxima ("Falta 1 tópico para…").
- **Revisão espaçada:** de vez em quando, um tópico essencial concluído há semanas volta no card "Seu próximo passo" para relembrar ("Ainda lembra de…?"), num ciclo de 14/30/90 dias.
- **Backup:** baixe e restaure o seu progresso em JSON.
- **Progresso por link:** copie um link com o seu progresso e abra no outro aparelho para juntar (sem apagar o que já estava lá).
- **Responsivo**, com menu hambúrguer no celular. As animações respeitam a preferência do sistema por menos movimento.
- **Instalável e funciona offline:** dá para adicionar à tela inicial do celular ou instalar no computador, e usar sem internet depois da primeira visita.

## Instalar como app (funciona offline)

O Orbit é um PWA (Progressive Web App). Depois de abrir o site uma vez com internet:

- **Celular (Android/Chrome):** menu do navegador → "Adicionar à tela inicial" (ou o próprio Chrome sugere instalar).
- **Celular (iPhone/Safari):** botão de compartilhar → "Adicionar à Tela de Início".
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço, ou menu → "Instalar Orbit".

Uma vez aberto ao menos uma vez, o app carrega e funciona **sem internet** (o progresso já era só local; agora as telas também ficam disponíveis offline). Ao sair uma versão nova, ela aparece sozinha da próxima vez que você abrir o app com internet.

## Privacidade

Não há conta, servidor nem rastreamento. O progresso fica **só no seu navegador** (`localStorage`). Para levar o progresso para outro navegador ou aparelho, use **Baixar backup**/**Restaurar backup** ou **Copiar link de progresso**: o link carrega o progresso depois do `#`, uma parte do endereço que o navegador nunca envia a nenhum servidor.

Suas **notas por tópico** e os **materiais marcados como lidos** ficam só no aparelho e no backup em arquivo: eles nunca entram no link de progresso, que precisa continuar curto e pode ser compartilhado por aí.

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
| `pnpm check-links` | Confere se as URLs dos materiais ainda respondem (fora do `pnpm test`, roda de vez em quando) |

O resultado de `pnpm build` é um site estático (HTML, CSS e JS). Pode ser publicado em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## Tecnologias

React 19, TypeScript, Vite e Zustand (estado com persistência em `localStorage`). O CSS é escrito à mão, sem framework de UI.

## Para quem vai contribuir

- [AGENTS.md](AGENTS.md): arquitetura, regras de negócio e convenções do código (também usado por agentes de IA).
- [BACKLOG.md](BACKLOG.md): ideias avaliadas para o futuro.

### Vindo da versão HTML antiga

Se a versão HTML anterior tiver sido aberta **no mesmo endereço**, o progresso dela é lido automaticamente na primeira execução. Endereços diferentes (por exemplo, `file://` e `http://localhost`) guardam dados separados. Nesse caso, exporte `orbit-progresso.json` na versão HTML e use **Restaurar backup** aqui.
