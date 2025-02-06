import express from "express";
import {registerUser, loginUser, checkBalance, addFunds, getUserDetails, withDrawFunds,
    transactionHistory, transferFunds} from "../controller/index.js";
import {authenticateUser} from "../middleware/index.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/getUser", authenticateUser, getUserDetails)
router.get("/balance", authenticateUser, checkBalance);
router.post("/add", authenticateUser, addFunds);
router.post("/withDraw", authenticateUser, withDrawFunds);
router.get("/transactionHistory", authenticateUser, transactionHistory);
router.post("/transfer", authenticateUser, transferFunds);

export default router
