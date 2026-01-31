import { NextRequest, NextResponse } from "next/server"
import {
  fetchAssetPairs,
  resolvePair,
  fetchOhlc,
  ALLOWED_INTERVALS,
  type Candle,
} from "@/lib/kraken"

const OHLC_TTL_MS = 60 * 1000 // 60 seconds
const MAX_CANDLES = 720 // Kraken returns up to 720
const DEFAULT_LIMIT = 200
const RESOLVE_ERROR_HINT = "Use format like BTC/USD, ETH/USD, SOL/USD or XBT/USD."

// In-memory cache for OHLC (candles + last)
const ohlcCache = new Map<string, { data: Candle[]; last: number; expiresAt: number }>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pair = searchParams.get("pair")
  const intervalParam = searchParams.get("interval")
  const limitParam = searchParams.get("limit")

  // Validate pair (required)
  if (pair == null || pair.trim() === "") {
    return NextResponse.json(
      { error: "Query parameter 'pair' is required (e.g. BTC/USD or XBT/USD)" },
      { status: 400 }
    )
  }

  // Validate interval (optional, default 240)
  let interval: number
  if (intervalParam == null || intervalParam.trim() === "") {
    interval = 240
  } else {
    interval = parseInt(intervalParam, 10)
    if (Number.isNaN(interval) || !ALLOWED_INTERVALS.includes(interval as (typeof ALLOWED_INTERVALS)[number])) {
      return NextResponse.json(
        { error: `'interval' must be one of: ${ALLOWED_INTERVALS.join(", ")}` },
        { status: 400 }
      )
    }
  }

  // Limit: default 200, optional override (1–720)
  let limit: number = DEFAULT_LIMIT
  if (limitParam != null && limitParam.trim() !== "") {
    const parsed = parseInt(limitParam, 10)
    if (Number.isNaN(parsed) || parsed < 1 || parsed > MAX_CANDLES) {
      return NextResponse.json(
        { error: `'limit' must be between 1 and ${MAX_CANDLES}` },
        { status: 400 }
      )
    }
    limit = parsed
  }

  try {
    const pairs = await fetchAssetPairs()
    const resolved = resolvePair(pairs, pair)

    if (!resolved) {
      return NextResponse.json(
        { error: `No Kraken market found for pair: ${pair}. ${RESOLVE_ERROR_HINT}` },
        { status: 404 }
      )
    }

    const { pairKey: resolvedPairKey, wsname, displayPair } = resolved
    const ohlcCacheKey = `${resolvedPairKey}:${interval}`

    const cacheControl = "public, max-age=60"

    // Check OHLC cache
    const cached = ohlcCache.get(ohlcCacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      const candles = cached.data.slice(-limit)
      return NextResponse.json(
        {
          inputPair: pair.trim(),
          resolvedPairKey,
          wsname,
          displayPair,
          interval,
          last: cached.last,
          candles,
        },
        { headers: { "Cache-Control": cacheControl } }
      )
    }

    const { candles: allCandles, last } = await fetchOhlc(resolvedPairKey, interval)

    ohlcCache.set(ohlcCacheKey, {
      data: allCandles,
      last,
      expiresAt: Date.now() + OHLC_TTL_MS,
    })

    const candles = allCandles.slice(-limit)

    return NextResponse.json(
      {
        inputPair: pair.trim(),
        resolvedPairKey,
        wsname,
        displayPair,
        interval,
        last,
        candles,
      },
      { headers: { "Cache-Control": cacheControl } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Kraken data"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
