import mongoose from "mongoose";
import Chat from "../models/ChatModel.js";
import Message from "../models/MessageModel.js";
import { getIO } from "./socketInstance.js";

export const registerChatHandlers = (socket) => {
  console.log("User connected:", socket.id);

  // 1. Join a chat room
  socket.on("joinChat", async ({ userId, otherUserId }) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(userId) ||
        !mongoose.Types.ObjectId.isValid(otherUserId)
      ) {
        return socket.emit("error", "Invalid user ID(s).");
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const otherUserObjectId = new mongoose.Types.ObjectId(otherUserId);

      const sortedIds = [userObjectId, otherUserObjectId].sort((a, b) =>
        a.toString().localeCompare(b.toString())
      );

      let chat = await Chat.findOne({ participants: sortedIds });

      if (!chat) {
        chat = await Chat.create({ participants: sortedIds });
      }

      socket.join(chat._id.toString());
      socket.emit("chatJoined", { chatId: chat._id });
    } catch (error) {
      console.error("Error joining chat:", error);
      socket.emit("error", "Could not join chat.");
    }
  });

  // 2. Send message
  socket.on(
    "sendMessage",
    async ({ chatId, senderId, content, messageType, attachments }) => {
      try {
        const senderObjectId = new mongoose.Types.ObjectId(senderId);
        const chatObjectId = new mongoose.Types.ObjectId(chatId);

        const message = await Message.create({
          chat: chatObjectId,
          sender: senderObjectId,
          content,
          messageType,
          attachments,
          isDelivered: false,
          isRead: false,
        });

        await Chat.findByIdAndUpdate(chatObjectId, {
          lastMessage: message._id,
        });

        const io = getIO();
        io.to(chatId).emit("newMessage", message);
      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("error", "Message could not be sent.");
      }
    }
  );

  // 3. Mark as Delivered
  socket.on("messageDelivered", async ({ messageId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { isDelivered: true });
    } catch (err) {
      console.error("messageDelivered error:", err);
    }
  });

  // 4. Mark as Read
  socket.on("messageRead", async ({ messageId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { isRead: true });
    } catch (err) {
      console.error("messageRead error:", err);
    }
  });

  // 5. Get chat messages
  socket.on("getMessages", async ({ chatId }) => {
    try {
      const messages = await Message.find({ chat: chatId }).sort({
        createdAt: 1,
      });
      socket.emit("chatMessages", messages);
    } catch (err) {
      console.error("getMessages error:", err);
      socket.emit("error", "Could not fetch messages.");
    }
  });

  // 6. Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
};
