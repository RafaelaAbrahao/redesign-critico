import { Dados } from './db.js';
import * as fastestCars from './fastest-cars.js';

window.onload = async () => {
    const dados = new Dados();
    await dados.init();

    await dados.loadCSV('fastest_cars', 'data/fastest-cars.csv');
    const data = await dados.query(fastestCars.SQL);
    fastestCars.loadChart(data);

    // Casos 2 e 3 (colegas) entram aqui, no mesmo formato.
};
