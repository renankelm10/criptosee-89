import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  cryptoId?: string;
}

export const TradingViewWidget = memo(({ symbol, cryptoId }: TradingViewWidgetProps) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "pt_BR",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(255, 255, 255, 0.06)",
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      details: true,
      hotlist: false,
      enable_publishing: false,
      withdateranges: true,
      range: "12M",
      save_image: false,
      studies: [],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
    });
    
    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, cryptoId]);

  return (
    <div className="tradingview-widget-container w-full" ref={container} style={{ height: "600px" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
      <div className="text-xs text-muted-foreground text-center mt-2">Powered by TradingView</div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
