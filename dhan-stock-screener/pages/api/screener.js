import Papa from "papaparse";
import fs from "fs";
import path from "path";
import { EMA } from "technicalindicators";

export default async function handler(req, res) {
  try {
    const clientId = process.env.DHAN_CLIENT_ID;
    const accessToken = process.env.DHAN_ACCESS_TOKEN;
    const minPrice = parseFloat(process.env.MIN_PRICE || "200");
    const minDayVolume = parseInt(process.env.MIN_DAY_VOLUME || "100000");

    // Instruments CSV load
    const csvFilePath = path.join(process.cwd(), process.env.INSTRUMENTS_CSV);
    const fileData = fs.readFileSync(csvFilePath, "utf8");
    const { data: instruments } = Papa.parse(fileData, { header: true });

    const results = [];

    // Loop through instruments and apply filters
    for (const stock of instruments) {
      if (!stock.SYMBOL) continue;

      const symbol = stock.SYMBOL;
      const securityId = stock.SECURITY_ID;

      try {
        // Fetch last 50 candles (5-min interval)
        const candleRes = await fetch(
          `https://api.dhan.co/v2/chart/records?symbol=${securityId}&interval=5m&count=50`,
          {
            headers: {
              "client-id": clientId,
              "access-token": accessToken,
            },
          }
        );

        if (!candleRes.ok) continue;

        const candleData = await candleRes.json();
        const closes = candleData.data.map(c => parseFloat(c.close));

        // Apply EMA filter
        const ema9 = EMA.calculate({ period: 9, values: closes });
        const ema21 = EMA.calculate({ period: 21, values: closes });

        const latestClose = closes[closes.length - 1];
        const latestEMA9 = ema9[ema9.length - 1];
        const latestEMA21 = ema21[ema21.length - 1];

        // Volume filter (approximation)
        const latestVolume = candleData.data[candleData.data.length - 1].volume;
        const avgVolume = candleData.data
          .slice(-5)
          .reduce((sum, c) => sum + c.volume, 0) / 5;

        if (
          latestClose >= minPrice &&
          avgVolume >= minDayVolume &&
          latestEMA9 > latestEMA21
        ) {
          results.push({
            symbol,
            latestClose,
            latestEMA9,
            latestEMA21,
            avgVolume
          });
        }
      } catch (err) {
        console.error(`Error processing ${symbol}:`, err);
      }
    }

    res.status(200).json({ count: results.length, stocks: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
            }
