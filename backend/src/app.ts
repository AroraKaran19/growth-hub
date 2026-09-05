import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import favicon from "serve-favicon";
import path from "path";
import { errorHandler, notFoundHandler } from "./middlewares";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

app.use(favicon(path.join(__dirname, "../public/favicon.ico")));
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
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


app.use(notFoundHandler); // Handle 404 errors
app.use(errorHandler); // Handle all other errors

export default app;
