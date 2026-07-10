# Roteiro de Defesa — Dashboard Diabetes no Brasil
**Piettro Pevidor Nakashoji · Ciência de Dados · IESB · 2026**

Documento de apoio para apresentação à banca. Estrutura: para cada aba há (1) o que mostrar, (2) o ponto técnico a destacar, (3) perguntas prováveis e como responder.

---

## Abertura (30–60 segundos)

> "Meu trabalho consolida em um único painel interativo os dados sobre diabetes no Brasil, hoje dispersos em múltiplas fontes oficiais — DATASUS, Vigitel, PNS, ANS e IDF. O diferencial não é só visualizar: o painel aplica o ciclo CRISP-DM, com uma camada estatística (correlação, regressão, intervalos de confiança), decomposição de séries temporais e um protótipo de modelo preditivo de risco. Todos os cálculos rodam em tempo real no navegador, a partir das séries documentadas."

Números-âncora para ter na ponta da língua:
- **16,8 milhões** de brasileiros com diabetes (IDF/SBD); 5º país do mundo.
- Prevalência subiu de **5,3% (2006) para 10,2% (2023)** no Vigitel.
- **~85 mil óbitos/ano** (SIM/DATASUS, 2022).
- Custo do sistema pode chegar a **R$ 27 bi em 2030**.

---

## 1. Visão Geral

**Mostrar:** KPIs nacionais, evolução da prevalência, distribuição por tipo de DM, Brasil no ranking mundial.

**Ponto técnico:** é a camada de *Business Understanding* — contextualiza o problema e sua magnitude antes de qualquer análise.

**Perguntas prováveis:**
- *"De onde vêm os 16,8 milhões?"* → Estimativa IDF Diabetes Atlas / SBD; é projeção para adultos 20–79 anos, diferente do diagnóstico autorreferido do Vigitel/PNS.
- *"Por que 90% é tipo 2?"* → O DM2 é associado a estilo de vida e envelhecimento; o DM1 é autoimune e bem mais raro. Isso justifica o foco em fatores de risco modificáveis.

---

## 2. Prevalência

**Mostrar:** prevalência por estado/capital, por escolaridade, por sexo e faixa etária.

**Ponto técnico:** o gradiente por **escolaridade** (17,8% no menor nível vs 5,9% no superior) evidencia o **determinante social da saúde** — não é só biologia.

**Perguntas prováveis:**
- *"Por que prevalência cresce tanto com a idade?"* → Acúmulo de resistência à insulina ao longo da vida + maior tempo de exposição a fatores de risco.
- *"Mulheres têm mais diabetes?"* → No autorreferido sim, mas em parte por maior procura de diagnóstico (viés de detecção). Bom exemplo de pensamento crítico sobre o dado.

---

## 3. Mortalidade (DATASUS/SIM)

**Mostrar:** série de óbitos 2000–2022, óbitos por faixa etária, taxa por região, tipo de DM (CID-10).

**Ponto técnico:** uso da **causa básica vs. causa associada** — o diabetes mata muito mais como causa associada (>180 mil menções) do que como causa básica (~85 mil). Isso explica por que a carga real é subestimada nas estatísticas oficiais.

**Perguntas prováveis:**
- *"A taxa é bruta ou padronizada?"* → A taxa por região é padronizada por idade (permite comparar populações com estruturas etárias diferentes). Saber essa distinção é crucial.
- *"O salto recente tem a ver com COVID?"* → Sim, 2020–2021 têm efeito da pandemia; diabéticos foram grupo de maior letalidade.

---

## 4. Internações (DATASUS/SIH)

**Mostrar:** série de internações, complicações, perfil por sexo/idade, amputações.

**Ponto técnico:** o **custo médio × volume** mostra o impacto econômico no SUS. As amputações são o desfecho mais evitável — marcador de qualidade do cuidado primário.

**Perguntas prováveis:**
- *"Por que a queda em 2020?"* → Suspensão de procedimentos eletivos na pandemia (mesmo fenômeno que aparece na decomposição da aba ML).

---

## 5. Fatores de Risco (Vigitel)

**Mostrar:** evolução obesidade × diabetes, sedentarismo, alimentação, risco relativo.

**Ponto técnico:** as curvas de **obesidade e diabetes sobem em paralelo** — prepara a análise de correlação formal feita na aba Análise. É a transição da estatística descritiva para a inferencial.

**Perguntas prováveis:**
- *"Correlação prova causalidade?"* → **Não.** Correlação é associação; a causalidade é sustentada por plausibilidade biológica e estudos longitudinais externos. Esta é a resposta mais importante de toda a defesa — deixe clara.

---

## 6. Complicações

**Mostrar:** prevalência das complicações, amputações, diálise, custo.

**Ponto técnico:** diabetes é a **principal causa de cegueira evitável e de doença renal em diálise** no Brasil. O custo das complicações é onde está a maior parte do gasto — argumento para prevenção.

---

## 7. Distribuição Geográfica

**Mostrar:** mapa coroplético interativo + comparativo estadual (prevalência × mortalidade, dois eixos).

**Ponto técnico:** escolha de **escala de cores quantizada** e join dos dados por UF com a topologia (TopoJSON). Mencionar que o mapa usa dados das capitais (limitação do Vigitel).

**Perguntas prováveis:**
- *"Por que o Sudeste tem mais?"* → Combinação de envelhecimento populacional, urbanização e maior acesso a diagnóstico. Norte tem menos prevalência registrada, mas possível **subdiagnóstico** (cuidado: menor número pode ser menos acesso, não menos doença).

---

## 8. Saúde Suplementar (ANS / D-TISS)

**Mostrar:** série de procedimentos, internações por UF, procedimentos ambulatoriais, tabela TUSS.

**Ponto técnico:** demonstra domínio da estrutura real dos dados (Padrão TISS, join por `ID_EVENTO`, tabelas TUSS 20/22/63/64). Citar a **limitação documentada**: CID indisponível no ambulatorial por decisão judicial.

**Perguntas prováveis:**
- *"Esses dados são reais?"* → A estrutura e a disponibilidade vêm da resposta oficial da ANS ao meu pedido via LAI (NUP 25072.015811/2026-30). Os valores no painel são estimativas calibradas enquanto a extração completa dos CSV está em andamento — seja transparente quanto a isso.

---

## 9. PNS / Fontes

**Mostrar:** comparativo Vigitel × PNS, evolução PNS, catálogo de 12 fontes.

**Ponto técnico — o mais valorizado:** Vigitel (8,8%) e PNS (7,7%) divergem em 2019 **e isso não é erro**. Vigitel é **telefônico e só de capitais**; PNS é **domiciliar e nacional** (inclui interior e zona rural). Triangular fontes é boa prática de ciência de dados.

**Perguntas prováveis:**
- *"Qual número é o certo?"* → Depende da pergunta. Para tendência temporal de capitais, Vigitel; para estimativa nacional representativa, PNS. Não existe "o certo" sem o contexto de cobertura e método.

---

## 10. Análise Estatística

**Mostrar:** pipeline CRISP-DM, correlações (Pearson), regressão com R², matriz de correlação (heatmap), distribuição por região, bubble multivariado, carga absoluta, tabela descritiva.

**Pontos técnicos:**
- **Pearson** mede associação linear; valores próximos de 1 indicam forte associação positiva.
- **R²** = proporção da variância explicada pelo modelo.
- **CV (coeficiente de variação)** permite comparar dispersão entre séries de escalas diferentes.
- A **carga absoluta** (prevalência × população) tem nota explícita de que **superestima** (aplica prevalência de adultos à população total) — incluí de propósito para demonstrar honestidade metodológica.

**Perguntas prováveis:**
- *"Por que Pearson e não Spearman?"* → Pearson assume relação linear; se a banca questionar normalidade/linearidade, Spearman (correlação de postos) seria a alternativa robusta. Tenha isso pronto.
- *"O bubble chart não tem muita sobreposição?"* → Sim, é uma limitação de legibilidade com 27 UFs; a cor por região e o tooltip mitigam.

---

## 11. Modelagem Preditiva (ML) — a aba que decide a nota

**Mostrar (nesta ordem):** forecast com IC 95% → decomposição → classificador interativo → matriz de confusão + ROC.

### 11a. Forecast com Intervalo de Confiança
- Regressão **OLS** projetando até 2035.
- A banda de IC 95% usa `SE = s·√(1/n + (x₀−x̄)²/Sxx)` com `t ≈ 2,12` (df=16).
- **Ponto-chave:** a banda **alarga conforme nos afastamos da média dos dados** — a incerteza cresce na extrapolação. Mostrar isso visualmente impressiona.
- *Pergunta provável:* *"Por que não ARIMA?"* → OLS é o baseline interpretável; SARIMA/Prophet estão no roadmap (Cap. 6) para capturar sazonalidade na série mensal.

### 11b. Decomposição de Série Temporal
- Modelo **aditivo**: Observado = Tendência + Sazonalidade + Resíduo.
- Tendência por **média móvel centrada 2×12** (correta para período par de 12 meses).
- **A ANOMALIA COVID É SEU MELHOR MOMENTO:** o resíduo de abr–jun/2020 (destacado em âmbar) é grande e negativo. Explicação:
  > "O modelo captura tendência e sazonalidade normais. O que sobra no resíduo é o inesperado. Em abril–junho de 2020 há um resíduo fortemente negativo: as internações por diabetes caíram muito abaixo do esperado. Isso **não** significa menos doença — reflete a **suspensão de procedimentos eletivos, o medo de buscar hospital e a subnotificação** durante o pico da pandemia. Pacientes deixaram de internar, o que provavelmente agravou desfechos depois. É um exemplo de como o resíduo de uma decomposição vira um detector de eventos."
- *Pergunta provável:* *"Aditivo ou multiplicativo?"* → Usei aditivo porque a amplitude sazonal é aproximadamente constante ao longo dos anos; se ela crescesse proporcionalmente ao nível da série, o multiplicativo seria mais adequado.

### 11c. Classificador de Risco (Regressão Logística TREINADA)
- **O modelo é treinado de verdade, ao vivo no navegador**, sobre o **Pima Indians Diabetes Dataset** (NIDDK, 768 pacientes reais). Nenhum número é fabricado.
- Pipeline completo (cite na ordem): imputação de ausentes pela mediana (no Pima, zeros em glicose/pressão/insulina são "missing") → **padronização z-score com estatística só do treino** (evita *data leakage*) → split **estratificado** 70/30 → **gradiente descendente** (entropia cruzada) → avaliação no teste.
- Função **sigmoide** transforma o log-odds em probabilidade [0,1]. O gráfico de **contribuição por feature** é explicabilidade (espírito do SHAP).
- **Coeficientes aprendidos batem com a fisiopatologia:** Glicose domina, seguida de IMC e nº de gestações. Isso é prova de que o modelo aprendeu sinal real, não ruído — ótimo ponto a destacar.
- **Ressalva honesta (diga antes que perguntem):** é um dataset-benchmark internacional (mulheres Pima), usado para demonstrar o *pipeline*. O re-treino com microdados da **PNS 2019** (população brasileira) é o próximo passo, documentado no roadmap.
- *Pergunta provável:* *"Por que Pima e não dado brasileiro?"* → Microdado da PNS exige processamento offline com pesos amostrais complexos; o Pima é real, citável e permite um pipeline reproduzível no navegador. A metodologia é idêntica; só troca a base.

### 11d. Avaliação do Modelo (números reais, calculados ao vivo)
- **Matriz de confusão, ROC e AUC são saída real do modelo no conjunto de teste** — recalculados a cada carregamento (seed fixa garante reprodutibilidade). Os valores exibidos no painel são os verdadeiros; confira na hora.
- **Métricas:** acurácia pode enganar em classes desbalanceadas → por isso reporto também **precisão, recall, F1 e AUC**.
- **Recall (sensibilidade) é a métrica crítica em saúde:** um falso negativo (não identificar quem tem risco) é mais grave que um falso positivo. Priorizaria recall, ajustando o limiar de decisão abaixo de 0,50 se preciso.
- **ROC-AUC** (≈ 0,82): probabilidade de o modelo ranquear um positivo acima de um negativo; 0,5 é aleatório, 1,0 é perfeito.
- *Pergunta provável:* *"Por que a acurária não é altíssima?"* → O Pima é reconhecidamente difícil; AUC ~0,82 com regressão logística é resultado consistente com a literatura. Modelos não-lineares (Random Forest/XGBoost) no roadmap tendem a melhorar — mas perdem interpretabilidade.
- *Pergunta provável:* *"Por que acurácia sozinha não basta?"* → Se 65% da amostra fosse negativa, um modelo que sempre diz "não" teria 65% de acurácia e seria inútil. Por isso F1 e AUC.

---

## Encerramento (30 segundos)

> "O painel entrega três camadas: dados consolidados e confiáveis de todas as fontes oficiais; uma análise estatística que conecta fatores de risco e desfechos; e um protótipo preditivo que aponta o caminho da modelagem do Capítulo 6. As principais limitações estão documentadas no próprio painel — divergência entre fontes, estimativas onde a extração ainda corre, e o caráter demonstrativo do modelo. O próximo passo é treinar os modelos com os microdados completos da PNS e da ANS."

---

## Checklist anti-armadilha (decore estas 5)

1. **Correlação ≠ causalidade.**
2. **Vigitel ≠ PNS** (telefônico/capitais vs domiciliar/nacional) — divergência é esperada.
3. **Acurácia engana** em classe desbalanceada → use F1/AUC; em saúde, priorize **recall**.
4. **Resíduo da decomposição = detector de anomalia** (COVID 2020).
5. **IC alarga na extrapolação** — a incerteza da projeção cresce com a distância.

## Limitações a admitir proativamente (admitir antes que perguntem passa segurança)
- Vigitel cobre só capitais; prevalência autorreferida depende de diagnóstico prévio (subestima quem não sabe que tem).
- Alguns valores da ANS são estimativas enquanto a extração dos CSV via LAI é finalizada — sinalizados no painel.
- O modelo de ML é **treinado de verdade**, mas sobre o Pima (benchmark internacional); o re-treino com microdados da PNS é o próximo passo.
- Carga absoluta por UF é aproximação ilustrativa (prevalência de adultos × população total) — declarado no próprio gráfico.
- A projeção OLS no tempo tem resíduos autocorrelacionados; o IC 95% é otimista (limite inferior da incerteza). Declarado no painel.
- Os filtros (Ano, Região, Sexo) recortam de verdade os gráficos que têm aquela dimensão; recortes muito pequenos (ex.: região Sul = 3 UFs) reduzem o poder estatístico — e o painel avisa "amostra insuficiente".

## Novidades técnicas desta versão (para destacar à banca)
- **Modelo treinado ao vivo** (regressão logística, gradiente descendente) sobre dado clínico real — sem números fabricados.
- **Métricas reais**: matriz de confusão, ROC e AUC computadas no conjunto de teste, reprodutíveis.
- **Rigor estatístico**: correlações agora com **IC 95% (z de Fisher)** e **p-valor (distribuição t via beta incompleta)**.
- **Filtros funcionais** (Ano/Região/Sexo) que recortam os dados e **recalculam estatísticas** em tempo real.
- **Ressalvas metodológicas** visíveis nos gráficos sensíveis (autocorrelação, falácia ecológica, limitação do mapa).
- **Exportação CSV** dos dados subjacentes.
