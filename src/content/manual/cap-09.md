# Capítulo 9 — Compras alimentando o Markup

> Não redigite custo: a Calculadora de Compras calcula o custo líquido do produto (com os créditos do regime) e entrega pronto para o Markup. Uma fonte, zero retrabalho.

## O que é

A integração **Compras → Markup** leva o custo unitário calculado na Compras direto para os produtos do Markup:

- Botão **"Puxar itens da Compra (n disp.)"** — na lista de produtos e no rodapé.
- Modal de importação — selecione os itens da Compra que virarão produtos.
- O custo entra com o badge **"Custo via Compras"**.
- Na Memória de Cálculo, o bloco **⑥ Custo Unitário do Produto** mostra a "Origem:" — Compras ou manual.
- **Padrão idempotente**: puxar de novo não duplica produtos.
- Botão **"Voltar para Calculadora de Compras"** para navegar.

**Nota de fidelidade**: o sistema não tem um módulo chamado "Kardex" — o controle de estoque/custo vive na Calculadora de Compras (estoque inicial/final, créditos por regime). É ela que alimenta o Markup.

## Onde está na tela

- Botão "Puxar itens da Compra (n disp.)" na lista de produtos.
- Botão "Puxar itens da Compra (n)" no rodapé.
- Badge "Custo via Compras" na linha do produto.
- Botão "Voltar para Calculadora de Compras" no rodapé.

## Passo a passo

1. Cadastre as compras na **Calculadora de Compras** (itens, valores, créditos).
2. Volte ao **Markup** (pílula "Calculadora Markup" ou botão "Voltar para Calculadora de Compras").
3. Clique em **"Puxar itens da Compra (n disp.)"**.
4. Selecione os itens e confirme a importação.
5. Confira o **badge de origem** do custo ("Custo via Compras").
6. Abra a Memória de Cálculo e confira o bloco **⑥** ("Origem: …").

## Exemplo com números reais (Caso Adriana)

O **Celular Samsung** com custo R$ 1.158,93 pode chegar ao Markup por dois caminhos — e o comportamento é conferido no sistema:

- **Via Compras**: o custo unitário vem da Calculadora de Compras, já considerando os créditos do regime ativo.
- **Manual**: você digita R$ 1.158,93 no campo de custo.

Mesmo valor, origem diferente — e o badge diz qual está valendo. No bloco ⑥ da Memória, a "Origem" registra o caminho.

## Dica de ouro

> O custo das compras **carrega os créditos do regime** — é por isso que o mesmo produto pode ter custo líquido diferente por regime. Se o preço do produto "mudou sozinho" ao trocar de regime, olhe o custo de origem Compras antes de suspeitar da margem.

## Erro comum e como evitar

**Erro**: editar o campo de custo manualmente esperando atualizar o registro da Compra.
**Como evitar**: são **camadas separadas** — a origem diz quem manda no número. Para mudar o custo de origem Compras, mude na Compras e puxe de novo (o padrão idempotente cuida do resto).
