const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();


const app = express();
app.use(cors());


app.get("/stream", async (req, res) => {
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

app.use('/test',async(req,res)=>{
  res.status(200).json({
    status: "OK",
    service: "Backend running"
  });
})

// Configure server to work on both localhost and 0.0.0.0
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server started on ${HOST}:${PORT}`);
});
