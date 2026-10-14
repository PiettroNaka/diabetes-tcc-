# Roteiro de Defesa — Dashboard Diabetes no Brasil
**Piettro Pevidor Nakashoji · Ciência de Dados · IESB · 2026**

Documento de apoio para a apresentação à banca. Para cada aba: (1) o que mostrar, (2) o ponto técnico a destacar, (3) perguntas prováveis e como responder. Todos os números abaixo conferem com o painel e com o texto do TCC (Capítulos 4 a 6).

---

## Abertura (30–60 segundos)

> "Meu trabalho integra, em um único painel interativo, dados públicos sobre o diabetes no Brasil que hoje estão dispersos — SIM e SIH do DATASUS, Vigitel, PNS e Censo do IBGE, além do IDF Atlas como referência internacional. O diferencial não é só visualizar: o painel segue o CRISP-DM, aplica inferência estatística com intervalo de confiança e p-valor, padroniza taxas por idade, modela a série mensal de óbitos com SARIMA e avalia modelos de aprendizado de máquina para o risco de diabetes. As estatísticas e as hipóteses são recalculadas no navegador, a partir dos dados."

Números-âncora:
- Prevalência (Vigitel, capitais): **5,5% (2006) → 12,9% (2024)**, +135%; TCAC **4,8% a.a.**
- PNS 2019 (nacional, inclui zona rural): **7,7%** (~12,3 mi de adultos); mulheres 8,4%, homens 6,9%.
- IDF 2021: **15,7 mi** de adultos (20–79), **6º país do mundo**; gasto em saúde **US$ 42,9 bi**, **3º do mundo** (US$ 45,1 bi em 2024).
- SIM: **72.151 óbitos em 2025** (preliminar); pico de **78.258 em 2021** (COVID); **82,7%** dos óbitos com 60 anos ou mais.
- SIH: **153.116 internações em 2025**, **R$ 175,2 mi** (só o componente hospitalar do SUS, valores nominais).

---

## 1. Visão Geral
**Mostrar:** KPIs, evolução da prevalência por sexo (com faixa de IC aproximada), projeção global do IDF e ranking de países.

**Ponto técnico:** todas as séries do Vigitel vêm do relatório **Vigitel Brasil 2006–2024** (Tabelas 1, 47, 51 e 52), já reponderadas pelo Ministério com o Censo 2022 — por isso alguns anos diferem levemente de relatórios antigos (ex.: 2019 = 8,2%).

**Perguntas prováveis:**
- *"De onde vêm os 15,7 milhões?"* → IDF Diabetes Atlas, 10ª ed. (2021): estimativa **modelada**, adultos de 20–79 anos, inclui não diagnosticados. Não é comparável ao autorreferido do Vigitel/PNS. (O antigo "16,8 mi" era da 9ª ed., 2019.)
- *"Por que a faixa de IC é aproximada?"* → Uso erro-padrão binomial com tamanho efetivo fixo de 25 mil entrevistas (n/deff). Os IC oficiais, com o desenho amostral completo, estão nos relatórios do Vigitel.

## 2. Prevalência
**Mostrar:** KPIs de 2024 (total, mulheres 14,3%, homens 11,2%, razão 1,28×, TCAC), recortes por capital, escolaridade, sexo e faixa etária.

**Ponto técnico:** a TCAC usa o **intervalo efetivo de 18 anos** (2006→2024), não o número de observações − 1 (17), porque não houve coleta em 2022.

**Faixa etária e instrução (oficiais, Tabela 51):** 65+ chega a **31,4%** em 2024 (+0,57 pp/ano); sem instrução/fundamental incompleto **24,0%** × superior completo **9,0%** (2,7×). **Capitais (oficial, Vigitel 2023, volume de morbidade referida):** maiores em São Paulo e Brasília (12,1%), Porto Alegre (12,0%), Natal (11,8%) e Fortaleza (11,6%); menor em Rio Branco (5,6%). Esse volume usa a ponderação anterior ao Censo 2022 (total 2023 = 10,2% × 11,4% no relatório 2006–2024) — diga isso se perguntarem por que os números não batem.

## 3. Mortalidade (SIM)
**Mostrar:** série 2000–2025, faixa etária, região (taxa bruta), **bruta × padronizada**, tipo CID-10, raça/cor, comparação com outras causas.

**Ponto técnico (o mais forte da aba):** padronização por idade pelo método direto. O **Norte** tem a **menor taxa bruta (28,2/100 mil)** e a **maior padronizada (41,8/100 mil)**: a população jovem mascara o risco. A escolha do indicador muda a priorização regional.

**Perguntas prováveis:**
- *"E14 em 57,6% dos óbitos?"* → Subespecificação no preenchimento da declaração de óbito; limita a análise por tipo de diabetes.
- *"A causa básica subestima?"* → Sim: o diabetes frequentemente aparece como causa associada (Naghavi et al., 2010).
- *"Raça/cor é risco?"* → Não: os óbitos por raça/cor são **composição**. A medida de risco comparável é a prevalência por raça/cor da PNS (aba Modelagem).

## 4. Internações (SIH/SUS)
**Mostrar:** série 2010–2025 (2026 parcial separado), região, sexo × faixa etária, amputações.

**Ponto técnico:** 2026 (jan–jul) **não** entra na série anual — comparar ano incompleto com anos completos sugeriria queda falsa. Valores são nominais (sem correção monetária) e só do SUS.

**Perguntas prováveis:**
- *"As amputações são todas por diabetes?"* → Não. O cubo de procedimentos do SIH não cruza com o diagnóstico; a série (27,7 mil → 40,8 mil, +47%) é de todas as causas, e isso está explícito no gráfico.
- *"Queda em 2020?"* → Suspensão de eletivas na pandemia (124,6 mil internações).

## 5. Fatores de Risco (Vigitel 2024)
**Mostrar:** obesidade 25,7% (↑118% desde 2006), excesso de peso 62,6%, hipertensão, inatividade por idade e escolaridade.

**Pergunta provável:** *"Correlação prova causalidade?"* → **Não.** A associação temporal entre excesso de peso e diabetes é ecológica; a relação causal é sustentada pela fisiopatologia e por estudos longitudinais. **A resposta mais importante da defesa.**

## 6. Distribuição Geográfica
**Mostrar:** mapa coroplético (D3 + TopoJSON) e comparativo prevalência × mortalidade por UF.

**Pontos técnicos:** o mapa lê **a mesma fonte de dados** dos gráficos (sem cópia própria); classes de **intervalos fixos** (mantêm o significado das cores sob o filtro de região); UFs fora da região filtrada são esmaecidas, não removidas. Limitação: a prevalência da capital representa a UF inteira.

## 7. Vigitel
**Mostrar:** marcos da série (2006 → 2024), evolução conjunta de diabetes, excesso de peso e hipertensão, prevalência por capital em 2023 (oficial).

## 8. PNS / Fontes
**Mostrar:** tabela "quantos diabéticos há no Brasil?", Vigitel × PNS, PNS por sexo e região, edições do IDF, gasto em saúde (IDF) e catálogo de fontes.

**Ponto técnico — o mais valorizado:** Vigitel 2019 (8,1%) × PNS 2019 (7,7%) **não é erro**: telefônico/capitais × domiciliar/nacional. E a PNS com exames (2014–15) indica 8,4% quando se inclui o diagnóstico laboratorial (Malta et al., 2019) — o subdiagnóstico existe.

**Pergunta provável:** *"Qual número é o certo?"* → Depende da pergunta: tendência nas capitais → Vigitel; estimativa nacional → PNS; carga total incluindo não diagnosticados → IDF (modelada).

**Fonte excluída:** ANS/D-TISS foi avaliada e **excluída na auditoria**. Na resposta ao pedido LAI (NUP 25072.015811/2026-30, 13/04/2026), a própria ANS informou que recebe a CID só nas internações, e de forma opcional, e que nos atendimentos ambulatoriais está **impedida por decisão judicial desde 2010** de exigi-la (ACP nº 2007.51.01.022606-4). Sem CID, não há como isolar o diabetes. Os indicadores estimados de versões antigas foram removidos.

## 9. Análise Estatística
**Mostrar:** CRISP-DM, correlações com IC e p, projeção OLS, matriz de correlação, distribuição por região, bolhas, carga estimada, estatística descritiva.

**Pontos técnicos:**
- **H1:** inclinação **+0,333 pp/ano**, R² = 0,861, p < 0,001 — o próprio relatório (Tabela 52, mesmo método: regressão do indicador sobre o ano) publica **+0,35 pp/ano (IC 0,25–0,44)**. Validação cruzada com a fonte oficial.
- **H2:** r = **0,933** (excesso de peso × diabetes, n = 18 anos), p < 0,001 — mas séries que crescem juntas compartilham tendência: é **coevolução**, não efeito individual.
- **H3: refutada.** Com a prevalência oficial das capitais, r = **0,185** (p = 0,35; IC 95% −0,21 a 0,53; Spearman 0,16). Prevalência autorreferida na capital e mortalidade bruta da UF medem coisas diferentes: a mortalidade depende da estrutura etária, do acesso ao cuidado e do interior, que a capital não representa. **Ponto forte da defesa:** a versão anterior do painel, com valores não verificados, mostrava r = 0,51 — a auditoria dos dados mudou a conclusão, e isso é ciência de dados funcionando.
- O p-valor da distribuição t é calculado em JavaScript pela **função beta incompleta regularizada** (Numerical Recipes).
- A **carga estimada** superestima (prevalência de adultos × população total) e serve apenas para **ordenar** UFs — está escrito no gráfico.

**Pergunta provável:** *"Por que Pearson e não Spearman?"* → Relação aproximadamente linear nas séries; Spearman seria a alternativa robusta a não linearidade e outliers.

## 10. Modelagem Preditiva (ML) — a aba que decide a nota
**Ordem sugerida:** projeção com IC → decomposição → SARIMA → classificador Pima → avaliação → modelo ecológico → modelos da PNS → raça/cor.

### 10a. Projeção com IC (OLS)
- IC 95% da **resposta média**: `ŷ ± t(0,975;16)·s·√(1/n + (x₀−x̄)²/Sxx)`, com t = 2,120. A banda alarga na extrapolação.
- Ressalvas: não é intervalo de predição; resíduos autocorrelacionados → IC otimista; a série acelera (2024 acima da reta). É **cenário de referência**, não previsão.

### 10b. Decomposição clássica (óbitos mensais, 2015–2020)
- Aditiva, tendência por **média móvel 2×12**.
- **Sazonalidade de inverno:** pico em julho (+674 óbitos/mês) e maio–agosto acima da média; vale em fevereiro (−705).
- **Anomalia COVID:** resíduos **positivos** em abril (+480) e maio de 2020 (+969, cerca de 4 desvios-padrão) — **excesso de óbitos**, não queda. Em 2020, os óbitos subiram 13,5% em relação a 2019. "O resíduo vira detector de eventos."

### 10c. SARIMA(1,1,1)(1,1,1)₁₂
- Parcimônia: 72 meses, 59 efetivos após as duas diferenciações. AIC 643,7.
- **Backtest** nos 12 meses de 2020 (o ano mais difícil): MAPE 9,9%.
- **Validação externa:** a soma das previsões de 2021 dá **78.462** contra **78.258 observados** no SIM (**erro de 0,3%**). Esse ano não foi usado no ajuste.
- Reprodutibilidade: reestimei com statsmodels e obtive o mesmo AIC e as mesmas previsões.

### 10d. Classificador Pima (treinado ao vivo)
- Pipeline **sem vazamento**: split estratificado 70/30 (semente 42; 537 de treino e 231 de teste) **antes** de tudo → imputação pela mediana do treino (glicose 117, PA 72, pele 28, insulina 125, IMC 32) → z-score com estatísticas do treino → gradiente descendente (η = 0,1; 4.000 épocas).
- **Convergência verificada:** os coeficientes coincidem com a solução exata de máxima verossimilhança (Newton/IRLS) até a 3ª casa decimal.
- Resultados no teste: **AUC 0,848**, AP 0,716, acurácia 80,5%, sensibilidade 60,5%, especificidade 91,3%, F1 0,685.
- OR por desvio-padrão: **glicose 3,18**, IMC 1,87, gestações 1,54, pedigree 1,48 → H5 confirmada.
- Ressalva: o Pima é benchmark internacional (mulheres Pima). A validação com dados brasileiros é a PNS.

### 10e. Modelos PNS 2019 (n = 6.089; 1.827 de teste; prevalência 9,2%)
- Logística (AUC teste 0,779; CV 0,770 ± 0,018) ≈ Random Forest (0,746) ≈ XGBoost (0,752) → com 4 preditores, o modelo **linear e interpretável empata ou vence**.
- Pesos de classe balanceados: sensibilidade 70% × precisão 19% — perfil de **triagem** em baixa prevalência; por isso mostro a curva PR.
- OR por DP: **idade 2,07**, hipertensão 1,60, IMC 1,26, sexo feminino 1,05.

### 10f. Modelo ecológico
- Prevalência ~ excesso de peso + hipertensão (n = 18): R² 0,927; R² ajustado 0,917; **RMSE LOOCV 0,66 pp**. Multicolinearidade → interpretar o ajuste, não os coeficientes.

---

## Encerramento (30 segundos)
> "O painel entrega três camadas: dados oficiais integrados e auditados, com a origem de cada número; uma análise estatística que trata padronização, falácia ecológica e autocorrelação; e modelos preditivos avaliados com métricas adequadas e validação externa. As limitações estão no próprio painel, junto dos resultados."

## Checklist anti-armadilha
1. **Correlação ≠ causalidade** — e correlação entre séries que crescem juntas pode ser só tendência comum.
2. **Vigitel ≠ PNS ≠ IDF** — métodos e universos diferentes; triangular.
3. **Taxa bruta ≠ padronizada** — o Norte inverte de posição.
4. **Acurácia engana** em classe desbalanceada → AUC, AP, sensibilidade e especificidade.
5. **IC alarga na extrapolação** e é otimista com autocorrelação.

## Limitações a admitir antes que perguntem
- Prevalência autorreferida subestima quem não tem diagnóstico.
- Vigitel cobre só capitais; o mapa usa a capital para a UF inteira. A prevalência por capital (2023) usa a ponderação anterior ao Censo 2022.
- O relatório não cruza idade/instrução com sexo e não ajusta o gradiente de instrução por idade.
- Reanálise da PNS por raça/cor dá 8,6% no total (oficial: 7,7%) → uso só para comparação relativa entre grupos.
- Imputação por mediana reduz a variabilidade da insulina (48,7% de zeros) e da prega cutânea.
- Internações em valores nominais e só no SUS; amputações de todas as causas.
- Dados do SIM de 2024–2025 preliminares.
