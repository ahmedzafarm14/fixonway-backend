import app from "./app.js";
import "dotenv/config";
import dotenv from "dotenv";
import dbConnection from "./config/dbConnection.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { setIO } from "./Sockets/socketInstance.js";
import { registerChatHandlers } from "./Sockets/socketsHandler.js";

dotenv.config();
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await dbConnection();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: `${process.env.FRONTEND_BASE_URL}`,
        methods: ["GET", "POST"],
      },
    });
    setIO(io);
    io.on("connection", (socket) => {
      registerChatHandlers(socket);
    });
    httpServer.listen(PORT, () => {
      console.log(`Server is listening at port ${PORT}`);
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();
