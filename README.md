# Diabetes no Brasil — Dashboard Epidemiológico

Dashboard interativo sobre a epidemiologia do diabetes no Brasil, desenvolvido como Trabalho de Conclusão de Curso (TCC) em Ciência de Dados — IESB.

**🔗 No ar:** https://diabetes-tcc.vercel.app/

---

## Sobre

Painel web estático (sem backend) que reúne, de forma navegável, os principais indicadores do diabetes no Brasil: prevalência, mortalidade, internações, fatores de risco, distribuição geográfica, análise estatística e modelagem preditiva. Todo valor é rastreável à sua fonte e classificado como **oficial**, **preliminar** ou **estimado**; valores ainda em conferência com a fonte oficial aparecem marcados como **provisórios** no painel.

## Fontes de dados (todas oficiais)

| Fonte | Órgão | Uso | Período |
|-------|-------|-----|---------|
| **SIM** | DATASUS/MS | Mortalidade (CID-10 E10–E14) | 2000–2025 (mensal 2015–2020) |
| **SIH/SUS** | DATASUS/MS | Internações e procedimentos hospitalares | 2010–2026* |
| **Vigitel** | Ministério da Saúde | Fatores de risco autorreferidos (capitais) | 2006–2024 |
| **PNS** | IBGE + Fiocruz | Inquérito domiciliar nacional | 2013, 2019 |
| **IDF Diabetes Atlas** | Federação Internacional de Diabetes | Estimativas globais | 9ª–11ª ed. |
| **Censo / estimativas** | IBGE / MS | População (denominadores de taxas) | 2022; 2024 |
| **Pima Indians Diabetes** | NIDDK | Dados clínicos (benchmark de ML) | — |

*2026 parcial (jan–jul), fora das séries anuais. A ANS/D-TISS foi avaliada (LAI NUP 25072.015811/2026-30) e excluída na auditoria: segundo a resposta da ANS (13/04/2026), a CID é opcional nas internações e não pode ser exigida nos atendimentos ambulatoriais (decisão judicial desde 2010), o que impede isolar o diabetes.

Os dados do DATASUS foram extraídos via **TabNet** (os scripts de ETL estão em `notebooks/`, fora deste repositório por tamanho). O modelo de risco é treinado **ao vivo no navegador** sobre o Pima Indians Diabetes Dataset (NIDDK).

## Abas

Visão Geral · Prevalência · Mortalidade · Internações · Fatores de Risco · Distribuição Geográfica · Vigitel · PNS/Fontes · Análise Estatística · Modelagem Preditiva (ML) · Síntese & Conclusões (11 abas)

## Tecnologia

- **HTML + CSS + JavaScript** puro (site estático, sem build)
- **Chart.js 4.4** para gráficos · **D3 + TopoJSON** para o mapa coroplético
- Estatística implementada em JS: correlação de Pearson (IC de Fisher, p-valor via beta incompleta), regressão OLS simples e múltipla com LOOCV, decomposição clássica (MM 2×12), regressão logística por gradiente descendente
- Em Python (fora do repositório): extração TabNet, SARIMA (statsmodels) e modelos sobre a PNS 2019 (scikit-learn, XGBoost)
- Bibliotecas incorporadas em `vendor/` — funciona sem internet
- Paleta acessível (Okabe-Ito, segura para daltônicos)

## Como executar localmente

É um site estático — basta servir a pasta:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`. (O mapa carrega `vendor/bra.topo.json` via `fetch`, então a pasta precisa ser servida por HTTP, não aberta via `file://`.)

## Estrutura

```
index.html        — página única com todas as abas
style.css         — estilos
data.js           — dados reais (séries extraídas das fontes oficiais)
charts.js         — renderização dos gráficos e funções estatísticas
map.js            — mapa coroplético (D3/TopoJSON)
ml.js + pima.js   — modelo de regressão logística treinado ao vivo
serie_mensal.js   — série mensal real de óbitos (decomposição/SARIMA)
pns_results.js    — resultados do modelo sobre microdados da PNS 2019
app.js            — navegação, filtros e exportação CSV
ROTEIRO_DEFESA.md — roteiro de apresentação da banca
```

## Metodologia e reprodutibilidade

### Extração dos dados do DATASUS (TabNet)
O FTP do DATASUS fica indisponível em muitos ambientes, então os dados foram extraídos do **TabNet** por requisições HTTP POST (via `curl`), parseando o HTML de resposta. Scripts em `notebooks/` (fora deste repositório por tamanho — ~473 MB com os microdados):

| Script | Base (def TabNet) | Saída |
|--------|-------------------|-------|
| `baixar_anual_mortalidade.py` | `sim/cnv/obt10br.def` (SIM) | óbitos anuais por diabetes (E10–E14, Grupo 47) |
| `baixar_sim_dim.py` | `sim/cnv/obt10br.def` / `obt10uf.def` | óbitos por faixa etária, região, UF, CID, raça/cor |
| `baixar_sih.py` | `sih/cnv/niuf.def` / `qiuf.def` (SIH) | internações e custo (Lista Morb 124) e amputações de MMII |
| `rodar_pns.py` | microdados PNS 2019 (IBGE) | modelos (Logística/RF/XGBoost), ROC, matriz de confusão, prevalência por raça |
| `rodar_sarima.py` | série mensal SIM | decomposição e SARIMA |
| população | `ibge/cnv/popsvs2024br.def` | denominadores por região × faixa etária (padronização) |

### Dicionário de dados (principais blocos de `data.js`)

| Bloco | Conteúdo | Fonte / ano |
|-------|----------|-------------|
| `vigitel2024` / `vigitelDM` | prevalência de DM (por sexo e total), excesso de peso, hipertensão | Vigitel 2006–2024 (SVSA/MS); total de DM e hipertensão = 0,54·fem + 0,46·masc (exato em 2006 e 2024) |
| `mortalidade` | óbitos anuais por diabetes | SIM/DATASUS 2000–2025 (prelim.) |
| `mortalidadeFaixaEtaria` / `Regiao` / `CID` / `Raca` | óbitos por faixa, região, subtipo E10–E14, raça | SIM 2025 |
| `mortalidadePadronizada` | taxa bruta × **padronizada por idade** (método direto) | SIM 2025 ÷ pop IBGE/SVS 2024 |
| `internacoes` | internações e custo (AIH) + 2026 parcial (jan–jul) | SIH/SUS 2010–2026 |
| `estadosPrevalencia` | prevalência (capital — **provisória**, em conferência) e mortalidade por UF; fonte única também do mapa | Vigitel + SIM 2025 + Censo 2022 |
| `pns` / `pnsRegiao` / `pnsRaca` | prevalência nacional e por sexo (IBGE), por região, e por raça/cor (reanálise dos microdados) | PNS 2013 e 2019 |
| `idfTopPaises` / `idfGlobal` / `idfEdicoes` / `idfGasto` | ranking (Brasil 15,7 mi, 6º), projeções, edições e gasto em saúde (Brasil US$ 42,9 bi, 3º) | IDF Diabetes Atlas 9ª–11ª ed. |

### Padronização por idade (método direto)
Taxa padronizada de cada região = Σ (taxa específica por faixa etária × peso da faixa na **população-padrão nacional**). Remove o efeito da estrutura etária, permitindo comparar regiões com perfis demográficos diferentes.

### Modelos de machine learning
- **Pima (interativo):** regressão logística treinada ao vivo no navegador (gradiente descendente) sobre o Pima Indians Diabetes Dataset (NIDDK) — demonstra o pipeline de ponta a ponta.
- **PNS 2019 (nacional):** Logística × Random Forest × XGBoost em Python (scikit-learn), validação cruzada k=5, split estratificado 70/30, seed fixa. Exporta AUC, curva ROC, matriz de confusão e coeficientes (`pns_results.js`).

> **Nota:** nenhum dado é sintético. Estimativas (IDF, carga por UF, totais calculados do Vigitel) estão sinalizadas como tal, e valores ainda não conferidos com o relatório oficial aparecem como **provisórios**.

---

*TCC — Ciência de Dados e Inteligência Artificial · IESB · 2026*
