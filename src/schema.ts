import { semanticType } from "./glossary.js";

type RecordValue = Record<string, unknown>;

export interface FieldSchema {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "null" | "mixed";
  nullable: boolean;
  uniqueInSample: boolean;
  examples: unknown[];
  semanticType: string | null;
  statistics: { present: number; missing: number; distinct: number; min?: number; max?: number };
  aliases: string[];
}

function valueType(value: unknown): FieldSchema["type"] {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "object";
  return "string";
}

export function inferSchema(records: RecordValue[]): { fields: FieldSchema[]; sampleSize: number } {
  const names = [...new Set(records.flatMap((record) => Object.keys(record)))].sort();
  const fields = names.map((name): FieldSchema => {
    const values = records.map((record) => record[name]);
    const present = values.filter((value) => value !== null && value !== undefined);
    const types = [...new Set(present.map(valueType))];
    const encoded = present.map((value) => typeof value === "object" ? JSON.stringify(value) : String(value));
    const distinct = new Set(encoded);
    const examples = present.filter((value, index) => encoded.indexOf(encoded[index]) === index).slice(0, 3);
    const numbers = present.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const semantic = semanticType(name);
    return {
      name,
      type: types.length === 0 ? "null" : types.length === 1 ? types[0] : "mixed",
      nullable: present.length !== records.length,
      uniqueInSample: present.length > 0 && distinct.size === present.length,
      examples,
      semanticType: semantic,
      statistics: {
        present: present.length,
        missing: records.length - present.length,
        distinct: distinct.size,
        ...(numbers.length ? { min: Math.min(...numbers), max: Math.max(...numbers) } : {}),
      },
      aliases: semantic ? [semantic] : [],
    };
  });
  return { fields, sampleSize: records.length };
}
