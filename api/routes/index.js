import express from "express";
import {registerUser, loginUser, checkBalance, addFunds, getUserDetails, withDrawFunds,
    transactionHistory, transferFunds, setDefaultCurrency, setTransactionLimit, detectFraud} from "../controller/index.js";
import {authenticateUser, apiLimiter} from "../middleware/index.js";

const router = express.Router();

router.post("/register", apiLimiter, registerUser);
router.post("/login", apiLimiter, loginUser);

router.get("/getUser", authenticateUser, getUserDetails);
router.get("/balance", authenticateUser, checkBalance);
router.get("/transactionHistory", authenticateUser, transactionHistory);

router.post("/add", authenticateUser, apiLimiter, addFunds);
router.post("/withDraw", authenticateUser, apiLimiter, withDrawFunds);
router.post("/transfer", authenticateUser, apiLimiter, transferFunds);

router.post("/setDefaultCurrency", authenticateUser, setDefaultCurrency);
router.post("/setTransactionLimit", authenticateUser, setTransactionLimit);
router.post("/detectFraud", authenticateUser, detectFraud);

export default router
