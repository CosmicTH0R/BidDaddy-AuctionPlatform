// import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
// import ErrorHandler from "../middlewares/error.js";
// import { User } from "../models/userSchema.js";
// import { v2 as cloudinary } from "cloudinary";

// export const register = catchAsyncErrors(async (req, res, next) => {
//   if (!req.files || Object.keys(req.files).length === 0) {
//     return next(new ErrorHandler("Profile image is required.", 400));
//   }

//   const { profileImage } = req.files;
//   const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
//   if (!allowedFormats.includes(profileImage.mimetype)) {
//     return next(new ErrorHandler("Invalid image format.", 400));
//   }

//   const {
//     userName,
//     email,
//     password,
//     phone,
//     address,
//     role,
//     bankAccountNumber,
//     bankAccountName,
//     bankName,
//     upi,
//     creditCard,
//     paypal,
//   } = req.body;

//   if (!userName || !email || !phone || !password || !address || !role) {
//     return next(new ErrorHandler("Please fill all the fields.", 400));
//   }
//   if (role === "Auctioneer") {
//     if (!bankAccountNumber || !bankAccountName || !bankName) {
//       return next(new ErrorHandler("Please provide your bank details.", 400));
//     } else if (!upi) {
//       return next(new ErrorHandler("Please provide your upi id.", 400));
//     } else if (!paypalEmail) {
//       return next(new ErrorHandler("Please provide your paypal email.", 400));
//     } else if (!creditCard) {
//       return next(
//         new ErrorHandler("Please provide your credit card details.", 400)
//       );
//     } else {
//       return next(new ErrorHandler("Please add one of payment Options.", 400));
//     }
//   }
//   const isRegisterd = await User.findOne({ email });
//   if (isRegisterd) {
//     return next(new ErrorHandler("User already exists.", 400));
//   }

//   const cloudinaryResponse = await cloudinary.uploader.upload(
//     profileImage.tempFilePath,
//     {
//       folder: "BidDaddy_USERS",
//     }
//   );

//   if (!cloudinaryResponse || cloudinaryResponse.error) {
//     console.error(
//       "Cloudinary error:",
//       cloudinaryResponse.error || "Unknown cloudinary error."
//     );
//     return next(
//       new ErrorHandler("Failed to upload profile image to Cloudinary.", 500)
//     );
//   }

//   const user = await User.create({
//     userName,
//     email,
//     password,
//     phone,
//     address,
//     role,
//     profileImage: {
//       public_id: cloudinaryResponse.public_id,
//       url: cloudinaryResponse.secure_url,
//     },
//     paymentMethods: {
//       bankTransfer: {
//         bankAccountNumber,
//         bankAccountName,
//         bankName,
//       },
//       creditCard: {
//         cardNumber,
//         expirydate,
//         cvv,
//       },
//       paypal: {
//         paypalEmail,
//       },
//       upi: {
//         upiId,
//       },
//     },
//   });

//   generateToken(user, "User Registered.", 201, res);
// });

import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { generateToken } from "../utils/jwtToken.js";

export const register = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Profile image is required.", 400));
  }

  const { profileImage } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(profileImage.mimetype)) {
    return next(new ErrorHandler("Invalid image format.", 400));
  }

  const {
    userName,
    email,
    password,
    phone,
    address,
    role,
    bankAccountNumber,
    bankAccountName,
    bankName,
    upi,
    creditCard,
    paypalEmail,
  } = req.body;

  if (!userName || !email || !phone || !password || !address || !role) {
    return next(new ErrorHandler("Please fill all the fields.", 400));
  }

  if (role === "Auctioneer") {
    if (
      (!bankAccountNumber || !bankAccountName || !bankName) &&
      !upi &&
      !paypalEmail &&
      !creditCard
    ) {
      return next(
        new ErrorHandler(
          "Please provide at least one payment method (Bank, UPI, PayPal, or Credit Card).",
          400
        )
      );
    }
  }

  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(new ErrorHandler("User already exists.", 400));
  }

  const cloudinaryResponse = await cloudinary.uploader.upload(
    profileImage.tempFilePath,
    {
      folder: "BidDaddy_USERS",
    }
  );

  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary error:",
      cloudinaryResponse.error || "Unknown cloudinary error."
    );
    return next(
      new ErrorHandler("Failed to upload profile image to Cloudinary.", 500)
    );
  }

  const user = await User.create({
    userName,
    email,
    password,
    phone,
    address,
    role,
    profileImage: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
    paymentMethods: {
      bankTransfer: {
        bankAccountNumber,
        bankAccountName,
        bankName,
      },
      creditCard: {
        cardNumber: creditCard?.cardNumber,
        expirydate: creditCard?.expirydate,
        cvv: creditCard?.cvv,
      },
      paypal: {
        paypalEmail,
      },
      upi: {
        upiId: upi,
      },
    },
  });

  generateToken(user, "User Registered.", 201, res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(
      new ErrorHandler("Please provide both email and password.", 400)
    );
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid email or password.", 400));
  }
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid email or password.", 400));
  }
  generateToken(user, "Login successful.", 200, res);
});
export const getProfile = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});
export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({ success: true, message: "Logged out successfully" });
});
export const fetchLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find({ moneySpent: { $gt: 0 } });
  const leaderboard = users.sort((a, b) => b.moneySpent - a.moneySpent);
  res.status(200).json({
    success: true,
    leaderboard,
  });
});
