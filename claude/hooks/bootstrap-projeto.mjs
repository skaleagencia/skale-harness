#!/usr/bin/env node
/**
 * Bootstrap de projeto — SessionStart hook.
 *
 * O que faz: ao abrir um projeto, verifica o que falta da configuração do harness (CLAUDE.md,
 * mapa do graphify, regra do caveman, .mcp.json, PRODUCT.md/DESIGN.md) e OFERECE criar — nunca
 * executa nada sozinho, quem decide é quem está na frente do teclado.
 *
 * Por que perguntar uma vez e não a cada sessão: perguntar toda hora é o tipo de coisa que faz
 * gente desligar o hook inteiro. Uma vez é aviso útil; toda sessão é ruído que ninguém lê mais.
 * A resposta (o que foi oferecido) fica registrada em <projeto>/.claude/.bootstrap-check — da
 * segunda sessão em diante, achar esse arquivo já basta para sair calado.
 *
 * REGRAS DE SEGURANÇA (a razão de cada guarda):
 *  - Só OFERECE. Nunca roda `graphify`, `aia-harness:init`, `/caveman-init` ou qualquer comando
 *    sozinho — isso é decisão de quem está usando o projeto, não do hook de abertura.
 *  - Diretório que não parece projeto (sem .git, package.json, deno.json, pyproject.toml,
 *    Cargo.toml, go.mod) sai calado: perguntar sobre CLAUDE.md numa pasta de downloads é ruído.
 *  - `graphify` só entra na lista se o binário existir no PATH — oferecer um comando que não vai
 *    rodar é pior do que não oferecer nada.
 *  - Nada é sobrescrito: cada item checado só entra na lista se o arquivo/pasta dele não existir;
 *    o único arquivo que este hook cria é o `.bootstrap-check`, e só depois de emitir a oferta —
 *    e só se ele ainda não existir.
 *  - Se nada falta, fica mudo e não grava nada: só grava quando de fato ofereceu algo, porque o
 *    registro é "o que foi oferecido" — nada oferecido, nada para registrar.
 *  - FALHA ABERTO. Qualquer erro — stdin ilegível, JSON quebrado, permissão de arquivo — sai com
 *    código 0 e sem saída nenhuma. Um hook de abertura de sessão que travasse a sessão seria pior
 *    do que a ausência dele.
 *
 * Só módulos nativos do Node (fs, path). Sem child_process, sem dependência externa: as checagens
 * são só existência de arquivo, não precisam de mais que isso.
 */

import fs from 'node:fs';
import path from 'node:path';

try {
  rodar();
} catch {
  // falha aberto: qualquer erro acima (stdin, parse, fs) cai aqui e a sessão segue normal
}
process.exit(0);

function rodar() {
  const entrada = fs.readFileSync(0, 'utf8');
  // `JSON.parse("null")` devolve null sem lançar — por isso o `?? {}` depois do parse, e não só
  // o try/catch em volta (que pega o "lixo{{{" mas não pegaria o `null` válido sozinho).
  const dados = JSON.parse(entrada || '{}') ?? {};
  const cwd = String(dados?.cwd ?? process.cwd());

  const checkPath = path.join(cwd, '.claude', '.bootstrap-check');
  // já perguntou uma vez sobre este projeto: sai sem nenhuma saída, para sempre.
  if (fs.existsSync(checkPath)) return;

  if (!pareceProjeto(cwd)) return; // pasta qualquer, não é projeto: nada a oferecer aqui

  const ofertas = [];

  if (!fs.existsSync(path.join(cwd, 'CLAUDE.md'))) {
    ofertas.push({
      chave: 'CLAUDE.md',
      texto: 'CLAUDE.md — é a ficha de instruções do projeto que eu leio antes de mexer em ' +
        'qualquer coisa: convenções, regras de negócio, o que não pode quebrar. Sem ele, cada ' +
        'sessão recomeça do zero. Gero agora? (via aia-harness:init)',
    });
  }

  if (!fs.existsSync(path.join(cwd, 'graphify-out', 'graph.json')) && binarioNoPath('graphify')) {
    ofertas.push({
      chave: 'graphify',
      texto: 'graphify — mapeia o código como um mapa de dependências. Com ele eu respondo ' +
        '"o que quebra se eu mudar isso" numa consulta, em vez de vasculhar arquivo por arquivo. ' +
        'Rodo agora? (comando: graphify update .)',
    });
  }

  if (!temRegraCaveman(cwd)) {
    ofertas.push({
      chave: 'regra-caveman',
      texto: 'regra do caveman — deixa minhas respostas de código diretas, sem enrolação, em ' +
        'qualquer editor que você use neste projeto, não só aqui no Claude Code. Configuro ' +
        'agora? (via /caveman-init)',
    });
  }

  if (!fs.existsSync(path.join(cwd, '.mcp.json'))) {
    ofertas.push({
      chave: '.mcp.json',
      texto: 'este projeto não tem .mcp.json — sem ele, as integrações de ClickUp e Obsidian ' +
        'não funcionam aqui dentro (não crio tarefa nem guardo nota a partir deste projeto). ' +
        'Isso é só um aviso: configurar depende de credencial sua, não é algo que eu ofereço rodar.',
    });
  }

  if (temInterface(cwd)) {
    const semProduct = !fs.existsSync(path.join(cwd, 'PRODUCT.md'));
    const semDesign = !fs.existsSync(path.join(cwd, 'DESIGN.md'));
    if (semProduct || semDesign) {
      const faltando = [semProduct && 'PRODUCT.md', semDesign && 'DESIGN.md']
        .filter(Boolean).join(' e ');
      ofertas.push({
        chave: 'product-design',
        texto: `${faltando} — é o contexto que a skill de design (impeccable) usa para saber ` +
          'quem é o usuário e qual é a linguagem visual do produto, em vez de inventar do zero ' +
          `a cada tela. Este projeto tem interface mas não tem ${semProduct && semDesign ? 'nenhum dos dois' : faltando}. Crio agora?`,
      });
    }
  }

  if (usaSupabase(cwd) && !temRotinaDeBackup(cwd)) {
    ofertas.push({
      chave: 'backup-supabase',
      texto: 'backup do Supabase — este projeto usa Supabase e não tem rotina de backup ' +
        'configurada. O plano Free não faz backup nenhum; o Pro guarda só os últimos 7 dias, ' +
        'numa janela que anda (passou disso, o dado some). E os arquivos do Storage não têm ' +
        'backup em plano nenhum, nem no Enterprise. Existe um template pronto: dump diário, ' +
        'criptografado, guardado no Cloudflare R2, com custo zero dentro dos limites grátis. ' +
        'Configuro? (template em templates/backup-supabase/ do skale-harness)',
    });
  }

  if (ofertas.length === 0) return; // nada falta: fica calado, sem gravar nada

  emitir(ofertas);
  registrar(checkPath, ofertas);
}

/** Marcadores mínimos de que a pasta é um projeto de verdade, não uma pasta qualquer. */
function pareceProjeto(cwd) {
  const marcadores = ['.git', 'package.json', 'deno.json', 'pyproject.toml', 'Cargo.toml', 'go.mod'];
  return marcadores.some((m) => fs.existsSync(path.join(cwd, m)));
}

/** Varre o PATH à procura do binário — sem child_process, só existência de arquivo. */
function binarioNoPath(nome) {
  const dirs = String(process.env.PATH ?? '').split(path.delimiter);
  return dirs.some((d) => d && fs.existsSync(path.join(d, nome)));
}

/** A regra do caveman vive numa dessas duas pastas, dependendo do editor usado no projeto. */
function temRegraCaveman(cwd) {
  return fs.existsSync(path.join(cwd, '.cursor', 'rules')) ||
    fs.existsSync(path.join(cwd, '.windsurf', 'rules'));
}

/** Projeto "tem interface" se usa um framework de UI nas dependências ou já tem pasta de componentes. */
function temInterface(cwd) {
  if (fs.existsSync(path.join(cwd, 'src', 'components'))) return true;
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) ?? {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.keys(deps).some((d) => /\b(react|vue|svelte|next)\b/i.test(d));
  } catch {
    return false; // package.json com JSON quebrado: não trava o hook, só não conta como "tem UI"
  }
}

/** Projeto "usa Supabase" se tem a pasta supabase/, variável SUPABASE_ num arquivo de env, ou o client nas dependências. */
function usaSupabase(cwd) {
  if (fs.existsSync(path.join(cwd, 'supabase'))) return true;
  if (temVarSupabaseEmEnv(cwd)) return true;
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) ?? {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.keys(deps).some((d) => /^@supabase\//.test(d));
  } catch {
    return false; // package.json com JSON quebrado: não trava o hook, só não conta como "usa Supabase"
  }
}

/** Procura SUPABASE_... nos arquivos de env mais comuns da raiz do projeto — sem varrer a árvore. */
function temVarSupabaseEmEnv(cwd) {
  const candidatos = ['.env', '.env.local', '.env.example', '.env.development', '.env.production'];
  return candidatos.some((nome) => {
    const p = path.join(cwd, nome);
    if (!fs.existsSync(p)) return false;
    try {
      return /^\s*(export\s+)?SUPABASE_[A-Z0-9_]*\s*=/m.test(fs.readFileSync(p, 'utf8'));
    } catch {
      return false;
    }
  });
}

/** Rotina de backup já existe se algum workflow do GitHub tiver "backup" no nome. */
function temRotinaDeBackup(cwd) {
  const dir = path.join(cwd, '.github', 'workflows');
  if (!fs.existsSync(dir)) return false;
  try {
    return fs.readdirSync(dir).some((nome) => /backup/i.test(nome));
  } catch {
    return false;
  }
}

function emitir(ofertas) {
  const bloco = ofertas.map((o) => `- ${o.texto}`).join('\n');
  const contexto =
    'CONFIGURAÇÃO DO PROJETO — checagem única, não repete nas próximas sessões.\n\n' +
    'Isto falta neste projeto. Ofereça tudo numa mensagem só, em português simples, explicando ' +
    'o papel de cada item antes de perguntar — e NUNCA execute nada sem o usuário confirmar:\n\n' +
    bloco;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: contexto,
    },
  }));
}

function registrar(checkPath, ofertas) {
  const dir = path.dirname(checkPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(checkPath)) return; // nunca sobrescreve: corrida rara, mas não arrisca
  fs.writeFileSync(checkPath, JSON.stringify({
    data: new Date().toISOString(),
    ofertado: ofertas.map((o) => o.chave),
  }, null, 2));
}
