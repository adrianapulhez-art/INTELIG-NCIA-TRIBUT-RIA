# Capítulo 6 — Memória de Cálculo: os 12 blocos desmistificados

> A Memória de Cálculo é o coração da plataforma: ela mostra, bloco a bloco, como o preço foi construído. Sem fé cega — com fórmula aberta.

## O que é

O modal **"Memória de Cálculo do Preço Sugerido"** abre em **12 blocos numerados (① a ⑫) com valores reais do estado**, com **abas por regime** (inicia no regime ativo da empresa; você troca de aba para ver os outros regimes sem sair do modal).

O bloco ⑩ traz o badge **"Valor canônico do motor"** — o número oficial da plataforma. E o bloco ⑫, a **Blindagem de Margem** (seção "Técnica Tributária"): a técnica que garante que a **margem real no fechamento seja MAIOR que a planejada**.

## Onde está na tela

- Botão **"Memória ›"** na linha de cada produto.
- Botão **"Memória de Cálculo · Ver fórmula"**.
- Tooltip "Ver memória de cálculo deste produto nos 3 regimes" na tabela comparativa.

## Passo a passo (um por bloco)

1. **① Perfil da Empresa** — o perfil/anexo que baseia o cálculo.
2. **② RBT12 (Receita Bruta Acumulada 12 Meses)** — mostra a regra usada: "Proporcional art. 2º LC 123/2006: (receitas acumuladas × 12)" ou "Porta 2: RBT12 informada".
3. **③ Anexo e Faixa Detectada** — alíquota "Nominal:" e valor de "Deduzir:" da faixa do anexo.
4. **④ Alíquota efetiva** — a alíquota real do DAS, com o "Fator:" calculado.
5. **⑤ ICMS Integrado no DAS** — a partilha do ICMS dentro do DAS ("Partilha: …"), com a nota "ICMS, PIS e COFINS vivem dentro do DAS no Simples Nacional".
6. **⑥ Custo Unitário do Produto** — o custo e a "Origem:" (Compras × manual).
7. **⑦ Despesas Variáveis de Venda (Σ DV)** — o total de DV e o "Fator DV:".
8. **⑧ Margem de Lucro** — a margem usada na fórmula.
9. **⑨ Fator Divisor Multiplicativo** — o divisor (1 − alíquotas) em destaque; é ele que embute tributos e DV no preço.
10. **⑩ Preço de Venda Sugerido (Unitário)** — o resultado, com o badge "Valor canônico do motor".
11. **⑪ Distribuição Didática do Preço de Venda (R$)** — como o preço se divide: "Custo Produto", "DAS (…)" etc.
12. **⑫ Blindagem de Margem** — a técnica tributária que blinda a sua margem no fechamento.

## Exemplo com números reais (Caso Adriana)

Abra a Memória do **Celular Samsung** e compare a aba de cada regime com o Capítulo 3: o bloco ⑩ deve mostrar **R$ 3.445,87** no Simples, **R$ 3.296,23** no Presumido e **R$ 3.172,18** no Real (modo Custo + Margem). No bloco ⑥, a origem do custo (R$ 1.158,93); no ⑨, o fator divisor do regime.

## Dica de ouro

> O bloco **⑩ é o número que precisa bater com o Card e com a DRE** — a plataforma é testada automaticamente para garantir a igualdade ao centavo nos 3 pontos e nos 3 regimes (teste "Card ↔ Memória ↔ DRE"). Se o ⑩ bate, o motor está íntegro.

## Erro comum e como evitar

**Erro**: olhar só o ⑩ (o preço) sem passar pelo ⑨ (o divisor).
**Como evitar**: sem o divisor, ninguém percebe uma DV faltando ou um tributo customizado errado. Leia na ordem: ⑥ custo → ⑦ DV → ⑧ margem → ⑨ divisor → ⑩ preço.
