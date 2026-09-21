# Capítulo 3 — Modo Custo + Margem

> Aqui a âncora é o custo: você parte do que o produto te custou e embute a margem desejada — e a plataforma calcula os tributos por dentro, ao centavo.

## O que é

O modo **"Custo + Margem"** parte do custo do produto e aplica a margem de lucro desejada. A plataforma calcula o **Preço de Venda Sugerido** embutindo, na ordem certa, ICMS, PIS/COFINS (ou o DAS no Simples) e as Despesas Variáveis de venda.

O campo **"Margem de lucro (%)"** é **readonly** (derivado) quando o produto vem do modo Receita Líquida — o sistema calcula a margem "a partir do custo da mercadoria e da receita líquida informada".

## Onde está na tela

- **Toggle de modo** dentro da linha do produto: botões "Receita Líquida" e "Custo + Margem" (tooltips "Mudar modo para …").
- **Campo "Custo do produto"** e **"Margem de lucro (%)"**.
- **Nota didática fixa**: "Receita líquida de vendas ≠ custo da mercadoria — o valor informado já embute CMV, despesas operacionais, IR, CSLL e a margem líquida alvo."

## Passo a passo

1. Na linha do produto, clique no toggle **"Custo + Margem"**.
2. Confirme o **custo** (ou puxe da Compras — Capítulo 9).
3. Informe a **margem de lucro (%)**.
4. Informe a **quantidade**.
5. Clique em **"Simular"**.
6. Abra a **Memória de Cálculo** e confira o bloco **⑨ Fator Divisor Multiplicativo** — é ele que transforma custo + margem em preço com tributos embutidos.

## Exemplo com números reais (Caso Adriana)

Cesta com margem 51,9% nos dois produtos, modo Custo + Margem:

- **Celular Samsung** (custo R$ 1.158,93) — Lucro Presumido: **R$ 3.296,23** · Lucro Real: **R$ 3.172,18** · Simples Nacional: **R$ 3.445,87**
- **Capa Protetora** (custo R$ 30,00) — Lucro Presumido: **R$ 85,53** · Lucro Real: **R$ 82,31** · Simples Nacional: **R$ 89,41**

_Valores canônicos do motor (suíte de integridade Card ↔ Memória ↔ DRE). Reproduza na sua tela: mesmos campos, mesmos centavos._

## Dica de ouro

> **Margem sobre o preço ≠ markup sobre o custo.** A margem de 51,9% do Caso Adriana é margem líquida sobre a receita — e é por isso que o preço não é custo × 1,519. O bloco ⑨ da Memória mostra o fator divisor que faz a conta certa: dividir, nunca multiplicar.

## Erro comum e como evitar

**Erro**: esperar que a margem incida só sobre o custo bruto, sem tributos e sem despesas variáveis.
**Como evitar**: a margem líquida só fecha quando ICMS, PIS/COFINS (ou DAS), DV e a própria margem entram no divisor. Se o preço "não fecha", abra a Memória (Capítulo 6) e confira bloco a bloco.
