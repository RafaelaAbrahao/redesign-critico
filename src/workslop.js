// Caso 3 — Workslop (HBR / Makeover Monday 2026/W13). Dois redesigns do
// gráfico original "Do You Send Colleagues Workslop?":
//   Design A (#workslop-A): barra única 100% empilhada (parte-todo)
//   Design B (#workslop-B): distribuição acumulada em escada ("pelo menos X%")
// Os dois têm um seletor de base: todos os respondentes × só quem usa IA.
import * as d3 from 'd3';

// -----------------------------------------------------------------------------
// SQL (DuckDB)
// -----------------------------------------------------------------------------

// Limpeza comum aos dois designs. A coluna workslop_pct mistura números
// (0, 10, ..., 100) com o texto "did_not_use_ai", então o read_csv_auto a lê
// como texto. Aqui ela vira:
//   nivel  → número (NULL para quem não usa IA)
//   grupo  → 'nao_usa' | 'zero' | 'algum' (algum workslop, de 10% a 100%)
//   ordem  → posição no empilhamento (não usa → 0% → 10% ... 100%)
const CTE_LIMPA = `
    limpa AS (
        SELECT
            TRY_CAST(workslop_pct AS INTEGER) AS nivel,
            respondent_pct AS pct,
            CASE
                WHEN workslop_pct = 'did_not_use_ai' THEN 'nao_usa'
                WHEN TRY_CAST(workslop_pct AS INTEGER) = 0 THEN 'zero'
                ELSE 'algum'
            END AS grupo,
            CASE
                WHEN workslop_pct = 'did_not_use_ai' THEN 'Não usa IA no trabalho'
                ELSE 'Considera ' || workslop_pct || '% do que envia workslop'
            END AS rotulo,
            COALESCE(TRY_CAST(workslop_pct AS INTEGER), -10) AS ordem
        FROM workslop
    )`;

// Design A: um segmento por categoria, com valor e posição (x0 → x1) na barra
// para as duas bases, e o total/extensão do grupo de cada segmento.
//   *_todos    → % de todos os respondentes (como publicado)
//   *_usuarios → % só de quem usa IA (divide pela soma dos que usam, 83,1%)
// As posições são somas acumuladas (funções de janela), então o D3 só
// precisa converter porcentagens em pixels.
export const SQL_A = `
    WITH ${CTE_LIMPA},
    valores AS (
        SELECT *,
            pct AS pct_todos,
            CASE WHEN grupo = 'nao_usa' THEN 0
                 ELSE pct / SUM(CASE WHEN grupo <> 'nao_usa' THEN pct ELSE 0 END) OVER () * 100
            END AS pct_usuarios
        FROM limpa
    ),
    segmentos AS (
        SELECT *,
            SUM(pct_todos)    OVER w - pct_todos    AS x0_todos,
            SUM(pct_todos)    OVER w                AS x1_todos,
            SUM(pct_usuarios) OVER w - pct_usuarios AS x0_usuarios,
            SUM(pct_usuarios) OVER w                AS x1_usuarios
        FROM valores
        WINDOW w AS (ORDER BY ordem ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
    )
    SELECT *,
        SUM(pct_todos)    OVER g AS total_grupo_todos,
        SUM(pct_usuarios) OVER g AS total_grupo_usuarios,
        MIN(x0_todos)     OVER g AS gx0_todos,
        MAX(x1_todos)     OVER g AS gx1_todos,
        MIN(x0_usuarios)  OVER g AS gx0_usuarios,
        MAX(x1_usuarios)  OVER g AS gx1_usuarios,
        ordem = MIN(ordem) OVER g AS primeiro_do_grupo
    FROM segmentos
    WINDOW g AS (PARTITION BY grupo)
    ORDER BY ordem
`;

// Design B: distribuição acumulada complementar. Para cada nível, a soma de
// quem considera aquele nível OU MAIS como workslop (janela do maior para o
// menor). Também traz a média estimada de workslop entre quem usa IA.
export const SQL_B = `
    WITH ${CTE_LIMPA},
    acum AS (
        SELECT
            nivel,
            SUM(pct) OVER (ORDER BY nivel DESC
                           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acum_todos,
            SUM(pct) OVER () AS total_usuarios,
            SUM(nivel * pct) OVER () / SUM(pct) OVER () AS media_usuarios
        FROM limpa
        WHERE nivel IS NOT NULL
    )
    SELECT
        nivel,
        acum_todos,
        acum_todos / total_usuarios * 100 AS acum_usuarios,
        media_usuarios
    FROM acum
    WHERE nivel >= 10
    ORDER BY nivel
`;

// Validação (opcional): confere o arquivo antes de desenhar.
// Esperado: 12 linhas, 11 níveis, soma 100,1% (arredondamento da fonte).
export const SQL_VALIDACAO = `
    WITH ${CTE_LIMPA}
    SELECT
        COUNT(*)                                             AS linhas,
        COUNT(nivel)                                         AS niveis,
        ROUND(SUM(pct), 1)                                   AS soma_total,
        ROUND(SUM(pct) FILTER (WHERE grupo <> 'nao_usa'), 1) AS usam_ia,
        ROUND(SUM(pct) FILTER (WHERE grupo = 'algum'), 1)    AS algum_workslop
    FROM limpa
`;

// -----------------------------------------------------------------------------
// Utilitários
// -----------------------------------------------------------------------------

const ROXO = '#4a3bb8';
const fmtPct = (v) => Number(v).toFixed(1).replace('.', ',') + '%';
const textoBase = (base) => (base === 'usuarios' ? 'de quem usa IA' : 'dos respondentes');

// Tooltip: um <div> único, criado na primeira vez e reaproveitado.
function tooltip() {
    let tip = d3.select('#workslop-tooltip');
    if (tip.empty()) {
        tip = d3.select('body').append('div')
            .attr('id', 'workslop-tooltip')
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('background', '#fff')
            .style('border', '1px solid #ccc')
            .style('border-radius', '6px')
            .style('padding', '6px 10px')
            .style('font-size', '13px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,.12)');
    }
    return {
        mostrar(evento, html) {
            tip.html(html)
                .style('display', 'block')
                .style('left', evento.pageX + 12 + 'px')
                .style('top', evento.pageY + 12 + 'px');
        },
        esconder() { tip.style('display', 'none'); },
    };
}

// Seletor de base: dois botões criados dentro do elemento indicado.
// Ao clicar, destaca o botão escolhido e chama aoTrocar('todos' | 'usuarios').
function seletorBase(seletor, aoTrocar) {
    const el = d3.select(seletor);
    if (el.empty()) return;

    const opcoes = [
        { base: 'todos', texto: 'Todos os respondentes' },
        { base: 'usuarios', texto: 'Só quem usa IA' },
    ];

    const pintar = (ativa) => el.selectAll('button')
        .style('background', d => (d.base === ativa ? ROXO : '#fff'))
        .style('color', d => (d.base === ativa ? '#fff' : '#444'));

    el.selectAll('button').data(opcoes).join('button')
        .attr('type', 'button')
        .text(d => d.texto)
        .style('margin', '0 6px 8px 0')
        .style('padding', '5px 12px')
        .style('border', `1px solid ${ROXO}`)
        .style('border-radius', '999px')
        .style('cursor', 'pointer')
        .style('font', 'inherit')
        .on('click', (evento, d) => { pintar(d.base); aoTrocar(d.base); });

    pintar('todos');
}

// -----------------------------------------------------------------------------
// Entrada
// -----------------------------------------------------------------------------

export function loadChart(dadosA, dadosB) {
    desenhaBarraEmpilhada(dadosA, 'todos');
    desenhaEscada(dadosB, 'todos');
    seletorBase('#workslop-base-A', base => desenhaBarraEmpilhada(dadosA, base));
    seletorBase('#workslop-base-B', base => desenhaEscada(dadosB, base));
}

export function clearChart() {
    d3.select('#workslop-A').selectAll('*').remove();
    d3.select('#workslop-B').selectAll('*').remove();
    d3.select('#workslop-base-A').html('');
    d3.select('#workslop-base-B').html('');
}

// -----------------------------------------------------------------------------
// Design A — barra única 100% empilhada.
// Toda a amostra numa só barra (comprimento em escala comum). Chaves acima
// agrupam os segmentos e mostram o total de cada grupo, destacando o número
// que o título original cita mas não mostra (52,8%). Cinza = "não usa IA"
// (fora da escala); violeta claro → escuro = intensidade (atributo ordinal).
// -----------------------------------------------------------------------------
function desenhaBarraEmpilhada(data, base) {
    const svg = d3.select('#workslop-A');
    if (svg.empty()) return;
    svg.selectAll('*').remove();   // redesenha do zero a cada troca de base

    // Tamanho fixo + viewBox: o gráfico escala com a largura da página.
    const W = 900, H = 270, m = 8;
    const barraY = 112, barraH = 54, espaco = 2;
    svg.attr('viewBox', `0 0 ${W} ${H}`)
        .style('width', '100%')
        .style('height', 'auto');

    // Colunas da base escolhida (ex.: x0_todos ou x0_usuarios).
    const valor = d => Number(d['pct_' + base]);
    const x0 = d => Number(d['x0_' + base]);
    const x1 = d => Number(d['x1_' + base]);
    const gx0 = d => Number(d['gx0_' + base]);
    const gx1 = d => Number(d['gx1_' + base]);
    const totalGrupo = d => Number(d['total_grupo_' + base]);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, x1)])
        .range([m, W - m]);

    const corNivel = d3.scaleLinear().domain([10, 100]).range(['#a89df0', '#241a6b']);
    const cor = d => (d.grupo === 'nao_usa' ? '#b4b2a9' : d.grupo === 'zero' ? '#dedaf8' : corNivel(Number(d.nivel)));

    // Na base "só quem usa IA" o grupo "não usa" tem largura 0 e some.
    const segmentos = data.filter(d => valor(d) > 0);
    const grupos = segmentos.filter(d => d.primeiro_do_grupo);
    const tip = tooltip();

    // 1. Segmentos.
    svg.selectAll('rect.seg').data(segmentos).join('rect')
        .attr('class', 'seg')
        .attr('x', d => x(x0(d)))
        .attr('y', barraY)
        .attr('width', d => Math.max(0, x(x1(d)) - x(x0(d)) - espaco))
        .attr('height', barraH)
        .attr('fill', cor)
        .on('mousemove', (e, d) => tip.mostrar(e, `${d.rotulo}<br><b>${fmtPct(valor(d))}</b> ${textoBase(base)}`))
        .on('mouseleave', () => tip.esconder());

    // 2. Chaves: linha sobre o grupo, número grande e rótulo.
    const nomes = {
        nao_usa: 'Não usa IA no trabalho',
        zero: 'Diz enviar 0% de workslop',
        algum: 'Admite enviar algum workslop',
    };
    const centro = d => (x(gx0(d)) + x(gx1(d))) / 2;
    const yChave = barraY - 12;

    svg.selectAll('line.chave').data(grupos).join('line')
        .attr('class', 'chave')
        .attr('x1', d => x(gx0(d)) + 1)
        .attr('x2', d => x(gx1(d)) - espaco - 1)
        .attr('y1', yChave).attr('y2', yChave)
        .attr('stroke', '#999');

    svg.selectAll('text.chave-valor').data(grupos).join('text')
        .attr('class', 'chave-valor')
        .attr('x', centro)
        .attr('y', d => yChave - (d.grupo === 'algum' ? 34 : 30))
        .attr('text-anchor', 'middle')
        .attr('font-size', d => (d.grupo === 'algum' ? 38 : 28))
        .attr('font-weight', 600)
        .attr('fill', d => (d.grupo === 'algum' ? ROXO : '#222'))
        .text(d => fmtPct(totalGrupo(d)));

    svg.selectAll('text.chave-rotulo').data(grupos).join('text')
        .attr('class', 'chave-rotulo')
        .attr('x', centro)
        .attr('y', yChave - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('fill', '#555')
        .text(d => nomes[d.grupo]);

    // 3. Legenda da intensidade, sob o bloco "algum workslop".
    const algum = grupos.find(d => d.grupo === 'algum');
    const niveis = d3.range(10, 101, 10);
    const inicio = x(gx0(algum));
    const celula = (x(gx1(algum)) - inicio) / niveis.length;
    const yLeg = barraY + barraH + 34;

    svg.append('text')
        .attr('class', 'label')
        .attr('x', inicio).attr('y', yLeg - 10)
        .attr('font-size', 12)
        .text('Parcela do que envia que a pessoa considera workslop →');

    svg.selectAll('rect.leg').data(niveis).join('rect')
        .attr('class', 'leg')
        .attr('x', (n, i) => inicio + i * celula)
        .attr('y', yLeg)
        .attr('width', celula - espaco)
        .attr('height', 10)
        .attr('fill', n => corNivel(n));

    svg.selectAll('text.leg-tick').data(niveis).join('text')
        .attr('class', 'leg-tick')
        .attr('x', (n, i) => inicio + i * celula + celula / 2)
        .attr('y', yLeg + 26)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', '#777')
        .text(n => n + '%');
}

// -----------------------------------------------------------------------------
// Design B — distribuição acumulada em escada ("pelo menos X%").
// Cada ponto já é a soma das categorias à direita (feita no DuckDB): a soma
// mental do original vira leitura de posição. Escada porque as faixas são
// discretas; eixo Y fixo em 0–70% para que a troca de base fique visível.
// -----------------------------------------------------------------------------
function desenhaEscada(data, base) {
    const svg = d3.select('#workslop-B');
    if (svg.empty()) return;
    svg.selectAll('*').remove();

    const W = 900, H = 400;
    const m = { left: 62, right: 36, top: 28, bottom: 62 };
    const largura = W - m.left - m.right;
    const altura = H - m.top - m.bottom;
    svg.attr('viewBox', `0 0 ${W} ${H}`)
        .style('width', '100%')
        .style('height', 'auto');

    const valor = d => Number(d['acum_' + base]);
    const media = Number(data[0].media_usuarios);

    const x = d3.scaleLinear().domain([10, 100]).range([0, largura]);
    const y = d3.scaleLinear().domain([0, 70]).range([altura, 0]);

    const g = svg.append('g').attr('transform', `translate(${m.left}, ${m.top})`);

    // Grade horizontal (atrás de tudo).
    const grid = g.append('g').attr('class', 'grid');
    grid.call(d3.axisLeft(y).ticks(7).tickSize(-largura).tickFormat(''));
    grid.select('.domain').remove();
    grid.selectAll('line').attr('stroke', '#e5e5e5');

    // Eixos.
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0, ${altura})`)
        .call(d3.axisBottom(x).tickValues(d3.range(10, 101, 10)).tickFormat(d => '≥' + d + '%'));

    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(7).tickFormat(d => d + '%'));

    svg.append('text')
        .attr('class', 'label')
        .attr('x', m.left + largura / 2).attr('y', H - 12)
        .attr('text-anchor', 'middle')
        .text('Parcela do trabalho com IA enviado que a pessoa considera workslop');

    svg.append('text')
        .attr('class', 'label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(m.top + altura / 2)).attr('y', 16)
        .attr('text-anchor', 'middle')
        .text(base === 'usuarios' ? '% de quem usa IA' : '% de todos os respondentes');

    // Média estimada (linha tracejada). Começa em 46% para não cruzar a
    // anotação do primeiro ponto.
    g.append('line')
        .attr('x1', x(media)).attr('x2', x(media))
        .attr('y1', y(46)).attr('y2', altura)
        .attr('stroke', '#888').attr('stroke-dasharray', '4 4');

    g.append('text')
        .attr('x', x(media) + 6).attr('y', altura - 10)
        .attr('font-size', 12).attr('fill', '#555')
        .text(`média estimada entre quem usa IA: ${Math.round(media)}% de workslop`);

    // Linha em degraus: d3.line gera o "d" do <path>; curveStepAfter mantém
    // o valor até a próxima categoria.
    const linha = d3.line()
        .x(d => x(Number(d.nivel)))
        .y(d => y(valor(d)))
        .curve(d3.curveStepAfter);

    g.append('path')
        .datum(data)
        .attr('d', linha)
        .attr('fill', 'none')
        .attr('stroke', ROXO)
        .attr('stroke-width', 2.5);

    // Pontos com tooltip.
    const tip = tooltip();
    g.selectAll('circle').data(data).join('circle')
        .attr('cx', d => x(Number(d.nivel)))
        .attr('cy', d => y(valor(d)))
        .attr('r', 6)
        .attr('fill', ROXO)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mousemove', (e, d) => tip.mostrar(e,
            `Considera <b>pelo menos ${d.nivel}%</b> do que envia workslop<br>` +
            `<b>${fmtPct(valor(d))}</b> ${textoBase(base)}`))
        .on('mouseleave', () => tip.esconder());

    // Anotações em três pontos-chave: valor em negrito + descrição.
    const anotacoes = {
        10: 'admite algum workslop',
        30: 'considera ao menos 30% workslop',
        50: 'considera metade ou mais workslop',
    };
    const textos = g.selectAll('text.anot').data(data.filter(d => anotacoes[d.nivel])).join('text')
        .attr('class', 'anot')
        .attr('x', d => x(Number(d.nivel)) + 10)
        .attr('y', d => y(valor(d)) - 12);

    textos.append('tspan')
        .attr('font-size', 16).attr('font-weight', 600).attr('fill', '#222')
        .text(d => fmtPct(valor(d)));

    textos.append('tspan')
        .attr('dx', 6).attr('font-size', 13).attr('fill', '#555')
        .text(d => anotacoes[d.nivel]);
}
