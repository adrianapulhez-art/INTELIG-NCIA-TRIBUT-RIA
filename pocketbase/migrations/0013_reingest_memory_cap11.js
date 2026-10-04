// pocketbase/migrations/0013_reingest_memory_cap11.js
// Ingestão RAG do Capítulo 11 do Manual (régua de repasse — explicação didática chancelada
// pela CEO em 03/10, fonte: artifacts/manual-it/repasse-explicacao-didatica.md). Marcador [v2]
// no padrão das migrations 0009/0010 (payload_key nova → força novo ciclo de ingestão).
migrate(
  (app) => {
    $ai.agents.putMemories(app, 'it-assistant', [
      {
        type: 'text',
        payload: {
          text: `[v2]
# Capítulo 11 — A régua de repasse: quem absorve a transição

> A régua não é sobre o comprador — é sobre o que o fornecedor vai fazer com o preço dele a partir de 2027. A lei não manda ninguém reprecificar: isso é decisão de mercado. O sistema dá um dial com 3 posições para você testar os três mundos — e ver quem absorve a transição em cada um.

## A pergunta que a régua responde

Como ninguém sabe o que cada fornecedor vai fazer, o dial muda uma única coisa: **um fator "f" que multiplica mercadoria e frete** para chegar no preço novo da nota. Tudo o mais decorre dele.

**A identidade que explica tudo**: quando o comprador credita integral, o custo dele sai **igual à receita líquida do fornecedor**. No caso canônico 2027, a nota sai em 44.488,27; o comprador credita tudo que está destacado (ICMS 8.007,89 + CBS 2.947,91 + IBS 33,50) e fica com custo de 33.498,97 — exatamente a "base limpa de referência" da memória. O crédito devolve ao comprador tudo que o fornecedor embutiu: ele acaba pagando o que o fornecedor **fica**. A régua é, no fundo, o dial de quanto o fornecedor vai ficar de receita líquida — e o custo do comprador acompanha.

## Repasse INTEGRAL — "reprecifico tudo, nem ganho nem perco"

O fornecedor reprecifica para **preservar a receita líquida de hoje** (33.498,97). Hoje ele fica com \`preço × (1−18%) × (1−3,65%)\` — o 3,65% é o PIS/COFINS cumulativo dele embutido. Em 2027 o PIS/COFINS morre e a CBS entra por fora; para ficar com o mesmo valor, ele tira o 3,65% do preço:

**f = (1−0,18)×(1−0,0365) ÷ (1−0,18) = 0,9635** → mercadoria cai de 42.000,00 para 40.467,00.

Resultado: nota 44.488,27, custo do comprador **1.116,63/un (−3,65% vs hoje)** — e fica **FLAT até 2032**, porque a cada redução do ICMS ele reprecifica de novo e preserva os mesmos 33.498,97. Quem absorve a transição: **ninguém da cadeia — o fisco** (abre mão da carga aos poucos). É a régua do "sistema funcionando como desenhado".

## SEM REPASSE — "não mexo no meu preço" (a escada)

Aqui f = 1: o preço bruto **congela em 42.400,00**. O que acontece:

- **2027–2028**: o fornecedor para de recolher PIS/COFINS (economia de **1.269,03**) e **não repassa nada** — ganho dele, 100%. O comprador paga custo de 1.158,93/un, igual a hoje.
- **2029 em diante**: o ICMS cai 1/10 por ano (18% → 16,2% → ...). O fornecedor passa a embutir menos ICMS na mesma nota congelada — ou seja, **fica com mais**. O comprador absorve cada fatia: **+25,44/un por ano** — 1.184,37 (2029) → 1.209,81 (2030) → 1.235,25 (2031) → **1.260,69 (2032), +8,78%**.

É a escada do módulo: ela **só existe nessa régua**, e cada degrau é o dinheiro que o fornecedor deixou de recolher e não devolveu no preço. Linha da memória: "(+) Sem repasse: ganho do fornecedor fica no preço".

## REPASSE 50% — o meio termo (e por que é exatamente metade)

O fator vira interpolação linear entre os dois extremos:

**f = 1 + 50% × (0,9635 − 1) = 0,98175** → mercadoria 41.233,50 em vez de 42.000,00 ou 40.467,00.

O ganho de 1.269,03 do fornecedor é dividido **exatamente ao meio**: ele fica com **634,51** (receita líquida sobe de 33.498,97 para 34.133,48) e entrega **634,52** no preço (custo do comprador cai de 1.158,93 para **1.137,78/un**, −1,82%). O número da régua (50%) é o % do reajuste que ele faz — 0% = nenhum, 100% = integral.

## As duas "bases" da memória de cálculo

A coluna do exercício mostra duas coisas diferentes com cara de "base":

**1ª — as linhas de PIS/COFINS (0,65% × 34.768,00 e 3% × 34.768,00)**: aparecem **IGUAIS nos 3 modos** — integral, 50% e nenhum. Rótulo: *"embutido no preço de hoje — extinto no exercício (referência da base)"*. Não são dedução do cálculo de 2027 — são a **âncora de hoje**: quanto de PIS/COFINS está embutido no preço pré-reforma. Ponto de partida fixo, o "zero" da régua.

**2ª — a linha de ganho (+)**: muda por modo, e a fórmula dela é sempre:

> **ganho = base limpa do exercício − 33.498,97 (referência de hoje)**

- **Integral**: base do exercício = 33.498,97 → ganho = **0** (a linha nem aparece — o alvo É a referência de hoje, por definição)
- **50%**: base do exercício = 34.133,48 → ganho = **634,51** (metade exata de 1.269,03)
- **Nenhum**: base do exercício = 34.768,00 → ganho = **1.269,03** (tudo)

**Identidade que fecha em qualquer modo** (conferida ao centavo nos 3 modos):

**42.000 + 400 − ICMS 7.632 − PIS/COFINS 1.269,03 + ganho = base limpa do exercício**

| Modo | Ganho (linha +) | Base limpa 2027 |
|---|---|---|
| Integral | 0 (não exibida) | 33.498,97 |
| Parcial 50% | 634,51 | 34.133,48 |
| Nenhum | 1.269,03 | 34.768,00 |

Ou seja: a coluna começa sempre na estrutura de **hoje** (elementos reais, ICMS cheio, PIS/COFINS embutidos → 33.498,97) e a linha de ganho é a **ponte** até a base do exercício. No modo nenhum ela coincide com o PIS/COFINS extinto (1.269,03) porque em 2027 o ICMS ainda está integral — coincidência que só vale neste exercício; em 2029+ o ganho passa a incluir também a fração do ICMS.

## Em 2026 a régua não mexe em nada

f = 1 sempre: o ano-teste não tem mudança de carga do fornecedor para repassar — CBS 0,9% entra e sai no crédito cruzado.

## Por que o sistema tem isso

A régua é **cenário econômico, não regra legal** — o sistema não afirma que o fornecedor VAI reprecificar; ele deixa testar os 3 mundos e ver **quem absorve a transição em cada um** (fisco / comprador / dividido). O mesmo imposto, três desfechos de custo, dependendo de uma decisão de preço que ninguém controla — só negocia.

## Dica de ouro

> Em 2026 a régua não mexe em nada (f = 1 sempre) — o ano-teste não tem mudança de carga para repassar. Use a régua a partir de 2027: teste os 3 modos e leia a linha de ganho — ela diz, em reais, quanto do dinheiro extinto ficou com o fornecedor e quanto chegou ao seu cliente.

## Erro comum e como evitar

**Erro**: ler as linhas de PIS/COFINS da memória como se fossem dedução do cálculo de 2027 — e estranhar que elas "não mudam" entre as réguas.
**Como evitar**: elas são a âncora de hoje (o "zero" da régua), iguais nos 3 modos por construção. A variável é a linha de ganho (+): 0 no integral, metade no 50%, tudo no nenhum. Se o número não fecha, confira a identidade: 42.000 + 400 − 7.632 − 1.269,03 + ganho = base limpa do exercício.`,
        },
      },
    ])
  },
  (app) => {
    // Down: remove a fonte [v2] (conteúdo exato exigido pela chave SHA-256)
    try {
      $ai.agents.deleteMemories(app, 'it-assistant', [
        {
          type: 'text',
          payload: {
            text: `[v2]
# Capítulo 11 — A régua de repasse: quem absorve a transição

> A régua não é sobre o comprador — é sobre o que o fornecedor vai fazer com o preço dele a partir de 2027. A lei não manda ninguém reprecificar: isso é decisão de mercado. O sistema dá um dial com 3 posições para você testar os três mundos — e ver quem absorve a transição em cada um.

## A pergunta que a régua responde

Como ninguém sabe o que cada fornecedor vai fazer, o dial muda uma única coisa: **um fator "f" que multiplica mercadoria e frete** para chegar no preço novo da nota. Tudo o mais decorre dele.

**A identidade que explica tudo**: quando o comprador credita integral, o custo dele sai **igual à receita líquida do fornecedor**. No caso canônico 2027, a nota sai em 44.488,27; o comprador credita tudo que está destacado (ICMS 8.007,89 + CBS 2.947,91 + IBS 33,50) e fica com custo de 33.498,97 — exatamente a "base limpa de referência" da memória. O crédito devolve ao comprador tudo que o fornecedor embutiu: ele acaba pagando o que o fornecedor **fica**. A régua é, no fundo, o dial de quanto o fornecedor vai ficar de receita líquida — e o custo do comprador acompanha.

## Repasse INTEGRAL — "reprecifico tudo, nem ganho nem perco"

O fornecedor reprecifica para **preservar a receita líquida de hoje** (33.498,97). Hoje ele fica com \`preço × (1−18%) × (1−3,65%)\` — o 3,65% é o PIS/COFINS cumulativo dele embutido. Em 2027 o PIS/COFINS morre e a CBS entra por fora; para ficar com o mesmo valor, ele tira o 3,65% do preço:

**f = (1−0,18)×(1−0,0365) ÷ (1−0,18) = 0,9635** → mercadoria cai de 42.000,00 para 40.467,00.

Resultado: nota 44.488,27, custo do comprador **1.116,63/un (−3,65% vs hoje)** — e fica **FLAT até 2032**, porque a cada redução do ICMS ele reprecifica de novo e preserva os mesmos 33.498,97. Quem absorve a transição: **ninguém da cadeia — o fisco** (abre mão da carga aos poucos). É a régua do "sistema funcionando como desenhado".

## SEM REPASSE — "não mexo no meu preço" (a escada)

Aqui f = 1: o preço bruto **congela em 42.400,00**. O que acontece:

- **2027–2028**: o fornecedor para de recolher PIS/COFINS (economia de **1.269,03**) e **não repassa nada** — ganho dele, 100%. O comprador paga custo de 1.158,93/un, igual a hoje.
- **2029 em diante**: o ICMS cai 1/10 por ano (18% → 16,2% → ...). O fornecedor passa a embutir menos ICMS na mesma nota congelada — ou seja, **fica com mais**. O comprador absorve cada fatia: **+25,44/un por ano** — 1.184,37 (2029) → 1.209,81 (2030) → 1.235,25 (2031) → **1.260,69 (2032), +8,78%**.

É a escada do módulo: ela **só existe nessa régua**, e cada degrau é o dinheiro que o fornecedor deixou de recolher e não devolveu no preço. Linha da memória: "(+) Sem repasse: ganho do fornecedor fica no preço".

## REPASSE 50% — o meio termo (e por que é exatamente metade)

O fator vira interpolação linear entre os dois extremos:

**f = 1 + 50% × (0,9635 − 1) = 0,98175** → mercadoria 41.233,50 em vez de 42.000,00 ou 40.467,00.

O ganho de 1.269,03 do fornecedor é dividido **exatamente ao meio**: ele fica com **634,51** (receita líquida sobe de 33.498,97 para 34.133,48) e entrega **634,52** no preço (custo do comprador cai de 1.158,93 para **1.137,78/un**, −1,82%). O número da régua (50%) é o % do reajuste que ele faz — 0% = nenhum, 100% = integral.

## As duas "bases" da memória de cálculo

A coluna do exercício mostra duas coisas diferentes com cara de "base":

**1ª — as linhas de PIS/COFINS (0,65% × 34.768,00 e 3% × 34.768,00)**: aparecem **IGUAIS nos 3 modos** — integral, 50% e nenhum. Rótulo: *"embutido no preço de hoje — extinto no exercício (referência da base)"*. Não são dedução do cálculo de 2027 — são a **âncora de hoje**: quanto de PIS/COFINS está embutido no preço pré-reforma. Ponto de partida fixo, o "zero" da régua.

**2ª — a linha de ganho (+)**: muda por modo, e a fórmula dela é sempre:

> **ganho = base limpa do exercício − 33.498,97 (referência de hoje)**

- **Integral**: base do exercício = 33.498,97 → ganho = **0** (a linha nem aparece — o alvo É a referência de hoje, por definição)
- **50%**: base do exercício = 34.133,48 → ganho = **634,51** (metade exata de 1.269,03)
- **Nenhum**: base do exercício = 34.768,00 → ganho = **1.269,03** (tudo)

**Identidade que fecha em qualquer modo** (conferida ao centavo nos 3 modos):

**42.000 + 400 − ICMS 7.632 − PIS/COFINS 1.269,03 + ganho = base limpa do exercício**

| Modo | Ganho (linha +) | Base limpa 2027 |
|---|---|---|
| Integral | 0 (não exibida) | 33.498,97 |
| Parcial 50% | 634,51 | 34.133,48 |
| Nenhum | 1.269,03 | 34.768,00 |

Ou seja: a coluna começa sempre na estrutura de **hoje** (elementos reais, ICMS cheio, PIS/COFINS embutidos → 33.498,97) e a linha de ganho é a **ponte** até a base do exercício. No modo nenhum ela coincide com o PIS/COFINS extinto (1.269,03) porque em 2027 o ICMS ainda está integral — coincidência que só vale neste exercício; em 2029+ o ganho passa a incluir também a fração do ICMS.

## Em 2026 a régua não mexe em nada

f = 1 sempre: o ano-teste não tem mudança de carga do fornecedor para repassar — CBS 0,9% entra e sai no crédito cruzado.

## Por que o sistema tem isso

A régua é **cenário econômico, não regra legal** — o sistema não afirma que o fornecedor VAI reprecificar; ele deixa testar os 3 mundos e ver **quem absorve a transição em cada um** (fisco / comprador / dividido). O mesmo imposto, três desfechos de custo, dependendo de uma decisão de preço que ninguém controla — só negocia.

## Dica de ouro

> Em 2026 a régua não mexe em nada (f = 1 sempre) — o ano-teste não tem mudança de carga para repassar. Use a régua a partir de 2027: teste os 3 modos e leia a linha de ganho — ela diz, em reais, quanto do dinheiro extinto ficou com o fornecedor e quanto chegou ao seu cliente.

## Erro comum e como evitar

**Erro**: ler as linhas de PIS/COFINS da memória como se fossem dedução do cálculo de 2027 — e estranhar que elas "não mudam" entre as réguas.
**Como evitar**: elas são a âncora de hoje (o "zero" da régua), iguais nos 3 modos por construção. A variável é a linha de ganho (+): 0 no integral, metade no 50%, tudo no nenhum. Se o número não fecha, confira a identidade: 42.000 + 400 − 7.632 − 1.269,03 + ganho = base limpa do exercício.`,
          },
        },
      ])
    } catch (err) {}
  },
)
