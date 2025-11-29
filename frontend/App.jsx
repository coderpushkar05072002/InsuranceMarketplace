import { useState } from "react";
import { buyInsurance, claimInsurance, getPolicy } from "./api";

function App() {
  const [beneficiary, setBeneficiary] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [claimId, setClaimId] = useState("");
  const [policy, setPolicy] = useState(null);
  const [status, setStatus] = useState("");
  const [account, setAccount] = useState(null);

  // ✅ Connect Wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        setStatus("✅ Wallet connected!");
      } catch (err) {
        setStatus("❌ Wallet connection failed!");
      }
    } else {
      setStatus("⚠️ MetaMask not found!");
    }
  };

  // ✅ Buy Insurance
  const handleBuy = async () => {
    try {
      await buyInsurance(beneficiary, 100); // 100 is premium example
      setStatus("✅ Insurance purchased!");
    } catch (err) {
      setStatus("❌ Buy failed!");
    }
  };

  // ✅ Claim Insurance
  const handleClaim = async () => {
    try {
      await claimInsurance(claimId);
      setStatus("✅ Claim processed!");
    } catch (err) {
      setStatus("❌ Claim failed!");
    }
  };

  // ✅ Get Policy
  const handleGetPolicy = async () => {
    try {
      const result = await getPolicy(policyId);
      setPolicy(result);
      setStatus("✅ Policy fetched successfully!");
    } catch (err) {
      setStatus("❌ Fetch failed!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold">🛡️ Insurance Marketplace</h1>
          <button
            onClick={connectWallet}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md"
          >
            {account ? `🔗 ${account.slice(0, 6)}...` : "Connect Wallet"}
          </button>
        </header>

        {/* Buy Insurance */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Buy Insurance</h2>
          <input
            type="text"
            placeholder="Beneficiary Address"
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            className="w-full p-2 mb-3 text-black rounded"
          />
          <button
            onClick={handleBuy}
            className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg"
          >
            Buy Insurance
          </button>
        </div>

        {/* Claim Insurance */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Claim Insurance</h2>
          <input
            type="text"
            placeholder="Policy ID"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            className="w-full p-2 mb-3 text-black rounded"
          />
          <button
            onClick={handleClaim}
            className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg"
          >
            Claim Insurance
          </button>
        </div>

        {/* Get Policy */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Get Policy</h2>
          <input
            type="text"
            placeholder="Policy ID"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            className="w-full p-2 mb-3 text-black rounded"
          />
          <button
            onClick={handleGetPolicy}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Get Policy
          </button>
          {policy && (
            <pre className="bg-black text-green-400 p-4 rounded mt-4 overflow-x-auto">
              {JSON.stringify(policy, null, 2)}
            </pre>
          )}
        </div>

        {/* Status Message */}
        {status && (
          <p className="mt-4 text-center text-lg font-medium">{status}</p>
        )}
      </div>
    </div>
  );
}

export default App;
