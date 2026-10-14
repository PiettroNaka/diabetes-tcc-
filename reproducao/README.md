# Reprodução e verificação dos resultados

Esta pasta permite conferir, a partir dos arquivos versionados no repositório, os números apresentados no TCC e no painel.

| Arquivo | O que faz | Requer |
|---------|-----------|---------|
| `reproduzir_resultados.js` | Recalcula os resultados do Capítulo 6: testes das hipóteses H1–H5, verificações de robustez (correlação sem a tendência e em primeiras diferenças, Spearman, exclusão do DF, LOOCV, VIF), perfis da prevalência, da mortalidade e das internações, decomposição da série mensal, comparação do SARIMA com a referência ingênua sazonal e métricas dos modelos | Node.js 18+ |
| `verificar_logistica.js` | Treina a regressão logística do painel (Pima) exatamente como no navegador e compara os coeficientes do gradiente descendente com a solução exata de máxima verossimilhança (Newton-Raphson) | Node.js 18+ |
| `verificar_sarima.py` | Reestima o SARIMA(1,1,1)(1,1,1)12 a partir de `serie_mensal.js` e compara o AIC, as previsões e a avaliação retrospectiva com os valores publicados | Python 3.10+ e `requirements.txt` |
| `modelagem_pns.ipynb` | Treina a regressão logística, o *Random Forest* e o XGBoost sobre os microdados da PNS 2019 e exporta `pns_results.js` | Python, `requirements.txt` e os microdados da PNS 2019 |

Os scripts em JavaScript carregam os mesmos arquivos e as mesmas funções estatísticas do painel (`data.js`, `charts.js`, `ml.js`...). Portanto, não existe uma segunda implementação que possa divergir da que roda no navegador.

## Como executar

Na raiz do repositório:

```bash
node reproducao/reproduzir_resultados.js                 # resumo no terminal
node reproducao/reproduzir_resultados.js resultados.json # também grava o JSON completo
node reproducao/verificar_logistica.js

pip install -r reproducao/requirements.txt
python reproducao/verificar_sarima.py
```

Nenhum desses comandos acessa a rede.

## Resultados esperados

| Verificação | Resultado |
|-------------|-----------|
| H1 — tendência da prevalência (Vigitel, 2006–2024) | 0,333 p.p./ano (IC 95%: 0,262 a 0,404); R² = 0,861; p < 0,001 |
| H2 — excesso de peso × diabetes | r = 0,933 (IC 95%: 0,825 a 0,975); sem a tendência linear: r = 0,269 (p = 0,280) |
| H3 — prevalência × mortalidade nas UFs | r = 0,185 (IC 95%: −0,209 a 0,528; p = 0,354); Spearman: 0,161 (p = 0,424) |
| H4 — regressão logística (Pima) | AUC = 0,848 no teste (n = 231); PNS 2019: AUC = 0,779 |
| H5 — preditores mais importantes (Pima) | Glicose (1,158) e IMC (0,628) |
| Gradiente descendente × Newton-Raphson | Nove coeficientes iguais até a 3ª casa decimal (diferença máxima ≈ 4 × 10⁻¹¹) |
| SARIMA — AIC e previsões de 2021–2022 | Reproduzidos exatamente (AIC 643,7; total de 2021: 78.462) |
| SARIMA — avaliação retrospectiva em 2020 | MAPE entre 9,9% e 10,3% (RMSE entre 753 e 801), conforme as restrições do otimizador; publicado: 9,9% e 775. Referência ingênua sazonal: MAPE 12,0% |

No SARIMA, o modelo publicado foi estimado sem impor estacionariedade e invertibilidade (`enforce_stationarity=False`, `enforce_invertibility=False`). Com essa configuração, o AIC e as previsões coincidem com os publicados. A avaliação retrospectiva é mais sensível ao otimizador e à versão do *statsmodels*, por isso o script a relata nas duas configurações.

## Notebook da PNS 2019

`modelagem_pns.ipynb` é o *notebook* de modelagem do autor. Esta cópia tem quatro alterações:

- a seção 9, que exporta a curva ROC, a matriz de confusão e as razões de chances por desvio-padrão no formato de `pns_results.js`;
- a correção do texto da seção 4: o peso amostral é lido, mas não entra no treinamento dos modelos;
- a atualização dos pré-requisitos e do cabeçalho;
- a remoção de um "próximo passo" que já foi realizado.

Os microdados (`PNS_2019.txt` e `dicionario_PNS_microdados_2019.xls`) são públicos no site do IBGE e não são versionados. Para executar o *notebook*, coloque-os em `reproducao/dados_brutos/` e rode-o a partir desta pasta.

## O que não está nesta pasta

- **Scripts de extração do TabNet** (`baixar_anual_mortalidade.py`, `baixar_sim_dim.py`, `baixar_sih.py`) e os scripts `rodar_sarima.py` e `rodar_pns.py`, executados localmente pelo autor. Seus produtos estão versionados na raiz: `data.js`, `serie_mensal.js` e `pns_results.js`. As consultas realizadas (arquivos `.def` do TabNet, linhas, colunas e filtros) estão descritas no `README.md` principal e no Capítulo 4 do TCC.
- **Prevalência da PNS 2019 por raça/cor** (`pnsRaca` em `data.js`): foi estimada com os pesos amostrais pelo `rodar_pns.py` e não é recalculada pelo *notebook*.
