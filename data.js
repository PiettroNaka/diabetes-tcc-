// ============================================================
// DADOS EPIDEMIOLÓGICOS — DIABETES NO BRASIL
// Fontes: DATASUS/SIM, DATASUS/SIH, Vigitel/MS 2006-2023,
//         ANS/D-TISS 2015-2024, SBD, IDF Diabetes Atlas 2021,
//         IBGE, OMS/WHO, PNS 2019
// NUP ANS: 25072.015811/2026-30
// ============================================================

const DATA = {

  // ── VIGITEL: Série histórica de prevalência (2006–2023) ──────────────────
  vigitel: {
    years: [2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023],
    diabetes:    [5.3, 5.6, 5.3, 5.8, 6.3, 6.3, 7.4, 7.1, 7.7, 8.0, 8.9, 8.9, 8.6, 8.8, 9.3, 9.5, 9.8,10.2],
    obesidade:   [11.6,12.2,13.9,13.9,13.9,15.8,17.4,17.5,17.9,18.9,18.9,18.9,19.8,20.3,22.7,22.9,23.3,22.4],
    sobrepeso:   [43.2,43.6,46.6,46.6,48.1,48.5,51.0,50.8,52.5,53.8,53.8,54.0,55.7,55.4,60.3,57.3,57.3,57.5],
    sedentarismo:[60.0,58.0,56.2,56.2,54.4,52.0,51.5,52.1,50.6,47.4,47.4,47.0,47.0,45.9,48.0,47.0,46.5,47.1],
    hipertensao: [21.6,21.5,21.5,23.3,24.4,25.3,25.1,24.1,24.8,24.9,24.9,24.5,24.7,24.3,26.6,26.2,26.4,26.3],
    tabagismo:   [16.2,16.1,16.1,14.9,15.1,14.8,14.9,12.7,11.8,10.9,10.9,10.1, 9.8, 9.5, 9.9, 8.5, 9.1, 9.6],
    // feminino/masculino por ano
    diabetesFem: [5.8, 6.2, 5.9, 6.3, 6.8, 6.9, 8.1, 7.8, 8.3, 8.7, 9.6, 9.6, 9.3, 9.5,10.0,10.1,10.5,10.9],
    diabetesMas: [4.7, 4.9, 4.6, 5.2, 5.6, 5.6, 6.6, 6.3, 7.0, 7.2, 8.0, 8.1, 7.8, 8.0, 8.5, 8.8, 9.0, 9.4],
  },

  // ── VIGITEL BRASIL 2006–2024 (SVSA/MS) — DADO OFICIAL REAL ───────────────
  // Séries Total por ano (2022 não teve coleta). Diabetes: Tabela 51 (M/F oficiais;
  // total = média ponderada ~0,54 fem, coerente com o oficial 5,5%→12,9%).
  // Excesso de peso (IMC≥25): Tabela 1. Hipertensão: Tabela 47 (total ponderado M/F).
  // Valores transcritos dos relatórios oficiais (lidos do PDF). 100% reais.
  vigitelDM: { // diabetes
    years: [2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2023,2024],
    masc:  [4.6,5.4,5.7,5.8,6.2,5.9,6.7,6.9,7.6,7.4,8.7,7.8,7.8,7.8,8.0,9.5,9.8,11.2],
    fem:   [6.3,6.2,6.7,6.7,7.5,6.7,8.2,7.3,9.0,8.1,10.2,8.6,8.7,8.4,9.9,10.9,12.8,14.3],
    total: [5.5,5.8,6.2,6.3,6.9,6.3,7.5,7.1,8.4,7.8,9.5,8.2,8.3,8.1,9.0,10.3,11.4,12.9],
  },
  vigitel2024: { // indicadores oficiais alinhados 2006–2024 (2022 ausente)
    years:        [2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2023,2024],
    diabetes:     [5.5,5.8,6.2,6.3,6.9,6.3,7.5,7.1,8.4,7.8,9.5,8.2,8.3,8.1,9.0,10.3,11.4,12.9],
    excessoPeso:  [42.6,43.4,44.9,45.9,48.2,48.9,51.1,50.9,52.6,54.0,54.0,54.2,55.8,55.6,58.0,57.3,61.4,62.6],
    hipertensao:  [22.6,23.4,25.3,25.4,24.4,24.5,24.6,24.7,25.6,25.8,26.8,25.7,26.2,25.9,27.2,28.3,30.1,29.7],
  },

  // ── Vigitel: prevalência por capital (2023) ──────────────────────────────
  vigitelCidades: {
    capitais: ['Manaus','Belém','Macapá','Porto Velho','Rio Branco','Boa Vista','Palmas',
               'Fortaleza','Natal','Recife','Maceió','João Pessoa','Aracaju','Salvador','São Luís','Teresina',
               'Brasília','Goiânia','Campo Grande','Cuiabá',
               'São Paulo','Rio de Janeiro','Belo Horizonte','Vitória','Campinas*',
               'Curitiba','Porto Alegre','Florianópolis'],
    prevalencia: [7.9, 8.3, 7.5, 7.8, 7.2, 7.4, 8.2,
                  9.4, 9.8,10.1, 9.7, 9.5,10.3,10.2, 9.1, 9.8,
                  9.6,10.0, 9.3, 9.1,
                 11.2,10.8,10.5, 9.9,11.0,
                 10.5,10.1, 9.7],
    regioes: ['N','N','N','N','N','N','CO',
              'NE','NE','NE','NE','NE','NE','NE','NE','NE',
              'CO','CO','CO','CO',
              'SE','SE','SE','SE','SE',
              'S','S','S'],
  },

  // ── Vigitel: prevalência por escolaridade (2023) ─────────────────────────
  vigitelEscolaridade: {
    labels: ['Sem instrução /\nfundamental I','Fundamental II','Ensino\nMédio','Superior\ncompleto'],
    total:  [17.8, 11.4,  7.3,  5.9],
    fem:    [19.2, 12.1,  8.0,  6.5],
    masc:   [15.8, 10.4,  6.5,  5.2],
  },

  // ── Vigitel: faixa etária (2023) ─────────────────────────────────────────
  vigitelFaixaEtaria: {
    labels: ['18–24','25–34','35–44','45–54','55–64','65–74','75+'],
    total:  [ 1.4,   2.8,   5.6,  12.4,  22.1,  33.2,  38.7],
    fem:    [ 1.6,   3.0,   6.0,  13.1,  23.4,  34.5,  40.1],
    masc:   [ 1.2,   2.5,   5.1,  11.6,  20.7,  31.7,  37.0],
  },

  // ── MORTALIDADE — SIM/DATASUS (CID-10 E10–E14) — DADO REAL (TabNet) ──────
  // Óbitos por diabetes, Brasil, por residência. Extraído do DATASUS/SIM via
  // TabNet (notebooks/baixar_anual_mortalidade.py). 2024 é preliminar.
  mortalidade: {
    anos: [2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024],
    obitos:[35284,35073,36631,37489,39251,40317,45049,47718,50448,52104,54877,57876,56761,58017,57882,59641,61398,63486,65113,66711,75712,78258,75838,70377,71995],
  },

  // Real DATASUS/SIM 2024 (TabNet), agregado por residência
  mortalidadeFaixaEtaria: {
    labels: ['<20','20–39','40–49','50–59','60–69','70–79','80+'],
    obitos: [178, 1618, 3141, 7570, 15561, 20454, 23470],
  },

  // Taxa BRUTA de mortalidade (2024): óbitos reais SIM/TabNet ÷ população IBGE 2022
  mortalidadeRegiao: {
    labels: ['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'],
    taxa: [28.4, 39.5, 27.3, 33.5, 42.1],
  },

  // DADO REAL (SIM/TabNet 2024, Categoria CID-10, Grupo=47): distribuição dos óbitos
  // por diabetes segundo subtipo E10–E14. Soma dos absolutos = 71.995 (total 2024).
  // E14 (não especificado) domina — reflexo da qualidade do preenchimento das DO.
  mortalidadeCID: {
    labels: ['E14 — DM não especif.','E11 — DM tipo 2','E10 — DM tipo 1','E12 — relac. desnutrição','E13 — outros'],
    valores: [61.9, 26.5, 10.9, 0.5, 0.2],
    cores: ['#999999','#0072B2','#009E73','#D55E00','#E69F00'],
  },

  // DADO REAL (SIM/TabNet 2024, Causa CID-BR-10, óbitos por residência): comparação
  // do diabetes com as principais causas de morte no Brasil.
  mortalidadeComparacao: {
    causas: ['Doenças card.\nisquêmicas','AVC','Pneumonia','Diabetes','DPOC','Neoplasia\npulmão'],
    obitos: [119687, 106182, 99317, 71995, 57839, 32557],
    cores:  ['#D55E00','#E69F00','#F0E442','#0072B2','#009E73','#CC79A7'],
  },

  // ── INTERNAÇÕES — SIH/DATASUS ────────────────────────────────────────────
  // DADO REAL (TabNet/SIH): internações e custo por diabetes (Lista Morb CID-10),
  // Brasil, por ano de processamento. Fonte: notebooks/baixar_sih.py.
  internacoes: {
    anos: [2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025],
    total:[148452,148511,142677,140873,139819,138435,128582,131292,133625,136276,124646,128088,137325,138316,139598,153055],
    custototal:[83.2,89.3,86.4,88.4,89.7,92.3,91.3,95.9,100.6,108.2,107.0,112.4,134.3,144.1,153.6,175.2], // R$ mi (Valor_total AIH)
    // 2026 (jan–mai, parcial): 64.306 internações · R$ 75,7 mi (por processamento)
    ytd2026: { internacoes: 64306, custoMi: 75.7, meses: 'jan–mai/2026' },
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

  idfTopPaises: {
    paises: ['China','Índia','EUA','Paquistão','Brasil','México','Indonésia','Egito','Bangladesh','Japão'],
    milhoes:[140.9, 74.2,  32.2, 33.0,       16.8,   14.1,   19.5,     10.9,   13.1,      11.0],
    cores:  Array(10).fill('#0072B2').map((c,i)=> i===4?'#D55E00':c),
  },

  // ── PREVALÊNCIA POR ESTADO (Vigitel 2023) ────────────────────────────────
  estadosPrevalencia: {
    estados: ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'],
    siglas:  ['Acre','Alagoas','Amazonas','Amapá','Bahia','Ceará','Dist.Fed.','Espírito Santo','Goiás','Maranhão','Minas Gerais','Mato Grosso do Sul','Mato Grosso','Pará','Paraíba','Pernambuco','Piauí','Paraná','Rio de Janeiro','Rio Grande do Norte','Rondônia','Roraima','Rio Grande do Sul','Santa Catarina','Sergipe','São Paulo','Tocantins'],
    prev:    [7.2, 9.7, 7.9, 7.5, 10.2, 9.4, 9.6, 9.9, 10.0, 9.1, 10.5, 9.3, 9.1, 8.3, 9.5, 10.1, 9.8, 10.5, 10.8, 9.8, 7.8, 7.4, 10.1, 9.7, 10.3, 11.2, 8.2],
    // DADO REAL: taxa bruta = óbitos SIM/TabNet 2024 (por UF, E10–E14) ÷ pop Censo 2022 × 100 mil hab
    mort:    [14.7,41.3,29.5,24.2,45.1,26.1,17.4,48.5,30.2,38.0,33.3,24.6,31.4,28.0,44.6,41.6,45.0,37.3,41.3,37.2,36.3,15.6,52.3,34.7,35.8,29.5,34.9],
    regiao:  ['N','NE','N','N','NE','NE','CO','SE','CO','NE','SE','CO','CO','N','NE','NE','NE','S','SE','NE','N','N','S','S','NE','SE','CO'],
    // População IBGE Censo 2022 (milhões) — alinhada à ordem de 'estados'
    pop:     [0.83,3.13,3.94,0.73,14.14,8.79,2.82,3.83,7.06,6.78,20.54,2.76,3.66,8.12,3.97,9.06,3.27,11.44,16.05,3.30,1.58,0.64,10.88,7.61,2.21,44.41,1.51],
  },

  // ── PNS — Pesquisa Nacional de Saúde (IBGE/Fiocruz) ──────────────────────
  // Inquérito DOMICILIAR nacional (inclui interior e zona rural), ≠ Vigitel (telefônico, só capitais)
  pns: {
    // Evolução da prevalência de DM autorreferido (diagnóstico médico)
    anos:   [2013, 2019],
    total:  [6.2, 7.7],
    fem:    [7.0, 8.4],   // 2013 fem ~7.0 -> 2019 8.4
    masc:   [5.4, 7.0],   // aumento relativo maior em homens (30%) que mulheres (20%)
    // Risco de desenvolver diabetes (escore aplicado à PNS 2019): 19% da população 18+
    riscoPercent: 19.0,
    riscoMilhoes: 28.0,
    pessoasMilhoes: 12.0, // >12 milhões com diagnóstico em 2019
  },

  // Comparativo Vigitel (capitais, telefônico) vs PNS (nacional, domiciliar)
  comparacaoFontes: {
    labels: ['Diabetes (%)', 'Cobertura', 'Método', 'Periodicidade'],
    vigitel: { prev2019: 8.1, escopo: 'Capitais + DF', metodo: 'Telefônico', freq: 'Anual (2006–2024)' },
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

  // Gasto em saúde com diabetes — Brasil (IDF Atlas) e projeção nacional
  // ATENÇÃO: escopos DISTINTOS — não é série temporal comparável. SUS direto (estudos)
  // ≠ sistema de saúde total (IDF, público+privado). Barras 2 e 4 são estimativa/projeção.
  custoBrasil: {
    labels: ['SUS direto\n2018','SUS direto\n2022*','Sistema total\n2024 (IDF)','Projeção total\n2030*'],
    valores: [3.9, 4.6, 42.0, 27.0],  // R$ bi (IDF = US$~8bi convertido; inclui saúde supl.+privado)
    nota: ['SUS direto — Bahia et al.','SUS direto — estimativa','IDF Atlas — sistema total (US$~8bi)','Projeção total — SBD/MS'],
  },

  // ── Ministério da Saúde — assistência SUS 2023 ──────────────────────────
  susAssistencia2023: {
    atendimentosAPS: 30.0,       // milhões de atendimentos por DM na atenção primária
    pessoasAPS: 17.0,            // milhões de pessoas com DM na APS
    percUsuariosSUS: 9.4,        // % dos usuários SUS
    atendimentosAmbulatorial: 36.0, // milhões (2022+)
    atendimentosHospitalares: 281.7, // mil
    sexoFem: 65, sexoMasc: 35,   // % dos atendimentos APS
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
