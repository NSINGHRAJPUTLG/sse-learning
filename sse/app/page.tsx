"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource("https://api.nsrgfx.in/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCount(data.count);
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };
    console.log('setting stream data')
    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Server Counter:</h1>
      <h2>{count}</h2>
    </div>
  );
}