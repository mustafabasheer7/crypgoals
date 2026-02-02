import { NextRequest, NextResponse } from "next/server"
import type { Candle } from "@/lib/kraken"
import { analyseCandles } from "@/lib/analysis"

// All available trading pairs (400+ coins)
const ALL_PAIRS = [
  // Top coins by market cap
  "BTC/USD", "ETH/USD", "XRP/USD", "SOL/USD", "BNB/USD", "DOGE/USD", "ADA/USD", 
  "TRX/USD", "WBTC/USD", "BCH/USD", "LINK/USD", "XLM/USD", "LTC/USD", "SUI/USD", 
  "AVAX/USD", "SHIB/USD", "HBAR/USD", "TON/USD", "CRO/USD", "DOT/USD", "UNI/USD", 
  "MNT/USD", "AAVE/USD", "TAO/USD", "PEPE/USD", "NEAR/USD", "ETC/USD", "ICP/USD", 
  "ONDO/USD", "WLD/USD", "POL/USD", "ENA/USD", "QNT/USD", "APT/USD", "ATOM/USD", 
  "ALGO/USD", "FLR/USD", "KAS/USD", "RENDER/USD", "ARB/USD", "FIL/USD", "VET/USD", 
  "XDC/USD", "BONK/USD", "JUP/USD", "SEI/USD", "DASH/USD", "CAKE/USD", "XTZ/USD", 
  "PENGU/USD", "CHZ/USD", "STX/USD", "OP/USD", "FET/USD", "CRV/USD", "INJ/USD", 
  "ZRO/USD", "LDO/USD", "AERO/USD", "XMR/USD", "ZEC/USD",
  
  // DeFi & Infrastructure
  "SUN/USD", "FLOKI/USD", "TIA/USD", "GRT/USD", "GNO/USD", "PYTH/USD", "AXS/USD",
  "STRK/USD", "JASMY/USD", "SPX/USD", "SAND/USD", "ENS/USD", "TEL/USD", "PENDLE/USD",
  "ZK/USD", "WIF/USD", "GALA/USD", "MANA/USD", "XCN/USD", "LUNA/USD", "RAY/USD",
  "COMP/USD", "BAT/USD", "HNT/USD", "AR/USD", "CVX/USD", "RUNE/USD", "1INCH/USD",
  "TRAC/USD", "IMX/USD", "EIGEN/USD", "EGLD/USD", "BEAM/USD", "APE/USD", "LPT/USD",
  "JTO/USD", "W/USD", "SNX/USD", "ATH/USD", "QTUM/USD", "RSR/USD", "DYDX/USD",
  "AKT/USD", "GRASS/USD", "YFI/USD", "KSM/USD", "SUPER/USD", "ZRX/USD", "MINA/USD",
  "COW/USD", "FLOW/USD", "KAITO/USD", "T/USD", "SAFE/USD", "NANO/USD", "TURBO/USD",
  "AIOZ/USD", "ALEO/USD", "ZETA/USD", "FXS/USD", "ARKM/USD", "MORPHO/USD", "ETHFI/USD",
  "JITOSOL/USD", "MSOL/USD", "LSETH/USD", "METH/USD", "TBTC/USD", "SKY/USD",
  
  // More altcoins
  "MOG/USD", "SC/USD", "ASTR/USD", "NMR/USD", "REQ/USD", "MOCA/USD", "KAVA/USD",
  "DEEP/USD", "BERA/USD", "XYO/USD", "SUSHI/USD", "GMX/USD", "MEW/USD", "BLUR/USD",
  "BICO/USD", "DRIFT/USD", "OMNI/USD", "OM/USD", "BIO/USD", "PLUME/USD", "MERL/USD",
  "PNUT/USD", "SSV/USD", "CELO/USD", "STG/USD", "POPCAT/USD", "ORCA/USD", "MASK/USD",
  "DAG/USD", "MEME/USD", "ALT/USD", "LRC/USD", "UMA/USD", "ANKR/USD", "BABY/USD",
  "SPK/USD", "ICX/USD", "API3/USD", "ENJ/USD", "NOT/USD", "GUN/USD", "ARC/USD",
  "GMT/USD", "BAND/USD", "LCX/USD", "ACH/USD", "SCRT/USD", "MNGO/USD", "RPL/USD",
  "POWR/USD", "SNEK/USD", "COTI/USD", "CORN/USD", "CARV/USD", "WOO/USD", "FHE/USD",
  "RLC/USD", "NEIRO/USD", "SPELL/USD", "SHX/USD", "DRV/USD", "BNT/USD", "BTR/USD",
  "PRIME/USD", "PEAQ/USD", "B2/USD", "EWT/USD", "OPEN/USD", "CHEX/USD", "LSK/USD",
  "AUDIO/USD", "BIGTIME/USD", "YGG/USD", "FLUX/USD", "ANIME/USD", "CYBER/USD",
  "OSMO/USD", "AUCTION/USD", "LQTY/USD", "EDU/USD", "CCD/USD", "ZORA/USD",
  
  // New additions from user list
  "HYPE/USD", "XAUT/USD", "PAXG/USD", "BGB/USD", "PUMP/USD", "ASTER/USD", "MYX/USD",
  "NIGHT/USD", "IP/USD", "VIRTUAL/USD", "JST/USD", "RIVER/USD", "BTT/USD", 
  "SYRUP/USD", "APENFT/USD", "AB/USD", "SENT/USD", "ADI/USD", "XPL/USD", "H/USD", 
  "MON/USD", "S/USD", "FF/USD", "CMETH/USD", "VSN/USD", "LION/USD", "A/USD", 
  "SOSO/USD", "WAL/USD", "GOMINING/USD", "0G/USD", "KMNO/USD", "KTA/USD", "MET/USD", 
  "CASH/USD", "SKR/USD", "ICNT/USD", "VVV/USD", "LINEA/USD", "RAVE/USD", "SOON/USD", 
  "DBR/USD", "ALCH/USD", "SXT/USD", "ESPORTS/USD", "ME/USD", "PROVE/USD", "RED/USD", 
  "WMTX/USD", "AVNT/USD", "GWEI/USD", "Q/USD", "SAHARA/USD", "ZIG/USD", "UAI/USD", 
  "KGEN/USD", "ACU/USD", "BREV/USD", "PLAY/USD", "AIO/USD",
  
  // Meme coins
  "TRUMP/USD", "MELANIA/USD", "DOG/USD", "FARTCOIN/USD", "CHEEMS/USD", "TOSHI/USD",
  "MOODENG/USD", "NPC/USD", "USELESS/USD", "REKT/USD", "BANANAS31/USD", "CLANKER/USD",
  
  // Gaming & Metaverse  
  "BIGTIME/USD", "MAGIC/USD", "GODS/USD", "ILV/USD", "ALICE/USD", "GHST/USD",
  "STARL/USD", "HERO/USD", "PYR/USD", "WILD/USD", "REVV/USD", "ATLAS/USD",
  
  // AI & Data
  "OCEAN/USD", "AGIX/USD", "NMR/USD", "RLC/USD", "GLM/USD", "CTSI/USD", "ROSE/USD",
  
  // Layer 2 & Scaling
  "MATIC/USD", "LRC/USD", "BOBA/USD", "METIS/USD", "CELR/USD", "OMG/USD", "SKL/USD",
  
  // Privacy coins
  "XMR/USD", "ZEC/USD", "SCRT/USD", "ARRR/USD", "FIRO/USD", "BEAM/USD",
  
  // Exchange tokens
  "BNB/USD", "CRO/USD", "FTT/USD", "LEO/USD", "OKB/USD", "KCS/USD", "HT/USD", "MX/USD",
  
  // Storage & Computing
  "FIL/USD", "AR/USD", "SC/USD", "STORJ/USD", "HOT/USD", "ANKR/USD", "AKT/USD",
  
  // Oracle networks
  "LINK/USD", "BAND/USD", "API3/USD", "DIA/USD", "TRB/USD", "UMA/USD",
  
  // Cross-chain
  "RUNE/USD", "REN/USD", "MULTI/USD", "SYN/USD", "STG/USD", "CCIP/USD"
]

// Remove duplicates and create unique list
const DEFAULT_PAIRS = [...new Set(ALL_PAIRS)]

interface ScanResult {
  pair: string
  success: boolean
  error?: string
  data?: {
    verdict: string
    compositeScore: number
    trend: string
    adx: number
    rsi: number
    confidence: string
    riskLevel: string
    lastPrice: number
    entryMid: number
    potentialGain: number // % to T1
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // Allow custom pairs or use defaults
  const pairsParam = searchParams.get("pairs")
  const pairs = pairsParam 
    ? pairsParam.split(",").map(p => p.trim().toUpperCase())
    : DEFAULT_PAIRS
  
  // Batch size: "quick" (50), "medium" (150), "full" (all ~300+)
  const batchSize = searchParams.get("batch") || "quick"
  const maxPairs = batchSize === "full" ? 400 : batchSize === "medium" ? 150 : 50
  const limitedPairs = pairs.slice(0, maxPairs)
  
  const interval = 240 // 4-hour candles
  const limit = 300
  
  const results: ScanResult[] = []
  
  // Process pairs sequentially to avoid rate limits
  for (const pair of limitedPairs) {
    try {
      // Fetch candles from our OHLC endpoint
      const baseUrl = new URL(req.url)
      baseUrl.pathname = "/api/kraken/ohlc"
      baseUrl.search = ""
      baseUrl.searchParams.set("pair", pair)
      baseUrl.searchParams.set("interval", String(interval))
      baseUrl.searchParams.set("limit", String(limit))
      
      const ohlcRes = await fetch(baseUrl.toString(), { cache: "no-store" })
      
      if (!ohlcRes.ok) {
        results.push({ pair, success: false, error: "Failed to fetch data" })
        continue
      }
      
      const ohlcJson = await ohlcRes.json()
      const candles = ohlcJson?.candles as Candle[] | undefined
      
      if (!Array.isArray(candles) || candles.length < 60) {
        results.push({ pair, success: false, error: "Insufficient data" })
        continue
      }
      
      // Run analysis
      const analysis = analyseCandles(pair, candles)
      
      // Calculate potential gain to T1
      const potentialGain = analysis.levels.entryMid > 0 
        ? ((analysis.levels.t1 - analysis.levels.entryMid) / analysis.levels.entryMid) * 100
        : 0
      
      results.push({
        pair,
        success: true,
        data: {
          verdict: analysis.verdict,
          compositeScore: analysis.meta.signals.composite,
          trend: analysis.meta.trend,
          adx: analysis.meta.adx,
          rsi: analysis.meta.indicators.rsi14,
          confidence: analysis.riskSummary.confidence,
          riskLevel: analysis.riskSummary.riskLevel,
          lastPrice: analysis.meta.lastPrice,
          entryMid: analysis.levels.entryMid,
          potentialGain: Math.round(potentialGain * 10) / 10,
        }
      })
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed"
      results.push({ pair, success: false, error: message })
    }
  }
  
  // Sort by composite score (highest first)
  results.sort((a, b) => {
    if (!a.success || !a.data) return 1
    if (!b.success || !b.data) return -1
    return b.data.compositeScore - a.data.compositeScore
  })
  
  // Summary stats
  const successful = results.filter(r => r.success)
  const buySignals = successful.filter(r => r.data?.verdict === "Buy" || r.data?.verdict === "Strong Buy")
  
  return NextResponse.json({
    scannedAt: new Date().toISOString(),
    totalScanned: results.length,
    successfulScans: successful.length,
    buySignals: buySignals.length,
    results,
  }, {
    headers: { "Cache-Control": "public, max-age=60" }
  })
}
