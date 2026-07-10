// ============================================================
// APP.JS — navegação entre tabs, filtros e inicialização
// ============================================================

let currentTab = 'overview';
let mapRendered = false;

function switchTab(tabId) {
  // Remove active de todos
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));

  // Ativa a tab selecionada
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  const section = document.getElementById(`tab-${tabId}`);
  if (btn) btn.classList.add('active');
  if (section) section.classList.add('active');

  currentTab = tabId;

  // Mostra só os filtros aplicáveis a esta aba (e zera os que saem de cena)
  updateFilterVisibility(tabId);

  // applyFilters relê os selects, atualiza FILTERS e re-renderiza a aba atual
  applyFilters();
}

// Estado global de filtros — lido pelos renderizadores em charts.js
window.FILTERS = { year: 'all', region: 'all', sex: 'all', age: 'all' };

const REGION_NAMES = { N:'Norte', NE:'Nordeste', CO:'Centro-Oeste', SE:'Sudeste', S:'Sul' };

// Quais filtros afetam cada aba (só esses aparecem na barra)
const TAB_FILTERS = {
  overview:        ['year', 'sex'],
  prevalence:      ['year', 'region', 'sex'],
  mortality:       ['year', 'region'],
  hospitalization: ['year', 'sex'],
  riskfactors:     ['year'],
  geographic:      ['region'],
  vigitel:         ['year', 'region', 'sex'],
  pns:             ['region'],
  analise:         ['year', 'region'],
  ml:              [],
  sintese:         [],
};

// Mostra apenas os filtros aplicáveis à aba atual; zera os que somem
function updateFilterVisibility(tabId) {
  const aplica = TAB_FILTERS[tabId] || [];
  [['year','f-year','filter-year'], ['region','f-region','filter-region'], ['sex','f-sex','filter-sex']]
    .forEach(([key, labelId, selId]) => {
      const label = document.getElementById(labelId);
      const sel = document.getElementById(selId);
      const on = aplica.includes(key);
      if (label) label.style.display = on ? '' : 'none';
      if (!on && sel && sel.value !== 'all') sel.value = 'all'; // reseta filtro que sai de cena
    });
  // dica quando nenhum filtro se aplica
  const hint = document.getElementById('filterHint');
  if (hint) hint.style.display = aplica.length ? 'none' : '';
}

function applyFilters() {
  window.FILTERS = {
    year:   document.getElementById('filter-year').value,
    region: document.getElementById('filter-region').value,
    sex:    document.getElementById('filter-sex').value,
  };

  // Banner de filtros ativos (legível)
  const f = window.FILTERS;
  const parts = [];
  if (f.year   !== 'all') parts.push('Até ' + f.year);
  if (f.region !== 'all') parts.push('Região: ' + (REGION_NAMES[f.region] || f.region));
  if (f.sex    !== 'all') parts.push('Sexo: ' + (f.sex === 'F' ? 'Feminino' : 'Masculino'));
  const banner = document.getElementById('filterBanner');
  if (banner) banner.innerHTML = parts.length
    ? '<i style="color:#2563eb">●</i> ' + parts.join('  ·  ')
    : '';

  // Re-renderiza a aba atual com os filtros aplicados (com proteção)
  try {
    if (TAB_RENDERERS[currentTab]) TAB_RENDERERS[currentTab]();
    if (typeof injectKpiSparks === 'function') injectKpiSparks(currentTab);
  } catch (e) { console.error('Erro ao aplicar filtros:', e); }
}

// Exporta as principais séries do dashboard em CSV (download no navegador)
function exportData() {
  const rows = [];
  const push = (bloco, chave, ano, valor, unidade, fonte) =>
    rows.push([bloco, chave, ano, valor, unidade, fonte]);

  const V = DATA.vigitel2024;   // série oficial real 2006–2024
  V.years.forEach((y, i) => {
    push('Vigitel', 'Diabetes', y, V.diabetes[i], '%', 'Vigitel/MS 2006-2024');
    push('Vigitel', 'Excesso_peso', y, V.excessoPeso[i], '%', 'Vigitel/MS 2006-2024');
    push('Vigitel', 'Hipertensao', y, V.hipertensao[i], '%', 'Vigitel/MS 2006-2024');
  });
  DATA.mortalidade.anos.forEach((y, i) => push('Mortalidade', 'Obitos_DM', y, DATA.mortalidade.obitos[i], 'obitos', 'SIM/DATASUS'));
  DATA.internacoes.anos.forEach((y, i) => push('Internacoes', 'Internacoes_SUS', y, DATA.internacoes.total[i], 'internacoes', 'SIH/DATASUS'));
  DATA.internacoes.anos.forEach((y, i) => push('Internacoes', 'Custo_SUS_Rmi', y, DATA.internacoes.custototal[i], 'R$ milhoes', 'SIH/DATASUS'));
  const E = DATA.estadosPrevalencia;
  E.estados.forEach((uf, i) => {
    push('Estados', 'Prevalencia_' + uf, 2023, E.prev[i], '%', 'Vigitel 2023 (capital)');
    push('Estados', 'Mortalidade_' + uf, 2024, E.mort[i], '/100k', 'SIM/DATASUS 2024');
    push('Estados', 'Populacao_' + uf, 2022, E.pop[i], 'milhoes', 'IBGE Censo 2022');
  });

  let csv = 'bloco;indicador;ano;valor;unidade;fonte\n';
  csv += rows.map(r => r.join(';')).join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diabetes_brasil_dados.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function resetFilters() {
  document.getElementById('filter-year').value   = 'all';
  document.getElementById('filter-region').value = 'all';
  document.getElementById('filter-sex').value    = 'all';
  applyFilters();
}

// ── Inicialização ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Adiciona banner de filtro ativos ao filters-bar
  const bar = document.querySelector('.filters-bar');
  if (bar) {
    const banner = document.createElement('span');
    banner.id = 'filterBanner';
    banner.style.cssText = 'font-size:12px;color:#1a56db;font-weight:500;';
    bar.appendChild(banner);
  }

  // Treina o modelo de ML uma vez (métricas reais prontas para a aba ML)
  if (typeof ML !== 'undefined' && !ML.trained) {
    try { ML.train(); } catch (e) { console.error('Falha ao treinar modelo:', e); }
  }

  // Renderiza tab inicial
  switchTab('overview');

  // Smooth scroll to content on mobile when tab clicked
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
