#!/usr/bin/env node
/**
 * Aviso de arquivo grande — SessionStart hook.
 *
 * O que faz, ao abrir um projeto:
 *   1. Se o projeto não parece JavaScript/TypeScript (sem package.json), fica calado — este
 *      aviso é só sobre o quality gate de ESLint, não faz sentido em outra stack.
 *   2. Se o quality gate do prompt 08 (regra `quality/max-lines`) NÃO estiver instalado no
 *      eslint.config.*, avisa UMA VEZ sugerindo a skill `qualidade-1-medir` — e nunca mais,
 *      porque perguntar toda sessão é o tipo de coisa que faz alguém desligar o hook inteiro.
 *   3. Se estiver instalado, conta quantos arquivos-fonte passam de MAX_LINES linhas e avisa
 *      SÓ quando esse número mudou desde a última sessão — mesma lógica do item 2: repetir o
 *      mesmo número toda vez vira ruído que ninguém lê mais.
 *
 * O que este hook NUNCA faz: consertar arquivo, rodar o linter completo, ou bloquear qualquer
 * coisa. É aviso, não gate — quem decide refatorar é o dono do projeto, via `qualidade-2-quebrar`
 * ou `qualidade-3-zerar`.
 *
 * MAX_LINES=350 é o padrão do toolkit de origem (vibe-coding-toolkit), não uma medição feita
 * neste projeto — mesmo valor usado pelas três skills de qualidade e pelo hook irmão
 * arquivo-grande-ao-editar.mjs, para o número não divergir de hook para hook.
 *
 * REGRAS DE SEGURANÇA (a razão de cada guarda):
 *  - FALHA ABERTO. stdin vazio, `null`, ou JSON quebrado saem com código 0 e SEM saída nenhuma
 *    — nunca travam a sessão por causa de um aviso.
 *  - `JSON.parse("null")` não lança erro, devolve o valor `null` — por isso o parse abaixo testa
 *    o TIPO do resultado (objeto de verdade, não `null`) antes de tratar como dado confiável, em
 *    vez de confiar que qualquer coisa que passou no `try` é segura de usar.
 *  - CUSTO BAIXO. Nunca roda o linter. Só percorre a árvore de arquivos contando linha por
 *    arquivo-fonte, pulando node_modules/dist/build/.git e afins ANTES de entrar neles — a
 *    pasta nunca chega a ser lida por dentro.
 *  - Estado por PROJETO, nunca global: fica em `<projeto>/.claude/`, então dois projetos abertos
 *    na mesma máquina têm contagens e avisos independentes.
 *  - Só módulos nativos do Node (fs, path) — nada para instalar, nada que quebre por versão.
 */
import fs from 'node:fs';
import path from 'node:path';

const MAX_LINES = 350;

/** Extensões que o quality gate de ESLint (prompt 08) realmente cobre — família JS/TS. */
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);

/**
 * Pastas nunca visitadas: saída de build, dependência de terceiro, controle de versão, ou
 * conteúdo gerado/de teste que o próprio gate trata separado (warn, não error). Comparado pelo
 * nome do segmento, então casa em qualquer profundidade sem precisar listar caminho completo.
 */
const IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', 'out', 'coverage', '.git', 'vendor',
  'generated', '__generated__', 'migrations', 'migration', 'locales',
  '__tests__', '__mocks__', 'fixtures', 'mocks',
]);

try {
  rodar();
} catch {
  // falha aberto: qualquer erro acima (stdin, parse, fs) cai aqui e a sessão segue normal
}
process.exit(0);

function rodar() {
  const entrada = fs.readFileSync(0, 'utf8');
  const bruto = JSON.parse(entrada || '{}');
  // `JSON.parse("null")` devolve `null` sem lançar erro — testar o tipo aqui é o que evita usar
  // `null.cwd` duas linhas abaixo e derrubar o hook num caso que devia sair calado, não travar.
  const dados = typeof bruto === 'object' && bruto !== null ? bruto : {};
  const cwd = String(dados.cwd ?? process.cwd());

  // Sem package.json não é projeto JS/TS — este aviso não tem o que dizer aqui.
  if (!fs.existsSync(path.join(cwd, 'package.json'))) return;

  const estadoPath = path.join(cwd, '.claude', '.qualidade-arquivo-grande.json');
  const estado = lerEstado(estadoPath);

  if (!gateInstalado(cwd)) {
    if (estado.avisadoSemGate) return; // já avisou uma vez sobre isto — nunca mais
    emitir(
      'Este projeto ainda não tem o quality gate de ESLint instalado (teto de linhas por ' +
      'arquivo, entre outras regras). Sem ele não dá para medir quantos arquivos já passaram ' +
      `de ${MAX_LINES} linhas. Sugira a skill qualidade-1-medir para instalar e medir.`,
    );
    salvarEstado(estadoPath, { ...estado, avisadoSemGate: true });
    return;
  }

  const contagem = contarArquivosGrandes(cwd);
  if (estado.ultimaContagem !== null && contagem === estado.ultimaContagem) return; // nada mudou

  const antes = estado.ultimaContagem === null ? 'ainda não medido' : String(estado.ultimaContagem);
  emitir(
    `${contagem} arquivo(s) de código passam de ${MAX_LINES} linhas (era: ${antes}). ` +
    'Isto é só um aviso — não conserte nada sozinho. Se o Eric quiser agir, a skill ' +
    'qualidade-2-quebrar divide arquivo por arquivo, por responsabilidade.',
  );
  salvarEstado(estadoPath, { ...estado, ultimaContagem: contagem });
}

/**
 * O quality gate está instalado quando algum eslint.config.* do projeto referencia a regra
 * `quality/max-lines` — o marcador que o prompt 08 deixa depois de copiar os arquivos e ligar
 * a regra na configuração. Checar o texto da config é mais barato e mais confiável do que supor
 * um caminho de arquivo fixo, que muda se alguém renomeou a pasta das regras.
 */
function gateInstalado(cwd) {
  const candidatos = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs', 'eslint.config.ts'];
  for (const nome of candidatos) {
    const p = path.join(cwd, nome);
    if (!fs.existsSync(p)) continue;
    try {
      if (fs.readFileSync(p, 'utf8').includes('quality/max-lines')) return true;
    } catch {
      // config existe mas não leu: não conta como instalado, mas também não derruba o hook
    }
  }
  return false;
}

/** Percorre a árvore a partir de `cwd`, contando arquivo-fonte acima de MAX_LINES. */
function contarArquivosGrandes(cwd) {
  let contagem = 0;
  const pilha = [cwd];
  while (pilha.length > 0) {
    const dir = pilha.pop();
    let entradas;
    try {
      entradas = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // pasta ilegível: pula, uma pasta ruim não pode zerar a contagem inteira
    }
    for (const entrada of entradas) {
      if (entrada.isDirectory()) {
        // pula ANTES de entrar — é isto que mantém o custo baixo em node_modules gigante
        if (!IGNORED_DIRS.has(entrada.name)) pilha.push(path.join(dir, entrada.name));
        continue;
      }
      if (!entrada.isFile()) continue;
      const abs = path.join(dir, entrada.name);
      if (!isArquivoFonte(abs)) continue;
      const linhas = contarLinhas(abs);
      if (linhas != null && linhas > MAX_LINES) contagem++;
    }
  }
  return contagem;
}

/** Mesma noção de "arquivo que vale medir" que a regra `quality/max-lines` já usa. */
function isArquivoFonte(abs) {
  if (!SOURCE_EXTS.has(path.extname(abs).toLowerCase())) return false;
  if (abs.endsWith('.d.ts')) return false; // só tipo, sem lógica
  const base = path.basename(abs);
  if (/\.(test|spec|stories|config|conf)\.[^.]+$/.test(base)) return false; // não é lógica principal
  if (/^(index|types?|interfaces?|constants?|dtos?|enums?|vo)\.[^.]+$/.test(base)) return false; // barrel/declaração pura
  return true;
}

function contarLinhas(abs) {
  try {
    return fs.readFileSync(abs, 'utf8').split(/\r?\n/).length;
  } catch {
    return null; // arquivo sumiu ou sem permissão entre o readdir e a leitura: ignora, não trava
  }
}

function lerEstado(estadoPath) {
  const padrao = { avisadoSemGate: false, ultimaContagem: null };
  try {
    const bruto = JSON.parse(fs.readFileSync(estadoPath, 'utf8'));
    if (typeof bruto !== 'object' || bruto === null) return padrao;
    return { ...padrao, ...bruto };
  } catch {
    return padrao; // primeira vez, ou arquivo de estado corrompido: começa do zero
  }
}

function salvarEstado(estadoPath, estado) {
  try {
    const dir = path.dirname(estadoPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(estadoPath, JSON.stringify(estado, null, 2));
  } catch {
    // melhor esforço — se não gravar, o pior efeito é repetir o mesmo aviso na próxima sessão
  }
}

function emitir(texto) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: texto,
    },
  }));
}
