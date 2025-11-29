// backend/index.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { ethers } from "ethers";
import { contractAddress, contractABI } from "./contract.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Provider + Signer setup (Hardhat local node ke liye)
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = await provider.getSigner(0); // default first account use hoga

// Contract instance
const contract = new ethers.Contract(contractAddress, contractABI, signer);

//  Buy Insurance (Premium pay karna)
app.post("/buyInsurance", async (req, res) => {
  try {
    const { policyId, premium } = req.body;
    if (!policyId || !premium) {
      return res.status(400).json({ error: "policyId and premium required" });
    }

    const tx = await contract.payPremium(policyId, {
      value: ethers.parseEther(premium.toString()), // ether me convert
    });
    await tx.wait();

    res.json({ message: "Insurance purchased!", txHash: tx.hash });
  } catch (err) {
    console.error("❌ BuyInsurance error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Claim Insurance
app.post("/claimInsurance", async (req, res) => {
  try {
    const { policyId, amount } = req.body;
    if (!policyId || !amount) {
      return res.status(400).json({ error: "policyId and amount required" });
    }

    const tx = await contract.payClaim(policyId, ethers.parseEther(amount.toString()));
    await tx.wait();

    res.json({ message: "Claim processed!", txHash: tx.hash });
  } catch (err) {
    console.error("❌ ClaimInsurance error:", err);
    res.status(500).json({ error: err.message });
  }
});

//  Get Policy details
app.get("/getPolicy/:policyId", async (req, res) => {
  try {
    const { policyId } = req.params;
    const policy = await contract.policies(policyId);

    res.json({
      provider: policy.provider,
      beneficiary: policy.beneficiary,
      premium: policy.premium.toString(),
      coverageLimit: policy.coverageLimit.toString(),
      liquidity: policy.liquidity.toString(),
      claimed: policy.claimed.toString(),
      active: policy.active,
    });
  } catch (err) {
    console.error("❌ GetPolicy error:", err);
    res.status(500).json({ error: err.message });
  }
});

//  Start backend server
app.listen(4000, () => {
  console.log("✅ Backend running at http://localhost:4000");
});
