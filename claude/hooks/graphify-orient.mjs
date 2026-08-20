#!/usr/bin/env node
/**
 * Lembra o agente de consultar o mapa do código (graphify) antes de sair vasculhando
 * arquivo por arquivo — só entra quando o mapa (`graphify-out/graph.json`) já existe
 * no projeto.
 *
 * Por quê: sem o mapa consultado antes, o agente busca às cegas — grep, leitura de
 * arquivo por arquivo — pra entender uma relação que o mapa já responde de cara
 * ("o que chama essa função", "como esse módulo se encaixa"). Isso custa tempo e
 * contexto à toa quando a resposta já está pronta.
 *
 * Como avisa: só injeta contexto (`hookSpecificOutput.additionalContext`) pedindo pra
 * rodar `graphify query` antes — nunca decide nada sobre a ferramenta, então nunca
 * bloqueia nem pede confirmação.
 *
 * Se o mapa ainda não existe no projeto, dispara um `graphify .` em segundo plano (sem
 * travar esta chamada) pra que a próxima já encontre o mapa pronto — e fica calado
 * nessa primeira vez, porque ainda não tem o que recomendar.
 *
 * FALHA ABERTO sempre: qualquer erro de leitura/parse do stdin, ou de spawn do
 * graphify, sai em código 0 sem aviso — nunca trava a ferramenta que o agente ia usar.
 *
 * Wire em .claude/settings.json, em PreToolUse, com matcher "Bash|Read|Glob".
 */
import fs from "node:fs";
import path from "node:path";

/** Lê todo o stdin como texto; nunca lança — string vazia se não der pra ler. */
function lerStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

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

/*
 * O QUE ESTE HOOK NÃO FAZ, E POR QUÊ
 *
 * A versão anterior, que vivia dentro de um projeto só, DISPARAVA `graphify .` sozinha quando
 * não encontrava o mapa. Fazia sentido lá: era um projeto só, já mapeado, e o dono sabia.
 *
 * Como hook GLOBAL isso vira outra coisa: abrir qualquer pasta — um repositório de terceiro,
 * um clone só para dar uma olhada, uma pasta do Desktop — começaria a indexar o código inteiro
 * em segundo plano, criando graphify-out/ sem ninguém pedir. Trabalho pesado e arquivo novo
 * aparecendo por conta própria em projeto que não é seu.
 *
 * Duas regras do harness barram isso: sem mapa, fica calado; e ferramenta se OFERECE, não se
 * executa sozinha. Quem faz a oferta é o bootstrap-projeto.mjs, ao abrir um projeto pela
 * primeira vez, explicando o que o graphify resolve — e a decisão fica com o dono.
 */

try {
  const evento = parseEvento(lerStdin());
  if (evento === null) process.exit(0);

  const cwdArg = typeof evento.cwd === "string" && evento.cwd ? evento.cwd : "";
  const dirProjeto = cwdArg || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const dirSaidaGraphify = path.join(dirProjeto, "graphify-out");

  // Sem mapa, fica inerte. Nada de criar nada: quem oferece é o bootstrap-projeto.mjs.
  if (!fs.existsSync(path.join(dirSaidaGraphify, "graph.json"))) {
    process.exit(0);
  }

  const ferramenta = String(evento.tool_name ?? "");
  const entrada = evento.tool_input ?? {};

  // Detecta comando de busca no Bash (grep, ripgrep, find, fd, ack, ag).
  const PADRAO_BUSCA = /grep|ripgrep|rg |find |fd |ack |ag /;

  // Extensões de código-fonte que valem a pena orientar antes de ler direto.
  const EXTENSOES_FONTE = [
    ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".astro", ".vue", ".svelte",
    ".go", ".rs", ".java", ".rb", ".cpp", ".hpp", ".cc", ".cs", ".c", ".h", ".kt",
    ".swift", ".php", ".scala", ".lua", ".sh", ".md", ".mdx", ".rst", ".txt",
  ];

  // Só casa a extensão numa borda de verdade (não no meio da palavra) — o lookahead
  // negativo impede ".h" de casar com "index.html" e ".c" com "data.csv". Extensões
  // maiores vêm antes das menores na lista pra regex preferir ".mdx" a ".md", por exemplo.
  const REGEX_EXTENSAO_FONTE = new RegExp(
    "\\.(" + EXTENSOES_FONTE.map((e) => e.slice(1)).join("|") + ")(?![a-z0-9])",
  );

  const CONTEXTO_BASH =
    'OBRIGATÓRIO: graphify-out/graph.json existe. Rode `graphify query "<pergunta>"` antes de ' +
    "sair grepando os arquivos crus. Só grepe depois que o graphify já orientou, ou pra " +
    "mexer/depurar linhas específicas.";

  const CONTEXTO_LEITURA =
    "OBRIGATÓRIO: graphify-out/graph.json existe. Rode o graphify antes de ler arquivo-fonte " +
    'direto. Use `graphify query "<pergunta>"` (subgrafo focado), `graphify explain ' +
    '"<conceito>"`, ou `graphify path "<A>" "<B>"`. Só leia o arquivo cru depois que o ' +
    "graphify já orientou, ou pra mexer/depurar linhas específicas. Essa regra vale pra " +
    "subagentes também — inclua no prompt de qualquer subagente que for explorar código.";

  let contextoAdicional = null;
  if (ferramenta === "Bash") {
    const comando = String(entrada.command ?? "");
    contextoAdicional = PADRAO_BUSCA.test(comando) ? CONTEXTO_BASH : null;
  } else if (ferramenta === "Read" || ferramenta === "Glob") {
    const alvo = `${entrada.file_path ?? ""} ${entrada.pattern ?? ""} ${entrada.path ?? ""}`
      .toLowerCase()
      .replace(/\\/g, "/");
    // Evita disparar em cima da própria saída do graphify.
    contextoAdicional =
      alvo.includes("graphify-out/") ? null : REGEX_EXTENSAO_FONTE.test(alvo) ? CONTEXTO_LEITURA : null;
  }

  if (contextoAdicional) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: contextoAdicional },
      }),
    );
  }
} catch {
  // qualquer erro inesperado cai aqui — nunca trava a ferramenta que o agente ia usar
}

process.exit(0);
