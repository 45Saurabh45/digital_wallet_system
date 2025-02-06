import {WalletUser} from "../models/index.js"
import jwt from "jsonwebtoken";
const sceretKey  = process.env.JWT_SECRET || 'secretKey'


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
