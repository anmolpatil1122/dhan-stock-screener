import { useEffect, useState } from "react";

export default function Home() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollInterval = parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL_SECONDS || "30");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/screener");
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setStocks(data.stocks || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollInterval * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Dhan Stock Screener</h1>
      {loading && <p>Loading data...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!loading && stocks.length === 0 && <p>No stocks found</p>}

      {stocks.length > 0 && (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Close</th>
              <th>EMA 9</th>
              <th>EMA 21</th>
              <th>Avg Volume</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s, i) => (
              <tr key={i}>
                <td>{s.symbol}</td>
                <td>{s.latestClose.toFixed(2)}</td>
                <td>{s.latestEMA9.toFixed(2)}</td>
                <td>{s.latestEMA21.toFixed(2)}</td>
                <td>{s.avgVolume.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
  }
