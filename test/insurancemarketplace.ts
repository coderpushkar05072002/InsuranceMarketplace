import { expect } from "chai";
import { ethers } from "hardhat";

describe("InsuranceMarketplace", function () {
  it("should create a policy, fund liquidity, pay premium and process claim", async function () {
    const [owner, provider, beneficiary, payer, feeWallet] = await ethers.getSigners();

    // Deploy contract
    const InsuranceMarketplace = await ethers.getContractFactory("InsuranceMarketplace");
    const insurance = await InsuranceMarketplace.deploy(feeWallet.address);
    await insurance.waitForDeployment();

    // Provider creates a policy
    const tx = await insurance.connect(provider).createPolicy(
      beneficiary.address,
      ethers.parseEther("1"),   // premium = 1 ETH
      ethers.parseEther("5"),   // coverage limit = 5 ETH
      0,                        // FeeMode.STANDARD
      0,                        // no start time restriction
      0                         // no end time restriction
    );
    const receipt = await tx.wait();
    const policyId = receipt?.logs[0].args?.policyId || 1n; // extract policyId

    // Provider funds liquidity (5 ETH)
    await insurance.connect(provider).fundPolicyLiquidity(policyId, { value: ethers.parseEther("5") });

    // Payer pays premium (premium=1 ETH + 1% fee=0.01 ETH => total=1.01 ETH)
    await insurance.connect(payer).payPremium(policyId, { value: ethers.parseEther("1.01") });

    // Provider pays claim (2 ETH to beneficiary)
    await insurance.connect(provider).payClaim(policyId, ethers.parseEther("2"));

    // Validate balances
    const policy = await insurance.policies(policyId);
    expect(policy.claimed).to.equal(ethers.parseEther("2"));
  });
});
