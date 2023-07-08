require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const bodyParser = require("body-parser");
const http = require("http");
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
};
const userRouter = require("./src/api/routes/userRouter");
const authRouter = require("./src/api/routes/authRouter");

const app = express();
const server = http.createServer(app);

connectDB();
app.use(
  bodyParser.json({
    parameterLimit: 100000,
    limit: "50mb",
    extended: true,
  })
);

app.use(cors());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/public", express.static("public/"));

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    success: false,
    message: err.message,
  });
});

app.get("/", (req, res) => {
  res.send("Server running healthy ✅");
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

process.on("uncaughtException", function (err) {
  console.log(err);
});

const port = process.env.PORT || 4400;
server.listen(port, () => {
  console.log("info", `Listening on  test ${port}`);
});
