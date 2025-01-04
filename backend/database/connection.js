import mongoose from "mongoose";

export const connection = () => {
  mongoose
    .connect(process.env.MONGO_URI, {
      dbName: "BidDaddy",
    })
    .then(() => {
      console.log("Successfully Connected to Database.");
    })
    .catch((error) => {
      console.log(
        `Something went wrong while connecting to Database : ${error}`
      );
    });
};
