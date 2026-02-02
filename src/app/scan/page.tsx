"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ScanResultData {
  verdict: string
  compositeScore: number
  trend: string
  adx: number
  rsi: number
  confidence: string
  riskLevel: string
  lastPrice: number
  entryMid: number
  potentialGain: number
}

interface ScanResult {
  pair: string
  success: boolean
  error?: string
  data?: ScanResultData
}

interface ScanResponse {
  scannedAt: string
  totalScanned: number
  successfulScans: number
  buySignals: number
  results: ScanResult[]
}

type SortKey = "score" | "rsi" | "adx" | "gain" | "price"
type FilterVerdict = "all" | "buy" | "accumulate" | "neutral"
type BatchSize = "quick" | "medium" | "full"

const BATCH_INFO: Record<BatchSize, { label: string; count: string; time: string }> = {
  quick: { label: "Quick Scan", count: "50 coins", time: "~40 sec" },
  medium: { label: "Medium Scan", count: "150 coins", time: "~2.5 min" },
  full: { label: "Full Scan", count: "300+ coins", time: "~5 min" },
}

export default function ScanPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [scanData, setScanData] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>("score")
  const [filterVerdict, setFilterVerdict] = useState<FilterVerdict>("all")
  const [batchSize, setBatchSize] = useState<BatchSize>("quick")

  const runScan = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/scan?batch=${batchSize}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Scan failed")
      }
      
      setScanData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed")
    } finally {
      setIsLoading(false)
    }
  }

  const getVerdictStyle = (verdict: string) => {
    if (verdict === "Strong Buy") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
    if (verdict === "Buy") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    if (verdict === "Accumulate") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
    if (verdict === "Avoid") return "bg-rose-500/10 text-rose-400 border-rose-500/30"
    return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" // Neutral
  }

  const getTrendStyle = (trend: string) => {
    if (trend.includes("Bull")) return "text-emerald-400"
    if (trend.includes("Bear")) return "text-rose-400"
    return "text-amber-400"
  }

  const getRsiStyle = (rsi: number) => {
    if (rsi < 30) return "text-emerald-400" // Oversold - good for buying
    if (rsi > 70) return "text-rose-400" // Overbought
    return "text-zinc-300"
  }

  const getConfidenceStyle = (confidence: string) => {
    if (confidence === "High") return "text-emerald-400"
    if (confidence === "Medium") return "text-amber-400"
    return "text-zinc-500"
  }

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    if (price >= 1) return `$${price.toFixed(4)}`
    if (price >= 0.01) return `$${price.toFixed(6)}`
    return `$${price.toFixed(8)}`
  }

  // Filter and sort results
  const getFilteredResults = () => {
    if (!scanData) return []
    
    let filtered = scanData.results.filter(r => r.success && r.data)
    
    // Apply verdict filter
    if (filterVerdict === "buy") {
      filtered = filtered.filter(r => r.data?.verdict === "Buy" || r.data?.verdict === "Strong Buy")
    } else if (filterVerdict === "accumulate") {
      filtered = filtered.filter(r => r.data?.verdict === "Accumulate")
    } else if (filterVerdict === "neutral") {
      filtered = filtered.filter(r => r.data?.verdict === "Neutral" || r.data?.verdict === "Avoid")
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      if (!a.data || !b.data) return 0
      switch (sortBy) {
        case "score":
          return b.data.compositeScore - a.data.compositeScore
        case "rsi":
          return a.data.rsi - b.data.rsi // Lower RSI first (oversold)
        case "adx":
          return b.data.adx - a.data.adx // Higher ADX first (stronger trend)
        case "gain":
          return b.data.potentialGain - a.data.potentialGain
        case "price":
          return b.data.lastPrice - a.data.lastPrice
        default:
          return 0
      }
    })
    
    return filtered
  }

  const filteredResults = getFilteredResults()

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-zinc-950 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.03),transparent_50%)] pointer-events-none"></div>
      
      <div className="container mx-auto px-4 py-12 max-w-7xl relative z-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">
              Market Scanner
            </h1>
            <p className="text-zinc-400">
              Scan multiple cryptocurrencies to find buying opportunities
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Back to Analysis
            </Button>
          </Link>
        </header>

        {/* Scan Options */}
        <Card className="bg-zinc-900/50 border-zinc-800/50 mb-8">
          <CardContent className="pt-6">
            {/* Batch Size Selection */}
            <div className="mb-6">
              <label className="text-sm text-zinc-400 mb-3 block">Select scan size:</label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(BATCH_INFO) as BatchSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setBatchSize(size)}
                    disabled={isLoading}
                    className={`p-4 rounded-lg border transition-all ${
                      batchSize === size
                        ? "border-indigo-500 bg-indigo-500/10 text-white"
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="font-medium">{BATCH_INFO[size].label}</div>
                    <div className="text-sm opacity-70">{BATCH_INFO[size].count}</div>
                    <div className="text-xs opacity-50 mt-1">{BATCH_INFO[size].time}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                onClick={runScan}
                disabled={isLoading}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Scanning {BATCH_INFO[batchSize].count}... ({BATCH_INFO[batchSize].time})
                  </span>
                ) : (
                  `Start ${BATCH_INFO[batchSize].label}`
                )}
              </Button>
              
              {scanData && (
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>Scanned: {scanData.successfulScans}/{scanData.totalScanned}</span>
                  <span className="text-emerald-400 font-medium">
                    Buy Signals: {scanData.buySignals}
                  </span>
                </div>
              )}
            </div>
            
            {error && (
              <p className="text-rose-400 text-sm mt-4">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {scanData && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">Filter:</span>
                <div className="flex gap-1">
                  {(["all", "buy", "wait"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilterVerdict(f)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        filterVerdict === f
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {f === "all" ? "All" : f === "buy" ? "Buy Signals" : f === "accumulate" ? "Accumulate" : "Neutral/Avoid"}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 border border-zinc-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="score">Composite Score</option>
                  <option value="rsi">RSI (Oversold First)</option>
                  <option value="adx">Trend Strength</option>
                  <option value="gain">Potential Gain</option>
                  <option value="price">Price</option>
                </select>
              </div>
              
              <span className="text-sm text-zinc-500 ml-auto">
                Showing {filteredResults.length} coins
              </span>
            </div>

            {/* Table */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Pair</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Price</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Verdict</th>
                      <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Score</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Trend</th>
                      <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">RSI</th>
                      <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">ADX</th>
                      <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Confidence</th>
                      <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Gain to T1</th>
                      <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredResults.map((result) => (
                      <tr 
                        key={result.pair} 
                        className={`hover:bg-zinc-800/30 transition-colors ${
                          result.data?.verdict === "Strong Buy" ? "bg-emerald-500/5" :
                          result.data?.verdict === "Buy" ? "bg-emerald-500/[0.02]" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-white">{result.pair.replace("/USD", "")}</span>
                          <span className="text-zinc-500">/USD</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 font-mono text-sm">
                          {result.data ? formatPrice(result.data.lastPrice) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {result.data && (
                            <Badge 
                              variant="outline" 
                              className={`${getVerdictStyle(result.data.verdict)} font-medium`}
                            >
                              {result.data.verdict}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono font-medium ${
                            (result.data?.compositeScore ?? 0) >= 20 ? "text-emerald-400" :
                            (result.data?.compositeScore ?? 0) >= 0 ? "text-amber-400" :
                            "text-rose-400"
                          }`}>
                            {result.data?.compositeScore.toFixed(0) ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${getTrendStyle(result.data?.trend ?? "")}`}>
                            {result.data?.trend ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono ${getRsiStyle(result.data?.rsi ?? 50)}`}>
                            {result.data?.rsi.toFixed(1) ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono ${
                            (result.data?.adx ?? 0) >= 25 ? "text-emerald-400" : "text-zinc-400"
                          }`}>
                            {result.data?.adx.toFixed(1) ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={getConfidenceStyle(result.data?.confidence ?? "")}>
                            {result.data?.confidence ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono ${
                            (result.data?.potentialGain ?? 0) >= 10 ? "text-emerald-400" : "text-zinc-300"
                          }`}>
                            +{result.data?.potentialGain ?? 0}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href={`/?pair=${encodeURIComponent(result.pair)}`}>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                            >
                              Analyze
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredResults.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                  No coins match the current filter
                </div>
              )}
            </Card>

            {/* Legend */}
            <div className="mt-6 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Understanding the Table</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-zinc-500">
                <div>
                  <span className="text-emerald-400">RSI &lt; 30</span> = Oversold (potential buy)
                </div>
                <div>
                  <span className="text-emerald-400">ADX &gt; 25</span> = Strong trend
                </div>
                <div>
                  <span className="text-emerald-400">Score &gt; 20</span> = Buy signal
                </div>
                <div>
                  <span className="text-emerald-400">Score &gt; 50</span> = Strong buy
                </div>
              </div>
            </div>
          </>
        )}

        {!scanData && !isLoading && (
          <Card className="bg-zinc-900/30 border-zinc-800/50">
            <CardContent className="py-16 text-center">
              <p className="text-zinc-500 mb-4">
                Click "Scan Top 40 Coins" to analyze multiple cryptocurrencies and find buying opportunities.
              </p>
              <p className="text-zinc-600 text-sm">
                The scan analyzes each coin using the same multi-factor system as the main analysis page.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
