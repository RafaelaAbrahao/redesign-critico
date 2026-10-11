// Caso 1 — Fastest Cars. Desenha dois redesigns da tabela original:
//   Design A (#fastest-cars-A): barras horizontais ordenadas por velocidade
//   Design B (#fastest-cars-B): dispersão potência x velocidade
import * as d3 from 'd3';

// Ordena por velocidade (ranking do Design A) e recalcula preço por HP (validação).
export const SQL = `
    SELECT
        car,
        engine_type,
        top_speed_kmh,
        horsepower_hp,
        price_usd,
        ROUND(price_usd / horsepower_hp, 2) AS price_per_hp
    FROM fastest_cars
    ORDER BY top_speed_kmh DESC
`;

// Cor por tipo de motor; o elétrico recebe o tom de destaque para sobressair.
const CORES = {
    'Twin-Turbo V8': '#3d5a73',
    'Quad-Turbo W16': '#b07c3f',
    'Electric (4 motors)': '#8c2f23',
};
const corDe = (tipo) => CORES[tipo] || '#777';

// Largura/altura internas do svg (desconta as margens).
function tamanho(svg, m) {
    const largura = +svg.style('width').split('px')[0] - m.left - m.right;
    const altura  = +svg.style('height').split('px')[0] - m.top - m.bottom;
    return { largura, altura };
}

function legenda(seletor, tipos) {
    const el = d3.select(seletor);
    if (el.empty()) return;
    el.html(tipos.map(t => `<span><i style="background:${corDe(t)}"></i>${t}</span>`).join(''));
}

export function loadChart(data) {
    desenhaBarras(data);
    desenhaDispersao(data);
}

export function clearChart() {
    d3.select('#fastest-cars-A').selectAll('*').remove();
    d3.select('#fastest-cars-B').selectAll('*').remove();
    d3.select('#leg-A').html('');
    d3.select('#leg-B').html('');
}

// Design A — barras horizontais. Comprimento (velocidade) a partir do zero.
function desenhaBarras(data) {
    const svg = d3.select('#fastest-cars-A');
    if (svg.empty()) return;

    const m = { left: 190, right: 60, top: 12, bottom: 46 };
    const { largura, altura } = tamanho(svg, m);

    const y = d3.scaleBand()
        .domain(data.map(d => d.car))
        .range([0, altura])
        .padding(0.22);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => Number(d.top_speed_kmh))])
        .range([0, largura]);

    const g = svg.selectAll('#fcA-g').data([0]).join('g')
        .attr('id', 'fcA-g')
        .attr('transform', `translate(${m.left}, ${m.top})`);

    // Grid desenhado antes das barras para ficar atrás.
    const grid = g.selectAll('#fcA-grid').data([0]).join('g')
        .attr('id', 'fcA-grid').attr('class', 'grid');
    grid.call(d3.axisBottom(x).ticks(6).tickSize(altura).tickFormat(''));
    grid.select('.domain').remove();

    g.selectAll('rect.bar').data(data).join('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', d => y(d.car))
        .attr('height', y.bandwidth())
        .attr('width', d => x(Number(d.top_speed_kmh)))
        .attr('fill', d => corDe(d.engine_type));

    g.selectAll('text.bar-val').data(data).join('text')
        .attr('class', 'bar-val')
        .attr('x', d => x(Number(d.top_speed_kmh)) + 6)
        .attr('y', d => y(d.car) + y.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .text(d => d.top_speed_kmh);

    g.selectAll('#fcA-x').data([0]).join('g')
        .attr('id', 'fcA-x').attr('class', 'axis')
        .attr('transform', `translate(0, ${altura})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('d')));

    g.selectAll('#fcA-y').data([0]).join('g')
        .attr('id', 'fcA-y').attr('class', 'axis')
        .call(d3.axisLeft(y));

    svg.selectAll('#fcA-xt').data([0]).join('text')
        .attr('id', 'fcA-xt').attr('class', 'label')
        .attr('x', m.left + largura / 2)
        .attr('y', +svg.style('height').split('px')[0] - 8)
        .attr('text-anchor', 'middle')
        .text('Velocidade máxima (km/h)');

    legenda('#leg-A', [...new Set(data.map(d => d.engine_type))]);
}

// Design B — dispersão. Mostra que mais potência não significa mais velocidade
// (o Rimac, elétrico, fica como ponto fora do padrão).
function desenhaDispersao(data) {
    const svg = d3.select('#fastest-cars-B');
    if (svg.empty()) return;

    const m = { left: 58, right: 24, top: 16, bottom: 48 };
    const { largura, altura } = tamanho(svg, m);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => Number(d.horsepower_hp))).nice()
        .range([0, largura]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => Number(d.top_speed_kmh))).nice()
        .range([altura, 0]);

    // Raio ~ preço (sqrt: área proporcional ao valor).
    const r = d3.scaleSqrt()
        .domain(d3.extent(data, d => Number(d.price_usd)))
        .range([6, 22]);

    const g = svg.selectAll('#fcB-g').data([0]).join('g')
        .attr('id', 'fcB-g')
        .attr('transform', `translate(${m.left}, ${m.top})`);

    const gridY = g.selectAll('#fcB-gy').data([0]).join('g')
        .attr('id', 'fcB-gy').attr('class', 'grid');
    gridY.call(d3.axisLeft(y).ticks(6).tickSize(-largura).tickFormat(''));
    gridY.select('.domain').remove();

    const gridX = g.selectAll('#fcB-gx').data([0]).join('g')
        .attr('id', 'fcB-gx').attr('class', 'grid')
        .attr('transform', `translate(0, ${altura})`);
    gridX.call(d3.axisBottom(x).ticks(6).tickSize(-altura).tickFormat(''));
    gridX.select('.domain').remove();

    g.selectAll('circle').data(data).join('circle')
        .attr('cx', d => x(Number(d.horsepower_hp)))
        .attr('cy', d => y(Number(d.top_speed_kmh)))
        .attr('r', d => r(Number(d.price_usd)))
        .attr('fill', d => corDe(d.engine_type))
        .attr('fill-opacity', 0.75)
        .attr('stroke', d => corDe(d.engine_type))
        .attr('stroke-width', 1.5);

    g.selectAll('#fcB-x').data([0]).join('g')
        .attr('id', 'fcB-x').attr('class', 'axis')
        .attr('transform', `translate(0, ${altura})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('d')));

    g.selectAll('#fcB-y').data([0]).join('g')
        .attr('id', 'fcB-y').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format('d')));

    svg.selectAll('#fcB-xt').data([0]).join('text')
        .attr('id', 'fcB-xt').attr('class', 'label')
        .attr('x', m.left + largura / 2)
        .attr('y', +svg.style('height').split('px')[0] - 8)
        .attr('text-anchor', 'middle')
        .text('Potência (HP)');

    svg.selectAll('#fcB-yt').data([0]).join('text')
        .attr('id', 'fcB-yt').attr('class', 'label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(m.top + altura / 2))
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .text('Velocidade (km/h)');

    legenda('#leg-B', [...new Set(data.map(d => d.engine_type))]);
}
