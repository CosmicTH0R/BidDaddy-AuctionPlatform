import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    minLength: [3, "Username must contain at least 3 characters."],
    maxLength: [40, "Username cannot exceed 40 characters."],
    required: true, // Marked as required
  },
  password: {
    type: String,
    select: false, // Exclude password from queries by default
    minLength: [8, "Password must contain at least 8 characters."],
    // maxLength: [32, "Password cannot exceed 32 characters."],
    required: true, // Marked as required
  },
  email: {
    type: String,
    required: true, // Marked as required
    unique: true, // Ensuring uniqueness of email
  },
  address: String,
  phone: {
    type: String,
    minLength: [10, "Phone number must contain exactly 10 digits."],
    maxLength: [10, "Phone number must contain exactly 10 digits."],
    required: true, // Marked as required
  },
  profileImage: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  paymentMethods: {
    bankTransfer: {
      bankAccountNumber: String,
      bankAccountName: String,
      bankName: String,
    },
    creditCard: {
      cardNumber: String,
      expirydate: String,
      cvv: String,
    },
    paypal: {
      paypalEmail: String,
    },
    upi: {
      upiId: String,
    },
  },
  role: {
    type: String,
    enum: ["user", "Bidder", "Super Admin"],
    default: "user", // Set default role
  },
  unpaidCommission: {
    type: Number,
    default: 0,
  },
  auctionsWon: {
    type: Number,
    default: 0,
  },
  moneySpent: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Password hashing before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare entered password with stored hash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateJsonWebToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export const User = mongoose.model("User", userSchema);
