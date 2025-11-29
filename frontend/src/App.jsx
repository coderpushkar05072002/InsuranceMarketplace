import React, { useState } from "react";
import { buyInsurance, claimInsurance, getPolicy } from "./api";
import { contractABI, contractAddress } from "./abi";
import { ethers } from "ethers";

function App() {
  const [account, setAccount] = useState(null);
  const [policyId, setPolicyId] = useState("");
  const [premium, setPremium] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [policy, setPolicy] = useState(null);

  // ✅ Wallet connect function
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      } catch (err) {
        console.error("Wallet connection failed:", err);
      }
    } else {
      alert("MetaMask not found! Install MetaMask extension.");
    }
  };

  // ✅ Buy Insurance
  const handleBuy = async () => {
    const res = await buyInsurance(policyId, premium);
    alert(JSON.stringify(res));
  };

  // ✅ Claim Insurance
  const handleClaim = async () => {
    const res = await claimInsurance(policyId, claimAmount);
    alert(JSON.stringify(res));
  };

  // ✅ Get Policy
  const handleGetPolicy = async () => {
    const res = await getPolicy(policyId);
    setPolicy(res);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1 style={{ color: "#333" }}>Insurance Marketplace</h1>

      {/* Wallet connect */}
      <div style={{ marginBottom: "20px" }}>
        {account ? (
          <p>✅ Connected Wallet: {account}</p>
        ) : (
          <button
            onClick={connectWallet}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Policy ID Input */}
      <div>
        <input
          type="text"
          placeholder="Policy ID"
          value={policyId}
          onChange={(e) => setPolicyId(e.target.value)}
          style={{ margin: "5px", padding: "8px" }}
        />
      </div>

      {/* Premium Input */}
      <div>
        <input
          type="text"
          placeholder="Premium (ETH)"
          value={premium}
          onChange={(e) => setPremium(e.target.value)}
          style={{ margin: "5px", padding: "8px" }}
        />
        <button
          onClick={handleBuy}
          style={{
            backgroundColor: "#2196F3",
            color: "white",
            padding: "10px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Buy Insurance
        </button>
      </div>

      {/* Claim Amount Input */}
      <div>
        <input
          type="text"
          placeholder="Claim Amount"
          value={claimAmount}
          onChange={(e) => setClaimAmount(e.target.value)}
          style={{ margin: "5px", padding: "8px" }}
        />
        <button
          onClick={handleClaim}
          style={{
            backgroundColor: "#f44336",
            color: "white",
            padding: "10px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Claim Insurance
        </button>
      </div>

      {/* Get Policy */}
      <div>
        <button
          onClick={handleGetPolicy}
          style={{
            backgroundColor: "#FF9800",
            color: "white",
            padding: "10px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Get Policy
        </button>
      </div>

      {/* Policy Details */}
      {policy && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#f4f4f4",
            borderRadius: "8px",
          }}
        >
          <h3>Policy Details</h3>
          <pre>{JSON.stringify(policy, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
