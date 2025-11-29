// scripts/deploy.js
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  
  const InsuranceMarketplace = await hre.ethers.getContractFactory("InsuranceMarketplace");
  const contract = await InsuranceMarketplace.deploy(deployer.address);

  await contract.waitForDeployment();

  console.log("InsuranceMarketplace deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
