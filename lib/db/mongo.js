const { MongoClient } = require("mongodb");

const DEFAULT_DB_NAME = "telegram_quiz_bot";

let mongoClient = null;
let mongoDb = null;

const resolveDatabaseName = () => {
  const explicitName = String(process.env.MONGODB_DB_NAME || "").trim();
  if (explicitName) {
    return explicitName;
  }

  const mongoUri = String(process.env.MONGODB_URI || "");

  try {
    const parsed = new URL(mongoUri);
    const dbNameFromPath = parsed.pathname.replace(/^\//, "").trim();
    return dbNameFromPath || DEFAULT_DB_NAME;
  } catch (error) {
    return DEFAULT_DB_NAME;
  }
};

const getMongoUri = () => String(process.env.MONGODB_URI || "").trim();

const connectMongo = async () => {
  if (mongoDb) {
    return mongoDb;
  }

  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required for API mode.");
  }

  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(resolveDatabaseName());

  return mongoDb;
};

const getMongoDb = () => {
  if (!mongoDb) {
    throw new Error("MongoDB is not connected. Call connectMongo() first.");
  }

  return mongoDb;
};

module.exports = {
  connectMongo,
  getMongoDb,
};
