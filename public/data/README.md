# Dados

Colocar aqui os datasets de cada caso. Eles são carregados
no DuckDB pela classe `Dados` (`src/db.js`) e transformados via SQL dentro de cada módulo de caso.

- `caso01.csv`, `worlds_deadliest_animals.csv`, `caso03.csv` — datasets reais de cada caso.

Carregamento (em `src/main.js`):

```js
await dados.loadCSV('caso01', 'data/caso01.csv');
```
