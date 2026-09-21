// pocketbase/migrations/0011_delete_stuck_original_memories.js
// Limpeza (ok da CEO em 21/09): remove as 10 fontes de memória ORIGINAIS do it-assistant
// (criadas pela migration 0007 às 17:02) que ficaram presas em "processing" com 0 chunks —
// diagnosticado via searchMemory puro (hook temporário, já removido). As 10 fontes [v2]
// (migrations 0009/0010) permanecem ready e intactas.
// Método: $ai.agents.deleteMemories exige o conteúdo EXATO original (chave SHA-256 do texto).
// Os textos abaixo são byte a byte os mesmos embutidos na migration 0007.
// Down: re-adiciona as 10 fontes originais (putMemories) — voltariam ao ciclo de ingestão.
migrate(
  (app) => {
    $ai.agents.deleteMemories(app, 'it-assistant', [
      {
        type: 'text',
        payload: {
          text: `# Capítulo 1 — Primeiros passos e o fluxo ideal

> Bem-vindo ao Manual da Calculadora Markup. Aqui você aprende, passo a passo, a transformar custo e margem em preço de venda correto — com tributos certos, ao centavo.

## O que é

A Calculadora Markup é o módulo de **precificação inteligente multi-produtos** da plataforma IT. A partir do custo dos seus produtos, da margem desejada (ou da receita líquida alvo) e do seu regime tributário, ela calcula o **Preço de Venda Sugerido** com os tributos embutidos de forma fracionada — e consolida tudo automaticamente nas DREs.

O fluxo ideal de trabalho tem 5 etapas, sempre nesta ordem:

1. **Custo** — cadastre o produto e o custo dele (digitado ou puxado da Calculadora de Compras).
2. **Modo** — escolha como precificar: a partir do custo + margem ou a partir da receita líquida desejada.
3. **Regime** — confirme o regime tributário ativo (Lucro Presumido, Lucro Real ou Simples Nacional).
4. **Preço** — simule e leia o Preço de Venda Sugerido, com a Memória de Cálculo aberta ao lado.
5. **DRE** — leve o resultado para a DRE do regime e confira o lucro líquido do exercício.

Precificar antes de conferir custo, modo e regime é precificar no escuro. Siga a ordem.

## Onde está na tela

- **Cabeçalho da página**: badge "PRECIFICAÇÃO INTELIGENTE & MULTI-PRODUTOS" e o título "CALCULADORA DE MARKUP".
- **Seção "Parâmetros e Produtos do MARKUP"**: modos de precificação, regimes, despesas variáveis e tributos.
- **Lista "PRODUTOS / SERVIÇOS CADASTRADOS"**: seus produtos, um por linha-camada.
- **Rodapé da página**: botões "Simular", "Gravar Cenário", "Carregar Cenários", "Voltar para Calculadora de Compras" e "Ir para a DRE".
- **Pills no topo do sistema**: navegação entre os módulos (Compras, Markup, DREs, Dashboard, Reforma, Ponte 2027, Clientes e este Manual).

## Passo a passo

1. Abra o menu **Calculadora Markup** (pílula "Calculadora Markup" no topo).
2. Confira o **regime ativo** nos cartões LUCRO PRESUMIDO / LUCRO REAL / SIMPLES NACIONAL.
3. Cadastre seu primeiro produto com **custo e quantidade** (Capítulo 2).
4. Escolha o **modo de precificação** do produto (Capítulos 3 e 4).
5. Clique em **"Simular"**.
6. Abra a **Memória de Cálculo** do produto (botão "Memória ›") e leia os 12 blocos (Capítulo 6).
7. Compare os regimes na tabela de síntese (Capítulo 7).
8. Clique em **"Ir para a DRE"** para ver o resultado consolidado (Capítulo 8).

## Exemplo com números reais (Caso Adriana)

Ao longo de todo este manual usamos o **Caso Adriana**, uma loja de eletrônicos no Simples Nacional (Anexo I, faixa 1, DAS 4%) com ICMS 18% e 5% de despesas variáveis de venda. A cesta de produtos:

- **Celular Samsung** — custo R$ 1.158,93 · margem 51,9% · receita líquida alvo R$ 2.335,00 · quantidade 22.
- **Capa Protetora** — custo R$ 30,00 · margem 51,9% · receita líquida alvo R$ 60,00 · quantidade 25.

Nos próximos capítulos você acompanha esses dois produtos do cadastro até a DRE, sempre com os mesmos centavos que a plataforma calcula.

## Dica de ouro

> Siga o fluxo na ordem: **custo → modo → regime → preço → DRE**. A precisão vem antes de pressa — cada etapa alimenta a seguinte, e pular etapa é a causa número 1 de preço errado.

## Erro comum e como evitar

**Erro**: abrir a calculadora e procurar direto o "preço sugerido" sem cadastrar custo e quantidade.
**Como evitar**: sem custo e quantidade, o sistema marca o produto como "Sem qtd informada" e a simulação não consolida. Comece sempre pelo Capítulo 2.

---

## Como usar este manual

- **Sumário lateral**: cada capítulo é um item clicável — você pode ler na ordem ou pular direto ao que precisa.
- **Busca**: use o campo de busca no topo do sumário para encontrar qualquer termo (ex.: "RBT12", "divisor", "gross-up") em todos os capítulos de uma vez. A busca é um recurso deste manual.
- **Capítulos independentes**: cada capítulo repete o necessário para ser lido sozinho — se algo parecer repetido, é de propósito.`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 2 — Cadastrando produtos e custos

> O preço nasce daqui: produto com custo certo e quantidade certa. Sem isso, nenhuma simulação fecha.

## O que é

A lista **"PRODUTOS / SERVIÇOS CADASTRADOS"** guarda seus produtos como **linhas-camada**: cada linha se expande para revelar todos os campos e ferramentas daquele produto — modo, custo, quantidade, Memória de Cálculo, camadas avançadas.

O **custo** pode ter duas origens, e o sistema marca qual está valendo com um badge:

- **"Custo via Compras"** — o custo veio da Calculadora de Compras (com os créditos do regime já considerados). Veja o Capítulo 9.
- **"Custo manual"** — você digitou o custo na mão, opcionalmente "· via composição de custo" quando montado pela composição de custo do produto.

## Onde está na tela

- **Lista de produtos**: seção "PRODUTOS / SERVIÇOS CADASTRADOS (n)", com os botões "Puxar itens da Compra (n disp.)", "Expandir todos" e "Recolher todos".
- **Cada produto**: nome editável (placeholder "Nome ou descrição do produto/serviço (ex.: Produto A)"), toggle de modo, campos de custo/margem/quantidade, botões "Memória ›", "Comparar modos ›", "Composição dos Tributos" e "Remover produto".
- **"+ Adicionar outro produto"**: cria uma nova linha-camada.
- **"Gravar Cenário"** e **"Carregar Cenários (n)"**: salvam e recarregam todo o seu trabalho (produtos, parâmetros e simulações) — o depósito de cenários fica na página Clientes, organizado em pastas por cliente e subpastas por simulação.

## Passo a passo

1. Clique em **"+ Adicionar outro produto"**.
2. Dê um **nome** claro ao produto.
3. Informe o **custo do produto** (R$) — digitado ou puxado da Compras (Capítulo 9).
4. Informe a **quantidade vendida**.
5. Confira o **badge de origem do custo** ("Custo via Compras" × "Custo manual").
6. Escolha o modo (Capítulos 3 e 4) e siga para a simulação.

## Exemplo com números reais (Caso Adriana)

- **Celular Samsung** — custo **R$ 1.158,93** · quantidade **22**.
- **Capa Protetora** — custo **R$ 30,00** · quantidade **25**.

Com esses dois produtos cadastrados e o regime Simples Nacional ativo (Anexo I, faixa 1), a base da cesta já está pronta para precificar.

## Dica de ouro

> Conheça a **Validação de Alimentação Manual por Regime (Leitura B)**: quando falta algum dado para simular, o sistema bloqueia a simulação e mostra uma mensagem dizendo exatamente o que falta. Não ignore — leia a mensagem até o fim, ela é o checklist de alimentação do regime.

## Erro comum e como evitar

**Erro**: digitar um custo manual diferente do registro de compra do mesmo produto (ex.: custo bruto em vez do custo líquido de créditos).
**Como evitar**: olhe o badge de origem. Se diz "Custo via Compras", o custo que manda é o das Compras — para mudar o número, mude na Compras (Capítulo 9). Se diz "Custo manual", o campo é editável e responsabilidade sua.`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 3 — Modo Custo + Margem

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
**Como evitar**: a margem líquida só fecha quando ICMS, PIS/COFINS (ou DAS), DV e a própria margem entram no divisor. Se o preço "não fecha", abra a Memória (Capítulo 6) e confira bloco a bloco.`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 4 — Modo Receita Líquida (precificação de trás para frente)

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
**Como evitar**: a RL informada aqui é **por unidade do produto** (a plataforma multiplica pela quantidade na consolidação). A receita da empresa é outra conta — aparece na DRE e na linha "Receita Consolidada (Σ)" do comparativo (Capítulo 7).`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 5 — Os 3 regimes: escolher e comparar

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
- **Composição dos Tributos** — mostra o % de cada tributo sobre a receita bruta de venda (ICMS sobre a RBV; PIS/COFINS sobre a base sem ICMS — tese do século, STJ RE 1.188.403; DAS efetivo no Simples) e compara os 3 regimes. Antes de simular, o chip mostra "Simular p/ ver".`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 6 — Memória de Cálculo: os 12 blocos desmistificados

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
**Como evitar**: sem o divisor, ninguém percebe uma DV faltando ou um tributo customizado errado. Leia na ordem: ⑥ custo → ⑦ DV → ⑧ margem → ⑨ divisor → ⑩ preço.`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 7 — Síntese Comparativa: decidindo o melhor preço

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

O modal de modos deixa claro: **"Independência lógica entre os modos de precificação"** — os resultados de "Custo + Margem" e "Receita Líquida" seguem cada um sua própria lógica multiplicativa. A convergência "Exato (100%)" da tabela indica que, com as mesmas premissas, os dois caminhos cheam ao mesmo lugar — e a janela é "estritamente informativa e limitada ao regime selecionado".`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 8 — Do preço à DRE

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
**Como evitar**: depois de qualquer alteração, clique em **"Simular"** de novo. A nota da lista de produtos avisa: "Atualização em tempo real · clique em Simular ou navegue livremente".`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 9 — Compras alimentando o Markup

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
**Como evitar**: são **camadas separadas** — a origem diz quem manda no número. Para mudar o custo de origem Compras, mude na Compras e puxe de novo (o padrão idempotente cuida do resto).`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 10 — Glossário tributário

> Falar a língua do sistema. Cada termo em 1–2 linhas, com o lugar onde ele aparece na plataforma.

## Termos

**Alíquota efetiva × nominal** — A nominal é a da tabela do anexo; a efetiva é a que sobra depois do desconto da faixa. Aparece nos blocos ③ e ④ da Memória.

**Anexo / Faixa** — A tabela do Simples Nacional em que sua empresa se enquadra (Anexo I, II…), com faixas de faturamento. Bloco ③ da Memória e seção "Entrada Inteligente".

**Blindagem de Margem** — Técnica tributária do bloco ⑫ da Memória: garante que a margem real no fechamento seja maior que a planejada.

**CBS e IBS** — Os novos tributos sobre o consumo da Reforma Tributária (EC 132/23 e LC 214/25). CBS 8,8% e IBS 17,7% na plena. Veja a pílula "Reforma Tributária" e a "Ponte 2027".

**Crédito** — Valor do tributo pago na compra que você abate do devido na venda (Lucro Real e Presumido). No Simples, o DAS não gera crédito ao cliente PJ — veja a Ponte 2027.

**Cumulativo × não cumulativo** — PIS/COFINS cumulativos (Presumido: 0,65%/3,00%) não geram crédito; não cumulativos (Real: 1,65%/7,60%) geram. Rótulos dos cartões de regime.

**DAS** — Documento de Arrecadação do Simples Nacional: guia única que integra ICMS, PIS, COFINS e mais. Bloco ⑤ da Memória.

**DIFAL** — Diferencial de alíquota em vendas interestaduais para consumidor final. Camada "DIFAL / Interestadual" do produto.

**Divisor (fator multiplicativo)** — O número pelo qual se divide custo + margem para embutir tributos e DV no preço. Bloco ⑨ da Memória. Dividir, nunca multiplicar.

**DV (Despesas Variáveis de Venda)** — Taxas incidentes sobre o preço de venda: maquininha ~3%, comissão ~2%, frete de entrega ~0–5%. Seção "DESPESAS VARIÁVEIS DE VENDA (Σ DV)" e bloco ⑦.

**Gross-up / RBV** — A receita bruta necessária para chegar na receita líquida desejada. Sub-resultado "RBV Gross-up" do modo Receita Líquida.

**ICMS-ST (Substituição Tributária)** — Regime em que o ICMS do produto é recolhido antecipadamente por outro elo da cadeia. Camada "ICMS-ST" do produto.

**LLE** — Lucro Líquido do Exercício. Aparece no sub-resultado "Operação viável (LLE positivo…)" e na DRE.

**Margem líquida** — Lucro líquido sobre a receita líquida. A "Métrica canônica" do modal "Comparação entre Modos de Precificação".

**Por dentro × por fora** — "Por dentro": a base do tributo inclui os outros tributos (encarece). "Por fora": o tribito é acrescentado sobre a base limpa (neutro). Conceito central da Ponte 2027 e do bloco ⑨.

**RBT12** — Receita Bruta de Transição dos 12 meses (receitas acumuladas × 12, art. 2º da LC 123/2006). Bloco ② da Memória e Portas 1/2 do Simples.

**Split payment** — Recolhimento do tributo na fonte pelo pagador (art. 31 da LC 214/25), a partir de 2027. Simulado na pílula "Ponte 2027".

**Tese do século** — Decisão do STJ (RE 1.188.403): PIS/COFINS incidem sobre a base **sem** o ICMS. Aplicada na camada "Composição dos Tributos".

## Dica de ouro

> Termos da Reforma mudam com o cronograma 2026–2033 — quando um termo tiver data (CBS, IBS, split payment), o glossário aponta o exercício de referência. Em dúvida, confira a pílula "Reforma Tributária".

## Erro comum e como evitar

**Erro**: usar "margem" sem especificar — margem de entrada (sobre o custo), margem líquida (sobre a receita) e margem apurada (no fechamento) são três números diferentes.
**Como evitar**: o sistema usa os três em lugares diferentes — "Margem de entrada" e "Margem líquida apurada" no modal de modos, "Margem de lucro (%)" no produto. Nomeie sempre qual está lendo.`,
        },
      },
    ])
  },
  (app) => {
    // Down: re-adiciona as 10 fontes originais (putMemories) — voltariam ao ciclo de ingestão.
    $ai.agents.putMemories(app, 'it-assistant', [
      {
        type: 'text',
        payload: {
          text: `# Capítulo 1 — Primeiros passos e o fluxo ideal

> Bem-vindo ao Manual da Calculadora Markup. Aqui você aprende, passo a passo, a transformar custo e margem em preço de venda correto — com tributos certos, ao centavo.

## O que é

A Calculadora Markup é o módulo de **precificação inteligente multi-produtos** da plataforma IT. A partir do custo dos seus produtos, da margem desejada (ou da receita líquida alvo) e do seu regime tributário, ela calcula o **Preço de Venda Sugerido** com os tributos embutidos de forma fracionada — e consolida tudo automaticamente nas DREs.

O fluxo ideal de trabalho tem 5 etapas, sempre nesta ordem:

1. **Custo** — cadastre o produto e o custo dele (digitado ou puxado da Calculadora de Compras).
2. **Modo** — escolha como precificar: a partir do custo + margem ou a partir da receita líquida desejada.
3. **Regime** — confirme o regime tributário ativo (Lucro Presumido, Lucro Real ou Simples Nacional).
4. **Preço** — simule e leia o Preço de Venda Sugerido, com a Memória de Cálculo aberta ao lado.
5. **DRE** — leve o resultado para a DRE do regime e confira o lucro líquido do exercício.

Precificar antes de conferir custo, modo e regime é precificar no escuro. Siga a ordem.

## Onde está na tela

- **Cabeçalho da página**: badge "PRECIFICAÇÃO INTELIGENTE & MULTI-PRODUTOS" e o título "CALCULADORA DE MARKUP".
- **Seção "Parâmetros e Produtos do MARKUP"**: modos de precificação, regimes, despesas variáveis e tributos.
- **Lista "PRODUTOS / SERVIÇOS CADASTRADOS"**: seus produtos, um por linha-camada.
- **Rodapé da página**: botões "Simular", "Gravar Cenário", "Carregar Cenários", "Voltar para Calculadora de Compras" e "Ir para a DRE".
- **Pills no topo do sistema**: navegação entre os módulos (Compras, Markup, DREs, Dashboard, Reforma, Ponte 2027, Clientes e este Manual).

## Passo a passo

1. Abra o menu **Calculadora Markup** (pílula "Calculadora Markup" no topo).
2. Confira o **regime ativo** nos cartões LUCRO PRESUMIDO / LUCRO REAL / SIMPLES NACIONAL.
3. Cadastre seu primeiro produto com **custo e quantidade** (Capítulo 2).
4. Escolha o **modo de precificação** do produto (Capítulos 3 e 4).
5. Clique em **"Simular"**.
6. Abra a **Memória de Cálculo** do produto (botão "Memória ›") e leia os 12 blocos (Capítulo 6).
7. Compare os regimes na tabela de síntese (Capítulo 7).
8. Clique em **"Ir para a DRE"** para ver o resultado consolidado (Capítulo 8).

## Exemplo com números reais (Caso Adriana)

Ao longo de todo este manual usamos o **Caso Adriana**, uma loja de eletrônicos no Simples Nacional (Anexo I, faixa 1, DAS 4%) com ICMS 18% e 5% de despesas variáveis de venda. A cesta de produtos:

- **Celular Samsung** — custo R$ 1.158,93 · margem 51,9% · receita líquida alvo R$ 2.335,00 · quantidade 22.
- **Capa Protetora** — custo R$ 30,00 · margem 51,9% · receita líquida alvo R$ 60,00 · quantidade 25.

Nos próximos capítulos você acompanha esses dois produtos do cadastro até a DRE, sempre com os mesmos centavos que a plataforma calcula.

## Dica de ouro

> Siga o fluxo na ordem: **custo → modo → regime → preço → DRE**. A precisão vem antes de pressa — cada etapa alimenta a seguinte, e pular etapa é a causa número 1 de preço errado.

## Erro comum e como evitar

**Erro**: abrir a calculadora e procurar direto o "preço sugerido" sem cadastrar custo e quantidade.
**Como evitar**: sem custo e quantidade, o sistema marca o produto como "Sem qtd informada" e a simulação não consolida. Comece sempre pelo Capítulo 2.

---

## Como usar este manual

- **Sumário lateral**: cada capítulo é um item clicável — você pode ler na ordem ou pular direto ao que precisa.
- **Busca**: use o campo de busca no topo do sumário para encontrar qualquer termo (ex.: "RBT12", "divisor", "gross-up") em todos os capítulos de uma vez. A busca é um recurso deste manual.
- **Capítulos independentes**: cada capítulo repete o necessário para ser lido sozinho — se algo parecer repetido, é de propósito.`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 2 — Cadastrando produtos e custos

> O preço nasce daqui: produto com custo certo e quantidade certa. Sem isso, nenhuma simulação fecha.

## O que é

A lista **"PRODUTOS / SERVIÇOS CADASTRADOS"** guarda seus produtos como **linhas-camada**: cada linha se expande para revelar todos os campos e ferramentas daquele produto — modo, custo, quantidade, Memória de Cálculo, camadas avançadas.

O **custo** pode ter duas origens, e o sistema marca qual está valendo com um badge:

- **"Custo via Compras"** — o custo veio da Calculadora de Compras (com os créditos do regime já considerados). Veja o Capítulo 9.
- **"Custo manual"** — você digitou o custo na mão, opcionalmente "· via composição de custo" quando montado pela composição de custo do produto.

## Onde está na tela

- **Lista de produtos**: seção "PRODUTOS / SERVIÇOS CADASTRADOS (n)", com os botões "Puxar itens da Compra (n disp.)", "Expandir todos" e "Recolher todos".
- **Cada produto**: nome editável (placeholder "Nome ou descrição do produto/serviço (ex.: Produto A)"), toggle de modo, campos de custo/margem/quantidade, botões "Memória ›", "Comparar modos ›", "Composição dos Tributos" e "Remover produto".
- **"+ Adicionar outro produto"**: cria uma nova linha-camada.
- **"Gravar Cenário"** e **"Carregar Cenários (n)"**: salvam e recarregam todo o seu trabalho (produtos, parâmetros e simulações) — o depósito de cenários fica na página Clientes, organizado em pastas por cliente e subpastas por simulação.

## Passo a passo

1. Clique em **"+ Adicionar outro produto"**.
2. Dê um **nome** claro ao produto.
3. Informe o **custo do produto** (R$) — digitado ou puxado da Compras (Capítulo 9).
4. Informe a **quantidade vendida**.
5. Confira o **badge de origem do custo** ("Custo via Compras" × "Custo manual").
6. Escolha o modo (Capítulos 3 e 4) e siga para a simulação.

## Exemplo com números reais (Caso Adriana)

- **Celular Samsung** — custo **R$ 1.158,93** · quantidade **22**.
- **Capa Protetora** — custo **R$ 30,00** · quantidade **25**.

Com esses dois produtos cadastrados e o regime Simples Nacional ativo (Anexo I, faixa 1), a base da cesta já está pronta para precificar.

## Dica de ouro

> Conheça a **Validação de Alimentação Manual por Regime (Leitura B)**: quando falta algum dado para simular, o sistema bloqueia a simulação e mostra uma mensagem dizendo exatamente o que falta. Não ignore — leia a mensagem até o fim, ela é o checklist de alimentação do regime.

## Erro comum e como evitar

**Erro**: digitar um custo manual diferente do registro de compra do mesmo produto (ex.: custo bruto em vez do custo líquido de créditos).
**Como evitar**: olhe o badge de origem. Se diz "Custo via Compras", o custo que manda é o das Compras — para mudar o número, mude na Compras (Capítulo 9). Se diz "Custo manual", o campo é editável e responsabilidade sua.`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 3 — Modo Custo + Margem

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
**Como evitar**: a margem líquida só fecha quando ICMS, PIS/COFINS (ou DAS), DV e a própria margem entram no divisor. Se o preço "não fecha", abra a Memória (Capítulo 6) e confira bloco a bloco.`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 4 — Modo Receita Líquida (precificação de trás para frente)

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
**Como evitar**: a RL informada aqui é **por unidade do produto** (a plataforma multiplica pela quantidade na consolidação). A receita da empresa é outra conta — aparece na DRE e na linha "Receita Consolidada (Σ)" do comparativo (Capítulo 7).`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 5 — Os 3 regimes: escolher e comparar

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
- **Composição dos Tributos** — mostra o % de cada tributo sobre a receita bruta de venda (ICMS sobre a RBV; PIS/COFINS sobre a base sem ICMS — tese do século, STJ RE 1.188.403; DAS efetivo no Simples) e compara os 3 regimes. Antes de simular, o chip mostra "Simular p/ ver".`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 6 — Memória de Cálculo: os 12 blocos desmistificados

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
**Como evitar**: sem o divisor, ninguém percebe uma DV faltando ou um tributo customizado errado. Leia na ordem: ⑥ custo → ⑦ DV → ⑧ margem → ⑨ divisor → ⑩ preço.`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 7 — Síntese Comparativa: decidindo o melhor preço

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

O modal de modos deixa claro: **"Independência lógica entre os modos de precificação"** — os resultados de "Custo + Margem" e "Receita Líquida" seguem cada um sua própria lógica multiplicativa. A convergência "Exato (100%)" da tabela indica que, com as mesmas premissas, os dois caminhos cheam ao mesmo lugar — e a janela é "estritamente informativa e limitada ao regime selecionado".`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 8 — Do preço à DRE

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
**Como evitar**: depois de qualquer alteração, clique em **"Simular"** de novo. A nota da lista de produtos avisa: "Atualização em tempo real · clique em Simular ou navegue livremente".`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 9 — Compras alimentando o Markup

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
**Como evitar**: são **camadas separadas** — a origem diz quem manda no número. Para mudar o custo de origem Compras, mude na Compras e puxe de novo (o padrão idempotente cuida do resto).`,
        },
      },
      {
        type: 'text',
        payload: {
          text: `# Capítulo 10 — Glossário tributário

> Falar a língua do sistema. Cada termo em 1–2 linhas, com o lugar onde ele aparece na plataforma.

## Termos

**Alíquota efetiva × nominal** — A nominal é a da tabela do anexo; a efetiva é a que sobra depois do desconto da faixa. Aparece nos blocos ③ e ④ da Memória.

**Anexo / Faixa** — A tabela do Simples Nacional em que sua empresa se enquadra (Anexo I, II…), com faixas de faturamento. Bloco ③ da Memória e seção "Entrada Inteligente".

**Blindagem de Margem** — Técnica tributária do bloco ⑫ da Memória: garante que a margem real no fechamento seja maior que a planejada.

**CBS e IBS** — Os novos tributos sobre o consumo da Reforma Tributária (EC 132/23 e LC 214/25). CBS 8,8% e IBS 17,7% na plena. Veja a pílula "Reforma Tributária" e a "Ponte 2027".

**Crédito** — Valor do tributo pago na compra que você abate do devido na venda (Lucro Real e Presumido). No Simples, o DAS não gera crédito ao cliente PJ — veja a Ponte 2027.

**Cumulativo × não cumulativo** — PIS/COFINS cumulativos (Presumido: 0,65%/3,00%) não geram crédito; não cumulativos (Real: 1,65%/7,60%) geram. Rótulos dos cartões de regime.

**DAS** — Documento de Arrecadação do Simples Nacional: guia única que integra ICMS, PIS, COFINS e mais. Bloco ⑤ da Memória.

**DIFAL** — Diferencial de alíquota em vendas interestaduais para consumidor final. Camada "DIFAL / Interestadual" do produto.

**Divisor (fator multiplicativo)** — O número pelo qual se divide custo + margem para embutir tributos e DV no preço. Bloco ⑨ da Memória. Dividir, nunca multiplicar.

**DV (Despesas Variáveis de Venda)** — Taxas incidentes sobre o preço de venda: maquininha ~3%, comissão ~2%, frete de entrega ~0–5%. Seção "DESPESAS VARIÁVEIS DE VENDA (Σ DV)" e bloco ⑦.

**Gross-up / RBV** — A receita bruta necessária para chegar na receita líquida desejada. Sub-resultado "RBV Gross-up" do modo Receita Líquida.

**ICMS-ST (Substituição Tributária)** — Regime em que o ICMS do produto é recolhido antecipadamente por outro elo da cadeia. Camada "ICMS-ST" do produto.

**LLE** — Lucro Líquido do Exercício. Aparece no sub-resultado "Operação viável (LLE positivo…)" e na DRE.

**Margem líquida** — Lucro líquido sobre a receita líquida. A "Métrica canônica" do modal "Comparação entre Modos de Precificação".

**Por dentro × por fora** — "Por dentro": a base do tributo inclui os outros tributos (encarece). "Por fora": o tribito é acrescentado sobre a base limpa (neutro). Conceito central da Ponte 2027 e do bloco ⑨.

**RBT12** — Receita Bruta de Transição dos 12 meses (receitas acumuladas × 12, art. 2º da LC 123/2006). Bloco ② da Memória e Portas 1/2 do Simples.

**Split payment** — Recolhimento do tributo na fonte pelo pagador (art. 31 da LC 214/25), a partir de 2027. Simulado na pílula "Ponte 2027".

**Tese do século** — Decisão do STJ (RE 1.188.403): PIS/COFINS incidem sobre a base **sem** o ICMS. Aplicada na camada "Composição dos Tributos".

## Dica de ouro

> Termos da Reforma mudam com o cronograma 2026–2033 — quando um termo tiver data (CBS, IBS, split payment), o glossário aponta o exercício de referência. Em dúvida, confira a pílula "Reforma Tributária".

## Erro comum e como evitar

**Erro**: usar "margem" sem especificar — margem de entrada (sobre o custo), margem líquida (sobre a receita) e margem apurada (no fechamento) são três números diferentes.
**Como evitar**: o sistema usa os três em lugares diferentes — "Margem de entrada" e "Margem líquida apurada" no modal de modos, "Margem de lucro (%)" no produto. Nomeie sempre qual está lendo.`,
        },
      },
    ])
  },
)
