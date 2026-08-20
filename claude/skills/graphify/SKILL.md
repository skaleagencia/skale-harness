---
name: graphify
description: "Use para qualquer pergunta sobre uma base de código, sua arquitetura, relação entre arquivos, ou conteúdo do projeto — principalmente quando `graphify-out/` já existe, caso em que a pergunta deve ser tratada primeiro como uma consulta ao graphify. Transforma qualquer entrada (código, documentos, artigos, imagens, vídeos) num grafo de conhecimento persistente, com nós centrais (god nodes), detecção de comunidade, e ferramentas de consulta/caminho/explicação."
---

# /graphify

Transforma qualquer pasta de arquivos num grafo de conhecimento navegável, com detecção de
comunidade, uma trilha de auditoria honesta, e três saídas: HTML interativo, JSON pronto para
GraphRAG, e um GRAPH_REPORT.md em linguagem simples.

## Uso

```
/graphify                                             # pipeline completo no diretório atual → vault do Obsidian
/graphify <path>                                      # pipeline completo num caminho específico
/graphify https://github.com/<owner>/<repo>           # clona o repositório e roda o pipeline completo nele
/graphify https://github.com/<owner>/<repo> --branch <branch>  # clona uma branch específica
/graphify <url1> <url2> ...                           # clona vários repositórios, constrói cada um, funde num único grafo cross-repo
/graphify <path> --mode deep                          # extração mais profunda, arestas INFERRED mais ricas
/graphify <path> --update                             # incremental - re-extrai só arquivo novo/alterado
/graphify <path> --directed                            # constrói grafo direcionado (preserva a direção source→target da aresta)
/graphify <path> --whisper-model medium                # usa um modelo Whisper maior para transcrição mais precisa
/graphify <path> --cluster-only                       # reroda o clustering num grafo já existente
/graphify <path> --no-viz                             # pula a visualização, só relatório + JSON
/graphify <path> --html                               # (o HTML já é gerado por padrão - essa flag não faz nada a mais)
/graphify <path> --svg                                # também exporta graph.svg (incorpora em Notion, GitHub)
/graphify <path> --graphml                            # exporta graph.graphml (Gephi, yEd)
/graphify <path> --neo4j                              # gera graphify-out/cypher.txt para Neo4j
/graphify <path> --neo4j-push bolt://localhost:7687   # envia direto para o Neo4j
/graphify <path> --falkordb                           # gera graphify-out/cypher.txt para FalkorDB
/graphify <path> --falkordb-push falkordb://localhost:6379   # envia direto para o FalkorDB
/graphify <path> --mcp                                # inicia servidor MCP stdio para acesso via agente
/graphify <path> --watch                              # observa a pasta, reconstrói sozinho quando o código muda (sem LLM)
/graphify <path> --wiki                               # constrói uma wiki navegável por agente (index.md + um artigo por comunidade)
/graphify <path> --obsidian --obsidian-dir ~/vaults/my-project  # escreve o vault num caminho customizado (ex.: vault já existente)
/graphify add <url>                                   # busca a URL, salva em ./raw, atualiza o grafo
/graphify add <url> --author "Nome"                   # marca quem escreveu
/graphify add <url> --contributor "Nome"               # marca quem adicionou ao corpus
/graphify query "<pergunta>"                          # travessia BFS - contexto amplo
/graphify query "<pergunta>" --dfs                    # DFS - traça um caminho específico
/graphify query "<pergunta>" --budget 1500            # limita a resposta a N tokens
/graphify path "AuthModule" "Database"                # caminho mais curto entre dois conceitos
/graphify explain "SwinTransformer"                   # explicação em linguagem simples de um nó
```

## Para que serve o graphify

Solte qualquer pasta de código, documentos, artigos, imagens ou vídeo no graphify e receba um grafo
de conhecimento consultável. Persiste entre sessões, tem trilha de auditoria honesta
(EXTRACTED/INFERRED/AMBIGUOUS), e a detecção de comunidade revela conexões entre documentos que
ninguém pensaria em perguntar.

## O que fazer obrigatoriamente ao ser invocado

Se o usuário chamou `/graphify --help` ou `/graphify -h` (sem outros argumentos), imprima o conteúdo
da seção `## Uso` acima ao pé da letra e pare. Não rode nenhum comando, não detecte arquivos, não
assuma `.` como caminho padrão. Só imprima o bloco de Uso e retorne.

**Caminho rápido — grafo já existe:** Antes de qualquer outra coisa, verifique se
`graphify-out/graph.json` existe. O local esperado é `graphify-out/graph.json` relativo ao
**diretório de trabalho atual** (ou seja, a raiz do projeto onde os comandos estão rodando). Se ele
existir E o pedido do usuário for uma pergunta em linguagem natural sobre a base de código (ex.:
"Como X funciona?", "O que chama Y?", "Trace o fluxo de dado por Z") e NÃO for um comando explícito
de reconstrução (`--update`, `--cluster-only`, ou um caminho/URL simples que implica extração do
zero): **pule os Passos 1–5 inteiramente e vá direto para `## Para /graphify query`.** Rode
`graphify query "<pergunta>"` imediatamente. Não rode detect. Não confira o tamanho do corpus. Não
peça para o usuário restringir o escopo. O grafo já está construído — use-o.

Se nenhum caminho foi passado, use `.` (diretório atual). Não pergunte ao usuário por um caminho.

Se o argumento de caminho começar com `https://github.com/` ou `http://github.com/`, trate como URL
do GitHub — rode o Passo 0 antes de qualquer outra coisa, depois continue com o caminho local
resolvido.

Siga estes passos em ordem. Não pule passo.

### Passo 0 - Repositórios do GitHub e fusão de múltiplos caminhos (só se houver URL ou vários caminhos)

Só quando o caminho for uma ou mais URLs `https://github.com/...`, ou várias subpastas locais para
fundir. Veja `references/github-and-merge.md` para o fluxo de clone, fusão cross-repo e monorepo, e
depois continue com o caminho local resolvido. Um caminho local simples pula este passo.

### Passo 1 - Garantir que o graphify está instalado

```bash
# Detecta o interpretador Python correto (lida com uv tool, pipx, venv, instalações de sistema)
PYTHON=""
GRAPHIFY_BIN=$(which graphify 2>/dev/null)
# 1. Instalações via uv tool — mais confiável em Mac/Linux modernos
if [ -z "$PYTHON" ] && command -v uv >/dev/null 2>&1; then
    _UV_PY=$(uv tool run graphifyy python -c "import sys; print(sys.executable)" 2>/dev/null)
    if [ -n "$_UV_PY" ]; then PYTHON="$_UV_PY"; fi
fi
# 2. Lê o shebang do binário graphify (pipx e instalações diretas via pip)
if [ -z "$PYTHON" ] && [ -n "$GRAPHIFY_BIN" ]; then
    _SHEBANG=$(head -1 "$GRAPHIFY_BIN" | tr -d '#!')
    case "$_SHEBANG" in
        *[!a-zA-Z0-9/_.-]*) ;;
        *) "$_SHEBANG" -c "import graphify" 2>/dev/null && PYTHON="$_SHEBANG" ;;
    esac
fi
# 3. Recorre a python3
if [ -z "$PYTHON" ]; then PYTHON="python3"; fi
if ! "$PYTHON" -c "import graphify" 2>/dev/null; then
    if command -v uv >/dev/null 2>&1; then
        uv tool install --upgrade graphifyy -q 2>&1 | tail -3
        _UV_PY=$(uv tool run graphifyy python -c "import sys; print(sys.executable)" 2>/dev/null)
        if [ -n "$_UV_PY" ]; then PYTHON="$_UV_PY"; fi
    else
        "$PYTHON" -m pip install graphifyy -q 2>/dev/null \
          || "$PYTHON" -m pip install graphifyy -q --break-system-packages 2>&1 | tail -3
    fi
fi
# Grava o caminho do interpretador para todos os próximos passos (persiste entre invocações)
mkdir -p graphify-out
"$PYTHON" -c "import sys; open('graphify-out/.graphify_python', 'w', encoding='utf-8').write(sys.executable)"
# Salva a raiz da varredura para o `graphify update` (sem args) saber onde olhar da próxima vez
echo "$(cd INPUT_PATH && pwd)" > graphify-out/.graphify_root
```

Se o import funcionar, não imprima nada e vá direto para o Passo 2.

**Em todo bloco bash seguinte, troque `python3` por `$(cat graphify-out/.graphify_python)` para usar
o interpretador correto.**

### Passo 2 - Detectar arquivos

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from graphify.detect import detect
from pathlib import Path
result = detect(Path('INPUT_PATH'))
print(json.dumps(result, ensure_ascii=False))
" > graphify-out/.graphify_detect.json
```

Troque INPUT_PATH pelo caminho de verdade que o usuário passou. NÃO faça cat ou print do JSON — leia
em silêncio e apresente um resumo limpo:

```
Corpus: X arquivos · ~Y palavras
  code:     N arquivos (.py .ts .go ...)
  docs:     N arquivos (.md .txt ...)
  papers:   N arquivos (.pdf ...)
  images:   N arquivos
  video:    N arquivos (.mp4 .mp3 ...)
```

Omita qualquer categoria com 0 arquivos do resumo.

Depois aja de acordo:
- Se `total_files` for 0: pare com "Nenhum arquivo suportado encontrado em [path]."
- Se `skipped_sensitive` não estiver vazio: mencione a quantidade de arquivos ignorados, não os nomes.
- Se `total_words` > 2.000.000 OU `total_files` > 500: mostre o aviso. Depois calcule as 5 principais
  subpastas de primeiro nível por quantidade de arquivo:
  - Leia `scan_root` do JSON do detect (sempre um caminho absoluto para o INPUT_PATH resolvido).
  - Concatene todas as listas de arquivo entre todos os tipos (`code`, `document`, `paper`, `image`,
    `video`).
  - Filtre qualquer caminho que comece com `scan_root + "/graphify-out/"` para excluir os sidecars
    convertidos.
  - Para cada arquivo, remova o prefixo `scan_root` e pegue o primeiro componente do caminho.
    Arquivos direto na `scan_root` sem subpasta contam como `(root)`.
  - Se todos os arquivos estiverem em `(root)` sem subpastas, não peça para restringir — não existe
    subpasta nenhuma. Em vez disso, sugira `--no-cluster` para pular o passo caro de clustering e
    seguir em frente.
  - Caso contrário, ordene por contagem, mostre as 5 principais com a quantidade de arquivo, e
    pergunte em qual subpasta rodar. Espere a resposta do usuário antes de continuar.
- Caso contrário: siga direto para o Passo 2.5 se arquivos de vídeo foram detectados, ou para o
  Passo 3 se não.

### Passo 2.5 - Vídeo e áudio (só se arquivo de vídeo foi detectado)

Pule este passo inteiramente se `detect` não retornou nenhum arquivo `video`. Quando o corpus tiver
vídeo ou áudio, veja `references/transcribe.md` para transcrever para texto primeiro, e depois trate
as transcrições como arquivo de documento no Passo 3.

### Passo 3 - Extrair entidades e relações

**Antes de começar:** anote se `--mode deep` foi passado. Você precisa passar `DEEP_MODE=true` para
todo subagente no Passo B2 se foi. Acompanhe isso desde a invocação original - não perca essa
informação.

Este passo tem duas partes: **extração estrutural** (determinística, grátis) e **extração
semântica** (LLM, custa token).

> **O graphify não precisa de chave de API. Nunca peça uma ao usuário, e nunca fique travado
> esperando uma.** Código é extraído estruturalmente (AST — árvore de sintaxe abstrata) sem LLM e
> sem chave nenhuma — um corpus só de código (o `/graphify .` comum num repositório) pula a extração
> semântica inteiramente, então não precisa de nada aqui: vá direto para a Parte A e pule a Parte B.
> A extração semântica (só para documentos, artigos e imagens) usa o Gemini **apenas se**
> `GEMINI_API_KEY`/`GOOGLE_API_KEY` já estiver definida; senão, o próprio agente hospedeiro é o LLM.
> O graphify **não** lê `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, nem qualquer outra chave de provedor.
> Se você se pegar prestes a pedir, esperar por, ou parar por causa de uma chave de API faltando,
> isso é uma leitura errada desta skill — prossiga sem uma.

**Antes da extração semântica:** confira se `GEMINI_API_KEY` ou `GOOGLE_API_KEY` está definida. Se
nenhuma estiver, imprima esta linha única para o usuário:
> Dica: defina `GEMINI_API_KEY` ou `GOOGLE_API_KEY` para usar o Gemini na extração semântica
> (`pip install 'graphifyy[gemini]'`).

Imprima uma vez e continue — não espere o usuário fornecer uma chave. Se `GEMINI_API_KEY` ou
`GOOGLE_API_KEY` ESTIVER definida, use `graphify.llm.extract_corpus_parallel(files, backend="gemini")`
para a extração semântica em vez de despachar subagentes. O modelo padrão do Gemini é
`gemini-3-flash-preview`; defina `GRAPHIFY_GEMINI_MODEL` ou passe `--model` em fluxos de CLI headless
para sobrescrever.

> **Nenhuma outra chave de API é lida.** Quando `GEMINI_API_KEY`/`GOOGLE_API_KEY` não estiverem
> definidas, a extração semântica cai para o próprio agente hospedeiro — a sessão em execução é o
> LLM. Num hospedeiro que despacha subagentes (ex.: Claude Code), despache-os como descrito na Parte
> B. Num hospedeiro que roda a CLI direto num terminal e não consegue despachar subagentes, não
> trave: um corpus só de código não tem trabalho semântico nenhum, então escreva o arquivo semântico
> vazio (Parte B "Caminho rápido") e continue para a Parte C; para um corpus com
> documentos/artigos/imagens, ou defina uma chave do Gemini ou extraia esses arquivos você mesmo
> inline, mas em nenhum caso peça `ANTHROPIC_API_KEY` — esse pedido é uma leitura errada desta
> skill.

**Rode a Parte A (AST) e a Parte B (semântica) em paralelo. Despache todos os subagentes semânticos
E comece a extração AST na mesma mensagem. As duas podem rodar simultaneamente já que operam em
tipos de arquivo diferentes. Funda os resultados na Parte C como antes.**

Nota: Paralelizar AST + semântica economiza 5-15s em corpus grande. AST é determinística e rápida;
comece ela enquanto os subagentes processam documentos/artigos.

#### Parte A - Extração estrutural para arquivos de código

Para qualquer arquivo de código detectado, rode a extração AST em paralelo com os subagentes da
Parte B:

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.extract import collect_files, extract
from pathlib import Path
import json

code_files = []
detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
for f in detect.get('files', {}).get('code', []):
    code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

if code_files:
    result = extract(code_files, cache_root=Path('INPUT_PATH'))
    Path('graphify-out/.graphify_ast.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding=\"utf-8\")
    print(f'AST: {len(result[\"nodes\"])} nodes, {len(result[\"edges\"])} edges')
else:
    Path('graphify-out/.graphify_ast.json').write_text(json.dumps({'nodes':[],'edges':[],'input_tokens':0,'output_tokens':0}, ensure_ascii=False), encoding=\"utf-8\")
    print('No code files - skipping AST extraction')
"
```

#### Parte B - Extração semântica (subagentes em paralelo)

**Caminho rápido:** Se a detecção não encontrou nenhum documento, artigo ou imagem (corpus só de
código), pule a Parte B inteiramente e vá direto para a Parte C. AST já cuida do código - não sobra
nada para os subagentes semânticos fazerem. **Primeiro escreva um arquivo semântico vazio** para a
fusão da Parte C ter sua entrada (ela lê `.graphify_semantic.json` incondicionalmente; sem isso, uma
rodada só de código dá `FileNotFoundError`):

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from pathlib import Path
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps({'nodes':[],'edges':[],'hyperedges':[],'input_tokens':0,'output_tokens':0}), encoding='utf-8')
"
```

**OBRIGATÓRIO: Você DEVE usar a ferramenta Agent aqui. Ler os arquivos você mesmo, um por um, é
proibido - é 5-10x mais lento. Se você não usar a ferramenta Agent, está fazendo errado.**

Antes de despachar subagentes, imprima uma estimativa de tempo:
- Carregue `total_words` e a contagem de arquivo de `graphify-out/.graphify_detect.json`
- Estime agentes necessários: `ceil(arquivos_não_código_sem_cache / 22)` (o tamanho do lote é 20-25)
- Estime o tempo: ~45s por lote de agente (rodam em paralelo, então o total ≈ 45s × ceil(agentes/limite_paralelo))
- Imprima: "Extração semântica: ~N arquivos → X agentes, estimativa de ~Ys"

**Passo B0 - Confira o cache de extração primeiro**

Antes de despachar qualquer subagente, confira quais arquivos já têm resultado de extração em cache:

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from graphify.cache import check_semantic_cache
from pathlib import Path

detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
# Só arquivo de conteúdo vai para extração semântica. Código já é coberto estruturalmente
# pela passada AST (Parte A); achatar toda categoria aqui faria os subagentes reler
# todo arquivo-fonte de novo (#1392). Vídeo é transcrito para documento no Passo 2.5 antes.
all_files = [f for cat in ('document', 'paper', 'image') for f in detect['files'].get(cat, [])]

cached_nodes, cached_edges, cached_hyperedges, uncached = check_semantic_cache(all_files, root='INPUT_PATH')

# Sempre (re)escreve o arquivo de cache: escreve os hits, senão APAGA qualquer resto
# de rodada anterior para a Parte C nunca fundir um .graphify_cached.json obsoleto (#1392).
if cached_nodes or cached_edges or cached_hyperedges:
    Path('graphify-out/.graphify_cached.json').write_text(json.dumps({'nodes': cached_nodes, 'edges': cached_edges, 'hyperedges': cached_hyperedges}, ensure_ascii=False), encoding=\"utf-8\")
else:
    Path('graphify-out/.graphify_cached.json').unlink(missing_ok=True)
Path('graphify-out/.graphify_uncached.txt').write_text('\n'.join(uncached), encoding=\"utf-8\")
print(f'Cache: {len(all_files)-len(uncached)} files hit, {len(uncached)} files need extraction')
"
```

Despache subagentes só para os arquivos listados em `graphify-out/.graphify_uncached.txt`. Se todos
os arquivos estiverem em cache, pule direto para a Parte C.

**Passo B1 - Dividir em lotes**

Carregue os arquivos de `graphify-out/.graphify_uncached.txt`. Divida em lotes de 20-25 arquivos
cada. Cada imagem tem seu próprio lote (visão precisa de contexto separado). Ao dividir, agrupe
arquivos da mesma pasta juntos para artefatos relacionados caírem no mesmo lote e relações
entre arquivo terem mais chance de serem extraídas.

**Passo B2 - Despachar TODOS os subagentes numa única mensagem**

Chame a ferramenta Agent várias vezes NA MESMA RESPOSTA - uma chamada por lote. Essa é a única forma
deles rodarem em paralelo. Se você fizer uma chamada Agent, esperar, e depois fizer outra, está
fazendo sequencial e anulando o propósito.

**IMPORTANTE - tipo de subagente:** Sempre use `subagent_type="general-purpose"`. NÃO use
`Explore` - é só leitura e não consegue escrever arquivo de lote em disco, o que silenciosamente
descarta o resultado da extração. O general-purpose tem acesso a Write e Bash, que o subagente
precisa.

Exemplo concreto para 3 lotes:
```
[chamada de Agent 1: arquivos 1-15, subagent_type="general-purpose"]
[chamada de Agent 2: arquivos 16-30, subagent_type="general-purpose"]
[chamada de Agent 3: arquivos 31-45, subagent_type="general-purpose"]
```
As três numa única mensagem. Não três mensagens separadas.

Cada subagente recebe este prompt exato (substituindo FILE_LIST, CHUNK_NUM, TOTAL_CHUNKS, DEEP_MODE,
e CHUNK_PATH).

CHUNK_PATH precisa ser um caminho **absoluto** — derive antes de despachar:
```bash
PROJECT_ROOT=$(pwd)  # cwd — onde a Parte C faz o glob de graphify-out/ (NÃO .graphify_root/pasta escaneada, #1392)
# Depois para o lote N: CHUNK_PATH="${PROJECT_ROOT}/graphify-out/.graphify_chunk_0N.json"
```

Template do prompt de subagente:

Veja `references/extraction-spec.md` para o prompt exato de subagente (schema JSON, regras de
node-ID, régua de confiança, frontmatter, hyperedge, e regras de visão). Carregue isso só aqui, só
quando pelo menos um lote tiver documento, artigo ou imagem; um corpus puro de código já pulou a
Parte B e nunca lê isso. Passe para cada subagente aquele prompt ao pé da letra com FILE_LIST,
CHUNK_NUM, TOTAL_CHUNKS, DEEP_MODE, e CHUNK_PATH substituídos, e faça ele escrever o resultado em
CHUNK_PATH.

**Passo B3 - Coletar, colocar em cache, e fundir**

Espere todos os subagentes. Para cada resultado:
- Confira se `graphify-out/.graphify_chunk_NN.json` existe no disco — esse é o sinal de sucesso
- Se o arquivo existir e contiver JSON válido com `nodes` e `edges`, inclua e salve no cache
- Se o arquivo estiver faltando, o subagente provavelmente foi despachado como read-only (tipo
  Explore) — imprima um aviso: "chunk N faltando no disco — subagente pode ter sido read-only.
  Rode de novo com o agente general-purpose." Não pule em silêncio.
- Se um subagente falhar ou retornar JSON inválido, imprima um aviso e pule aquele lote - não aborte

Se mais da metade dos lotes falhou ou está faltando, pare e diga ao usuário para rodar de novo e
garantir que `subagent_type="general-purpose"` está sendo usado.

Funda todos os arquivos de lote em `.graphify_semantic_new.json`. **Depois de cada chamada Agent
terminar, leia a contagem real de token do campo `usage` do resultado da ferramenta Agent e escreva
de volta no JSON do lote antes de fundir** — o JSON do lote em si sempre tem zeros de placeholder.
Depois rode:
```bash
$(cat graphify-out/.graphify_python) -c "
import json, glob
from pathlib import Path

chunks = sorted(glob.glob('graphify-out/.graphify_chunk_*.json'))
all_nodes, all_edges, all_hyperedges = [], [], []
total_in, total_out = 0, 0
for c in chunks:
    d = json.loads(Path(c).read_text(encoding=\"utf-8\"))
    all_nodes += d.get('nodes', [])
    all_edges += d.get('edges', [])
    all_hyperedges += d.get('hyperedges', [])
    total_in += d.get('input_tokens', 0)
    total_out += d.get('output_tokens', 0)
Path('graphify-out/.graphify_semantic_new.json').write_text(json.dumps({
    'nodes': all_nodes, 'edges': all_edges, 'hyperedges': all_hyperedges,
    'input_tokens': total_in, 'output_tokens': total_out,
}, indent=2, ensure_ascii=False), encoding=\"utf-8\")
print(f'Merged {len(chunks)} chunks: {total_in:,} in / {total_out:,} out tokens')
"
```

Salve os resultados novos no cache:
```bash
$(cat graphify-out/.graphify_python) -c "
import json
from graphify.cache import save_semantic_cache
from pathlib import Path

new = json.loads(Path('graphify-out/.graphify_semantic_new.json').read_text(encoding=\"utf-8\")) if Path('graphify-out/.graphify_semantic_new.json').exists() else {'nodes':[],'edges':[],'hyperedges':[]}
saved = save_semantic_cache(new.get('nodes', []), new.get('edges', []), new.get('hyperedges', []), root='INPUT_PATH')
print(f'Cached {saved} files')
"
```

Funda os resultados em cache + novos em `graphify-out/.graphify_semantic.json`:
```bash
$(cat graphify-out/.graphify_python) -c "
import json
from pathlib import Path

cached = json.loads(Path('graphify-out/.graphify_cached.json').read_text(encoding=\"utf-8\")) if Path('graphify-out/.graphify_cached.json').exists() else {'nodes':[],'edges':[],'hyperedges':[]}
new = json.loads(Path('graphify-out/.graphify_semantic_new.json').read_text(encoding=\"utf-8\")) if Path('graphify-out/.graphify_semantic_new.json').exists() else {'nodes':[],'edges':[],'hyperedges':[]}

all_nodes = cached['nodes'] + new.get('nodes', [])
all_edges = cached['edges'] + new.get('edges', [])
all_hyperedges = cached.get('hyperedges', []) + new.get('hyperedges', [])
seen = set()
deduped = []
for n in all_nodes:
    if n['id'] not in seen:
        seen.add(n['id'])
        deduped.append(n)

merged = {
    'nodes': deduped,
    'edges': all_edges,
    'hyperedges': all_hyperedges,
    'input_tokens': new.get('input_tokens', 0),
    'output_tokens': new.get('output_tokens', 0),
}
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding=\"utf-8\")
print(f'Extraction complete - {len(deduped)} nodes, {len(all_edges)} edges ({len(cached[\"nodes\"])} from cache, {len(new.get(\"nodes\",[]))} new)')
"
```
Limpe os arquivos temporários: `rm -f graphify-out/.graphify_cached.json graphify-out/.graphify_uncached.txt graphify-out/.graphify_semantic_new.json`

#### Parte C - Fundir AST + semântica na extração final

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from pathlib import Path

ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding=\"utf-8\"))
sem = json.loads(Path('graphify-out/.graphify_semantic.json').read_text(encoding=\"utf-8\"))

# Funde: nós AST primeiro, nós semânticos deduplicados por id
seen = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in sem['nodes']:
    if n['id'] not in seen:
        merged_nodes.append(n)
        seen.add(n['id'])

merged_edges = ast['edges'] + sem['edges']
merged_hyperedges = sem.get('hyperedges', [])
merged = {
    'nodes': merged_nodes,
    'edges': merged_edges,
    'hyperedges': merged_hyperedges,
    'input_tokens': sem.get('input_tokens', 0),
    'output_tokens': sem.get('output_tokens', 0),
}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding=\"utf-8\")
total = len(merged_nodes)
edges = len(merged_edges)
print(f'Merged: {total} nodes, {edges} edges ({len(ast[\"nodes\"])} AST + {len(sem[\"nodes\"])} semantic)')
"
```

### Passo 4 - Construir o grafo, agrupar, analisar, gerar saídas

**Antes de começar:** os blocos de código abaixo passam `directed=IS_DIRECTED` para
`build_from_json()`. Troque `IS_DIRECTED` por `True` se `--directed` foi passado (constrói um
`DiGraph` preservando a direção source→target da aresta), senão `False` (o padrão, um `Graph` não
direcionado). Substitua da mesma forma que substitui `INPUT_PATH` — não deixe o literal
`IS_DIRECTED` no código.

```bash
mkdir -p graphify-out
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))

# root= espelha o runbook do --update (#1361): relativiza source_file para a mesma
# base para o build completo e o --update incremental nunca se desalinharem na re-extração.
G = build_from_json(extraction, root='INPUT_PATH', directed=IS_DIRECTED)
# Guarda ANTES de qualquer escrita: uma extração vazia não pode sobrescrever um bom graph.json /
# GRAPH_REPORT.md / sidecar de análise. Confira logo depois do build (#1392).
if G.number_of_nodes() == 0:
    print('ERROR: Graph is empty - extraction produced no nodes.')
    print('Possible causes: all files were skipped, binary-only corpus, or extraction failed.')
    raise SystemExit(1)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: 'Community ' + str(cid) for cid in communities}
# Perguntas de placeholder - regeneradas com labels reais no Passo 5
questions = suggest_questions(G, communities, labels)

# Exporta PRIMEIRO e respeita a guarda de encolhimento do #479: to_json retorna False
# (não escreve nada) quando o grafo novo é menor que o graph.json existente. Só escreve
# GRAPH_REPORT.md + o sidecar de análise quando o grafo de fato foi escrito, para nunca
# descreverem um grafo que o graph.json não contém (#1392).
wrote = to_json(G, communities, 'graphify-out/graph.json')
if not wrote:
    print('ERROR: refused to shrink graphify-out/graph.json (existing graph has more nodes; #479).')
    print('If this shrink is intentional (you deleted files), re-run a full build with --force.')
    raise SystemExit(1)
report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, 'INPUT_PATH', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding=\"utf-8\")
analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods,
    'surprises': surprises,
    'questions': questions,
}
Path('graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding=\"utf-8\")
print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities')
"
```

Se este passo imprimir `ERROR: Graph is empty`, pare e diga ao usuário o que aconteceu - não avance
para o labeling ou a visualização.

Troque INPUT_PATH pelo caminho de verdade.

### Passo 4.5 - Checagem de saúde do grafo (verificação de integridade, só leitura)

Um diagnóstico não-destrutivo na extração, antes do labeling. Revela colapso de aresta,
extremidade faltando/pendurada, e self-loops — os modos de corrupção silenciosa das atualizações
incrementais e desalinhamento de id entre AST/LLM. Só leitura; nunca aborta.

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from pathlib import Path
from graphify.diagnostics import diagnose_extraction, format_diagnostic_report

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
summary = diagnose_extraction(extraction, directed=IS_DIRECTED, root='INPUT_PATH')
print(format_diagnostic_report(summary))
flags = [f'{summary[k]} {label}' for k, label in (
    ('dangling_endpoint_edges', 'dangling-endpoint edges'),
    ('missing_endpoint_edges', 'missing-endpoint edges'),
    ('self_loop_edges', 'self-loop edges'),
    ('directed_same_endpoint_collapsed_edges', 'collapsed (directed) edges'),
    ('undirected_same_endpoint_collapsed_edges', 'collapsed (undirected) edges'),
) if summary.get(k, 0)]
print('GRAPH HEALTH WARNING: ' + '; '.join(flags) + ' - graph may be incomplete/corrupt.' if flags else 'Graph health: OK (no dangling/missing/collapsed edges).')
"
```

Substitua `IS_DIRECTED` e `INPUT_PATH` como no Passo 4. Se um `GRAPH HEALTH WARNING` for impresso,
mostre isso no resumo final (não aborte — o grafo ainda é usável, mas o problema de integridade
precisa ficar visível, seguindo as Regras de Honestidade).

### Passo 5 - Nomear as comunidades

Leia `graphify-out/.graphify_analysis.json`. Para cada chave de comunidade, olhe os labels dos
nós dela e escreva um nome de 2-5 palavras em linguagem simples (ex.: "Mecanismo de Atenção",
"Pipeline de Treino", "Carregamento de Dado").

Depois regenere o relatório e salve os labels para o visualizador:

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
analysis   = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding=\"utf-8\"))

# root= como no Passo 4 / runbook do --update (#1361) — mesma base para paridade de node-key.
G = build_from_json(extraction, root='INPUT_PATH', directed=IS_DIRECTED)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

# LABELS - troque isso pelos nomes que você escolheu acima
labels = LABELS_DICT

# Regenera as perguntas com os labels reais de comunidade (labels afetam o fraseado da pergunta)
questions = suggest_questions(G, communities, labels)

report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, 'INPUT_PATH', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding=\"utf-8\")
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding=\"utf-8\")
print('Report updated with community labels')
"
```

Troque `LABELS_DICT` pelo dict de verdade que você construiu (ex.:
`{0: "Mecanismo de Atenção", 1: "Pipeline de Treino"}`).
Troque INPUT_PATH pelo caminho de verdade.

### Passo 6 - Gerar vault do Obsidian (opcional) + HTML

**Gere o HTML sempre** (a menos que `--no-viz`). **Vault do Obsidian só se `--obsidian` foi passado
explicitamente** — pule caso contrário, ele gera um arquivo por nó.

Se `--obsidian` foi passado:

- Se `--obsidian-dir <path>` também foi passado, passe via `--dir`. Senão, o padrão é
  `graphify-out/obsidian`.

```bash
graphify export obsidian
# ou com pasta customizada: graphify export obsidian --dir ~/vaults/my-project
```

Gere o grafo HTML (sempre, a menos que `--no-viz`):

```bash
graphify export html  # agrega automaticamente para visão de comunidade se o grafo > 5000 nós
# ou: graphify export html --no-viz
```

### Passos 6b-8 - Wiki, Neo4j, FalkorDB, SVG, GraphML, MCP, benchmark (só nas respectivas flags)

Esses só rodam quando a flag deles está presente (`--wiki`, `--neo4j`/`--neo4j-push`,
`--falkordb`/`--falkordb-push`, `--svg`, `--graphml`, `--mcp`) ou, para o benchmark de redução de
token, quando `total_words` passa de 5.000. Uma rodada padrão sem flag de export pula todos eles.
Veja `references/exports.md` para cada um. Rode qualquer export `--wiki` antes da limpeza do Passo 9
para o `.graphify_labels.json` ainda estar disponível.

---

### Passo 9 - Salvar manifesto, atualizar o rastreador de custo, limpar, e reportar

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from pathlib import Path
from datetime import datetime, timezone
from graphify.detect import save_manifest

# Salva o manifesto para o --update
detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
# No modo --update, 'all_files' carrega o corpus completo; 'files' é o subconjunto alterado.
# O modo de rebuild completo só popula 'files', então o fallback cobre isso.
# root= relativiza as chaves do manifesto para a raiz de varredura (mesma base do build),
# então o manifesto em disco é portável entre clones/máquinas e um --update posterior
# combina com arquivo em cache em vez de perder cada um (#1417).
save_manifest(detect.get('all_files') or detect['files'], root='INPUT_PATH')

# Atualiza o rastreador de custo acumulado
extract = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
input_tok = extract.get('input_tokens', 0)
output_tok = extract.get('output_tokens', 0)

cost_path = Path('graphify-out/cost.json')
if cost_path.exists():
    cost = json.loads(cost_path.read_text(encoding=\"utf-8\"))
else:
    cost = {'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}

cost['runs'].append({
    'date': datetime.now(timezone.utc).isoformat(),
    'input_tokens': input_tok,
    'output_tokens': output_tok,
    'files': detect.get('total_files', 0),
})
cost['total_input_tokens'] += input_tok
cost['total_output_tokens'] += output_tok
cost_path.write_text(json.dumps(cost, indent=2, ensure_ascii=False), encoding=\"utf-8\")

print(f'This run: {input_tok:,} input tokens, {output_tok:,} output tokens')
print(f'All time: {cost[\"total_input_tokens\"]:,} input, {cost[\"total_output_tokens\"]:,} output ({len(cost[\"runs\"])} runs)')
"
rm -f graphify-out/.graphify_detect.json graphify-out/.graphify_extract.json graphify-out/.graphify_ast.json graphify-out/.graphify_semantic.json graphify-out/.graphify_analysis.json
find graphify-out -maxdepth 1 -name '.graphify_chunk_*.json' -delete 2>/dev/null
rm -f graphify-out/.needs_update 2>/dev/null || true
```

Troque INPUT_PATH pelo caminho de verdade (mesmo valor usado nos Passos 4-5) para o manifesto ficar
relativizado à raiz de varredura.

Diga ao usuário (omita a linha do obsidian a menos que --obsidian tenha sido passado):
```
Graph complete. Outputs in PATH_TO_DIR/graphify-out/

  graph.html            - interactive graph, open in browser
  GRAPH_REPORT.md       - audit report
  graph.json            - raw graph data
  obsidian/             - Obsidian vault (only if --obsidian was given)
```

Se o graphify economizou seu tempo, considere apoiar: https://github.com/sponsors/safishamsi

Troque PATH_TO_DIR pelo caminho absoluto de verdade do diretório que foi processado.

Depois cole estas seções do GRAPH_REPORT.md direto no chat:
- God Nodes
- Surprising Connections
- Suggested Questions

NÃO cole o relatório inteiro - só essas três seções. Mantenha conciso.

Depois ofereça imediatamente explorar. Escolha a pergunta sugerida mais interessante do relatório -
a que cruza mais fronteiras de comunidade ou tem o nó-ponte mais surpreendente - e pergunte:

> "A pergunta mais interessante que este grafo pode responder: **[pergunta]**. Quer que eu trace?"

Se o usuário disser sim, rode `/graphify query "[pergunta]"` no grafo e guie pela resposta usando a
estrutura do grafo - quais nós conectam, quais fronteiras de comunidade são cruzadas, o que o
caminho revela. Continue enquanto o usuário quiser explorar. Cada resposta deve terminar com um
gancho natural ("isso conecta com X - quer ir mais fundo?") para a sessão parecer navegação, não um
relatório de tiro único.

O grafo é o mapa. Seu trabalho depois do pipeline é ser o guia.

---

## Guarda de interpretador para subcomandos

Antes de rodar qualquer subcomando abaixo (`--update`, `--cluster-only`, `query`, `path`,
`explain`, `add`), confira se `.graphify_python` existe. Se estiver faltando (ex.: usuário apagou
`graphify-out/`), resolva o interpretador de novo primeiro:

```bash
if [ ! -f graphify-out/.graphify_python ]; then
    GRAPHIFY_BIN=$(which graphify 2>/dev/null)
    if [ -n "$GRAPHIFY_BIN" ]; then
        PYTHON=$(head -1 "$GRAPHIFY_BIN" | tr -d '#!')
        case "$PYTHON" in *[!a-zA-Z0-9/_.-]*) PYTHON="python3" ;; esac
    else
        PYTHON="python3"
    fi
    mkdir -p graphify-out
    "$PYTHON" -c "import sys; open('graphify-out/.graphify_python', 'w', encoding='utf-8').write(sys.executable)"
fi
```

## Para --update e --cluster-only

Ambos são subcomandos não-padrão. `--update` re-extrai só arquivo novo ou alterado;
`--cluster-only` reroda o clustering no grafo existente. Veja `references/update.md` para os dois
fluxos.

---

## Para /graphify query

Quando `graphify-out/graph.json` já existe e o usuário faz uma pergunta sobre o corpus, responda a
partir do grafo em vez de reconstruir:

```bash
graphify query "<pergunta>"
```

Antes da travessia, expanda a pergunta contra o vocabulário próprio do grafo para uma diferença de
fraseado não colapsar a resposta em ruído. Responda usando só o que a saída do grafo contém, e cite
`source_location` ao citar um fato específico. Para esse passo de expansão de vocabulário, os modos
de travessia BFS/DFS, o limite `--budget`, o fallback em NetworkX, o feedback de `save-result`, e os
fluxos de `/graphify path` e `/graphify explain`, veja `references/query.md`.

---

## Para /graphify add e --watch

Nenhum dos dois faz parte do build padrão. Quando o usuário roda `/graphify add <url>` para buscar
uma URL para o corpus, ou passa `--watch` para reconstruir sozinho quando arquivo muda, veja
`references/add-watch.md`.

---

## Para o hook de commit e integração nativa com o CLAUDE.md

Quando o usuário pedir para instalar o hook de reconstrução automática pós-commit, ou conectar o
graphify no CLAUDE.md de um projeto, veja `references/hooks.md`.

---

## Regras de Honestidade

- Nunca invente uma aresta. Na dúvida, use AMBIGUOUS.
- Nunca pule o aviso de checagem do corpus.
- Sempre mostre o custo em token no relatório.
- Nunca esconda o índice de coesão atrás de símbolo - mostre o número bruto.
- Nunca rode a visualização HTML num grafo com mais de 5.000 nós sem avisar o usuário.
