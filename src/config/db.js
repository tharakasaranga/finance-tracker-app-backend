const mongoose = require("mongoose");

let connectPromise = null;

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    if (connectPromise) {
      return connectPromise;
    }

    connectPromise = mongoose.connect(process.env.MONGO_URI).then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn.connection;
    });

    return await connectPromise;
  } catch (error) {
    connectPromise = null;
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;