import { describe, expect, it } from "bun:test";
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { encodeVectorTile } from "../src/vector-tiles.js";

describe("Mapbox vector tiles", () => {
  it("encodes a standards-readable MVT layer", () => {
    const bytes = encodeVectorTile({ type: "FeatureCollection", features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [55.27, 25.2] }, properties: { name: "Dubai", nested: { value: 1 } } },
    ] }, 0, 0, 0, "UAE facilities");
    const tile = new VectorTile(new PbfReader(bytes));
    expect(tile.layers.uae_facilities.length).toBe(1);
    expect(tile.layers.uae_facilities.feature(0).properties).toMatchObject({ name: "Dubai", nested: '{"value":1}' });
  });

  it("rejects invalid tile coordinates", () => {
    expect(() => encodeVectorTile({ type: "FeatureCollection", features: [] }, 2, 4, 0)).toThrow("tile coordinates");
  });
});
