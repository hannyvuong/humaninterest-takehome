import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function App() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountId, setAccountId] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [message, setMessage] = useState("");
  const [balanceHistory, setBalanceHistory] = useState([]);

  // ✅ Create or load account by email
  const handleCreateAccount = async () => {
    const checkRes = await fetch(`http://localhost:4000/account/by-email/${email}`);
    if (checkRes.ok) {
      const existingData = await checkRes.json();
      setAccountId(existingData.accountId);
      setAccountInfo(existingData.account);
      setMessage("Loaded existing account");
      setBalanceHistory([{ date: new Date().toLocaleTimeString(), balance: existingData.account.balance }]);
      return;
    }

    const res = await fetch("http://localhost:4000/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email })
    });
    const data = await res.json();
    if (res.ok) {
      setAccountId(data.accountId);
      setAccountInfo(data.account);
      setMessage(data.message);
      setBalanceHistory([{ date: new Date().toLocaleTimeString(), balance: data.account.balance }]);
    } else {
      setMessage(data.error || "Error creating account");
    }
  };

  // ✅ Deposit funds
  const handleDeposit = async () => {
    if (!accountId) {
      setMessage("Create an account first!");
      return;
    }
    const res = await fetch(`http://localhost:4000/account/${accountId}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(amount) })
    });
    const data = await res.json();
    if (res.ok) {
      setAccountInfo(prev => ({ ...prev, balance: data.newBalance }));
      setMessage(data.message);
      setBalanceHistory(prev => [
        ...prev,
        { date: new Date().toLocaleTimeString(), balance: data.newBalance }
      ]);
    } else {
      setMessage(data.error || "Error depositing");
    }
  };

  // ✅ Issue card
  const handleIssueCard = async () => {
    if (!accountId) {
      setMessage("Create an account first!");
      return;
    }
    const res = await fetch(`http://localhost:4000/account/${accountId}/card`, {
      method: "POST"
    });
    const data = await res.json();
    if (res.ok) {
      setAccountInfo(prev => ({ ...prev, cards: [...(prev.cards || []), data.card] }));
      setMessage("Card issued successfully");
    } else {
      setMessage(data.error || "Error issuing card");
    }
  };

  // ✅ Make transaction
  const handleTransaction = async () => {
    if (!accountId) {
      setMessage("Create an account first!");
      return;
    }
    if (!selectedCardId) {
      setMessage("Select a card first!");
      return;
    }
    const res = await fetch(`http://localhost:4000/account/${accountId}/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(amount),
        description: reason,
        cardId: selectedCardId
      })
    });
    const data = await res.json();
    if (res.ok) {
      setAccountInfo(data.account);
      setMessage(data.message);
      setBalanceHistory(prev => [
        ...prev,
        { date: new Date().toLocaleTimeString(), balance: data.account.balance }
      ]);
    } else {
      setMessage(data.error || "Error making transaction");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Health Savings Account (HSA) Demo</h1>

      {/* Wrap main content in a flex container */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
        {/* LEFT SIDE: Account info, deposit, cards, transactions */}
        <div style={{ flex: 1 }}>
          {/* Account Creation */}
          <div>
            <h2>Create / Load Account</h2>
            <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <button onClick={handleCreateAccount}>Submit</button>
          </div>

          {accountInfo && (
            <>
              <h3>Account Info</h3>
              <p><strong>Name:</strong> {accountInfo.name}</p>
              <p><strong>Email:</strong> {accountInfo.email}</p>
              <p><strong>Balance:</strong> ${accountInfo.balance.toFixed(2)}</p>

              {/* Deposit */}
              <div>
                <h3>Deposit Funds</h3>
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <button onClick={handleDeposit}>Deposit</button>
              </div>

              {/* Issue Card */}
              <div>
                <h3>Cards</h3>
                <button onClick={handleIssueCard}>Issue Card</button>
                <ul>
                  {accountInfo.cards?.map(card => (
                    <li key={card.id}>
                      Card •••• {card.cardNumber.slice(-4)} (Exp: {card.expiry})
                    </li>
                  ))}
                </ul>
              </div>

              {/* Transaction */}
              <div>
                <h3>Make Transaction</h3>
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
                <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)}>
                  <option value="">Select Card</option>
                  {accountInfo.cards?.map(card => (
                    <option key={card.id} value={card.id}>
                      •••• {card.cardNumber.slice(-4)}
                    </option>
                  ))}
                </select>
                <button onClick={handleTransaction}>Submit Transaction</button>
              </div>

              {/* Transactions List */}
              <div>
                <h3>Transactions</h3>
                <ul>
                  {accountInfo.transactions?.map(tx => (
                    <li key={tx.id}>
                      {tx.description} - ${tx.amount.toFixed(2)} ({tx.status})
                      {" "} [Card: ••••{tx.cardNumber.slice(-4)}]
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* RIGHT SIDE: Balance chart */}
        {balanceHistory.length > 0 && (
          <div style={{ flex: 1 }}>
            <h3>Balance Over Time</h3>
            <LineChart width={500} height={300} data={balanceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="balance" stroke="#8884d8" />
            </LineChart>
          </div>
        )}
      </div>

      {message && <p><strong>Status:</strong> {message}</p>}
    </div>
  );
}

export default App;
