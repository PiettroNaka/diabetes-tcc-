// ============================================================
// DADOS EPIDEMIOLÓGICOS — DIABETES NO BRASIL
// Fontes: DATASUS/SIM (2000–2025), DATASUS/SIH (2010–2026), Vigitel/MS
//         2006–2024, PNS 2013/2019 (IBGE), Censo 2022 (IBGE), IDF Diabetes
//         Atlas (9ª–11ª ed.), Pima Indians Diabetes Dataset (NIDDK).
// ANS/D-TISS avaliada e EXCLUÍDA na auditoria (sem dado primário com recorte
// de diabetes; pedido LAI NUP 25072.015811/2026-30).
// ============================================================

const DATA = {

  // ── VIGITEL BRASIL 2006–2024 (SVSA/MS, 2025) — DADO OFICIAL ──────────────
  // Transcrito do relatório "Vigitel Brasil 2006-2024" (213 p.). Percentuais
  // ponderados (método rake) do conjunto das 26 capitais + DF. 2022 sem coleta.
  //   Diabetes: Tabela 51 (total, sexo, idade, instrução) · Tabela 52 (variação anual)
  //   Excesso de peso: Tabela 1 · Hipertensão: Tabela 47 · Entrevistas: Quadro 1
  vigitelDM: { // diabetes — Tabela 51
    years: [2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2023,2024],
    masc:  [4.6,5.4,5.7,5.8,6.2,5.9,6.7,6.9,7.6,7.4,8.7,7.8,7.8,7.8,8.0,9.5,9.8,11.2],
    fem:   [6.3,6.2,6.7,6.7,7.5,6.7,8.2,7.3,9.0,8.1,10.2,8.6,8.7,8.4,9.9,10.9,12.8,14.3],
    total: [5.5,5.8,6.2,6.3,6.9,6.4,7.5,7.1,8.4,7.8,9.6,8.2,8.3,8.2,9.1,10.3,11.4,12.9],
    // Quadro 1 — entrevistas realizadas por ano (usadas na faixa de IC aproximada)
    entrevistas: [54369,54251,54353,54367,54339,54144,45448,52929,40853,54174,53210,53034,52395,52443,27077,27093,21690,27048],
    // Tabela 52 — variação anual média (pp/ano), regressão linear do indicador sobre o ano
    variacaoOficial: { periodo2006_2024: { pp: 0.35, ic: [0.25, 0.44] }, periodo2019_2024: { pp: 0.90, ic: [0.66, 1.13] } },
  },
  vigitel2024: { // séries oficiais 2006–2024 (2022 ausente)
    years:        [2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2023,2024],
    diabetes:     [5.5,5.8,6.2,6.3,6.9,6.4,7.5,7.1,8.4,7.8,9.6,8.2,8.3,8.2,9.1,10.3,11.4,12.9],   // Tabela 51
    excessoPeso:  [42.6,43.4,44.9,45.9,48.2,48.9,51.1,50.9,52.6,54.0,54.0,54.2,55.8,55.6,58.0,57.3,61.4,62.6], // Tabela 1
    hipertensao:  [22.6,23.4,25.3,25.4,24.5,24.6,24.6,24.7,25.6,25.9,26.8,25.8,26.3,26.0,27.2,28.4,30.1,29.7], // Tabela 47
  },

  // ── Vigitel: diabetes por capital — DADO OFICIAL ─────────────────────────
  // "Vigitel Brasil 2006-2023: morbidade referida e autoavaliação de saúde"
  // (MS/SVSA, 2025), Anexo, Tabela 2: % de adultos com diagnóstico médico de
  // diabetes por capital, 2006–2023 (sem 2022). Atenção: esta edição usa a
  // ponderação ANTERIOR à revisão pelo Censo 2022 (total 2023 = 10,2% aqui ×
  // 11,4% no relatório 2006–2024). Comparações entre capitais seguem válidas.
  vigitelCidades: {
    ano: 2023,
    capitais: ['Manaus','Belém','Macapá','Porto Velho','Rio Branco','Boa Vista','Palmas','Fortaleza','Natal','Recife','Maceió','João Pessoa','Aracaju','Salvador','São Luís','Teresina','Brasília','Goiânia','Campo Grande','Cuiabá','São Paulo','Rio de Janeiro','Belo Horizonte','Vitória','Curitiba','Porto Alegre','Florianópolis'],
    prevalencia: [8.2, 6.9, 6.8, 6.6, 5.6, 6.9, 8.2, 11.6, 11.8, 8.3, 9.6, 7.2, 9.6, 9.0, 6.0, 10.2, 12.1, 8.8, 9.0, 9.0, 12.1, 11.0, 8.7, 9.6, 9.8, 12.0, 7.2],
    regioes: ['N','N','N','N','N','N','N','NE','NE','NE','NE','NE','NE','NE','NE','NE','CO','CO','CO','CO','SE','SE','SE','SE','S','S','S'],
    // série completa por capital (anos 2006–2021 e 2023)
    anos: [2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2023],
    serie: {
      'Manaus': [5.0, 4.4, 4.6, 4.2, 4.6, 4.8, 4.9, 5.2, 7.4, 7.2, 5.6, 7.0, 7.4, 6.0, 7.3, 6.7, 8.2],
      'Belém': [5.6, 4.5, 4.0, 4.5, 5.8, 6.0, 5.5, 5.5, 7.6, 6.3, 6.6, 6.2, 7.0, 6.8, 6.9, 9.3, 6.9],
      'Macapá': [3.6, 4.4, 4.2, 4.2, 4.9, 5.4, 4.9, 4.6, 5.5, 4.6, 6.3, 6.0, 5.4, 5.2, 4.7, 7.9, 6.8],
      'Porto Velho': [4.8, 4.8, 5.1, 5.5, 5.2, 4.8, 5.0, 5.3, 5.4, 5.5, 6.8, 7.5, 6.3, 4.6, 5.7, 7.6, 6.6],
      'Rio Branco': [3.5, 4.0, 4.7, 3.9, 5.5, 5.3, 6.0, 4.6, 6.2, 6.7, 5.8, 6.2, 5.2, 4.9, 4.4, 6.4, 5.6],
      'Boa Vista': [4.1, 2.0, 3.5, 3.7, 4.8, 4.7, 5.5, 4.6, 5.0, 4.6, 5.3, 8.1, 5.5, 7.0, 6.4, 6.7, 6.9],
      'Palmas': [3.0, 4.2, 3.0, 4.0, 4.7, 3.2, 4.3, 3.6, 4.1, 3.9, 5.8, 4.5, 5.5, 4.7, 5.6, 8.8, 8.2],
      'Fortaleza': [4.9, 5.7, 5.9, 5.7, 6.5, 7.2, 6.7, 7.5, 7.4, 6.2, 8.2, 7.6, 9.5, 7.4, 7.3, 9.0, 11.6],
      'Natal': [5.0, 7.8, 7.3, 6.6, 6.5, 6.8, 8.0, 7.2, 7.8, 7.8, 10.1, 6.8, 7.9, 7.3, 10.5, 8.6, 11.8],
      'Recife': [5.7, 6.0, 5.8, 7.1, 6.1, 6.4, 7.7, 6.1, 7.4, 7.6, 9.6, 7.3, 7.2, 8.1, 9.3, 8.9, 8.3],
      'Maceió': [5.7, 5.5, 5.7, 6.8, 7.0, 6.5, 7.3, 7.2, 8.3, 7.3, 8.1, 7.8, 8.4, 8.2, 11.0, 10.7, 9.6],
      'João Pessoa': [5.5, 5.7, 6.1, 6.5, 5.1, 5.4, 5.9, 6.5, 7.0, 6.2, 7.2, 7.3, 7.2, 6.8, 6.6, 8.7, 7.2],
      'Aracaju': [4.4, 5.3, 6.6, 5.6, 6.4, 6.2, 6.0, 6.3, 7.2, 7.1, 9.2, 6.9, 6.8, 7.3, 7.0, 9.5, 9.6],
      'Salvador': [5.2, 5.6, 5.5, 6.4, 4.8, 5.9, 6.0, 5.9, 7.4, 7.4, 8.0, 6.6, 6.3, 6.7, 6.3, 9.0, 9.0],
      'São Luís': [5.7, 5.2, 3.6, 5.1, 5.4, 5.2, 5.5, 4.9, 4.4, 4.4, 6.8, 5.2, 6.3, 6.4, 6.8, 9.0, 6.0],
      'Teresina': [4.4, 4.8, 5.3, 5.2, 5.8, 5.8, 5.1, 5.5, 5.4, 6.5, 6.8, 5.6, 6.3, 6.3, 6.4, 9.5, 10.2],
      'Brasília': [5.2, 4.6, 5.4, 4.0, 5.5, 5.5, 6.6, 5.3, 6.7, 7.0, 8.6, 7.3, 6.7, 7.7, 5.7, 7.9, 12.1],
      'Goiânia': [5.2, 4.2, 4.4, 6.1, 6.5, 4.8, 5.4, 5.1, 6.2, 7.0, 7.6, 7.2, 6.2, 6.6, 6.3, 6.8, 8.8],
      'Campo Grande': [4.1, 4.8, 6.9, 6.1, 5.8, 6.5, 6.5, 6.6, 7.7, 7.9, 8.8, 7.7, 7.1, 5.9, 7.7, 8.5, 9.0],
      'Cuiabá': [4.3, 6.2, 4.8, 5.6, 7.6, 6.1, 6.9, 6.8, 7.4, 6.3, 7.9, 5.8, 6.9, 7.0, 7.5, 10.0, 9.0],
      'São Paulo': [6.4, 6.7, 7.5, 7.6, 7.8, 6.9, 9.3, 8.2, 9.5, 7.7, 10.0, 8.3, 7.7, 7.9, 8.5, 9.1, 12.1],
      'Rio de Janeiro': [6.2, 6.0, 7.4, 7.0, 8.4, 6.9, 7.8, 7.4, 9.2, 8.8, 10.4, 8.8, 9.8, 8.3, 11.2, 10.9, 11.0],
      'Belo Horizonte': [4.2, 5.8, 5.8, 5.7, 6.4, 6.2, 6.6, 7.6, 7.4, 7.5, 10.1, 8.2, 7.5, 8.0, 7.7, 11.3, 8.7],
      'Vitória': [5.3, 4.6, 4.9, 5.7, 5.5, 6.6, 7.4, 6.7, 8.1, 6.6, 9.7, 8.5, 6.9, 6.4, 7.9, 8.8, 9.6],
      'Curitiba': [5.5, 5.4, 5.1, 6.3, 7.4, 5.6, 8.4, 6.1, 8.1, 7.2, 9.6, 7.2, 6.8, 7.0, 8.2, 9.3, 9.8],
      'Porto Alegre': [5.4, 6.9, 6.9, 6.0, 7.1, 6.5, 8.0, 7.8, 8.6, 8.7, 8.5, 8.0, 7.9, 8.6, 10.0, 8.7, 12.0],
      'Florianópolis': [4.5, 6.1, 4.9, 5.6, 6.5, 6.2, 7.3, 5.5, 8.3, 6.7, 6.7, 5.4, 6.5, 6.1, 7.9, 6.6, 7.2],
    },
  },

  // ── Vigitel: diabetes por nível de instrução — Tabela 51 (oficial) ────────
  // Série completa 2006–2024 (mesmos anos de vigitelDM). O relatório não cruza
  // instrução × sexo, por isso não há recorte por sexo aqui.
  vigitelEscolaridade: {
    labels: ['Sem instrução /\nfund. incompleto','Fund. completo /\nmédio incompleto','Médio completo /\nsup. incompleto','Superior\ncompleto'],
    serie: [
      [9.5,9.8,11.5,11.7,11.9,11.9,13.2,13.9,16.7,15.7,19.7,17.5,17.6,17.1,18.3,21.8,23.5,24.0],
      [5.0,5.0,5.3,5.8,6.5,6.3,8.4,7.5,8.2,8.3,9.6,9.1,10.0,9.8,10.3,11.1,13.1,15.5],
      [2.5,3.4,2.9,3.0,4.1,3.2,4.5,3.8,4.6,4.1,5.1,4.5,4.5,4.9,5.9,6.8,8.3,9.2],
      [3.2,3.1,3.2,3.6,4.5,3.9,3.9,3.5,4.4,4.6,5.9,4.4,4.4,4.1,5.3,5.8,6.1,9.0],
    ],
    // Tabela 52 — variação anual 2006–2024 (pp/ano)
    variacao: [0.79, 0.51, 0.33, 0.22],
  },

  // ── Vigitel: diabetes por faixa etária — Tabela 51 (oficial) ─────────────
  vigitelFaixaEtaria: {
    labels: ['18–24','25–34','35–44','45–54','55–64','65+'],
    serie: [
      [0.9,0.7,0.6,0.7,1.3,0.4,0.9,0.8,1.0,0.9,1.0,0.7,0.9,0.7,1.4,1.0,0.5,1.7],
      [1.1,1.7,0.9,1.9,2.3,1.0,1.6,1.2,1.6,1.3,2.0,1.6,1.7,1.4,2.3,1.9,2.5,3.7],
      [2.9,2.9,3.4,3.3,3.4,3.3,3.9,3.6,3.9,4.8,5.1,4.1,3.5,3.5,3.8,4.6,5.2,6.2],
      [7.1,7.7,9.0,7.4,8.2,8.7,9.3,8.4,11.5,9.0,11.1,8.7,9.4,7.6,8.3,10.9,10.1,14.8],
      [15.7,15.8,15.7,15.3,16.2,14.8,18.5,17.2,18.1,15.8,19.5,17.2,16.9,17.3,17.3,17.3,21.6,20.3],
      [18.9,18.9,21.2,22.5,21.8,21.4,23.0,22.1,24.4,22.5,27.1,23.3,23.2,22.9,24.8,28.0,30.1,31.4],
    ],
    variacao: [0.02, 0.08, 0.14, 0.20, 0.24, 0.57],
  },

  // ── MORTALIDADE — SIM/DATASUS (CID-10 E10–E14) — DADO REAL (TabNet) ──────
  // Óbitos por diabetes, Brasil, por residência. Extraído do DATASUS/SIM via
  // TabNet (notebooks/baixar_anual_mortalidade.py). 2024–2025 preliminares.
  mortalidade: {
    anos: [2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025],
    obitos:[35284,35073,36631,37489,39251,40317,45049,47718,50448,52104,54877,57876,56761,58017,57882,59641,61398,63486,65113,66711,75712,78258,75838,70377,71995,72151],
  },

  // Real DATASUS/SIM 2025 (TabNet), agregado por residência. Soma = 72.147 (+4 idade ignorada)
  mortalidadeFaixaEtaria: {
    labels: ['<20','20–39','40–49','50–59','60–69','70–79','80+'],
    obitos: [155, 1588, 3175, 7578, 15322, 20746, 23583],
  },

  // Taxa BRUTA de mortalidade (2025): óbitos reais SIM/TabNet ÷ população IBGE 2022
  mortalidadeRegiao: {
    labels: ['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'],
    taxa: [30.4, 39.3, 28.3, 33.3, 41.9],
  },

  // DADO REAL: taxa de mortalidade por diabetes BRUTA vs PADRONIZADA POR IDADE
  // (método direto). Óbitos SIM 2025 por região×faixa ÷ população IBGE/SVS 2024
  // por região×faixa; padrão = estrutura etária nacional. Revela o viés da idade:
  // o Norte (pop. jovem) tem a MENOR taxa bruta mas a MAIOR padronizada.
  mortalidadePadronizada: {
    labels: ['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'],
    bruta:        [28.2, 37.6, 27.0, 31.9, 40.3],
    padronizada:  [41.8, 39.4, 31.6, 29.2, 36.9],
  },

  // DADO REAL (SIM/TabNet 2025, Cor/raça): composição dos óbitos por diabetes.
  // Soma = 72.151 (exclui 898 ignorados ao exibir %). NÃO é taxa — reflete também
  // o tamanho e a estrutura etária de cada grupo (ver prevalência PNS por raça).
  mortalidadeRaca: {
    labels: ['Branca','Parda','Preta','Amarela','Indígena'],
    obitos: [34858, 28011, 7658, 502, 224],
    cores:  ['#0072B2','#E69F00','#009E73','#CC79A7','#D55E00'],
  },

  // DADO REAL: prevalência de DM autorreferido por raça/cor — reanálise ponderada
  // dos MICRODADOS da PNS 2019 (peso do morador selecionado, adultos 18+, n=82.349).
  // Fonte: notebooks/rodar_pns.py (recorte por raça). Amarela se destaca (13,4%).
  pnsRaca: {
    labels: ['Branca','Preta','Amarela','Parda','Indígena'],
    prev:   [8.7, 8.8, 13.4, 8.3, 8.4],
    n:      [30815, 9343, 639, 40948, 597],
    total:  8.6,
  },

  // DADO REAL (SIM/TabNet 2025, Categoria CID-10, Grupo=47): distribuição dos óbitos
  // por diabetes segundo subtipo E10–E14. Soma dos absolutos = 72.151 (total 2025).
  // E14 (não especificado) ainda domina — melhorou vs 2024 (era 61,9%).
  mortalidadeCID: {
    labels: ['E14 — DM não especif.','E11 — DM tipo 2','E10 — DM tipo 1','E12 — relac. desnutrição','E13 — outros'],
    valores: [57.6, 30.9, 10.8, 0.5, 0.2],
    cores: ['#999999','#0072B2','#009E73','#D55E00','#E69F00'],
  },

  // DADO REAL (SIM/TabNet 2025, Causa CID-BR-10, óbitos por residência): comparação
  // do diabetes com as principais causas de morte no Brasil.
  mortalidadeComparacao: {
    causas: ['Doenças card.\nisquêmicas','AVC','Pneumonia','Diabetes','DPOC','Neoplasia\npulmão'],
    obitos: [116962, 106970, 100304, 72151, 57436, 32430],
    cores:  ['#D55E00','#E69F00','#F0E442','#0072B2','#009E73','#CC79A7'],
  },

  // ── INTERNAÇÕES — SIH/DATASUS ────────────────────────────────────────────
  // DADO REAL (TabNet/SIH): internações e custo por diabetes (Lista Morb CID-10),
  // Brasil, por ano de processamento. Fonte: notebooks/baixar_sih.py.
  internacoes: {
    anos: [2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025],
    total:[148452,148511,142677,140873,139819,138435,128582,131292,133625,136276,124646,128088,137325,138316,139598,153116],
    custototal:[83.2,89.3,86.4,88.4,89.7,92.3,91.3,95.9,100.6,108.2,107.0,112.4,134.3,144.1,153.6,175.2], // R$ mi (Valor_total AIH)
    // 2026 (jan–jul, parcial): 91.830 internações · R$ 108,9 mi (por processamento)
    ytd2026: { internacoes: 91830, custoMi: 108.9, meses: 'jan–jul/2026' },
  },

  // DADO REAL (TabNet/SIH niuf.def): internações por diabetes (Lista Morb=124),
  // Brasil 2025, por região de internação. Soma = 153.055 (total nacional).
  internacoesRegiao: {
    labels: ['Norte','Nordeste','Sudeste','Sul','Centro-Oeste'],
    n:      [16978, 45604, 58684, 21180, 10609],
  },

  // DADO REAL (TabNet/SIH niuf.def): internações por diabetes (Lista Morb=124),
  // Brasil 2025, por sexo × faixa etária. Soma = 153.055. Fonte: baixar_sih.py.
  internacoesSexoFaixa: {
    labels: ['<20','20–39','40–49','50–59','60–69','70–79','80+'],
    fem:    [7525, 10261, 7785, 11846, 14514, 12231, 7070],
    masc:   [5800, 8437, 9494, 17151, 21389, 14172, 5380],
  },

  // DADO REAL (TabNet/SIH qiuf.def): internações com amputação/desarticulação de
  // membros inferiores + pé/tarso (proc. 0408050012 e 0408050020), SUS, por ano de
  // processamento. Todas as causas — o cubo de procedimentos não cruza com diagnóstico,
  // por isso NÃO há recorte específico de diabetes. Fonte: notebooks (post_ampP).
  amputacoesAnos: {
    anos:  [2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025],
    total: [27663,29340,30501,32917,34474,34920,36648,38936,39277,38869,40761],
  },

  // ── FATORES DE RISCO ─────────────────────────────────────────────────────
  // DADO REAL (Vigitel Brasil 2006–2024, Tabela 21): % de adultos fisicamente
  // inativos por faixa etária, capitais + DF, 2024.
  inatividadeFaixa: {
    labels: ['18–24','25–34','35–44','45–54','55–64','65+'],
    perc:   [4.9, 4.7, 6.0, 9.1, 10.9, 21.3],
  },

  // DADO REAL (Vigitel Brasil 2006–2024, Tabela 21): % fisicamente inativos por
  // nível de instrução, capitais + DF, 2024.
  inatividadeEscolaridade: {
    labels: ['Sem instr./\nfund. incompleto','Fund. completo/\nmédio incompleto','Médio completo/\nsuperior incompleto','Superior\ncompleto'],
    perc:   [15.9, 8.7, 7.3, 8.2],
  },

  // (Blocos de complicações clínicas e ANS/D-TISS removidos: eram estimativas/
  // literatura sem microdado primário acessível — ver auditoria de dados reais.)

  // ── IDF GLOBAL ───────────────────────────────────────────────────────────
  idfGlobal: {
    anos:   [2021, 2030, 2045],
    milhoes:[536.6, 642.7, 783.2],
  },

  // DADO REAL (IDF Diabetes Atlas, 10ª ed. 2021) — adultos 20–79 com diabetes, por país.
  // Ordenado decrescente: o Brasil é o 6º do mundo (atrás de China, Índia, Paquistão, EUA e Indonésia).
  // Brasil = 15,7 mi em 2021 (factsheet IDF América do Sul e Central). [16,8 mi era o valor da 9ª ed., 2019.]
  // 11ª ed.: Brasil 16,6 mi em 2024.
  idfTopPaises: {
    paises: ['China','Índia','Paquistão','EUA','Indonésia','Brasil','México','Bangladesh','Japão','Egito'],
    milhoes:[140.9,  74.2,  33.0,        32.2, 19.5,        15.7,    14.1,    13.1,        11.0,   10.9],
    cores:  Array(10).fill('#0072B2').map((c,i)=> i===5?'#D55E00':c),
  },

  // ── INDICADORES POR UF ───────────────────────────────────────────────────
  // prev: prevalência de diabetes na CAPITAL da UF, Vigitel 2023 (volume 2006–2023 de
  //       morbidade referida, Tabela 2 do anexo) — aproximação da UF pela capital.
  // mort: SIM 2025 ÷ Censo 2022 (taxa bruta). pop: Censo 2022. Fonte única do mapa.
  estadosPrevalencia: {
    estados: ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'],
    siglas:  ['Acre','Alagoas','Amazonas','Amapá','Bahia','Ceará','Dist.Fed.','Espírito Santo','Goiás','Maranhão','Minas Gerais','Mato Grosso do Sul','Mato Grosso','Pará','Paraíba','Pernambuco','Piauí','Paraná','Rio de Janeiro','Rio Grande do Norte','Rondônia','Roraima','Rio Grande do Sul','Santa Catarina','Sergipe','São Paulo','Tocantins'],
    prev:    [5.6, 9.6, 8.2, 6.8, 9.0, 11.6, 12.1, 9.6, 8.8, 6.0, 8.7, 9.0, 9.0, 6.9, 7.2, 8.3, 10.2, 9.8, 11.0, 11.8, 6.6, 6.9, 12.0, 7.2, 9.6, 12.1, 8.2],
    // DADO REAL: taxa bruta = óbitos SIM/TabNet 2025 (por UF, E10–E14) ÷ pop Censo 2022 × 100 mil hab
    mort:    [13.6,40.6,31.0,22.7,45.8,25.1,19.3,51.3,29.3,39.4,32.1,28.0,33.6,31.0,44.0,42.7,43.3,37.7,43.6,31.3,38.7,20.3,51.4,34.6,34.7,28.7,33.4],
    regiao:  ['N','NE','N','N','NE','NE','CO','SE','CO','NE','SE','CO','CO','N','NE','NE','NE','S','SE','NE','N','N','S','S','NE','SE','N'],
    // População IBGE Censo 2022 (milhões) — alinhada à ordem de 'estados'
    pop:     [0.83,3.13,3.94,0.73,14.14,8.79,2.82,3.83,7.06,6.78,20.54,2.76,3.66,8.12,3.97,9.06,3.27,11.44,16.05,3.30,1.58,0.64,10.88,7.61,2.21,44.41,1.51],
  },

  // ── PNS — Pesquisa Nacional de Saúde (IBGE/Fiocruz) ──────────────────────
  // Inquérito DOMICILIAR nacional (inclui interior e zona rural), ≠ Vigitel (telefônico, só capitais)
  pns: {
    // Prevalência de DM autorreferido (diagnóstico médico), adultos 18+ — IBGE.
    // 2013: 6,2% (mulheres 7,0%; homens 5,4%). 2019: 7,7% (mulheres 8,4%; homens 6,9%),
    // cerca de 12,3 milhões de adultos.
    anos:   [2013, 2019],
    total:  [6.2, 7.7],
    fem:    [7.0, 8.4],
    masc:   [5.4, 6.9],
  },

  // Comparativo Vigitel (capitais, telefônico) vs PNS (nacional, domiciliar)
  comparacaoFontes: {
    labels: ['Diabetes (%)', 'Cobertura', 'Método', 'Periodicidade'],
    vigitel: { prev2019: 8.2, escopo: 'Capitais + DF', metodo: 'Telefônico', freq: 'Anual (2006–2024)' },
    pns:     { prev2019: 7.7, escopo: 'Nacional (incl. rural)', metodo: 'Domiciliar', freq: 'Quinquenal (2013, 2019)' },
  },

  // PNS 2019 — prevalência por região (domiciliar nacional)
  pnsRegiao: {
    labels: ['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'],
    prev:   [5.9, 7.0, 7.1, 8.7, 8.0],
  },

  // ── IDF Diabetes Atlas — evolução das edições ───────────────────────────
  idfEdicoes: {
    edicoes: ['9ª ed.\n(2019)','10ª ed.\n(2021)','11ª ed.\n(2024)','Projeção\n2050'],
    globalMilhoes: [463, 536.6, 589, 853],
    mundialMortes: [4.2, 6.7, 3.4, null], // milhões de mortes (metodologia mudou na 11ª)
  },

  // DADO REAL (IDF Diabetes Atlas, 10ª ed. 2021): gasto total em saúde relacionado
  // ao diabetes (adultos 20–79), US$ bilhões — três maiores do mundo. O Brasil é o 3º.
  // 11ª ed. (2025): Brasil US$ 45,1 bi em 2024, mantendo a 3ª posição.
  // (Substitui o antigo bloco de "custos" com estimativas sem fonte verificável.)
  idfGasto: {
    paises: ['EUA', 'China', 'Brasil'],
    bilhoesUSD: [379.5, 165.3, 42.9],
    brasil2024: 45.1,
  },

  // NOTA sobre a série mensal: a decomposição e o SARIMA usam a série MENSAL
  // REAL de óbitos por diabetes (DATASUS/SIM 2015–2020), carregada de
  // serie_mensal.js (window.SERIE_MENSAL), gerada por notebooks/rodar_sarima.py.
  // Nenhuma série sintética é usada.

  // NOTA: o modelo de regressão logística e sua avaliação (coeficientes,
  // matriz de confusão, ROC, AUC) NÃO são fixos aqui — são TREINADOS ao vivo
  // em ml.js sobre o Pima Indians Diabetes Dataset (pima.js, dado real).
  // Nenhum número de modelo é fabricado neste arquivo.
};
