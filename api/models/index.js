import mongoose from "mongoose";

// User Schema
const WalletUserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        currency: { type: String, default: "USD", required: true }, // Default currency
        wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    },
    { timestamps: true }
);

// Wallet Schema
const WalletSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "WalletUser", required: true },
        balance: { type: Number, default: 0 },
        currency: { type: String, enum: ["USD", "EUR", "INR", "GBP"], default: "INR", required: true },
        dailyTransactionLimit: { type: Number, default: 10000 }, 
        lastTransactionTime: { type: Date }, 
        totalTransactionsToday: { type: Number, default: 0 }, 
    },
    { timestamps: true }
);

// Transaction Schema
const TransactionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "WalletUser" },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "WalletUser" },
        receiver: { type: mongoose.Schema.Types.ObjectId, ref: "WalletUser" },
        amount: { type: Number, required: true },
        transactionType: { type: String, enum: ["credit", "debit"], required: true },
        status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
        description: { type: String },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true }
);



const WalletUser = mongoose.model("WalletUser", WalletUserSchema);
const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);


export { WalletUser, Wallet, Transaction};
