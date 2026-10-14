# Dados

Colocar aqui os datasets de cada caso. Eles são carregados
no DuckDB pela classe `Dados` (`src/db.js`) e transformados via SQL dentro de cada módulo de caso.

- `fastest-cars.csv`, `worlds_deadliest_animals.csv`, `workslop.csv` — datasets reais de cada caso.

Carregamento (em `src/main.js`):

```js
await dados.loadCSV('fastest-cars', 'data/fastest-cars.csv');
await dados.loadCSV('worlds_deadliest_animals', 'data/worlds_deadliest_animals.csv');
await dados.loadCSV('workslop', 'data/workslop.csv');
```
