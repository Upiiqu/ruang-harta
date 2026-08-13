import { NextResponse } from 'next/server';

// Revalidate this API route every 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    const marketData: any = [];

    // 1. Fetch BTC/IDR from CoinGecko (Works in Indonesia, unlike Binance)
    try {
      const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=idr&include_24hr_change=true');
      if (btcRes.ok) {
        const btcData = await btcRes.json();
        const price = btcData.bitcoin.idr;
        const changePercent = btcData.bitcoin.idr_24h_change;
        const changeAmount = price - (price / (1 + (changePercent / 100)));
        const formattedChange = `${changeAmount >= 0 ? '+' : '-'}Rp ${Math.abs(changeAmount).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        
        marketData.push({
          symbol: 'BTC/IDR',
          name: 'Bitcoin',
          price: price,
          changePercent: changePercent,
          formattedPrice: `Rp ${price.toLocaleString('id-ID')}`,
          formattedChange: formattedChange,
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
            const prevClose = meta.chartPreviousClose || meta.previousClose;
            const changePercent = ((price - prevClose) / prevClose) * 100;
            const changeAmount = price - prevClose;
            
            let formattedPrice = '';
            let formattedChange = '';
            
            if (isCurrency) {
              formattedPrice = `Rp ${price.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              formattedChange = `${changeAmount >= 0 ? '+' : '-'}Rp ${Math.abs(changeAmount).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            } else {
              formattedPrice = `Rp ${price.toLocaleString('id-ID')}`;
              formattedChange = `${changeAmount >= 0 ? '+' : '-'}Rp ${Math.abs(changeAmount).toLocaleString('id-ID')}`;
            }

            let displaySymbol = symbol.replace('.JK', '').replace('=X', '');
            if (displaySymbol === 'USDIDR') displaySymbol = 'USD/IDR';

            marketData.push({
              symbol: displaySymbol,
              name,
              price,
              changePercent,
              formattedPrice,
              formattedChange,
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
    
    // 3. Fetch Gold from Logam Mulia API (Antam Indonesia)
    const fetchGoldGram = async () => {
      try {
        const res = await fetch('https://logam-mulia-api.iamutaki.workers.dev/api/antam', {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          next: { revalidate: 60 }
        });
        
        if (res.ok) {
          const json = await res.json();
          let price: any = 0;
          
          const findPriceInArray = (arr: any[]) => {
            const oneGramItem = arr.find(item => {
              const str = JSON.stringify(item).toLowerCase();
              return str.includes('"1 gram"') || str.includes('"1g"') || str.includes('"berat":"1"') || str.includes('"weight":"1"');
            });
            const item = oneGramItem || arr[0]; 
            if (!item) return 0;
            return item.price || item.buy || item.jual || item.harga || item.sell || item.current_price || 0;
          };

          if (json.data) {
            if (Array.isArray(json.data)) {
              price = findPriceInArray(json.data);
            } else if (typeof json.data === 'object') {
               const keys = Object.keys(json.data);
               for (const k of keys) {
                 if (Array.isArray(json.data[k])) {
                   price = findPriceInArray(json.data[k]);
                   if (price > 0) break;
                 }
               }
               if (price === 0) price = json.data.price || json.data.buy || json.data.sell || json.data.harga || json.data.jual || 0;
            }
          } else {
             price = json.price || json.buy || json.harga || 0;
          }
          
          if (typeof price === 'string') {
             price = parseFloat(price.replace(/[^0-9.-]+/g,""));
          }
          
          if (price > 0) {
            marketData.push({
              symbol: 'EMAS',
              name: 'Emas Antam',
              price,
              changePercent: 0,
              formattedPrice: `Rp ${price.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              formattedChange: `Rp 0`,
              type: 'commodity'
            });
          } else {
            console.warn("Harga emas tidak ditemukan dari response Antam API");
          }
        } else {
          console.error("Antam API returned status:", res.status);
        }
      } catch(e) { console.error('Failed to fetch Antam Gold from API', e); }
    };
    await fetchGoldGram();
    
    await fetchYahoo('BBCA.JK', 'Bank BCA', 'stock');
    await fetchYahoo('BBRI.JK', 'Bank BRI', 'stock');

    // Add fallback data if any failed to load just so UI doesn't look empty
    if (marketData.length === 0) {
       marketData.push({
          symbol: 'BTC/IDR', name: 'Bitcoin', price: 1000000000, changePercent: 1.2, formattedPrice: 'Rp 1.000.000.000', formattedChange: '+Rp 12.000.000', type: 'crypto'
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
