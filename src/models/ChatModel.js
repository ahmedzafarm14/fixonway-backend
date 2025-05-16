import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  {
    timestamps: true,
  }
);

// Ensuring a chat between same two users isn't duplicated
ChatSchema.index({ participants: 1 }, { unique: true });

const Chat = mongoose.model("Chat", ChatSchema);
export default Chat;
