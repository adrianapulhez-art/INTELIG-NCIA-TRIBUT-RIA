# Capítulo 7 — Síntese Comparativa: decidindo o melhor preço

> Preço pronto não é decisão tomada. A síntese comparativa mostra os 3 regimes lado a lado — e as ferramentas de comparação dizem qual caminho sustenta melhor a sua margem.

## O que é

A tabela **"Preço de venda simulado por regime"** consolida a simulação:

- Colunas: **"Operação | Qtd. | Lucro Presumido | Lucro Real | Simples Nacional | Status"**.
- Linha **"Receita Consolidada (Σ)"** — a soma por regime, destacada.
- Cada produto mostra o preço unitário e o total ("Tot: R$ X (n un.)" ou "Sem qtd informada").
- Coluna **Status**: badge "✨ {regime} (R$ preço)" marcando o **menor preço unitário** do produto entre os regimes.
- Alternância **"Ver comparativo por produto"** e mini-gráfico de barras "Receita Consolidada × Menor Preço".

Duas ferramentas completam a decisão:

- **Fluxo A — "Comparação por preço de mercado"**: testa um único preço de venda de mercado como âncora nos 3 regimes, mostrando por regime: "Preço de Venda / Custo Líquido / Tributos s/ Venda / Receita Líquida / Lucro Líquido (LLE) / Margem Líquida".
- **Modal "Comparação entre Modos de Precificação"** (botão "Comparar modos ›"): compara o modo Ativo com o Alternativo ("E se?") no regime selecionado, com a **Tabela de Síntese Comparativa da Tríade** (colunas "Dimensão da Tríade | Ativo | Alternativo | Convergência"; linhas "Âncora adotada", "Preço de Venda (PV)" com convergência "Exato (100%)", "Margem de entrada" e "Margem líquida apurada (pós-IRPJ/CSLL sobre RL aditiva)" — a "Métrica canônica").

## Onde está na tela

- Seção **"Comparativo simulado" / "Totais consolidados por regime"** abaixo da lista de produtos.
- Botão **"Comparação por preço de mercado (Fluxo A) ›"** no topo dos parâmetros.
- Botão **"Comparar modos ›"** na linha de cada produto.

## Passo a passo

1. Cadastre os produtos e **simule**.
2. Leia a linha **"Receita Consolidada (Σ)"** — o faturamento em cada regime.
3. Olhe a coluna **Status** de cada produto — onde o preço unitário é menor.
4. Teste um preço de mercado no **Fluxo A** e veja a margem líquida em cada regime.
5. Abra o **"Comparar modos ›"** do produto e compare a âncora Ativa com a Alternativa.
6. Decida: regime + modo + preço.

## Exemplo com números reais (Caso Adriana)

Com a cesta simulada nos dois modos (Capítulos 3 e 4), o padrão que emerge:

- No **modo Custo + Margem**, o menor preço unitário do Celular Samsung é no **Lucro Real** (R$ 3.172,18).
- No **modo Receita Líquida**, o menor é no **Simples Nacional** (R$ 2.738,34).
- A linha "Receita Consolidada (Σ)" mostra o faturamento total da cesta (22 Celulares + 25 Capas) em cada regime.

## Dica de ouro

> **Menor preço unitário não é automaticamente a melhor decisão.** O menor preço pode vir com margem líquida menor. Antes de decidir, olhe a "Margem líquida apurada" — a "Métrica canônica" do modal de modos — e não só o preço de etiqueta.

## Erro comum e como evitar

**Erro**: comparar regimes com **quantidades diferentes** por regime sem perceber (o total muda por causa da quantidade, não do preço).
**Como evitar**: passe o mouse na coluna Qtd. — o tooltip "P: x un. | R: y un. | S: z un." mostra as três quantidades. Alinhe as quantidades antes de comparar preço.

---

## Nota técnica (para quem gosta de rigor)

O modal de modos deixa claro: **"Independência lógica entre os modos de precificação"** — os resultados de "Custo + Margem" e "Receita Líquida" seguem cada um sua própria lógica multiplicativa. A convergência "Exato (100%)" da tabela indica que, com as mesmas premissas, os dois caminhos cheam ao mesmo lugar — e a janela é "estritamente informativa e limitada ao regime selecionado".
