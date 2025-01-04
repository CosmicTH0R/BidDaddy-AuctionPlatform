import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

export const addNewAuctionItem = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Auction item image is required.", 400));
  }

  const { image } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(image.mimetype)) {
    return next(new ErrorHandler("Invalid image format.", 400));
  }
  const {
    title,
    description,
    category,
    condition,
    startingBid,
    startTime,
    endTime,
  } = req.body;
  if (
    !title ||
    !description ||
    !category ||
    !condition ||
    !startingBid ||
    !startTime ||
    !endTime
  ) {
    return next(new ErrorHandler("Please provide all details.", 400));
  }
  if (new Date(startTime) < Date.now()) {
    return next(new ErrorHandler("Start time cannot be in the past.", 400));
  }
  if (new Date(startTime) >= new Date(endTime)) {
    return next(
      new ErrorHandler("Start time must be earlier than end time.", 400)
    );
  }
  const alreadyOneAuctionactive = await Auction.find({
    createdBy: req.user._id,
    endTime: { $gte: Date.now() },
  });
  if (alreadyOneAuctionactive.length > 0) {
    return next(new ErrorHandler("One auction already in progress.", 400));
  }
  try {
    const cloudinaryResponse = await cloudinary.uploader.upload(
      image.tempFilePath,
      {
        folder: "BidDaddy_AUCTIONS",
      }
    );

    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error(
        "Cloudinary error:",
        cloudinaryResponse.error || "Unknown cloudinary error."
      );
      return next(
        new ErrorHandler("Failed to upload auction image to Cloudinary.", 500)
      );
    }
    const auctionItem = await Auction.create({
      title,
      description,
      category,
      condition,
      startingBid,
      startTime,
      endTime,
      image: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
      createdBy: req.user._id,
    });
    return res.status(201).json({
      success: true,
      message: `Auction is created and is scheduled for ${startTime}`,
      auctionItem,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message || "Failed to create an auction.", 500)
    );
  }
});

export const getAllItems = catchAsyncErrors(async (req, res, next) => {
  let items = await Auction.find();
  res.status(200).json({
    success: true,
    items,
  });
});

export const getAuctionDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id Format.", 400));
  }
  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  const bidders = auctionItem.bids.sort((a, b) => b.bid - a.bid);
  res.status(200).json({
    success: true,
    auctionItem,
    bidders,
  });
});

export const getMyAuctionItems = catchAsyncErrors(async (req, res, next) => {
  const items = await Auction.find({
    createdBy: req.user._id,
  });
  res.status(200).json({
    success: true,
    items,
  });
});

export const removeFromAuction = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id Format.", 400));
  }
  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  await auctionItem.deleteOne();
  res.status(200).json({
    success: true,
    message: "Auction item deleted successfully.",
  });
});
export const republishItem = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id Format.", 400));
  }
  let auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  if (!req.body.startTime || !req.body.endTime) {
    return next(
      new ErrorHandler(
        "Start time and End time of the auction is mandatory to republish."
      )
    );
  }
  if (new Date(auctionItem.endTime) > Date.now()) {
    return next(new ErrorHandler("Auction is still active.", 400));
  }
  let data = {
    startTime: new Date(req.body.startTime),
    endTime: new Date(req.body.endTime),
  };
  if (data.startTime < Date.now()) {
    return next(new ErrorHandler("Start time cannot be in the past.", 400));
  }
  if (data.startTime >= data.endTime) {
    return next(
      new ErrorHandler("End time must be greater than start time.", 400)
    );
  }
  data.bids = [];
  data.commissionCalculated = false;

  auctionItem = await Auction.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  const createdBy = await User.findByIdAndUpdate(
    req.user._id,
    { unpaidCommission: 0 },
    {
      runValidators: false,
      useFindAndModify: false,
    }
  );

  res.status(200).json({
    success: true,
    auctionItem,
    message: `Auction is republished and will be active on ${req.body.startTime}`,
    createdBy,
  });
});