import { ValidationError } from "./errors.js";
import { resolveEntityKey } from "./geography.js";

type Rec = Record<string, unknown>;

export interface EntityResolutionResult {
  matches: Rec[];
  leftMatched: number;
  rightMatched: number;
  leftUnmatched: number;
  rightUnmatched: number;
  truncated: boolean;
}

export function resolveEntities(left: Rec[], leftFields: string[], right: Rec[], rightFields: string[], maxMatches = 1000): EntityResolutionResult {
  if (!leftFields.length || leftFields.length !== rightFields.length) throw new ValidationError("left_fields and right_fields must be non-empty lists of equal length");
  if (!Number.isInteger(maxMatches) || maxMatches < 1 || maxMatches > 5000) throw new ValidationError("max_matches must be between 1 and 5000");
  const rightIndex = new Map<string, Array<{ index: number; record: Rec }>>();
  right.forEach((record, index) => {
    const key = resolveEntityKey(record, rightFields);
    const entries = rightIndex.get(key) ?? [];
    rightIndex.set(key, [...entries, { index, record }]);
  });
  const matches: Rec[] = []; const leftMatched = new Set<number>(); const rightMatched = new Set<number>();
  let truncated = false;
  outer: for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const key = resolveEntityKey(left[leftIndex], leftFields);
    for (const candidate of rightIndex.get(key) ?? []) {
      if (matches.length >= maxMatches) { truncated = true; break outer; }
      leftMatched.add(leftIndex); rightMatched.add(candidate.index);
      matches.push({ entity_key: key, left: left[leftIndex], right: candidate.record, match: { method: "normalized_exact", fields: leftFields.map((field, index) => ({ left: field, right: rightFields[index] })), confidence: 1 } });
    }
  }
  return { matches, leftMatched: leftMatched.size, rightMatched: rightMatched.size, leftUnmatched: left.length - leftMatched.size, rightUnmatched: right.length - rightMatched.size, truncated };
}
