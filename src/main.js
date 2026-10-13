import { Dados } from './db.js';
import * as fastestCars from './fastest-cars.js';
import * as workslop from './workslop.js';

window.onload = async () => {
    const dados = new Dados();
    await dados.init();

    await dados.loadCSV('fastest_cars', 'data/fastest-cars.csv');
    const data = await dados.query(fastestCars.SQL);
    fastestCars.loadChart(data);

    // Casos 2 e 3 (colegas) entram aqui, no mesmo formato.
    // Caso 3 — Workslop
    await dados.loadCSV('workslop', 'data/workslop.csv');
    console.table(await dados.query(workslop.SQL_VALIDACAO)); // validação (opcional)
    const dadosWorkslopA = await dados.query(workslop.SQL_A);
    const dadosWorkslopB = await dados.query(workslop.SQL_B);
    workslop.loadChart(dadosWorkslopA, dadosWorkslopB);
};