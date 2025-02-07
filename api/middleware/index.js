import {WalletUser} from "../models/index.js"
import jwt from "jsonwebtoken";
const sceretKey  = process.env.JWT_SECRET || 'secretKey'
import rateLimit from "express-rate-limit";

export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, sceretKey);
    req.user = await WalletUser.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    next();
  } catch (error) {
    console.log(error)
    res.status(401).json({ message: "Invalid Token" });
  }
};

export const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 10, 
    message: "Too many requests from this IP, please try again later."
});