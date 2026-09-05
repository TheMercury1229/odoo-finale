import dotenv from "dotenv";
dotenv.config();

const envVars = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  DATABASE_URL: process.env.DATABASE_URL,
};

Object.freeze(envVars);
export default envVars;
