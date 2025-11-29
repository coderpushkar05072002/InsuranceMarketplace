import React, { useState } from "react";
import { buyInsurance, claimInsurance, getPolicy } from "./api";

function App() {
  const [wallet, setWallet] = useState(null);
  const [message, setMessage] = useState("");

  // connect wallet button
  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWallet(accounts[0]);
      setMessage(`Wallet connected: ${accounts[0]}`);
    } else {
      setMessage("MetaMask not found!");
    }
  };

  // buy insurance
  const handleBuy = async () => {
    try {
      const res = await buyInsurance(100);
      setMessage("Insurance bought: " + JSON.stringify(res));
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  // claim insurance
  const handleClaim = async () => {
    try {
      const res = await claimInsurance();
      setMessage("Insurance claimed: " + JSON.stringify(res));
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  // get policy
  const handleGetPolicy = async () => {
    try {
      const res = await getPolicy();
      setMessage("Policy: " + JSON.stringify(res));
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Insurance Marketplace DApp</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      <br /><br />
      <button onClick={handleBuy}>Buy Insurance</button>
      <button onClick={handleClaim} style={{ marginLeft: "10px" }}>Claim Insurance</button>
      <button onClick={handleGetPolicy} style={{ marginLeft: "10px" }}>Get Policy</button>

      <p style={{ marginTop: "20px" }}>{message}</p>
    </div>
  );
}

export default App;
