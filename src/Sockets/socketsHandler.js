import mongoose from "mongoose";
import Chat from "../models/ChatModel.js";
import Message from "../models/MessageModel.js";
import { getIO } from "./socketInstance.js";
import User from "../models/User.js";

export const registerChatHandlers = (socket) => {
  console.log("User connected:", socket.id);

  // 1. Join a chat room
  socket.on("joinChat", async ({ userId, otherUserId }) => {
    try {
      // Validate ObjectId format
      if (
        !mongoose.Types.ObjectId.isValid(userId) ||
        !mongoose.Types.ObjectId.isValid(otherUserId)
      ) {
        throw new Error("Invalid user IDs");
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const otherUserObjectId = new mongoose.Types.ObjectId(otherUserId);

      // Sort participant IDs to keep consistent order
      const sortedIds = [userObjectId, otherUserObjectId].sort((a, b) =>
        a.toString().localeCompare(b.toString())
      );

      // Check if a chat already exists
      let chat = await Chat.findOne({ participants: sortedIds })
        .populate("lastMessage") // optional
        .exec();

      if (!chat) {
        // Create new chat if it doesn't exist
        chat = await Chat.create({ participants: sortedIds });
      }

      // Get the full user info for the opposite participant
      const oppositeUserId =
        userId === sortedIds[0].toString() ? sortedIds[1] : sortedIds[0];
      const oppositeUser = await User.findById(oppositeUserId).select(
        "_id fullName email"
      );

      // Optionally load messages (remove if not needed)
      const messages = await Message.find({ chat: chat._id }).sort({
        createdAt: 1,
      });

      // Format response
      const chatData = {
        chatId: chat._id,
        oppositeUser,
        lastMessage: chat.lastMessage || null,
        messages,
      };

      socket.join(chat._id.toString());
      socket.emit("chatJoined", chatData);
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

  // 7. Get all chats
  socket.on("getAllChats", async ({ userId }) => {
    try {
      // Fetch all chats involving the user
      const chats = await Chat.find({ participants: userId })
        .populate({
          path: "participants",
          select: "_id fullName email",
        })
        .populate({
          path: "lastMessage",
          populate: {
            path: "sender deliveredTo",
            select: "_id fullName email",
          },
        })
        .lean(); // use lean for better performance and mutability

      // Fetch all messages for these chats
      const chatIds = chats.map((chat) => chat._id);
      const messages = await Message.find({ chat: { $in: chatIds } })
        .populate("sender", "_id fullName email")
        .populate("deliveredTo", "_id fullName email")
        .sort({ createdAt: 1 })
        .lean();

      // Map messages by chat
      const messagesByChat = {};
      for (const msg of messages) {
        const chatIdStr = msg.chat.toString();
        if (!messagesByChat[chatIdStr]) messagesByChat[chatIdStr] = [];
        messagesByChat[chatIdStr].push(msg);
      }

      // Prepare final chat response
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
                deliveredTo: chat.lastMessage.deliveredTo?.map((user) => ({
                  _id: user._id,
                  fullName: user.fullName,
                })),
                createdAt: chat.lastMessage.createdAt,
                messageType: chat.lastMessage.messageType,
              }
            : null,
          messages: messagesByChat[chat._id.toString()] || [],
        };
      });

      socket.emit("allChats", chatData);
    } catch (error) {
      console.error("Error fetching chats:", error);
      socket.emit("chatError", { message: "Failed to fetch chats" });
    }
  });
};
