const mongoose = require("mongoose");

let connectionPromise;

function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!process.env.MONGO_URI) {
    return Promise.reject(new Error("MONGO_URI is not configured."));
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
  }

  const pendingConnection = connectionPromise;
  return pendingConnection.finally(() => {
    if (connectionPromise === pendingConnection) connectionPromise = null;
  });
}

module.exports = { connectToDatabase };
