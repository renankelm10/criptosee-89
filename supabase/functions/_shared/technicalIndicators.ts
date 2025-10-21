// Funções utilitárias para cálculo de indicadores técnicos

interface PriceData {
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  total_volume: number;
}

interface MarketHistory {
  current_price: number;
  timestamp: string;
}

// Calcular RSI (Relative Strength Index) - período 14
export function calculateRSI(history: MarketHistory[]): number {
  if (history.length < 14) return 50; // Valor neutro se não houver dados suficientes
  
  const prices = history.slice(0, 14).map(h => h.current_price).reverse();
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / 13;
  const avgLoss = losses / 13;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return Math.round(rsi * 100) / 100;
}

// Detectar spike de volume
export function detectVolumeSpike(currentVolume: number, avgVolume: number): boolean {
  return currentVolume > (avgVolume * 1.5);
}

// Calcular média de volume
export function calculateAverageVolume(history: any[]): number {
  if (history.length === 0) return 0;
  const sum = history.reduce((acc, h) => acc + (h.total_volume || 0), 0);
  return sum / history.length;
}

// Classificar opportunity level baseado em RSI e action
export function classifyOpportunityLevel(
  action: string,
  rsi: number,
  volumeSpike: boolean,
  priceChange7d: number
): 'hot' | 'warm' | 'normal' {
  
  // HOT: Oportunidades extremas + confirmação
  if (action === 'buy' && rsi < 25 && volumeSpike) return 'hot';
  if (action === 'sell' && rsi > 75 && volumeSpike) return 'hot';
  if (action === 'buy' && rsi < 30 && priceChange7d < -15) return 'hot';
  if (action === 'sell' && rsi > 70 && priceChange7d > 15) return 'hot';
  
  // WARM: Boas oportunidades
  if (action === 'buy' && rsi < 35) return 'warm';
  if (action === 'sell' && rsi > 65) return 'warm';
  if (action === 'buy' && priceChange7d < -10) return 'warm';
  if (action === 'sell' && priceChange7d > 10) return 'warm';
  
  // NORMAL: análise padrão
  return 'normal';
}

// Forçar distribuição de ações baseada em RSI - LÓGICA AGRESSIVA
export function determineAction(rsi: number, priceChange7d: number, planLevel: 'free' | 'basic' | 'premium'): string {
  // Free: sempre conservador
  if (planLevel === 'free') {
    return rsi < 30 || priceChange7d < -10 ? 'watch' : 'hold';
  }
  
  // PREMIUM: DISTRIBUIÇÃO AGRESSIVA (40% BUY, 25% SELL, 20% HOLD, 15% WATCH)
  if (planLevel === 'premium') {
    // COMPRA FORTE (40% das vezes)
    if (rsi < 35) return 'buy';
    if (rsi < 45 && priceChange7d > 15) return 'buy';
    if (rsi < 40 && priceChange7d > 10) return 'buy';
    
    // VENDA FORTE (25% das vezes)
    if (rsi > 65) return 'sell';
    if (rsi > 60 && priceChange7d < -15) return 'sell';
    if (rsi > 70 && priceChange7d < -10) return 'sell';
    
    // HOLD (20%)
    if (rsi >= 45 && rsi <= 55 && Math.abs(priceChange7d) < 10) return 'hold';
    
    // WATCH (15%)
    return 'watch';
  }
  
  // Basic: mais conservador
  if (rsi < 30) return 'buy';
  if (rsi > 70) return 'sell';
  if (rsi >= 40 && rsi <= 60) return 'hold';
  return 'watch';
}

// Calcular score de volatilidade
export function calculateVolatilityScore(priceChange24h: number, priceChange7d: number): string {
  const avgChange = (Math.abs(priceChange24h) + Math.abs(priceChange7d / 7)) / 2;
  
  if (avgChange > 10) return 'Alta';
  if (avgChange > 5) return 'Média';
  return 'Baixa';
}

// Determinar tendência
export function determineTrend(priceChange24h: number, priceChange7d: number): string {
  if (priceChange7d > 5 && priceChange24h > 2) return 'Alta Forte';
  if (priceChange7d > 0) return 'Alta';
  if (priceChange7d < -5 && priceChange24h < -2) return 'Baixa Forte';
  if (priceChange7d < 0) return 'Baixa';
  return 'Lateral';
}

// Determinar momentum
export function determineMomentum(priceChange24h: number, priceChange7d: number, volumeSpike: boolean): string {
  const shortTerm = priceChange24h > 3;
  const longTerm = priceChange7d > 10;
  
  if (shortTerm && longTerm && volumeSpike) return 'Muito Positivo';
  if (shortTerm || longTerm) return 'Positivo';
  if (priceChange24h < -3 && priceChange7d < -10) return 'Muito Negativo';
  if (priceChange24h < 0 || priceChange7d < 0) return 'Negativo';
  return 'Neutro';
}

// Calcular EMA (Exponential Moving Average)
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[0];
  
  const k = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < Math.min(prices.length, period); i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }
  
  return ema;
}

// Calcular MACD (Moving Average Convergence Divergence)
export function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(prices.slice(0, 26), 12);
  const ema26 = calculateEMA(prices.slice(0, 26), 26);
  const macd = ema12 - ema26;
  
  // Signal line (EMA 9 do MACD)
  const macdArray = [macd];
  const signal = calculateEMA(macdArray, 9);
  const histogram = macd - signal;
  
  return { 
    macd: Math.round(macd * 100) / 100, 
    signal: Math.round(signal * 100) / 100, 
    histogram: Math.round(histogram * 100) / 100 
  };
}

// Calcular Standard Deviation
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

// Calcular Bollinger Bands
export function calculateBollingerBands(prices: number[]): { upper: number; middle: number; lower: number } {
  if (prices.length < 20) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { upper: avg, middle: avg, lower: avg };
  }
  
  const period = Math.min(20, prices.length);
  const recentPrices = prices.slice(0, period);
  const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
  const stdDev = calculateStandardDeviation(recentPrices);
  
  return {
    upper: Math.round((sma + (2 * stdDev)) * 100) / 100,
    middle: Math.round(sma * 100) / 100,
    lower: Math.round((sma - (2 * stdDev)) * 100) / 100
  };
}

// Detectar Suporte e Resistência
export function detectSupportResistance(prices: number[], currentPrice: number) {
  if (prices.length === 0) {
    return {
      resistance: currentPrice,
      support: currentPrice,
      distanceToResistance: 0,
      distanceToSupport: 0,
      nearResistance: false,
      nearSupport: false
    };
  }
  
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  
  const distanceToResistance = ((max - currentPrice) / currentPrice) * 100;
  const distanceToSupport = ((currentPrice - min) / currentPrice) * 100;
  
  return {
    resistance: Math.round(max * 100) / 100,
    support: Math.round(min * 100) / 100,
    distanceToResistance: Math.round(distanceToResistance * 100) / 100,
    distanceToSupport: Math.round(distanceToSupport * 100) / 100,
    nearResistance: distanceToResistance < 5,
    nearSupport: distanceToSupport < 5
  };
}

// Calcular correlação de Pearson entre duas séries
export function calculateCorrelation(series1: number[], series2: number[]): number {
  const n = Math.min(series1.length, series2.length);
  if (n < 2) return 0;
  
  const mean1 = series1.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const mean2 = series2.slice(0, n).reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = series1[i] - mean1;
    const diff2 = series2[i] - mean2;
    numerator += diff1 * diff2;
    denominator1 += diff1 * diff1;
    denominator2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(denominator1 * denominator2);
  if (denominator === 0) return 0;
  
  const correlation = numerator / denominator;
  return Math.round(correlation * 100) / 100;
}