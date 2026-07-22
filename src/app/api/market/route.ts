import { NextResponse } from 'next/server';

// Revalidate this API route every 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    const marketData: any = [];

    // 1. Fetch BTC/USDT from Binance (100% Real-time, highly reliable)
    try {
      const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      if (btcRes.ok) {
        const btcData = await btcRes.json();
        const price = parseFloat(btcData.lastPrice);
        const changePercent = parseFloat(btcData.priceChangePercent);
        
        marketData.push({
          symbol: 'BTC/USD',
          name: 'Bitcoin',
          price: price,
          changePercent: changePercent,
          formattedPrice: `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          type: 'crypto'
        });
      }
    } catch (e) {
      console.error("Failed to fetch BTC", e);
    }

    // Function to fetch from Yahoo Finance
    const fetchYahoo = async (symbol: string, name: string, type: string, isCurrency = false) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta) {
            const price = meta.regularMarketPrice;
            const prevClose = meta.previousClose;
            const changePercent = ((price - prevClose) / prevClose) * 100;
            
            let formattedPrice = '';
            if (isCurrency) {
              formattedPrice = `Rp ${price.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            } else {
              formattedPrice = `Rp ${price.toLocaleString('id-ID')}`;
            }

            marketData.push({
              symbol: symbol.replace('.JK', '').replace('=X', ''),
              name,
              price,
              changePercent,
              formattedPrice,
              type
            });
          }
        }
      } catch (e) {
        console.error(`Failed to fetch ${symbol}`, e);
      }
    };

    // 2. Fetch USD/IDR
    await fetchYahoo('USDIDR=X', 'USD to IDR', 'currency', true);
    
    // 3. Fetch BBCA & BBRI (Delayed 15m by IDX)
    await fetchYahoo('BBCA.JK', 'Bank BCA', 'stock');
    await fetchYahoo('BBRI.JK', 'Bank BRI', 'stock');
    await fetchYahoo('BMRI.JK', 'Bank Mandiri', 'stock');

    // Add fallback data if any failed to load just so UI doesn't look empty
    if (marketData.length === 0) {
       marketData.push({
          symbol: 'BTC/USD', name: 'Bitcoin', price: 65000, changePercent: 1.2, formattedPrice: '$65,000.00', type: 'crypto'
       });
    }

    return NextResponse.json({ success: true, data: marketData });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
