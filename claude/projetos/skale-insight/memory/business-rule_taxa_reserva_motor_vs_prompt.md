---
name: taxa-reserva-motor-vs-prompt
description: Quando o assistente de IA ignora uma regra do prompt do cliente por três tentativas seguidas, procure o bloco do MOTOR que manda o contrário — foi o caso da taxa de reserva da Dra. Simony.
metadata:
  type: business-rule
---

**Regra de negócio:** clínica que cobra taxa obrigatória pra reservar horário (Dra. Simony: R$ 100)
tem que dizer o valor **na mesma mensagem em que oferece os horários**, antes de a pessoa escolher.
Dita depois, a mesma informação vira desconfiança — já aconteceu com lead real ("vocês não falaram
nada de taxa antes", "tudo isso? 100 reais???").

**Por que foi difícil de achar:** três correções seguidas no texto do prompt da clínica falharam, e
a causa não estava no prompt. O bloco `CONDUCAO_CONSULTIVA` do `chatbot-engine/index.ts` injeta
"QUEM PUXA O ASSUNTO DE DINHEIRO É O CLIENTE, NUNCA VOCÊ" — sem exceção pra taxa obrigatória. O
motor mandava calar exatamente o que o prompt mandava falar, e **ordem do motor ganha de pedido do
prompt**. Evidência: conversa da lead Milena em 25/08/2026 (sessão `3a72b359`), seis mensagens
oferecendo horário e o agendamento confirmado, com a palavra "taxa" nunca aparecendo.

**Como aplicar:** quando uma regra do prompt do cliente for ignorada de forma teimosa, procure
primeiro um bloco do motor que diga o contrário — o motor cuida do MÉTODO, e método vira ordem.
Corrigido o texto, a garantia determinística fica em `supabase/functions/chatbot-engine/
taxa-reserva.ts` (mesmo padrão do `semRepetir`): o valor sai de `ai_assistants.config.taxa_reserva`
(jsonb que já existe, sem migração), e oferta de horário sem o valor é descartada e regerada uma
vez. Telemetria: log `taxa_reserva` com desfecho `resolveu` / `insistiu` / `ja_veio`.

**Armadilha achada aqui:** detectar "a taxa foi dita" pela PALAVRA "taxa" não funciona — a
assistente escreve "10x com a taxa da máquina" ao falar de pagamento, e isso desligaria o guarda
pelo resto da conversa. O teste tem que ser pelo VALOR ("R$ 100" / "100 reais"), sem casar com
"R$ 1.100" nem com "volta 100% no dia".
