// backend/index.js
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000;

// In-memory storage
const accounts = new Map(); // still use Map for lookups by ID
const emailToAccountId = new Map(); // secondary index to enforce uniqueness

// IRS-qualified expenses
const qualifiedMerchants = ["doctor", "hospital", "pharmacy", "clinic", "dentist", "optometrist", "chiropractor"];

// ✅ Create an account
app.post("/account", (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  // ✅ Check if account already exists for this email
  if (emailToAccountId.has(email)) {
    const existingId = emailToAccountId.get(email);
    const existingAccount = accounts.get(existingId);
    return res.status(200).json({
      accountId: existingId,
      message: "Account already exists",
      account: existingAccount
    });
  }

  // Otherwise create new account
  const accountId = uuidv4();
  const account = {
    id: accountId,
    name,
    email,
    balance: 0,
    cards: [],
    transactions: []
  };

  accounts.set(accountId, account);
  emailToAccountId.set(email, accountId);

  res.status(201).json({
    accountId,
    message: "Account created successfully",
    account
  });
});

// ✅ Get account by email
app.get("/account/by-email/:email", (req, res) => {
  const email = req.params.email;

  if (!emailToAccountId.has(email)) {
    return res.status(404).json({ error: "Account not found" });
  }

  const accountId = emailToAccountId.get(email);
  const account = accounts.get(accountId);

  res.json({
    accountId,
    account
  });
});


// ✅ Get account info
app.get("/account/:id", (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.json(account);
});

// ✅ Deposit funds
app.post("/account/:id/deposit", (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });

  const { amount } = req.body;
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Deposit amount must be positive" });
  }

  account.balance += amount;
  res.json({ message: "Deposit successful", newBalance: account.balance });
});

// ✅ Issue a card
app.post("/account/:id/card", (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });

  const cardNumber =
    "4000" + Math.floor(100000000000 + Math.random() * 900000000000);
  const expiryMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const expiryYear = new Date().getFullYear() + 3;
  const cvv = Math.floor(100 + Math.random() * 900);

  const card = {
    id: uuidv4(),
    cardNumber,
    expiry: `${expiryMonth}/${expiryYear}`,
    cvv,
    accountId: account.id
  };

  account.cards.push(card);
  res.status(201).json({ message: "Card issued successfully", card });
});

// ✅ Process a transaction
app.post("/account/:id/transaction", (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });

  const { amount, description, cardId } = req.body;
  if (!amount || !description || !cardId) {
    return res
      .status(400)
      .json({ error: "Amount, description, and cardId are required" });
  }

  const card = account.cards.find(c => c.id === cardId);
  if (!card) return res.status(404).json({ error: "Card not found" });

  const isQualified = qualifiedMerchants.some(m =>
    description.toLowerCase().includes(m)
  );

  let status = "declined";
  if (isQualified && account.balance >= amount) {
    account.balance -= amount;
    status = "approved";
  }

  const transaction = {
    id: uuidv4(),
    amount,
    description,
    status,
    cardNumber: card.cardNumber
  };

  account.transactions.push(transaction);

  // 🔑 Return updated account instead of just transaction
  res.json({
    message: "Transaction processed",
    account
  });
});

// ✅ Apply interest (simulate 1%)
app.post("/account/:id/interest", (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });

  const interest = account.balance * 0.01;
  account.balance += interest;

  const transaction = {
    id: uuidv4(),
    amount: interest,
    description: "Interest applied",
    status: "credited",
    cardNumber: null
  };

  account.transactions.push(transaction);
  res.json({
    message: "Interest applied",
    newBalance: account.balance,
    transaction
  });
});

app.listen(PORT, () =>
  console.log(`✅ Backend running at http://localhost:${PORT}`)
);
