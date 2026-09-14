import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import favicon from "serve-favicon";
import path from "path";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares";
import cookieParser from "cookie-parser";
import routes from "./routes";

dotenv.config();

const config = env();
const app = express();

if (config.trustProxy !== null) app.set("trust proxy", config.trustProxy);

app.use(favicon(path.join(__dirname, "../public/favicon.ico")));
app.use(cors({ origin: config.frontendUrl }));
app.use(
  express.json({
    limit: "100mb",
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Growth Hub Backend Server is running",
    timestamp: new Date().toISOString(),
  });
});


app.use("/api", routes);
app.use(notFoundHandler); // Handle 404 errors
app.use(errorHandler); // Handle all other errors

export default app;
