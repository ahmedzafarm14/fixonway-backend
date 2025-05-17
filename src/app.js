import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandlerMiddlewares.js";
import logger from "./middleware/logger.js";
import authRoutes from "./routes/authRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import servicesTypesRoutes from "./routes/servicesTypesRoutes.js";
import { corsOptions } from "./config/cors.js";

const app = express();
// Parse JSON requests
app.use(express.json());
// Use logger middleware
app.use(logger);

// Enable CORS with specified options
app.use(cors(corsOptions));
app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the Fixonway" });
});
// Define routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/service-types", servicesTypesRoutes);
// Error handling middleware
app.use(errorHandler);

export default app;
