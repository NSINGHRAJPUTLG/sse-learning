const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let count = 0;
  console.log('stream request')
  const interval = setInterval(() => {
    count++;
    res.write(`data: ${JSON.stringify({ count })}\n\n`);
  }, 1000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

app.listen(4000, () => {
  console.log("SSE server running on http://localhost:4000");
});