let cachedRate: number | null = null
let ratePromise: Promise<number> | null = null

export async function fetchExchangeRate(): Promise<number> {
  if (cachedRate !== null) return cachedRate
  if (ratePromise) return ratePromise
  ratePromise = fetch("/api/configuracion")
    .then((r) => r.json())
    .then((data) => {
      cachedRate = Number(data.exchange_rate) || 1
      return cachedRate
    })
    .catch(() => 1)
  return ratePromise
}

export function clearExchangeRateCache() {
  cachedRate = null
  ratePromise = null
}
