import mongoose from "mongoose";
import Chat from "../models/ChatModel.js";
import Message from "../models/MessageModel.js";
import User from "../models/User.js";
import { getIO } from "./socketInstance.js";

export const registerChatHandlers = (socket) => {
  console.log("User connected:", socket.id);

  // 1. Join a Chat Room
  socket.on("joinChat", async ({ userId, otherUserId }) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(userId) ||
        !mongoose.Types.ObjectId.isValid(otherUserId)
      ) {
        throw new Error("Invalid user IDs");
      }

      const sortedIds = [userId, otherUserId].sort();
      let chat = await Chat.findOne({ participants: sortedIds }).populate(
        "lastMessage"
      );

      if (!chat) {
        chat = await Chat.create({ participants: sortedIds });
      }

      const oppositeUserId =
        userId === sortedIds[0] ? sortedIds[1] : sortedIds[0];
      const oppositeUser = await User.findById(oppositeUserId).select(
        "_id fullName email"
      );

      const messages = await Message.find({ chat: chat._id })
        .populate("sender", "_id fullName")
        .populate("deliveredTo", "_id fullName")
        .sort({ createdAt: 1 });

      socket.join(chat._id.toString());

      socket.emit("chatJoined", {
        chatId: chat._id,
        oppositeUser,
        lastMessage: chat.lastMessage || null,
        messages,
      });
    } catch (error) {
      console.error("Error joining chat:", error);
      socket.emit("error", "Could not join chat.");
    }
  });

  // 2. Send Message
  socket.on(
    "sendMessage",
    async ({ chatId, sender, content, deliveredToPerson }) => {
      try {
        if (
          !mongoose.Types.ObjectId.isValid(chatId) ||
          !mongoose.Types.ObjectId.isValid(sender._id) ||
          !mongoose.Types.ObjectId.isValid(deliveredToPerson)
        ) {
          throw new Error("Invalid ObjectIds in sendMessage");
        }

        const message = await Message.create({
          chat: chatId,
          sender: sender._id,
          content,
          deliveredTo: [deliveredToPerson],
        });

        // Update chat's last message
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
        });

        // Populate message for frontend use
        const populatedMsg = await Message.findById(message._id)
          .populate("sender", "_id fullName")
          .populate("deliveredTo", "_id fullName");

        const io = getIO();
        io.to(chatId).emit("newMessage", {
          _id: populatedMsg._id,
          chatId: chatId,
          senderId: populatedMsg.sender._id,
          content: populatedMsg.content,
          deliveredTo: populatedMsg.deliveredTo,
          createdAt: populatedMsg.createdAt,
        });
      } catch (error) {
        console.error("sendMessage error:", error);
        socket.emit("error", "Message could not be sent.");
      }
    }
  );

  // 3. Get Messages by Chat ID (Fallback if frontend doesn't have them)
  socket.on("getMessages", async ({ chatId }) => {
    try {
      const messages = await Message.find({ chat: chatId })
        .populate("sender", "_id fullName")
        .populate("deliveredTo", "_id fullName")
        .sort({ createdAt: 1 });

      socket.emit("chatMessages", messages);
    } catch (error) {
      console.error("getMessages error:", error);
      socket.emit("error", "Could not fetch messages.");
    }
  });

  // 4. Get All Chats for a User
  socket.on("getAllChats", async ({ userId }) => {
    try {
      const chats = await Chat.find({ participants: userId })
        .populate({
          path: "participants",
          select: "_id fullName email",
        })
        .populate({
          path: "lastMessage",
          populate: {
            path: "sender deliveredTo",
            select: "_id fullName",
          },
        })
        .lean();

      const chatIds = chats.map((chat) => chat._id);
      const messages = await Message.find({ chat: { $in: chatIds } })
        .populate("sender", "_id fullName")
        .populate("deliveredTo", "_id fullName")
        .sort({ createdAt: 1 })
        .lean();

      const messagesByChat = {};
      for (const msg of messages) {
        const chatIdStr = msg.chat.toString();
        if (!messagesByChat[chatIdStr]) messagesByChat[chatIdStr] = [];
        messagesByChat[chatIdStr].push(msg);
      }

      const chatData = chats.map((chat) => {
        const oppositeUser = chat.participants.find(
          (p) => p._id.toString() !== userId
        );

        return {
          chatId: chat._id,
          oppositeUser: {
            _id: oppositeUser._id,
            fullName: oppositeUser.fullName,
            email: oppositeUser.email,
          },
          lastMessage: chat.lastMessage
            ? {
                _id: chat.lastMessage._id,
                content: chat.lastMessage.content,
                sender: {
                  _id: chat.lastMessage.sender?._id,
                  fullName: chat.lastMessage.sender?.fullName,
                },
                deliveredTo: chat.lastMessage.deliveredTo?.map((u) => ({
                  _id: u._id,
                  fullName: u.fullName,
                })),
                createdAt: chat.lastMessage.createdAt,
              }
            : null,
          messages: messagesByChat[chat._id.toString()] || [],
        };
      });

      socket.emit("allChats", chatData);
    } catch (error) {
      console.error("getAllChats error:", error);
      socket.emit("chatError", { message: "Failed to fetch chats" });
    }
  });

  // 5. Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
};
