import { Dados } from './db.js';
import * as fastestCars from './fastest-cars.js';
import * as deadliestAnimals from './deadliest-animals.js'
import * as workslop from './workslop.js';

window.onload = async () => {
    const dados = new Dados();
    await dados.init();

    await dados.loadCSV('fastest_cars', 'data/fastest-cars.csv');
    const data = await dados.query(fastestCars.SQL);
    fastestCars.loadChart(data);

    // Casos 2 - Deadliest Animals

    await dados.loadCSV('deadliest_animals', 'data/worlds_deadliest_animals.csv');
    const dataDA = await dados.query(deadliestAnimals.SQL);
    deadliestAnimals.loadChart(dataDA);

    // Caso 3 — Workslop
    await dados.loadCSV('workslop', 'data/workslop.csv');
    console.table(await dados.query(workslop.SQL_VALIDACAO)); // validação (opcional)
    const dadosWorkslopA = await dados.query(workslop.SQL_A);
    const dadosWorkslopB = await dados.query(workslop.SQL_B);
    workslop.loadChart(dadosWorkslopA, dadosWorkslopB);
};