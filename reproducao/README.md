# Reprodução e verificação dos resultados

Esta pasta reúne três coisas: os *scripts* que produziram os dados e os modelos do TCC, as respostas originais das fontes (`fontes/`) e as verificações que permitem conferir os números publicados a partir delas.

## Scripts originais (extração e modelagem)

| Script | O que faz | Produto |
|--------|-----------|---------|
| `baixar_anual_mortalidade.py` | Monta a consulta ao TabNet do SIM (`sim/cnv/obt10br.def`; Grupo CID-10 47 = E10–E14; óbitos por residência; 2000–2026) e lê a tabela de resposta | Óbitos anuais por diabetes → `mortalidade` em `data.js` |
| `baixar_sim_dim.py` | Mesma consulta, para um único ano, com uma dimensão na linha da tabela (região ou faixa etária) | Perfis da mortalidade → `mortalidadeRegiao`, `mortalidadeFaixaEtaria` |
| `baixar_sih.py` | Consulta ao TabNet do SIH/SUS (`sih/cnv/niuf.def`; Lista de Morbidade CID-10 124 = diabetes; 2010–2025, por ano de processamento), com o número de internações ou o valor total | `internacoes` em `data.js` |
| `rodar_sarima.py` | Ajusta o SARIMA(1,1,1)(1,1,1)12 à série mensal de óbitos (2015–2020), faz a avaliação retrospectiva de 2020 e prevê 18 meses | `serie_mensal.js` |
| `rodar_pns.py` | Lê os microdados da PNS 2019 nas posições do *input* SAS oficial e treina a regressão logística, o *Random Forest* e o XGBoost, com validação cruzada estratificada em 5 partições | `pns_results.js` |

Os três `baixar_*.py` funcionam em duas etapas:

1. `build` grava o corpo da requisição em `dados_brutos/`.
2. `parse` lê o HTML devolvido pelo TabNet.

Entre as duas, a requisição é enviada por `curl` ao tabulador. Por exemplo, para a série anual (executar dentro de `reproducao/`):

```bash
python baixar_anual_mortalidade.py build
curl -s -X POST --data-binary @dados_brutos/post_anual.txt \
     "http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sim/cnv/obt10br.def" -o dados_brutos/anual_result.html
python baixar_anual_mortalidade.py parse
```

Os *scripts* usam caminhos relativos (`dados_brutos/`, `../serie_mensal.js`) e devem ser executados de dentro de `reproducao/`. O `rodar_pns.py` é a exceção e pode ser executado de qualquer pasta.

Os *scripts* estão como foram recebidos do autor; o histórico do git registra a versão original. A única alteração foi no `rodar_pns.py`: ele procurava os microdados numa pasta `notebooks/` e agora usa a sua própria pasta (`reproducao/dados_brutos/`). Com os mesmos dados, a saída é idêntica à do original.

### O que foi verificado nesta revisão

| Script | Verificação | Resultado |
|--------|-------------|-----------|
| `rodar_sarima.py` | Executado sobre os 72 valores mensais versionados em `serie_mensal.js` | Regenera o arquivo publicado com fonte, modelo, AIC, previsões e intervalos idênticos. Só a avaliação retrospectiva difere: MAPE 10,3% e RMSE 801 aqui, contra 9,9% e 775 publicados. A diferença vem da versão do *statsmodels*: o modelo de 2015–2019 é reestimado e o otimizador converge para um ponto ligeiramente diferente. O Cap. 5 do TCC relata essa faixa (9,9% a 10,3%) |
| `rodar_pns.py` | Executado sobre microdados sintéticos no layout da PNS, apenas como teste de código | Roda de ponta a ponta e gera `pns_results.js` com as mesmas chaves do arquivo publicado. Não foi executado aqui com os microdados reais, porque o site do IBGE não é acessível deste ambiente |
| `modelagem_pns.ipynb` × `rodar_pns.py` | Os dois executados sobre a mesma base sintética | Resultados idênticos em todas as chaves: métricas, ROC, matriz de confusão, razões de chances e importâncias |
| `baixar_*.py` | Etapa `build` executada; etapa `parse` testada com uma tabela HTML de exemplo | Corpos das requisições gerados e tabela lida corretamente. As consultas não foram reenviadas ao TabNet, porque o DATASUS não é acessível deste ambiente |

Os dois *scripts* da PNS leem o peso amostral, mas nenhum o usa no treinamento. Os modelos são ajustados sem ponderação, e o desbalanceamento das classes é tratado por `class_weight='balanced'`.

## Respostas originais das fontes (`fontes/`)

| Pasta | Conteúdo |
|-------|----------|
| `fontes/tabnet/` | 15 tabelas HTML devolvidas pelo TabNet (SIM, SIH/SUS e população), como foram salvas na extração. Cada página registra, ao final, a consulta enviada: arquivo `.def`, linha, coluna, incremento, filtros e período |
| `fontes/sih/` | Saídas do `baixar_sih.py` (internações e valor total por ano) |
| `fontes/sim/` | Série mensal de óbitos 2015–2020, entrada do `rodar_sarima.py` |
| `fontes/pns/` | Saídas da reanálise dos microdados da PNS 2019: prevalência por cor ou raça (`pns_raca.json`) e registro da execução do `rodar_pns.py` (`pns_run.log`) |

`verificar_fontes.js` lê essas respostas e confere, bloco a bloco, os valores de `data.js`, `serie_mensal.js` e `pns_results.js`. As taxas por UF, por região e padronizadas por idade são recalculadas a partir das contagens. A conferência inclui também a coerência entre extrações: a soma dos 12 meses da série mensal reproduz o total anual de cada ano de 2015 a 2020.

```bash
node reproducao/verificar_fontes.js     # 20 de 20 blocos conferem com as fontes
```

## Verificações a partir dos dados versionados

| Arquivo | O que faz | Requer |
|---------|-----------|---------|
| `reproduzir_resultados.js` | Recalcula os resultados do Capítulo 6: testes das hipóteses H1–H5, verificações de robustez (correlação sem a tendência e em primeiras diferenças, Spearman, exclusão do DF, LOOCV, VIF), perfis da prevalência, da mortalidade e das internações, decomposição da série mensal, comparação do SARIMA com a referência ingênua sazonal e métricas dos modelos | Node.js 18+ |
| `verificar_logistica.js` | Treina a regressão logística do painel (Pima) exatamente como no navegador e compara os coeficientes do gradiente descendente com a solução exata de máxima verossimilhança (Newton-Raphson) | Node.js 18+ |
| `verificar_sarima.py` | Reestima o SARIMA a partir de `serie_mensal.js` e compara o AIC, as previsões e a avaliação retrospectiva com os valores publicados | Python 3.10+ e `requirements.txt` |
| `modelagem_pns.ipynb` | Versão em *notebook* do `rodar_pns.py`, com as etapas explicadas. Mesmos filtros, divisão e modelos; localiza as colunas pelo dicionário da PNS em vez das posições fixas | Python, `requirements.txt` e os microdados da PNS 2019 |
| `rodar_pns_raca.py` | Reconstrução do cálculo da prevalência por cor ou raça (o código original não foi preservado), com a comparação com `fontes/pns/pns_raca.json`. Calcula também a especificação do indicador oficial do IBGE | Python e os microdados da PNS 2019 |
| `colab_verificacao_pns.ipynb` | Executa `rodar_pns.py` e `rodar_pns_raca.py` no Google Colab sobre os microdados guardados no Google Drive e compara os resultados com os publicados | Conta Google com os microdados no Drive |

Os scripts em JavaScript carregam os mesmos arquivos e as mesmas funções estatísticas do painel (`data.js`, `charts.js`, `ml.js`...). Portanto, não existe uma segunda implementação que possa divergir da que roda no navegador.

```bash
# na raiz do repositório
node reproducao/reproduzir_resultados.js                 # resumo no terminal
node reproducao/reproduzir_resultados.js resultados.json # também grava o JSON completo
node reproducao/verificar_logistica.js

pip install -r reproducao/requirements.txt
python reproducao/verificar_sarima.py
```

Nenhum desses comandos acessa a rede.

### Resultados esperados

| Verificação | Resultado |
|-------------|-----------|
| H1 — tendência da prevalência (Vigitel, 2006–2024) | 0,333 p.p./ano (IC 95%: 0,262 a 0,404); R² = 0,861; p < 0,001 |
| H2 — excesso de peso × diabetes | r = 0,933 (IC 95%: 0,825 a 0,975); sem a tendência linear: r = 0,269 (p = 0,280) |
| H3 — prevalência × mortalidade nas UFs | r = 0,185 (IC 95%: −0,209 a 0,528; p = 0,354); Spearman: 0,161 (p = 0,424) |
| H4 — regressão logística (Pima) | AUC = 0,848 no teste (n = 231); PNS 2019: AUC = 0,779 |
| H5 — preditores mais importantes (Pima) | Glicose (1,158) e IMC (0,628) |
| Gradiente descendente × Newton-Raphson | Nove coeficientes iguais até a 3ª casa decimal (diferença máxima ≈ 4 × 10⁻¹¹) |
| SARIMA — AIC e previsões de 2021–2022 | Reproduzidos exatamente (AIC 643,7; total de 2021: 78.462) |
| SARIMA — avaliação retrospectiva em 2020 | MAPE entre 9,9% e 10,3% (RMSE entre 753 e 801), conforme a configuração e a versão do *statsmodels*; publicado: 9,9% e 775. Referência ingênua sazonal: MAPE 12,0% |

## Dados de entrada não versionados

- **Microdados da PNS 2019** (`PNS_2019.txt`, cerca de 434 MB, e o dicionário `.xls`): são públicos no site do IBGE. Para executar `rodar_pns.py` ou o *notebook*, coloque-os em `reproducao/dados_brutos/` (pasta ignorada pelo git).
- **Série mensal de óbitos** (`dados_brutos/serie_mensal_obitos.json`, entrada do `rodar_sarima.py`): os mesmos 72 valores estão versionados em `serie_mensal.js`, e `verificar_sarima.py` reestima o modelo a partir deles.

## O que não está nesta pasta

- **Código original da prevalência por cor ou raça** (`pnsRaca` em `data.js`): não foi preservado. A saída original está em `fontes/pns/pns_raca.json`, e `rodar_pns_raca.py` reconstrói o cálculo.
- **Variações dos `baixar_*.py` para os demais recortes**: a versão recebida de `baixar_sim_dim.py` mapeia apenas região e faixa etária, e a de `baixar_sih.py`, apenas o total anual. Para os outros recortes (UF, subtipo da CID-10, cor ou raça, outras causas, região × faixa etária, internações por região e por sexo × faixa etária, amputações e 2026 parcial), a consulta enviada e a resposta do TabNet estão em `fontes/tabnet/` e conferem com `data.js`.
