// Caso 2 — Deadliest Animals. Desenha dois redesigns da tabela original:
//   Design A (#deadliest-animals-A): Barras em escala logarítmica
//   Design B (#deadliest-animals-B): Pareto - Gráfico de barras + escala linear

import * as d3 from 'd3';

// Ordena por Mortes por ano.
export const SQL = `
    SELECT
        animal,
        animal_type,
        humans_killed_per_year,
        estimate_qualifier,
    FROM deadliest_animals
    ORDER BY humans_killed_per_year DESC
`;

const corDe = (tipo) => '#3d5a73';

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
    desenhaPareto(data);
}

export function clearChart() {
    d3.select('#deadliest-animals-A').selectAll('*').remove();
    d3.select('#deadliest-animals-B').selectAll('*').remove();
    d3.select('#DA-leg-A').html('');
    d3.select('#DA-leg-B').html('');
}

// Design A — barras horizontais. Mortes por categoria.
function desenhaBarras(data) {
    const svg = d3.select('#deadliest-animals-A');
    if (svg.empty()) return;

    const m = { left: 190, right: 60, top: 12, bottom: 46 };
    const { largura, altura } = tamanho(svg, m);

    const y = d3.scaleBand()
        .domain(data.map(d => d.animal))
        .range([0, altura])
        .padding(0.22);

    const x = d3.scaleLog()
        .domain([1, d3.max(data, d => Number(d.humans_killed_per_year))]) // <--- funciona
        .range([0, largura]);

    const g = svg.selectAll('#fcA-g').data([0]).join('g')
        .attr('id', 'fcA-g')
        .attr('transform', `translate(${m.left}, ${m.top})`);


    g.selectAll('rect.bar').data(data).join('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', d => y(d.animal))
        .attr('width', d => x(Number(d.humans_killed_per_year)))
        .attr('height', y.bandwidth())
        .attr('fill', d => corDe(d.animal_type));

    g.selectAll('text.bar-val').data(data).join('text')
        .attr('class', 'bar-val')
        .attr('x', d => x(Number(d.humans_killed_per_year)) + 6)
        .attr('y', d => y(d.animal) + y.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .text(d => d.humans_killed_per_year);

    g.selectAll('#fcA-x').data([0]).join('g')
        .attr('id', 'fcA-x').attr('class', 'axis')
        .attr('transform', `translate(0, ${altura})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('~g')));

    g.selectAll('#fcA-y').data([0]).join('g')
        .attr('id', 'fcA-y').attr('class', 'axis')
        .call(d3.axisLeft(y));

    svg.selectAll('#fcA-xt').data([0]).join('text')
        .attr('id', 'fcA-xt').attr('class', 'label')
        .attr('x', m.left + largura / 2)
        .attr('y', +svg.style('height').split('px')[0] - 8)
        .attr('text-anchor', 'middle')
        .text('Mortes por ano');
}

// Design B — Pareto. Demonstra como apartir da 4ª categoria a mudança no total é infima.
function desenhaPareto(data) {
    const svg = d3.select('#deadliest-animals-B');
    if (svg.empty()) return;

    const m = { left: 70, right: 50, top: 16, bottom: 100 };
    const { largura, altura } = tamanho(svg, m);

    const total = d3.sum(data, d => Number(d.humans_killed_per_year));

    let acumulado = 0;
    const comAcumulado = data.map(d => {
        acumulado += Number(d.humans_killed_per_year);
        return {
            ...d,
            pct_acumulada: (acumulado / total) * 100
        };
    });

    const x = d3.scaleBand()
            .domain(comAcumulado.map(d => d.animal))
            .range([0, largura])
            .padding(0.22);

    const y = d3.scaleLinear()
        .domain(d3.extent(comAcumulado, d => Number(d.humans_killed_per_year))).nice()
        .range([altura, 0]);
    
    const y2 = d3.scaleLinear()
    .domain([0,100]).range([altura, 0]);


    const g = svg.selectAll('#fcB-g').data([0]).join('g')
        .attr('id', 'fcB-g')
        .attr('transform', `translate(${m.left}, ${m.top})`);
    

    const gridY = g.selectAll('#fcB-gy').data([0]).join('g')
        .attr('id', 'fcB-gy').attr('class', 'grid');
    gridY.call(d3.axisLeft(y).ticks(6).tickSize(-largura).tickFormat(''));
    gridY.select('.domain').remove();

    const gridY2 = g.selectAll('#fcB-gy2').data([0]).join('g')
        .attr('transform', `translate(${largura}, 0)`)
        .attr('id', 'fcB-gy2').attr('class', 'grid');
    gridY2.call(d3.axisRight(y2).ticks(6).tickSize(-largura).tickFormat(''));
    
    g.selectAll('rect.bar').data(comAcumulado).join('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.animal))
        .attr('y', d => y(Number(d.humans_killed_per_year)))
        .attr('width', x.bandwidth())
        .attr('height', d => altura - y(Number(d.humans_killed_per_year)))
        .attr('fill', d => corDe(d.animal_type));

    const linha = d3.line()
        .x(d => x(d.animal) + x.bandwidth() / 2)  // centro da banda
        .y(d => y2(d.pct_acumulada));
    
    g.selectAll('path.pareto').data([comAcumulado]).join('path')
        .attr('class', 'pareto')
        .attr('fill', 'none')
        .attr('stroke', '#8c2f23')
        .attr('stroke-width', 2)
        .attr('d', linha);
    
     g.selectAll('circle.pareto').data(comAcumulado).join('circle')
        .attr('class', 'pareto')
        .attr('cx', d => x(d.animal) + x.bandwidth() / 2)
        .attr('cy', d => y2(d.pct_acumulada))
        .attr('r', 3.5)
        .attr('fill', '#8c2f23');
    
    g.selectAll('text.pareto-val').data(comAcumulado).join('text')
    .attr('class', 'pareto-val')
    .attr('x', d => x(d.animal) + x.bandwidth() / 2)
    .attr('y', d => y2(d.pct_acumulada) + 12)   // 8px acima do ponto
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#582620')
    .attr('font-size', 10)
    .text(d => d3.format('.1f')(d.pct_acumulada) + '%');

    g.selectAll('text.bar-val').data(comAcumulado).join('text')
        .attr('class', 'bar-val')
        .attr('y', d => (y(Number(d.humans_killed_per_year)) + -6))
        .attr('x', d => x(d.animal) + (x.bandwidth() / 2))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .text(d => d.humans_killed_per_year);
    

    g.selectAll('#fcB-x').data([0]).join('g')
            .attr('id', 'fcB-x').attr('class', 'axis')
            .attr('transform', `translate(0, ${altura})`)
            .call(d3.axisBottom(x))
        .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

    g.selectAll('#fcB-y').data([0]).join('g')
        .attr('id', 'fcB-y').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format('d')));
    
    g.selectAll('#fcB-y2').data([0]).join('g')
    .attr('transform', `translate(${largura}, 0)`)
        .attr('id', 'fcB-y2').attr('class', 'axis')
        .call(d3.axisRight(y2).ticks(6).tickFormat(d => d + '%'));

    svg.selectAll('#fcB-xt').data([0]).join('text')
        .attr('id', 'fcB-xt').attr('class', 'label')
        .attr('x', m.left + largura / 2)
        .attr('y', +svg.style('height').split('px')[0] - 8)
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(-60, 0)')
        .text('Animais');

    svg.selectAll('#fcB-yt').data([0]).join('text')
        .attr('id', 'fcB-yt').attr('class', 'label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(m.top + altura / 2))
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .text('Mortes por ano');
}
