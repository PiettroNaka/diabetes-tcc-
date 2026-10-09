# Diabetes no Brasil — Dashboard Epidemiológico

Dashboard interativo sobre a epidemiologia do diabetes no Brasil, desenvolvido como Trabalho de Conclusão de Curso (TCC) em Ciência de Dados — IESB.

**🔗 No ar:** https://diabetes-tcc.vercel.app/

---

## Sobre

Painel web estático (sem backend) que reúne, de forma navegável, os principais indicadores do diabetes no Brasil: prevalência, mortalidade, internações, fatores de risco, complicações, distribuição geográfica e modelagem preditiva. Todos os dados são **reais e rastreáveis** — nenhum valor sintético.

## Fontes de dados (todas oficiais)

| Fonte | Órgão | Uso | Período |
|-------|-------|-----|---------|
| **SIM** | DATASUS/MS | Mortalidade (CID-10 E10–E14) | 1996–2024 |
| **SIH/SUS** | DATASUS/MS | Internações e procedimentos hospitalares | 2008–2026* |
| **Vigitel** | Ministério da Saúde | Fatores de risco autorreferidos (capitais) | 2006–2024 |
| **PNS** | IBGE + Fiocruz | Inquérito domiciliar nacional | 2013, 2019 |
| **IDF Diabetes Atlas** | Federação Internacional de Diabetes | Estimativas globais | 9ª–11ª ed. |
| **Censo** | IBGE | População (denominadores de taxas) | 2022 |

Os dados do DATASUS foram extraídos via **TabNet** (os scripts de ETL estão em `notebooks/`, fora deste repositório por tamanho). O modelo de risco é treinado **ao vivo no navegador** sobre o Pima Indians Diabetes Dataset (NIDDK).

## Abas

Visão Geral · Prevalência · Mortalidade · Internações · Fatores de Risco · Complicações · Distribuição Geográfica · Vigitel · PNS/Fontes · Análise Estatística · Modelagem Preditiva (ML) · Síntese & Conclusões

## Tecnologia

- **HTML + CSS + JavaScript** puro (site estático, sem build)
- **Chart.js 4.4** para gráficos · **D3 + TopoJSON** para o mapa coroplético
- Estatística implementada em JS: correlação de Pearson (IC de Fisher, p-valor), regressão OLS, decomposição de série temporal, SARIMA
- Paleta acessível (Okabe-Ito, segura para daltônicos)

## Como executar localmente

É um site estático — basta servir a pasta:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`. (O mapa usa `fetch` de um CDN, então precisa ser servido por HTTP, não aberto via `file://`.)

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

---

*TCC — Ciência de Dados · IESB · 2026*
