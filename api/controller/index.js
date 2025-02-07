import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { WalletUser, Wallet, Transaction } from "../models/index.js";
import axios from "axios";

const sceret = process.env.JWT_SECRET || 'secretKey'
// **User Registration**
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, currency } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

    const userExists = await WalletUser.findOne({ email });
    if (userExists) return res.status(400).json({ message: "WalletUser already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await WalletUser.create({ name, email, password: hashedPassword, currency });

    const newWallet = await Wallet.create({ user: newUser._id, currency });
    newUser.wallet = newWallet._id;
    await newUser.save();

    res.status(201).json({ message: "WalletUser registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// **WalletUser Login**
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await WalletUser.findOne({ email: email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, sceret, { expiresIn: "1h" });
    res.status(200).json({message: "Login Successfull ", token});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//fetch user details
export const getUserDetails = async (req, res) => {
    try {
      const user = await WalletUser.findById(req.user._id).select("-password"); // Exclude password
      if (!user) return res.status(404).json({ message: "WalletUser not found" });
  
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// **Check Wallet Balance**
export const checkBalance = async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  res.json({ balance: wallet.balance, currency: wallet.currency });
};

//add funds
export const addFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTransactions = await Transaction.aggregate([
            {
                $match: {
                    sender: userId,
                    transactionType: "credit",
                    timestamp: { $gte: today }
                }
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const todayTotal = todayTransactions.length > 0 ? todayTransactions[0].total : 0;
        const dailyLimit = wallet.dailyTransactionLimit  

        if (todayTotal + amount > dailyLimit) {
            return res.status(400).json({ message: "Daily transaction limit exceeded" });
        }

        wallet.balance += amount;
        await wallet.save();

        await Transaction.create({
            user: userId,
            sender: userId,
            amount,
            transactionType: "credit",
            status: "completed",
            description: "Deposit"
        });

        res.status(200).json({ message: "Funds added successfully", balance: wallet.balance });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// Withdraw Funds
export const withDrawFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid withdrawal amount" });
        }

        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        if (wallet.balance < amount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTransactions = await Transaction.aggregate([
            {
                $match: {
                    sender: userId,
                    transactionType: "debit",
                    timestamp: { $gte: today }
                }
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const todayTotal = todayTransactions.length > 0 ? todayTransactions[0].total : 0;
        const dailyLimit = wallet.dailyTransactionLimit 

        if (todayTotal + amount > dailyLimit) {
            return res.status(400).json({ message: "Daily transaction limit exceeded" });
        }

        wallet.balance -= amount;
        await wallet.save();

        await Transaction.create({
            user: userId,
            sender: userId,
            amount,
            transactionType: "debit",
            status: "completed",
            description: "Withdrawal"
        });

        res.status(200).json({ message: "Withdrawal successful", balance: wallet.balance });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Fetch User's Transaction History
export const transactionHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const transactions = await Transaction.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate("sender receiver", "name email");

        if (!transactions.length) {
            return res.status(404).json({ message: "No transactions found" });
        }

        res.status(200).json({ transactions });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Transfer Funds
export const transferFunds = async (req, res) => {
    try {
        const { receiverId, amount } = req.body;
        const senderId = req.user._id;

        if (!receiverId || !amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid transfer details" });
        }

        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({ message: "Cannot transfer to yourself" });
        }

        const senderWallet = await Wallet.findOne({ user: senderId });
        if (!senderWallet) {
            return res.status(404).json({ message: "Sender wallet not found" });
        }

        if (senderWallet.balance < amount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        const receiverWallet = await Wallet.findOne({ user: receiverId });
        if (!receiverWallet) {
            return res.status(404).json({ message: "Receiver wallet not found" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTransactions = await Transaction.aggregate([
            {
                $match: {
                    sender: senderId,
                    transactionType: "debit",
                    timestamp: { $gte: today }
                }
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const todayTotal = todayTransactions.length > 0 ? todayTransactions[0].total : 0;
        const dailyLimit = senderWallet.dailyTransactionLimit

        if (todayTotal + amount > dailyLimit) {
            return res.status(400).json({ message: "Daily transaction limit exceeded" });
        }

        senderWallet.balance -= amount;
        receiverWallet.balance += amount;

        await senderWallet.save();
        await receiverWallet.save();

        await Transaction.create({
            user: senderId,
            sender: senderId,
            receiver: receiverId,
            amount,
            transactionType: "debit",
            status: "completed",
            description: `Transfer to ${receiverId}`
        });

        await Transaction.create({
            user: receiverId,
            sender: senderId,
            receiver: receiverId,
            amount,
            transactionType: "credit",
            status: "completed",
            description: `Received from ${senderId}`
        });

        res.status(200).json({ message: "Transfer successful", balance: senderWallet.balance });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// Set default currency and update amount
export const setDefaultCurrency = async (req, res) => {
    try {
        const { currency } = req.body;
        const userId = req.user._id;
        const supportedCurrencies = ["USD", "EUR", "INR", "GBP"];

        if (!supportedCurrencies.includes(currency)) {
            return res.status(400).json({ message: "Invalid currency selection" });
        }

        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        if (wallet.currency === currency) {
            return res.status(200).json({ message: `Your default currency is already set to ${currency}` });
        }

        // Fetch exchange rate to convert balance
        const exchangeRateAPI = `https://api.exchangerate-api.com/v4/latest/${wallet.currency}`;
        const response = await axios.get(exchangeRateAPI);
        const rate = response.data.rates[currency];

        if (!rate) {
            return res.status(400).json({ message: "Exchange rate not available" });
        }

        const convertedBalance = wallet.balance * rate;
        wallet.currency = currency;
        wallet.balance = convertedBalance;
        await wallet.save();

        res.status(200).json({
            message: `Currency updated to ${currency} and balance converted`,
            newBalance: convertedBalance,
            exchangeRate: rate
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

//set daily limit
export const setTransactionLimit = async (req, res) => {
    try {
        const { limit } = req.body;
        const userId = req.user._id;

        if (!limit || limit <= 0) {
            return res.status(400).json({ message: "Invalid limit amount" });
        }

        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        wallet.dailyTransactionLimit = limit;
        await wallet.save();

        res.status(200).json({ message: `Transaction limit set to ${limit}` });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

//detect fraud
export const detectFraud = async (req, res) => {
    const { threshold, timeFrameMinutes } = req.body;
    const timeFrame = new Date(Date.now() - timeFrameMinutes * 60 * 1000); 
    console.log(timeFrame)
    try {

      const suspiciousTransactions = await Transaction.find({
        amount: { $gte: threshold },
        timestamp: { $gte: timeFrame }
      })
        .sort({ timestamp: 1 })
        .populate('user'); 
  
      if (suspiciousTransactions.length > 0) {
        return res.status(200).json({
          suspicious: true,
          message: `Multiple high-value transactions detected within the past ${timeFrameMinutes} minutes.`,
          transactions: suspiciousTransactions.map((transaction) => ({
            transactionId: transaction._id,
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            user: transaction.user._id,
            name: transaction.user.name,
            email: transaction.user.email,
          })),
        });
      }
  
      return res.status(200).json({
        suspicious: false,
        message: 'No suspicious activity detected.'
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error detecting suspicious activity', error });
    }
}