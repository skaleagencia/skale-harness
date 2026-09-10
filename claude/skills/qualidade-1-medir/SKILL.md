---
name: qualidade-1-medir
description: Instala três regras de qualidade de ESLint já prontas e testadas (teto de 350 linhas por arquivo, proibição de console direto, proibição de a interface acessar o banco direto) e MEDE quantas violações existem — nunca conserta nada. Primeira vez instala e mede; vezes seguintes só mede de novo. Use como passo 1 antes de qualquer refatoração de tamanho de arquivo — depois vem qualidade-2-quebrar (arquivos grandes) ou qualidade-3-zerar (o resto dos avisos). Diferente de configurar-lint: aquela monta o ESLint inteiro do zero com filosofia opinativa completa; esta só copia três regras específicas e mede — use configurar-lint quando não existir lint nenhum ainda, use esta quando só quiser o teto de tamanho valendo hoje.
---

# Qualidade 1 — Medir

Executa, sem modificar, o prompt `08-eslint-quality-gates-install.md` do
vibe-coding-toolkit (commit `13add21`) — copiado em
[`referencia/08-eslint-quality-gates-install.md`](referencia/08-eslint-quality-gates-install.md),
junto com os seis arquivos que ele instala em
[`referencia/templates/`](referencia/templates/). Esta skill não reescreve o
método, só aponta para o material já baixado e fixa os parâmetros que este
projeto sempre usa.

## Verificação antes de rodar

Antes de qualquer coisa, confira se faz sentido rodar isto:

- **Sem `package.json`** no projeto → avise que esta skill é para
  JavaScript/TypeScript e pare. Não force em outra stack.
- **ESLint não instalado nem nas dependências** → mesma coisa: avise e pare.
  Instalar ESLint do zero com filosofia completa é o trabalho da skill
  `configurar-lint`, não desta.

## Como rodar

1. Abra [`referencia/08-eslint-quality-gates-install.md`](referencia/08-eslint-quality-gates-install.md)
   e siga o prompt de dentro dele (seção "O prompt") de ponta a ponta —
   passos 0 a 7. Ele já explica cada passo em detalhe; não reduza o
   raciocínio, só preencha os parâmetros fixos abaixo.
2. Parâmetros já decididos para este projeto — não pergunte, não peça para
   o usuário escolher:
   - **`MAX_LINES` = `350`** (padrão do toolkit original — ainda não é um
     número medido neste código específico; se a primeira medição real
     mostrar que ele está claramente errado para este projeto, diga isso no
     relatório em vez de mudar o número em silêncio).
   - **`PACKAGE_MANAGER`** = o que o projeto já usa (leia o `package.json` e
     o lockfile presente — `package-lock.json`, `pnpm-lock.yaml`,
     `yarn.lock`, `bun.lockb` — em vez de perguntar ou presumir `npm`).
   - **`SOURCE_URL`** = o caminho local `referencia/templates` desta
     própria skill (dentro de `~/.claude/skills/qualidade-1-medir/`), **não**
     a URL do GitHub que o prompt cita por padrão. Os seis arquivos já estão
     aqui, não precisa baixar nada da rede.

## Primeira vez vs. vezes seguintes

- **Primeira vez** (o `eslint.config.*` do projeto ainda não referencia
  `quality/max-lines`): siga o prompt inteiro — passo 0 (copiar os seis
  arquivos), 1 (ler o projeto), 2 (instalar dependência), 3 (adaptar a
  config aos caminhos reais), 4 (scripts), 5 (`node verify.mjs`), e só então
  6 (medir).
- **Vezes seguintes** (a regra já está na config): pule os passos 0–5 —
  nada para copiar ou adaptar de novo — e vá direto ao passo 6, rodando o
  linter e reportando a contagem atual.

## O que esta skill NUNCA faz

- **Não conserta nenhuma violação encontrada.** Instalar o gate e medir o
  que ele pega é o trabalho inteiro; corrigir é outra tarefa, com sua
  própria revisão — vá para `qualidade-2-quebrar` (arquivos grandes) ou
  `qualidade-3-zerar` (o resto).
- **Não sobe `MAX_LINES`** para um arquivo passar. Usa a opção `ignore` da
  regra para um caso conhecido, ou deixa reportado.
- **Não liga preset de framework** só porque existe — só o que o projeto
  realmente usa.

## Relatório final

Sempre feche dizendo: quais regras foram instaladas, quais foram puladas e
por quê, a contagem de violação por regra, quais regras ficaram em `warn`
com a contagem-base anotada, e a lista de arquivos acima do
[MAX_LINES]-linha ordenada do maior para o menor.
