# Redesign Crítico de Visualizações

Trabalho da disciplina de Visualização de Dados. Seleção de **3 visualizações
originais** (dos sites *Junk Charts* e *Makeover Monday*), análise crítica e
**2 redesigns por caso** (6 no total) implementados em **D3.js**, com
transformação de dados via **DuckDB**.

## Requisitos atendidos

- Visualizações feitas em **D3.js** (sem bibliotecas de alto nível como Plotly,
  Chart.js, Vega-Lite ou Observable Plot).
- **DuckDB** usado para consulta, transformação e validação dos dados.
- Código comentado.
- Aplicação única apresentando, para cada caso: **imagem original**, **Design A**
  e **Design B**.
- Relatório crítico em [`relatorio/relatorio.md`](relatorio/relatorio.md).

## Como executar

```bash
npm install
npm run dev
```

Abra o endereço indicado pelo Vite (ex.: `http://localhost:5173`).
Clique em **Desenhar** em cada caso para gerar os redesigns.

## Estrutura

```
redesign-critico/
├── index.html            # aplicação: 3 casos (original + Design A + Design B)
├── index.css             # estilos
├── vite.config.js        # publicDir = public/
├── package.json          # d3 + @duckdb/duckdb-wasm + vite
├── public/
│   ├── data/             # datasets (CSV/parquet) de cada caso
│   │   └── exemplo.csv   # dados de demonstração (substituir)
│   └── img/              # imagens das visualizações originais
├── src/
│   ├── config.js         # inicialização do DuckDB-wasm
│   ├── db.js             # classe Dados (init / loadCSV / query)
│   ├── utils.js          # auxiliares de desenho (margens, eixos, rótulos)
│   ├── main.js           # orquestra os casos e liga os botões
│   ├── caso01.js         # transformação (SQL) + Design A e Design B
│   ├── caso02.js
│   └── caso03.js
└── relatorio/
    └── relatorio.md      # relatório crítico
```