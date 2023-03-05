const app = require("./app");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

mongoose.set("strictQuery", false);

const port = 5000 || process.env.PORT;

async function startServer() {
  await connectDb();

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
//creating a db connection
const connectDb = async () => {
  await mongoose.connect(
    "mongodb+srv://admin-hassan:" +
      process.env.MONGOATLASPASWORD +
      "@cluster0.yipmq.mongodb.net/Authentication"
  );
  console.log("MongoDB Server is up and running");
};

const mongooseDisconnect = async () => {
  await mongoose.disconnect();
};

startServer();
module.exports = {
  app,
  connectDb,
  mongooseDisconnect,
};
