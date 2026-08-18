import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/download/source", (_req, res) => {
  const file = path.join(process.cwd(), "src", "carei-source-complete.zip");
  res.download(file, "carei-source-complete.zip");
});

app.use("/api", router);

export default app;
