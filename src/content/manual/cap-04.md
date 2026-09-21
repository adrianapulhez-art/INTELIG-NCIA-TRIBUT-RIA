# Capítulo 4 — Modo Receita Líquida (precificação de trás para frente)

> Aqui a âncora é a meta: você diz quanto quer ganhar por produto e a plataforma calcula o preço de venda que chega lá — o famoso gross-up.

## O que é

O modo **"Receita Líquida"** parte da **receita líquida desejada** (a RL alvo) e trabalha de trás para frente: a plataforma aplica os fatores do regime e revela o **preço de venda** que sustenta essa meta.

No campo, o rótulo muda conforme o regime ativo: **"Receita Líquida Desejada — {regime} (R$)"**, com badge "Manual" quando digitado por você.

Depois de simular, a linha do produto mostra o sub-resultado:

- **"Operação viável (LLE positivo: R$ X · Margem: Y%)"** — confirma que a operação fecha com lucro.
- **"RBV Gross-up: R$ Z"** — a receita bruta necessária para chegar na RL desejada.

## Onde está na tela

- **Toggle de modo** na linha do produto: botão "Receita Líquida".
- **Campo "Receita Líquida Desejada — {regime} (R$)"** (placeholder "informe manualmente").
- **Sub-resultado do produto** após simular: "Operação viável (LLE positivo…)" e "RBV Gross-up: …".

## Passo a passo

1. Na linha do produto, clique no toggle **"Receita Líquida"**.
2. Informe a **Receita Líquida Desejada** (R$).
3. Informe a **quantidade**.
4. Clique em **"Simular"**.
5. Leia o **"RBV Gross-up"** — é o preço cheio que você deve cobrar.
6. Confira a **viabilidade**: LLE positivo e margem apurada.

## Exemplo com números reais (Caso Adriana)

RL alvo por produto, modo Receita Líquida:

- **Celular Samsung** (RL alvo R$ 2.335,00) — Lucro Presumido: **R$ 3.195,06** · Lucro Real: **R$ 3.392,23** · Simples Nacional: **R$ 2.738,34**
- **Capa Protetora** (RL alvo R$ 60,00) — Lucro Presumido: **R$ 82,10** · Lucro Real: **R$ 87,17** · Simples Nacional: **R$ 70,36**

_Valores canônicos do motor. Note: partindo da mesma RL alvo, o Lucro Real exige preço maior (tributos não cumulativos com alíquotas cheias) e o Simples, menor (DAS de 4%)._

## Dica de ouro

> A **RL desejada já embute tudo**: CMV, despesas operacionais, IRPJ/CSLL e a margem líquida alvo. Ela não é "lucro em cima do custo" — é o valor líquido final por unidade. Se você informar nela só a sua margem, o preço sai subestimado.

## Erro comum e como evitar

**Erro**: confundir a RL alvo do produto com a receita total da empresa.
**Como evitar**: a RL informada aqui é **por unidade do produto** (a plataforma multiplica pela quantidade na consolidação). A receita da empresa é outra conta — aparece na DRE e na linha "Receita Consolidada (Σ)" do comparativo (Capítulo 7).
