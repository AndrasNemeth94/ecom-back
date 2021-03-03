const express = require("express");
const cors = require("cors");
const api = require("./routes/api");
const bodyParser = require("body-parser");
const app = express();

const port = 3000;
app.use(cors());
app.use(bodyParser.json());
app.use("/api", api);

app.get("/", (req, res) => {
  res.json("server is up and running");
});

app.listen(port, () => {
  console.log("Server is listening on: " + port);
});
