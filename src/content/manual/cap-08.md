# Capítulo 8 — Do preço à DRE

> O preço não termina em etiqueta: ele vira resultado contábil. A DRE é o auditor silencioso — se o preço não bate com ela, algo está errado na alimentação.

## O que é

O botão **"Ir para a DRE"** leva à Demonstração de Resultados do Exercício do regime ativo (DRE Lucro Presumido, DRE Lucro Real ou DRE Simples Nacional). A DRE recebe automaticamente:

- A **receita consolidada** (Σ) dos produtos do Markup.
- O **CMV** (custo das mercadorias vendidas) da Calculadora de Compras.
- As **despesas operacionais** do módulo de Despesas e Receitas.

E fecha no **Lucro Líquido do Exercício (LLE)** — do preço ao resultado.

**Garantia de integridade**: a plataforma roda um teste automático permanente — **"Card ↔ Memória ↔ DRE"** — que exige o Preço de Venda Sugerido **idêntico ao centavo** nos 3 pontos (Card, bloco ⑩ da Memória e DRE) e nos 3 regimes.

## Onde está na tela

- Botão **"Ir para a DRE"** no rodapé da página Markup.
- Pílulas "DRE Lucro Presumido", "DRE Lucro Real" e "DRE Simples Nacional" no topo do sistema.

## Passo a passo

1. **Simule** os produtos (botão "Simular").
2. Confira o bloco **⑩** da Memória do produto principal.
3. Clique em **"Ir para a DRE"**.
4. Confira a **receita bruta** da DRE — deve refletir a "Receita Consolidada (Σ)" do comparativo.
5. Confira o **LLE** — o resultado final depois de tributos, CMV e despesas.

## Exemplo com números reais (Caso Adriana)

A cesta do Caso Adriana (22 Celulares + 25 Capas) consolida na DRE do regime ativo com os preços unitários canônicos dos Capítulos 3 e 4 — e o teste de integridade garante: o R$ 3.445,87 do Celular no Simples é **o mesmo centavo** no Card, no bloco ⑩ e na linha de Receita Bruta da DRE.

## Dica de ouro

> Trate a DRE como o **auditor silencioso**: se o preço do Card não bater com a DRE, pare e reconfira a alimentação (custo, quantidade, regime) antes de usar o número. A tríade Card ↔ Memória ↔ DRE é o seu comprovante de integridade.

## Erro comum e como evitar

**Erro**: alterar quantidade ou custo depois de simular e navegar para a DRE sem resimular — a DRE consolida o que estava gravado na última simulação.
**Como evitar**: depois de qualquer alteração, clique em **"Simular"** de novo. A nota da lista de produtos avisa: "Atualização em tempo real · clique em Simular ou navegue livremente".
