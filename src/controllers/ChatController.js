import Chat from "../models/ChatModel.js";
import Message from "../models/MessageModel.js";

export const getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({ participants: userId })
      .populate({
        path: "participants",
        select: "_id name email",
        match: { _id: { $ne: userId } },
      })
      .populate({
        path: "lastMessage",
        select: "content sender createdAt messageType",
        populate: {
          path: "sender",
          select: "name",
        },
      })
      .sort({ updatedAt: -1 });

    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      return {
        _id: chat._id,
        participant: otherParticipant || null,
        lastMessage: chat.lastMessage,
        unreadCount: Message.countDocuments({
          chat: chat._id,
          sender: { $ne: userId },
          isRead: false,
        }),
        updatedAt: chat.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      chats: formattedChats,
    });
  } catch (error) {
    console.error("Error fetching user chats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
      error: error.message,
    });
  }
};
