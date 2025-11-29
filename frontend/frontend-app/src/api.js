// frontend-app/src/api.js
import axios from "axios";

const API_URL = "http://localhost:4000";

// Buy Insurance
export async function buyInsurance(premium, coverage, beneficiary) {
  const res = await axios.post(`${API_URL}/buyInsurance`, {
    premium,
    coverage,
    beneficiary,
  });
  return res.data;
}

// Claim Insurance
export async function claimInsurance(policyId, amount) {
  const res = await axios.post(`${API_URL}/claimInsurance`, {
    policyId,
    amount,
  });
  return res.data;
}

// Get Policy
export async function getPolicy(policyId) {
  const res = await axios.get(`${API_URL}/getPolicy/${policyId}`);
  return res.data;
}
