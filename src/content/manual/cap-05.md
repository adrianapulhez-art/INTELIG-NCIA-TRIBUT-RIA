# Capítulo 5 — Os 3 regimes: escolher e comparar

> Presumido, Real ou Simples? O mesmo produto pode ter três preços diferentes — e a decisão muda conforme o regime. Aqui você aprende a escolher e a comparar sem perder trabalho.

## O que é

A plataforma calcula nos **3 regimes tributários** ao mesmo tempo, com um regime **ativo** por vez:

- **LUCRO PRESUMIDO** — "PIS 0,65% · COFINS 3,00% (cumulativo)".
- **LUCRO REAL** — "PIS 1,65% · COFINS 7,60% (não cumulativo)".
- **SIMPLES NACIONAL** — "Guia única DAS (PIS/COFINS sem destaque avulso)".

Cada produto aceita **quantidade por regime** — você pode testar cenários com quantidades diferentes em cada regime (o tooltip "P: x un. | R: y un. | S: z un." mostra os três valores).

## Onde está na tela

- **Cartões de regime** no topo da seção de parâmetros (o ativo fica destacado).
- **Seção "Entrada Inteligente — Simples Nacional"**: pergunta "A empresa já está em atividade há mais de 12 meses?", cartões de cenário e campos de projeção.
- **Camadas avançadas por produto**: chips "ICMS-ST Inativo", "DIFAL / Interestadual Inativo", "Gerenciar (n) ›" e "Composição dos Tributos".

## Passo a passo

1. Clique no cartão do **regime ativo** (Presumido, Real ou Simples).
2. Para o **Simples Nacional**:
   - Responda "A empresa já está em atividade há mais de 12 meses?" (SIM / NÃO — Início de atividade).
   - Escolha um dos **3 cartões de cenário**:
     - **Conservador** — R$ 15.000 / mês · RBT12: R$ 180.000 · Alíquota: 4,00%
     - **Moderado** — R$ 20.000 / mês · RBT12: R$ 240.000 · Alíquota: 4,83%
     - **Otimista** — R$ 30.000 / mês · RBT12: R$ 360.000 · Alíquota: 5,65%
   - Ou use as **Portas 1 e 2**: Porta 1 = faturamento mensal projetado; Porta 2 = RBT12 formada (informada). As duas se sincronizam com foco protegido.
   - Confira a **"RBT12 Adotada:"** antes de simular.
3. Se precisar, ajuste a **quantidade por regime** do produto.
4. Simule e compare (Capítulo 7).

## Exemplo com números reais (Caso Adriana)

A loja do Caso Adriana é Simples Nacional, **Anexo I, faixa 1** — RBT12 de R$ 180.000 (cenário Conservador) e **DAS 4%**. É esse parâmetro que faz o Simples sair com os preços do Capítulo 4 (R$ 2.738,34 no Celular, modo Receita Líquida).

## Dica de ouro

> Empresa **em início de atividade** sem receitas mensais preenchidas usa regra própria de RBT12 — o sistema avisa ("Empresa em início de atividade: receitas mensais não preenchidas. O Simples Nacional está us…"). Leia o aviso completo: a alíquota efetiva muda conforme a projeção.

## Erro comum e como evitar

**Erro**: digitar a RBT12 na Porta 2 sem conferir a Porta 1 (ou vice-versa) e simular com um valor que não é o adotado.
**Como evitar**: as duas portas se sincronizam com foco protegido — mas o número que manda é o da **"RBT12 Adotada:"**. Confirme antes de simular.

---

## Camadas avançadas por produto

Cada produto tem camadas opcionais que refinam a tributação:

- **Substituição Tributária (ICMS-ST)** — chip "ICMS-ST Inativo/Ativo": ative quando o produto é sujeito a ST.
- **DIFAL / Operações Interestaduais** — chip "DIFAL / Interestadual Inativo/Ativo": para vendas entre estados.
- **Composição dos Tributos** — mostra o % de cada tributo sobre a receita bruta de venda (ICMS sobre a RBV; PIS/COFINS sobre a base sem ICMS — tese do século, STJ RE 1.188.403; DAS efetivo no Simples) e compara os 3 regimes. Antes de simular, o chip mostra "Simular p/ ver".
