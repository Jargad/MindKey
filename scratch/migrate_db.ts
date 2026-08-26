import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Leer .env.local manualmente
const env = readFileSync(".env.local", "utf-8");
const dbUrlMatch = env.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
const DATABASE_URL = dbUrlMatch ? dbUrlMatch[1] : null;

if (!DATABASE_URL) {
  console.error("No se encontró DATABASE_URL en .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log("Migrando base de datos...");
  try {
    await sql`ALTER TABLE vault_items RENAME COLUMN name TO encrypted_name;`;
    console.log("Columna 'name' renombrada a 'encrypted_name' en vault_items.");
  } catch (e) {
    console.log("Salto vault_items:name (ya hecho o no existe).");
  }

  try {
    await sql`ALTER TABLE folders RENAME COLUMN name TO encrypted_name;`;
    console.log("Columna 'name' renombrada a 'encrypted_name' en folders.");
  } catch (e) {
    console.log("Salto folders:name (ya hecho o no existe).");
  }

  try {
    // Asegurar que no sean null
    await sql`UPDATE vault_items SET encrypted_name = 'Cifrado' WHERE encrypted_name IS NULL;`;
    await sql`ALTER TABLE vault_items ALTER COLUMN encrypted_name SET NOT NULL;`;
  } catch (e) {}
}

main();
