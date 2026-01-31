const ASSET_PAIRS_URL = "https://api.kraken.com/0/public/AssetPairs"
const OHLC_URL = "https://api.kraken.com/0/public/OHLC"

const ASSET_PAIRS_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export const ALLOWED_INTERVALS = [1, 5, 15, 30, 60, 240, 1440] as const

export type OHLCRow = [string, string, string, string, string, string, string, number]

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  vwap: number
  volume: number
  count: number
}

export interface AssetPairInfo {
  wsname?: string
  altname?: string
  [key: string]: unknown
}

export interface ResolvedPair {
  pairKey: string
  wsname: string
  displayPair: string
}

interface AssetPairsResponse {
  error: string[]
  result: Record<string, AssetPairInfo>
}

interface OHLCResponse {
  error: string[]
  result: Record<string, OHLCRow[] | number> & { last: number }
}

// In-memory cache for AssetPairs
let assetPairsCache: { data: Record<string, AssetPairInfo>; expiresAt: number } | null = null
let assetPairsPromise: Promise<Record<string, AssetPairInfo>> | null = null

function normalizePairInput(input: string): string {
  return input.trim().replace(/-/g, "/").toUpperCase()
}

function pairInputToMatchKey(normalized: string): string {
  const parts = normalized.split("/")
  if (parts.length !== 2) return normalized
  const base = parts[0] === "BTC" ? "XBT" : parts[0]
  const quote = parts[1] === "BTC" ? "XBT" : parts[1]
  return `${base}/${quote}`
}

function normalizeToMatchKey(s: string): string {
  return pairInputToMatchKey(normalizePairInput(s))
}

function toMatchKeyCompressed(s: string): string {
  return normalizeToMatchKey(s).replace(/\//g, "")
}

export async function fetchAssetPairs(): Promise<Record<string, AssetPairInfo>> {
  if (assetPairsCache && Date.now() < assetPairsCache.expiresAt) {
    return assetPairsCache.data
  }

  if (assetPairsPromise) {
    return assetPairsPromise
  }

  assetPairsPromise = (async () => {
    try {
      const res = await fetch(ASSET_PAIRS_URL)
      if (!res.ok) {
        throw new Error(`Kraken AssetPairs failed: ${res.status} ${res.statusText}`)
      }
      const json = (await res.json()) as AssetPairsResponse

      if (json.error && json.error.length > 0) {
        throw new Error(json.error.join(", "))
      }

      if (!json.result || typeof json.result !== "object") {
        throw new Error("Invalid AssetPairs response")
      }

      assetPairsCache = {
        data: json.result,
        expiresAt: Date.now() + ASSET_PAIRS_TTL_MS,
      }
      return json.result
    } finally {
      assetPairsPromise = null
    }
  })()

  return assetPairsPromise
}

export function resolvePair(
  pairs: Record<string, AssetPairInfo>,
  userInput: string
): ResolvedPair | null {
  const matchKey = normalizeToMatchKey(userInput)
  const matchKeyCompressed = toMatchKeyCompressed(userInput)

  for (const [pairKey, info] of Object.entries(pairs)) {
    const wsname = info?.wsname
    if (typeof wsname === "string" && normalizeToMatchKey(wsname) === matchKey) {
      const displayPair = wsname.replace(/\bXBT\b/g, "BTC")
      return { pairKey, wsname, displayPair }
    }
    const altname = info?.altname
    if (typeof altname === "string") {
      if (altname.includes("/") || altname.includes("-")) {
        if (normalizeToMatchKey(altname) === matchKey) {
          const canonical = normalizePairInput(altname).replace(/-/g, "/")
          const displayPair = canonical.replace(/\bXBT\b/g, "BTC")
          return { pairKey, wsname: info.wsname ?? canonical, displayPair }
        }
      } else if (toMatchKeyCompressed(altname) === matchKeyCompressed) {
        const canonical = typeof info.wsname === "string" ? info.wsname : altname
        const displayPair = canonical.replace(/\bXBT\b/g, "BTC")
        return { pairKey, wsname: canonical, displayPair }
      }
    }
  }
  return null
}

function parseCandle(raw: OHLCRow): Candle {
  return {
    time: Number(raw[0]),
    open: Number(raw[1]),
    high: Number(raw[2]),
    low: Number(raw[3]),
    close: Number(raw[4]),
    vwap: Number(raw[5]),
    volume: Number(raw[6]),
    count: Number(raw[7]),
  }
}

const CANDLE_CLOSE_EPS = 1e-8

function isCandleValid(c: Candle): boolean {
  if (![c.open, c.high, c.low, c.close].every(Number.isFinite)) return false
  if (c.high < c.low) return false
  // Allow close slightly outside [low, high] for rounding/stitching
  if (c.close < c.low - CANDLE_CLOSE_EPS || c.close > c.high + CANDLE_CLOSE_EPS) return false
  if (!Number.isFinite(c.volume)) return false
  return true
}

export interface FetchOhlcResult {
  candles: Candle[]
  last: number
}

export async function fetchOhlc(
  pairKey: string,
  interval: number
): Promise<FetchOhlcResult> {
  const res = await fetch(
    `${OHLC_URL}?pair=${encodeURIComponent(pairKey)}&interval=${interval}`
  )
  if (!res.ok) {
    throw new Error(`Kraken OHLC failed: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as OHLCResponse

  if (json.error && json.error.length > 0) {
    throw new Error(json.error.join(", "))
  }

  const lastVal = json.result.last
  const last = typeof lastVal === "number" ? lastVal : Number(lastVal) || 0
  const rawCandles = json.result[pairKey]
  if (!Array.isArray(rawCandles)) {
    throw new Error("Invalid OHLC response from Kraken")
  }

  const candles = rawCandles
    .slice(0, -1)
    .filter((row): row is OHLCRow => Array.isArray(row) && row.length >= 8)
    .map(parseCandle)
    .filter(isCandleValid)

  return { candles, last }
}
