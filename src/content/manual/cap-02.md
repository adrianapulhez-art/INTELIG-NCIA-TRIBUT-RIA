# Capítulo 2 — Cadastrando produtos e custos

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
**Como evitar**: olhe o badge de origem. Se diz "Custo via Compras", o custo que manda é o das Compras — para mudar o número, mude na Compras (Capítulo 9). Se diz "Custo manual", o campo é editável e responsabilidade sua.
