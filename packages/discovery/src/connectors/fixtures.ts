import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function useConnectorFixtures(): boolean {
  return process.env.APERO_J_CONNECTOR_FIXTURES === "true";
}

export async function loadConnectorFixture(name: string): Promise<unknown> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixturePath = path.join(here, "../../fixtures/connectors", `${name}.json`);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as unknown;
}
