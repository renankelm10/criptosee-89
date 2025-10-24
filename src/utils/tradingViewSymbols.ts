// Mapa de IDs do CoinGecko para símbolos do TradingView
// Usando formato genérico CRYPTO:{TICKER}USD para melhor compatibilidade
const SYMBOL_MAP: Record<string, string> = {
  'bitcoin': 'CRYPTO:BTCUSD',
  'ethereum': 'CRYPTO:ETHUSD',
  'binancecoin': 'CRYPTO:BNBUSD',
  'solana': 'CRYPTO:SOLUSD',
  'cardano': 'CRYPTO:ADAUSD',
  'ripple': 'CRYPTO:XRPUSD',
  'dogecoin': 'CRYPTO:DOGEUSD',
  'polkadot': 'CRYPTO:DOTUSD',
  'polygon': 'CRYPTO:MATICUSD',
  'shiba-inu': 'CRYPTO:SHIBUSD',
  'avalanche-2': 'CRYPTO:AVAXUSD',
  'chainlink': 'CRYPTO:LINKUSD',
  'uniswap': 'CRYPTO:UNIUSD',
  'litecoin': 'CRYPTO:LTCUSD',
  'cosmos': 'CRYPTO:ATOMUSD',
  'algorand': 'CRYPTO:ALGOUSD',
  'near': 'CRYPTO:NEARUSD',
  'vechain': 'CRYPTO:VETUSD',
  'filecoin': 'CRYPTO:FILUSD',
  'tron': 'CRYPTO:TRXUSD',
  'aptos': 'CRYPTO:APTUSD',
  'optimism': 'CRYPTO:OPUSD',
  'arbitrum': 'CRYPTO:ARBUSD',
  'stellar': 'CRYPTO:XLMUSD',
  'monero': 'CRYPTO:XMRUSD',
  'ethereum-classic': 'CRYPTO:ETCUSD',
  'hedera-hashgraph': 'CRYPTO:HBARUSD',
  'internet-computer': 'CRYPTO:ICPUSD',
  'quant-network': 'CRYPTO:QNTUSD',
  'aave': 'CRYPTO:AAVEUSD',
  'the-sandbox': 'CRYPTO:SANDUSD',
  'decentraland': 'CRYPTO:MANAUSD',
  'axie-infinity': 'CRYPTO:AXSUSD',
  'flow': 'CRYPTO:FLOWUSD',
  'elrond-erd-2': 'CRYPTO:EGLDUSD',
  'theta-token': 'CRYPTO:THETAUSD',
  'eos': 'CRYPTO:EOSUSD',
  'tezos': 'CRYPTO:XTZUSD',
  'bitcoin-cash': 'CRYPTO:BCHUSD',
  'pancakeswap-token': 'CRYPTO:CAKEUSD',
  'maker': 'CRYPTO:MKRUSD',
  'curve-dao-token': 'CRYPTO:CRVUSD',
  'sushi': 'CRYPTO:SUSHIUSD',
  'compound-governance-token': 'CRYPTO:COMPUSD',
  'yearn-finance': 'CRYPTO:YFIUSD',
  'matic-network': 'CRYPTO:MATICUSD',
  '1inch': 'CRYPTO:1INCHUSD',
  'synthetix-network-token': 'CRYPTO:SNXUSD',
  'enjincoin': 'CRYPTO:ENJUSD',
  'gala': 'CRYPTO:GALAUSD',
  'fantom': 'CRYPTO:FTMUSD',
  'harmony': 'CRYPTO:ONEUSD',
  'zilliqa': 'CRYPTO:ZILUSD',
  'basic-attention-token': 'CRYPTO:BATUSD',
  'dash': 'CRYPTO:DASHUSD',
  'zcash': 'CRYPTO:ZECUSD',
  'waves': 'CRYPTO:WAVESUSD',
  'ontology': 'CRYPTO:ONTUSD',
  'qtum': 'CRYPTO:QTUMUSD',
  'ravencoin': 'CRYPTO:RVNUSD',
  'icon': 'CRYPTO:ICXUSD',
  'kucoin-shares': 'CRYPTO:KCSUSD',
  'neo': 'CRYPTO:NEOUSD',
  'iota': 'CRYPTO:IOTAUSD',
};

export function getTradingViewSymbol(cryptoId: string, symbol?: string): string {
  // 1) Tentar no mapa
  if (SYMBOL_MAP[cryptoId.toLowerCase()]) {
    return SYMBOL_MAP[cryptoId.toLowerCase()];
  }

  // 2) Fallback: usar formato genérico CRYPTO:{TICKER}USD
  // Esse formato funciona para a maioria das moedas no TradingView
  const ticker = (symbol || cryptoId).toUpperCase();
  return `CRYPTO:${ticker}USD`;
}
