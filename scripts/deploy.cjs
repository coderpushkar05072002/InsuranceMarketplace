const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);

  const InsuranceMarketplace = await hre.ethers.getContractFactory("InsuranceMarketplace");
  const insurance = await InsuranceMarketplace.deploy(deployer.address); // feeWallet as deployer

  await insurance.waitForDeployment();

  console.log("InsuranceMarketplace deployed at:", await insurance.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
