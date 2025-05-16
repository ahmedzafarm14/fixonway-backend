import { connect } from "mongoose";

const dbConnection = async () => {
  try {
    const connectionInstance = await connect(process.env.MONGODB_URI);
    console.log(
      `MongoDB is connected !! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Error: ", error);
    process.exit(1);
  }
};

export default dbConnection;
