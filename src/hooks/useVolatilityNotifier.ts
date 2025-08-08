import { useEffect, useRef } from 'react';

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
}

const VOLATILITY_THRESHOLD = 5; // 5% threshold for notifications

export const useVolatilityNotifier = (cryptos: CryptoData[]) => {
  const previousCryptosRef = useRef<CryptoData[]>([]);
  const notifiedCoinsRef = useRef<Set<string>>(new Set());

  const sendNotification = async (crypto: CryptoData) => {
    try {
      console.log(`Volatility detected for ${crypto.name} (${crypto.symbol}): ${crypto.price_change_percentage_24h}%`);
      // Note: Email notifications are now handled locally
      // This could be connected to a local notification system if needed
    } catch (error) {
      console.error('Error in sendNotification:', error);
    }
  };

  const checkVolatilityChanges = async (currentCryptos: CryptoData[]) => {
    if (previousCryptosRef.current.length === 0) {
      // First load, don't send notifications yet
      previousCryptosRef.current = currentCryptos;
      return;
    }

    const previousCryptos = previousCryptosRef.current;
    const currentTime = new Date().getTime();
    
    // Reset notified coins every hour
    const oneHour = 60 * 60 * 1000;
    if (!notifiedCoinsRef.current.has('last_reset') || 
        (currentTime - parseInt(localStorage.getItem('last_notification_reset') || '0')) > oneHour) {
      notifiedCoinsRef.current.clear();
      localStorage.setItem('last_notification_reset', currentTime.toString());
    }

    for (const currentCrypto of currentCryptos) {
      const previousCrypto = previousCryptos.find(c => c.id === currentCrypto.id);
      
      if (!previousCrypto) continue;

      const currentVolatility = Math.abs(currentCrypto.price_change_percentage_24h);
      const previousVolatility = Math.abs(previousCrypto.price_change_percentage_24h);

      // Check if the coin has crossed the volatility threshold (became highly volatile)
      const crossedThreshold = 
        previousVolatility < VOLATILITY_THRESHOLD && 
        currentVolatility >= VOLATILITY_THRESHOLD;

      // Check if volatility increased significantly (by at least 2%)
      const volatilityIncreased = 
        currentVolatility >= VOLATILITY_THRESHOLD && 
        (currentVolatility - previousVolatility) >= 2;

      if ((crossedThreshold || volatilityIncreased) && 
          !notifiedCoinsRef.current.has(currentCrypto.id)) {
        
        console.log(`High volatility detected for ${currentCrypto.name}: ${currentVolatility.toFixed(2)}%`);
        
        await sendNotification(currentCrypto);
        notifiedCoinsRef.current.add(currentCrypto.id);
      }
    }

    previousCryptosRef.current = currentCryptos;
  };

  useEffect(() => {
    if (cryptos.length > 0) {
      checkVolatilityChanges(cryptos);
    }
  }, [cryptos]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      previousCryptosRef.current = [];
      notifiedCoinsRef.current.clear();
    };
  }, []);
};