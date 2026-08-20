# skale-harness — Índice do projeto

> Repositório que versiona a configuração global do Claude Code e distribui o motor de automação de desenvolvimento para todos os projetos.
>
> **Este é o mapa.** O conteúdo está em 3 documentos, colados em momentos diferentes.

---

## Os 3 documentos

| # | Documento | Cobre |
|---|---|---|
| **1** | `contexto-motor-global-harness-clickup-obsidian` | Estrutura do repo · MANIFEST · CLAUDE.md global · harness invisível · model+effort · bootstrap |
| **2** | `skale-harness-automacao-clickup` | Fluxo ClickUp · as 3 skills · regras de operação · README |
| **3** | `prompt-backup-diy-skale-harness` | Template de backup Supabase → Cloudflare R2 |

**Por que separados:** juntos dão ~1.700 linhas. Colar tudo de uma vez consome contexto que o Claude Code vai precisar pra trabalhar.

---

## Ordem de uso

### Sessão 1 — Fundação
```
Cole: documento 1 (inteiro)
Faz:  Etapas 1 a 6
      → repositório, MANIFEST, CLAUDE.md global,
        harness invisível, model+effort, bootstrap
```

⚠️ **Não rode `install.sh` sem revisar.** É o único comando que sobrescreve sua configuração real.

### Sessão 2 — Automação ClickUp
```
Cole: documento 2
Faz:  as 3 skills (/clickup, /clickup-executar, /clickup-fila)
      + o README do repositório
```

### Sessão 3 — Backup
```
Cole: documento 3
Faz:  template em templates/backup-supabase/
      + integração com o bootstrap (oferece, não aplica)
```

### Sessão 4 — Instalar e testar
```
./install.sh
→ ele reporta o que falta (MCPs, CLIs, credenciais)
→ testes no skale-insight (documento 2, Parte 6)
```

---

## O que o projeto entrega

```
skale-harness/
├── claude/                 espelho de ~/.claude/
│   ├── settings.json       effortLevel: xhigh
│   ├── CLAUDE.md           regras globais
│   ├── MANIFEST.md         catálogo de tudo
│   ├── agents/             9 agentes com model + effort
│   ├── skills/             inclui impeccable e as do ClickUp
│   └── hooks/
├── templates/
│   └── backup-supabase/
├── install.sh              sincroniza + instala + reporta
├── backup.sh               captura o estado atual
├── SETUP.md
└── README.md
```

**Em máquina nova:**
```bash
git clone [skale-harness] && cd skale-harness && ./install.sh
```

---

## As decisões que atravessam tudo

**O harness é invisível.** Você escreve o mesmo prompt de sempre; ele decide qual ferramenta usar. Se precisar lembrar que o harness existe, ele falhou.

**Tomada, não interruptor geral.** As ferramentas estão todas disponíveis, mas só entram quando a situação pede. Carregar tudo sempre enche o contexto.

**Model ≠ Effort ≠ Ultracode.** Model é quanto sabe; effort é quanto se esforça; ultracode é quantos rodam. Sessão em `xhigh` por padrão *(persiste; `max` não pode ser fixado)*, `max` só na frontmatter do `architect` e em problema difícil pontual, ultracode sempre manual.

**O Claude Code para em Homologação.** Nunca move para Deploy ou Concluído — quem valida é humano.

**Bootstrap oferece, nunca aplica.** Projeto sem `CLAUDE.md`, sem graphify ou sem backup recebe oferta explicando o papel de cada coisa. Landing page sem banco não é perguntada.

---

## 🔴 Fora deste projeto, mas urgente

`prompt-investigar-edge-functions` → roda no **skale-insight**, não aqui.

São 551 mil invocações de Edge Function para 20 usuários — é o que derruba a produção. Resolva antes de começar o harness.
