# Redesign Crítico de Visualizações

Trabalho de Visualização de Dados: três visualizações originais do Makeover
Monday, analisadas criticamente e refeitas em dois redesigns cada (6 no total),
usando **D3.js** e **DuckDB**.

## Como executar

```bash
npm install
npm run dev
```

Abra o endereço indicado pelo Vite (ex.: `http://localhost:5173`). Os gráficos
são desenhados automaticamente ao carregar a página.

## Requisitos técnicos

- Visualizações em **D3.js** (sem bibliotecas de alto nível como Plotly,
  Chart.js, Vega-Lite ou Observable Plot).
- **DuckDB** para carga, transformação e validação dos dados.
- Código comentado.
- Para cada caso: imagem original + Design A + Design B.

## Estrutura

```
redesign-critico/
├── index.html          # página: título geral + uma seção por caso
├── index.css           # estilo
├── vite.config.js      # publicDir = public/
├── package.json        # d3 + @duckdb/duckdb-wasm + vite
├── public/
│   ├── data/           # CSVs dos casos (ex.: fastest-cars.csv)
│   └── img/            # imagens dos originais (ex.: fastest-cars-original.png)
└── src/
    ├── config.js       # inicialização do DuckDB-wasm
    ├── db.js           # classe Dados (init / loadCSV / query)
    ├── main.js         # carrega os dados e desenha cada caso
    └── fastest-cars.js # caso 1: SQL (DuckDB) + Design A e Design B (D3)
```

## Casos

1. **Fastest Cars In The World (As Of 2026)** — Makeover Monday 2026/W11 (implementado).
2. *(a definir — colega)*
3. **AI Workslop** — Makeover Monday 2026/W13
