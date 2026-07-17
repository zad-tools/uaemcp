// Retained year-end observations from the three official TDRA workbooks.
const serials = [40878,41244,41609,41974,42339,42705,43070,43435,43800,44166,44531,44896,45261,45627,45992] as const;
const rows = (field: string, values: readonly number[]) => serials.map((Statistics, index) => ({ Statistics, [field]: values[index] }));

export const TDRA_CONNECTIVITY_SNAPSHOT = {
  active_mobile_subscriptions: rows("Active Mobile Subscriptions[ii]", [11727401,13775252,16063547,16819024,17942560,19905093,19826224,19475483,18278817,16820680,18001105,20036039,21222710,22407833,24278380]),
  broadband_per_100_inhabitants: rows("Broadband Internet Subscriptions per 100 inhabitants", [14.8,11.6,12.5,12.91,14.43,14.98,15.38,34.143,34.04,35.91,39.1,41,42,48,51.4]),
  fixed_lines_per_100_inhabitants: rows("Fixed lines per 100 inhabitants", [31.026575766178343,23.966084733979585,25.045436298978675,23.124505847224956,24.51227469404093,24.343030024496425,24.086964814122364,24.02597912634844,23.73394725999292,23.6,20.2,21.6,20.8,20.8,20.4]),
} as const;

export const TDRA_CONNECTIVITY_SNAPSHOT_META = {
  retrievedAt: "2026-07-18T00:00:00Z",
  period: "2011-01-01/2025-12-01",
  granularity: "retained year-end observations; live workbooks contain monthly observations",
  sha256: {
    tdra_active_mobile_subscriptions_2025: "b6845219db682ec3830d74632c58e580285171c6d575b5511a80cc0e3469b25c",
    tdra_broadband_per_100_2025: "aad6e469935d2a09a5ca1a44be9ab1a5d178be2fdcaceb0596de14d06e2bf795",
    tdra_fixed_lines_per_100_2025: "f4e8172085d1fb45dd72f55d49d7ac2238429b073ba470a21849ca22fbc0ee3f",
  },
} as const;
