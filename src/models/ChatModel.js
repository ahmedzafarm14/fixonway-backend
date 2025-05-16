import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate chats (based on sorted participant IDs)
ChatSchema.index({ participants: 1 }, { unique: true });

const Chat = mongoose.model("Chat", ChatSchema);
export default Chat;
