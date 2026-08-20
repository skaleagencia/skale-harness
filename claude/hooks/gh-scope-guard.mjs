#!/usr/bin/env node
/**
 * Quando um comando `gh` (CLI do GitHub) falha por falta de permissão (escopo OAuth),
 * mostra o comando certo pra corrigir, em vez de deixar o agente tentar gambiarra —
 * criar um token pessoal na mão, colar GH_TOKEN direto no comando, ou ficar tentando
 * de novo esperando que funcione sozinho.
 *
 * Por quê: esse tipo de erro não é bug de código — é permissão faltando na conta
 * logada do `gh`. A reação errada mais comum é o agente tentar contornar com um token
 * novo, o que troca a credencial usada sem o dono saber. O comando certo só adiciona
 * o escopo que falta à credencial já logada, sem mexer no que já funciona.
 *
 * Roda DEPOIS do comando (PostToolUse) — só dá pra saber que faltou permissão depois
 * de ver a mensagem de erro do `gh`. Nunca desfaz o comando (isso o PostToolUse não
 * permite); só explica o que aconteceu e qual é o próximo passo.
 *
 * FALHA ABERTO sempre: qualquer erro de leitura/parse do stdin sai em código 0 sem
 * aviso.
 *
 * Wire em .claude/settings.json, em PostToolUse, com matcher "Bash".
 */
import fs from "node:fs";

// Escopos padrão pedidos por este harness — cobre os usos mais comuns do `gh`
// (issues, PRs, workflow, projeto, chave SSH, gist). Se o projeto precisar de mais
// escopos que isso, o comando de refresh abaixo ainda funciona — só adiciona a mais.
const ESCOPOS_GH = ["admin:public_key", "gist", "project", "read:org", "repo", "workflow"];

/** Monta o comando de refresh de escopo já com a lista de escopos embutida. */
function comandoRefreshGh(escopos) {
  return `gh auth refresh -h github.com -s ${escopos.join(",")}`;
}

// Reconhece as várias formas como o `gh` reporta falta de permissão na saída.
const REGEX_ERRO_ESCOPO =
  /requires (the following|additional) scopes?|token has not been granted|resource not accessible by (personal access token|integration)|insufficient (permission|scope)|missing (the )?required scopes?|gh auth refresh -s/i;

/**
 * Faz o parse do JSON do stdin, devolvendo null pra qualquer coisa que não seja um
 * objeto de verdade — inclusive o literal JSON `null` (é JSON válido, não lança no
 * parse, mas quebraria o primeiro `evento.algo` sem essa checagem extra).
 */
function parseEvento(bruto) {
  try {
    const evento = JSON.parse(bruto || "{}");
    return typeof evento === "object" && evento !== null ? evento : null;
  } catch {
    return null;
  }
}

try {
  let bruto = "";
  try {
    bruto = fs.readFileSync(0, "utf8");
  } catch {
    bruto = "";
  }

  const evento = parseEvento(bruto);
  if (evento === null) process.exit(0);

  const comando = evento.tool_input?.command ?? "";
  // A classe de borda inclui `\` (separador de caminho no Windows, ex.: C:\tools\gh) e o
  // sufixo `.exe` é opcional (no Windows o binário costuma se chamar gh.exe).
  if (typeof comando !== "string" || !/(^|[\s;&|(/\\`])gh(\.exe)?\s/.test(comando)) {
    process.exit(0);
  }

  const resposta = evento.tool_response ?? {};
  const saida = `${resposta.stdout ?? ""}\n${resposta.stderr ?? ""}`;
  if (!REGEX_ERRO_ESCOPO.test(saida)) process.exit(0);

  const comandoRefresh = comandoRefreshGh(ESCOPOS_GH);

  // O `gh` prioriza GH_TOKEN/GITHUB_TOKEN sobre o login guardado no chaveiro. Se uma
  // dessas variáveis está definida, a credencial que está falhando é a do ambiente —
  // e `gh auth refresh` (que só mexe no login OAuth guardado) não mudaria nada.
  const tokenDeAmbienteAtivo = Boolean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);

  const mensagemSistema = tokenDeAmbienteAtivo
    ? [
        "⚠️ O comando gh falhou por falta de permissão/escopo, e GH_TOKEN/GITHUB_TOKEN está",
        "definido no ambiente — o gh está usando esse token, não o login do seu chaveiro, então",
        "um refresh não mudaria nada. Rode no seu terminal:",
        "",
        "  unset GH_TOKEN GITHUB_TOKEN",
        "",
        "Depois rode o comando de novo. Confirme a credencial ativa com `gh auth status`.",
      ].join("\n")
    : [
        "⚠️ O comando gh falhou por falta de um escopo OAuth no seu token. Rode no seu terminal:",
        "",
        `  ${comandoRefresh}`,
        "",
        "Isso adiciona os escopos sem tirar os que você já tem. Confirme com `gh auth status`.",
        "Não contorne isso com GH_TOKEN nem com um token pessoal criado na mão — o login",
        "padrão do gh é a credencial certa.",
      ].join("\n");

  const contextoAdicional = tokenDeAmbienteAtivo
    ? [
        "O comando gh anterior falhou porque GH_TOKEN/GITHUB_TOKEN no ambiente está encobrindo",
        "o login do chaveiro do usuário, não por bug de código. Não tente nenhuma gambiarra.",
        "Pare e peça pro usuário rodar `unset GH_TOKEN GITHUB_TOKEN` no terminal dele, e só",
        "tente o comando gh de novo depois que ele confirmar.",
      ].join(" ")
    : [
        "O comando gh anterior falhou porque o token do usuário está sem um escopo OAuth,",
        "não por bug de código. Não tente gambiarra — nunca defina GH_TOKEN ou GITHUB_TOKEN,",
        "e nunca sugira criar um token de acesso pessoal na interface do GitHub.",
        `Pare e peça pro usuário rodar isto no terminal dele: ${comandoRefresh}`,
        "Só tente o comando gh de novo depois que o usuário confirmar que rodou.",
      ].join(" ");

  process.stdout.write(
    JSON.stringify({
      systemMessage: mensagemSistema,
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: contextoAdicional },
    }),
  );
} catch {
  // qualquer erro inesperado cai aqui — nunca trava nem comenta o comando gh
}
process.exit(0);
