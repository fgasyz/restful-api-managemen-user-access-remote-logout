import Dotenv from "dotenv";
import Express from "express";
import ApiRouter from "./routes/Api.js";
import Connection from "./connection.js";
import Cors from "cors";

const env = Dotenv.config().parsed;

const app = Express();

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "DELETE, PUT, GET, POST");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, X-Token"
  );
  next();
});

app.use(Cors({ origin: env.APP_CORS }));

app.use("/api/", ApiRouter);

// catch 404 and forward to error handler
app.use((req, res) => {
  res.status(404).json({ message: "404_NOT_FOUND" });
});

//MongoDb Connection
Connection();

app.listen(env.APP_PORT, () => {
  console.log(`Server started on port ${env.APP_PORT}`);
});
