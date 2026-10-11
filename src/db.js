// Acesso aos dados via DuckDB. Mesma estrutura da classe Taxi de aula,
// adaptada para ler CSV (read_csv_auto) em vez de parquet.
import { loadDb } from './config.js';

export class Dados {
    async init() {
        this.db = await loadDb();
        this.conn = await this.db.connect();
    }

    // Registra o CSV e cria a tabela `tabela`.
    async loadCSV(tabela, url) {
        const res = await fetch(url);
        await this.db.registerFileBuffer(`${tabela}.csv`, new Uint8Array(await res.arrayBuffer()));
        await this.conn.query(`
            CREATE OR REPLACE TABLE ${tabela} AS
                SELECT * FROM read_csv_auto('${tabela}.csv');
        `);
    }

    async query(sql) {
        const result = await this.conn.query(sql);
        return result.toArray().map(row => row.toJSON());
    }
}
