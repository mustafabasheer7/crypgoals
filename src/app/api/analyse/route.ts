import { NextRequest, NextResponse } from "next/server"
import type { Candle } from "@/lib/kraken"
import { analyseCandles } from "@/lib/analysis"

const DEFAULT_INTERVAL = 240
const DEFAULT_LIMIT = 300

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pair = searchParams.get("pair")?.trim()

  if (!pair) {
    return NextResponse.json(
      { error: "Query parameter 'pair' is required (e.g. BTC/USD)" },
      { status: 400 }
    )
  }

  const interval = Number(searchParams.get("interval") ?? DEFAULT_INTERVAL)
  const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT)

  if (!Number.isFinite(interval) || interval <= 0) {
    return NextResponse.json({ error: "Invalid 'interval'." }, { status: 400 })
  }
  if (!Number.isFinite(limit) || limit < 50 || limit > 720) {
    return NextResponse.json(
      { error: "'limit' must be between 50 and 720." },
      { status: 400 }
    )
  }

  try {
    // Call your own OHLC route so Kraken logic stays in one place
    const baseUrl = new URL(req.url)
    baseUrl.pathname = "/api/kraken/ohlc"
    baseUrl.search = ""
    baseUrl.searchParams.set("pair", pair)
    baseUrl.searchParams.set("interval", String(interval))
    baseUrl.searchParams.set("limit", String(limit))

    const ohlcRes = await fetch(baseUrl.toString(), { cache: "no-store" })
    const text = await ohlcRes.text()

    let ohlcJson: any = null
    try {
      ohlcJson = text ? JSON.parse(text) : null
    } catch {
      ohlcJson = null
    }

    if (!ohlcRes.ok) {
      return NextResponse.json(
        { error: ohlcJson?.error ?? text ?? "Failed to fetch OHLC." },
        { status: ohlcRes.status }
      )
    }

    const candles = ohlcJson?.candles as Candle[] | undefined
    if (!Array.isArray(candles) || candles.length < 60) {
      return NextResponse.json(
        { error: "Not enough candle data to analyse." },
        { status: 502 }
      )
    }

    const analysis = analyseCandles(pair, candles)

    return NextResponse.json(
      {
        pair: ohlcJson?.displayPair ?? pair,
        interval,
        limit,
        last: ohlcJson?.last ?? null,
        ...analysis,
      },
      { headers: { "Cache-Control": "public, max-age=30" } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
