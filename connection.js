import Dotenv from "dotenv";
import Mongoose from "mongoose";

const env = Dotenv.config().parsed;

const connection = () => {
  Mongoose.set("strictQuery", false);
  Mongoose.connect(
    `mongodb://${env.DB_USERNAME}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_DATABASE}?authSource=admin&readPreference=primary&directConnection=true&ssl=false`,
    {
      dbName: env.MONGODB_NAME,
    }
  );
};
export default connection;
