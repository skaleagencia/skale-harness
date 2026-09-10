#!/usr/bin/env node
/**
 * limite-despachos.mjs — põe um teto REAL na quantidade de subagentes despachados por tarefa.
 *
 * PreToolUse, matcher `Agent`.
 *
 * POR QUE ISTO EXISTE
 * Um bug de sincronização consumiu 30% de um bloco de 5 horas em 15 despachos: quatro `debugger`
 * para o mesmo defeito visto de quatro lugares, investigação e correção separadas, revisão rodando
 * três vezes. Cada despacho custa, medido nesta máquina, cerca de 4 milhões de tokens.
 *
 * O CLAUDE.md já pede teto de 5 por tarefa — mas texto é orientação, não limite. Este hook é o
 * limite. A documentação confirma que um hook que bloqueia vence a regra de `allow`, então o
 * `Agent(*)` do settings.local.json continua no lugar e a trava funciona por cima dele.
 *
 * Não existe teto nativo: o `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` foi removido na v2.1.224 e hoje
 * é inerte. O que sobrou nativo controla concorrência e profundidade, não quantidade.
 *
 * A ESCADA
 *   1 a 5    passa calado          — é o teto do CLAUDE.md, e cabe numa tarefa normal
 *   6 a 11   passa COM AVISO       — travar aqui obrigaria a mexer em configuração no meio do
 *                                    trabalho; o aviso dá o sinal enquanto ainda dá para corrigir
 *   12 ou +  NEGA                  — nesse ponto não é mais uma tarefa grande, é descontrole
 *
 * O QUE CONTA COMO "UMA TAREFA"
 * Não é a mensagem: "corrige isso" seguido de "agora testa" são duas mensagens do mesmo trabalho,
 * e contar por mensagem faria o teto sumir a cada frase nova. Também não é a sessão inteira: seis
 * horas de trabalho com quatro tarefas diferentes estourariam o teto sem nada de errado.
 * Então uma tarefa é uma SEQUÊNCIA de despachos com pouco intervalo entre si — 20 minutos sem
 * despachar nada zera a contagem. É aproximação, mas erra para o lado certo.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TETO_AVISO = 5;    // acima disto, avisa
const TETO_NEGA = 12;    // a partir disto, nega
const JANELA_MIN = 20;   // minutos sem despacho que zeram a contagem

function lerStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

try {
  const bruto = lerStdin();
  if (!bruto.trim()) process.exit(0);

  const evento = JSON.parse(bruto);
  // JSON válido mas nulo (`null`) passa no parse e quebra no acesso — daí o teste de tipo.
  if (!evento || typeof evento !== "object") process.exit(0);

  const sessao = evento.session_id;
  if (!sessao) process.exit(0); // sem id não dá para contar; melhor deixar passar que travar no escuro

  const tipo = evento?.tool_input?.subagent_type ?? "(sem tipo)";

  const arquivo = path.join(os.tmpdir(), `claude-despachos-${sessao}.json`);
  const agora = Date.now();

  let estado = { contagem: 0, ultimo: 0 };
  try {
    estado = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  } catch {
    // primeira vez nesta sessão, ou arquivo ilegível — recomeça do zero, sem reclamar
  }

  // Passou da janela sem despachar nada? É outra tarefa.
  const minutosParado = (agora - (estado.ultimo || 0)) / 60000;
  if (minutosParado > JANELA_MIN) estado.contagem = 0;

  estado.contagem += 1;
  estado.ultimo = agora;

  try {
    fs.writeFileSync(arquivo, JSON.stringify(estado));
  } catch {
    // não conseguiu gravar: segue sem contar em vez de bloquear o trabalho
  }

  const n = estado.contagem;

  if (n >= TETO_NEGA) {
    // exit 2 bloqueia a chamada; o que sai em stderr é o motivo que o Claude lê.
    console.error(
      `LIMITE ATINGIDO: ${n}º despacho de subagente nesta tarefa (${tipo}).\n` +
      `O teto é ${TETO_NEGA}. Isto não é uma tarefa grande, é fatiamento excessivo — o padrão que ` +
      `custou 30% de um bloco de 5 horas num bug só.\n` +
      `Antes de insistir: os sintomas que você está investigando são o mesmo problema? Investigação ` +
      `e correção cabem no mesmo despacho? A revisão já rodou uma vez?\n` +
      `Se este despacho for mesmo necessário, diga ao Eric por que — ele destrava.`
    );
    process.exit(2);
  }

  if (n > TETO_AVISO) {
    // Passa, mas deixa o número visível enquanto ainda dá para corrigir o rumo.
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext:
          `AVISO — este é o ${n}º despacho desta tarefa (${tipo}). O teto do CLAUDE.md é ` +
          `${TETO_AVISO}; a partir de ${TETO_NEGA} a chamada é negada. ` +
          `Vale conferir se os despachos anteriores não cobriam este trabalho.`,
      },
    }));
  }

  process.exit(0);
} catch {
  // Falha aberta, sempre: um hook que derruba a sessão é pior que a ausência dele.
  process.exit(0);
}
