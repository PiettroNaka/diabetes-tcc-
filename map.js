// ============================================================
// MAP.JS — Mapa do Brasil por estado (D3 + TopoJSON)
// ============================================================

const MAP_DATA = {
  AC: { nome: 'Acre',              prev: 7.2,  mort: 30.1, regiao:'Norte' },
  AL: { nome: 'Alagoas',          prev: 9.7,  mort: 36.2, regiao:'Nordeste' },
  AM: { nome: 'Amazonas',         prev: 7.9,  mort: 29.8, regiao:'Norte' },
  AP: { nome: 'Amapá',            prev: 7.5,  mort: 28.4, regiao:'Norte' },
  BA: { nome: 'Bahia',            prev: 10.2, mort: 38.1, regiao:'Nordeste' },
  CE: { nome: 'Ceará',            prev: 9.4,  mort: 35.9, regiao:'Nordeste' },
  DF: { nome: 'Distrito Federal', prev: 9.6,  mort: 36.4, regiao:'Centro-Oeste' },
  ES: { nome: 'Espírito Santo',   prev: 9.9,  mort: 37.2, regiao:'Sudeste' },
  GO: { nome: 'Goiás',            prev: 10.0, mort: 39.0, regiao:'Centro-Oeste' },
  MA: { nome: 'Maranhão',         prev: 9.1,  mort: 34.2, regiao:'Nordeste' },
  MG: { nome: 'Minas Gerais',     prev: 10.5, mort: 40.1, regiao:'Sudeste' },
  MS: { nome: 'Mato Grosso do Sul',prev:9.3,  mort: 38.7, regiao:'Centro-Oeste' },
  MT: { nome: 'Mato Grosso',      prev: 9.1,  mort: 37.8, regiao:'Centro-Oeste' },
  PA: { nome: 'Pará',             prev: 8.3,  mort: 31.4, regiao:'Norte' },
  PB: { nome: 'Paraíba',          prev: 9.5,  mort: 35.8, regiao:'Nordeste' },
  PE: { nome: 'Pernambuco',       prev: 10.1, mort: 38.4, regiao:'Nordeste' },
  PI: { nome: 'Piauí',            prev: 9.8,  mort: 36.7, regiao:'Nordeste' },
  PR: { nome: 'Paraná',           prev: 10.5, mort: 40.2, regiao:'Sul' },
  RJ: { nome: 'Rio de Janeiro',   prev: 10.8, mort: 42.1, regiao:'Sudeste' },
  RN: { nome: 'Rio Grande do Norte',prev:9.8, mort: 37.3, regiao:'Nordeste' },
  RO: { nome: 'Rondônia',         prev: 7.8,  mort: 29.2, regiao:'Norte' },
  RR: { nome: 'Roraima',          prev: 7.4,  mort: 27.9, regiao:'Norte' },
  RS: { nome: 'Rio Grande do Sul',prev: 10.1, mort: 40.5, regiao:'Sul' },
  SC: { nome: 'Santa Catarina',   prev: 9.7,  mort: 38.2, regiao:'Sul' },
  SE: { nome: 'Sergipe',          prev: 10.3, mort: 39.4, regiao:'Nordeste' },
  SP: { nome: 'São Paulo',        prev: 11.2, mort: 43.8, regiao:'Sudeste' },
  TO: { nome: 'Tocantins',        prev: 8.2,  mort: 31.9, regiao:'Centro-Oeste' },
};

// Cores para escala de prevalência
const COLOR_SCALE = [
  { min: 0,    max: 8.0,  fill: '#bfdbfe', label: '< 8,0%' },
  { min: 8.0,  max: 9.0,  fill: '#93c5fd', label: '8,0 – 9,0%' },
  { min: 9.0,  max: 10.0, fill: '#3b82f6', label: '9,0 – 10,0%' },
  { min: 10.0, max: 10.5, fill: '#1d4ed8', label: '10,0 – 10,5%' },
  { min: 10.5, max: 99,   fill: '#1e3a8a', label: '> 10,5%' },
];

function getColor(prev) {
  const found = COLOR_SCALE.find(c => prev >= c.min && prev < c.max);
  return found ? found.fill : '#e2e8f0';
}

function buildMapLegend() {
  const el = document.getElementById('mapLegend');
  if (!el) return;
  el.innerHTML = '<span style="font-size:12px;color:#64748b;margin-right:8px">Prevalência:</span>' +
    COLOR_SCALE.map(c =>
      `<span class="map-legend-item">
        <span class="map-legend-swatch" style="background:${c.fill}"></span>
        <span style="font-size:11px;color:#475569;">${c.label}</span>
      </span>`
    ).join('') +
    `<span style="font-size:11px;color:#94a3b8;margin-left:12px">* Vigitel 2023 — capitais estaduais</span>`;
}

// nome completo da região -> código de filtro
const REGION_NAME_TO_CODE = { 'Norte':'N', 'Nordeste':'NE', 'Centro-Oeste':'CO', 'Sudeste':'SE', 'Sul':'S' };
// região atualmente filtrada (lida do estado global)
function mapRegionFilter() { return (typeof window !== 'undefined' && window.FILTERS) ? window.FILTERS.region : 'all'; }
// um estado está "ativo" sob o filtro atual?
function stateActive(info) {
  const sel = mapRegionFilter();
  return sel === 'all' || (info && REGION_NAME_TO_CODE[info.regiao] === sel);
}
// normaliza texto (remove acentos, minúsculas) para casar nomes
function _norm(s) { return String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim(); }
// mapa nome-do-estado -> sigla, derivado do MAP_DATA
const NAME_TO_UF = (function () { const m = {}; for (const k in MAP_DATA) m[_norm(MAP_DATA[k].nome)] = k; return m; })();
// extrai a sigla de 2 letras (TopoJSON usa id "BR.RR"; alguns vêm como "BR." → cai p/ o nome)
function ufCode(d) {
  let id = d.id ? String(d.id) : '';
  if (id.indexOf('.') >= 0) id = id.split('.').pop();
  id = id.toUpperCase();
  if (id && MAP_DATA[id]) return id;                       // id válido
  const nm = d.properties && d.properties.name;            // fallback por nome
  if (nm && NAME_TO_UF[_norm(nm)]) return NAME_TO_UF[_norm(nm)];
  return id;
}

let _topoCacheFeatures = null;

async function renderBrazilMap() {
  const container = document.getElementById('brazilMap');
  if (!container) return;

  // Adiciona tooltip ao body se não existir
  let tooltip = document.getElementById('mapTooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'mapTooltip';
    tooltip.className = 'map-tooltip';
    document.body.appendChild(tooltip);
  }

  try {
    container.innerHTML = ''; // limpa antes de redesenhar (re-render em filtros)
    let features = _topoCacheFeatures;
    if (!features) {
      const topo = await d3.json('https://cdn.jsdelivr.net/npm/datamaps@0.5.10/src/js/data/bra.topo.json');
      features = topojson.feature(topo, topo.objects.bra).features;
      _topoCacheFeatures = features;
    }

    const width = container.clientWidth || 680;
    const height = Math.round(width * 0.75);

    const svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('aria-label', 'Mapa do Brasil com prevalência de diabetes por estado');

    const projection = d3.geoMercator().fitSize([width - 20, height - 20], { type: 'FeatureCollection', features });
    const path = d3.geoPath().projection(projection);

    svg.selectAll('path')
      .data(features)
      .join('path')
      .attr('class', 'state')
      .attr('d', path)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.8)
      .attr('fill', d => {
        const id = ufCode(d);
        const info = MAP_DATA[id];
        if (!info) return '#e2e8f0';
        return stateActive(info) ? getColor(info.prev) : '#edf0f5'; // esmaece fora do filtro
      })
      .attr('opacity', d => {
        const info = MAP_DATA[ufCode(d)];
        return stateActive(info) ? 1 : 0.55;
      })
      .on('mousemove', function(event, d) {
        const id = ufCode(d);
        const info = MAP_DATA[id];
        if (!info) return;
        tooltip.style.display = 'block';
        tooltip.style.left = (event.clientX + 14) + 'px';
        tooltip.style.top  = (event.clientY - 10) + 'px';
        tooltip.innerHTML = `
          <strong>${info.nome} (${id})</strong>
          <span>Prevalência DM: ${info.prev.toFixed(1)}%</span><br>
          <span>Mortalidade: ${info.mort.toFixed(1)}/100k hab</span><br>
          <span style="color:#94a3b8;font-size:11px">Região: ${info.regiao}</span>`;
      })
      .on('mouseleave', function() {
        tooltip.style.display = 'none';
      });

    // Labels das siglas
    svg.selectAll('text')
      .data(features)
      .join('text')
      .attr('x', d => path.centroid(d)[0])
      .attr('y', d => path.centroid(d)[1])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', d => {
        const area = path.area(d);
        return area > 4000 ? 10 : area > 1000 ? 8 : 7;
      })
      .attr('fill', d => {
        const info = MAP_DATA[ufCode(d)];
        if (!info) return '#475569';
        if (!stateActive(info)) return '#94a3b8';
        return info.prev >= 10.0 ? '#fff' : '#03426b';
      })
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text(d => ufCode(d) || '');

    buildMapLegend();

  } catch (err) {
    container.innerHTML = `
      <div style="padding:2rem;text-align:center;color:#64748b;">
        <p style="font-size:14px;margin-bottom:1rem">Mapa interativo não disponível offline.</p>
        <p style="font-size:12px">Abaixo estão os dados tabulares por estado.</p>
        ${buildFallbackTable()}
      </div>`;
    buildMapLegend();
  }
}

function buildFallbackTable() {
  const rows = Object.entries(MAP_DATA)
    .sort((a, b) => b[1].prev - a[1].prev)
    .map(([uf, d]) => `
      <tr>
        <td><strong>${uf}</strong></td>
        <td>${d.nome}</td>
        <td>${d.regiao}</td>
        <td>${d.prev.toFixed(1)}%</td>
        <td>${d.mort.toFixed(1)}</td>
      </tr>`).join('');
  return `
    <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;margin-top:1rem">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:6px 10px;border:1px solid #e2e8f0">UF</th>
          <th style="padding:6px 10px;border:1px solid #e2e8f0">Estado</th>
          <th style="padding:6px 10px;border:1px solid #e2e8f0">Região</th>
          <th style="padding:6px 10px;border:1px solid #e2e8f0">Prev. DM (%)</th>
          <th style="padding:6px 10px;border:1px solid #e2e8f0">Mort./100k</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
