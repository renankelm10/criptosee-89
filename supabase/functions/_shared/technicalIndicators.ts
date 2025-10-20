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

// Forçar distribuição de ações baseada em RSI
export function determineAction(rsi: number, priceChange7d: number, planLevel: 'free' | 'basic' | 'premium'): string {
  // Free: sempre conservador
  if (planLevel === 'free') {
    return rsi < 30 || priceChange7d < -10 ? 'watch' : 'hold';
  }
  
  // Basic e Premium: usar RSI de verdade
  if (rsi < 30) return 'buy';    // Oversold
  if (rsi > 70) return 'sell';   // Overbought
  if (rsi < 45) return 'buy';    // Tendência de compra
  if (rsi > 55) return 'hold';   // Tendência de manutenção
  return 'watch';                // Neutro
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