// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, network } from "hardhat";
import { BridgeTestToken, BridgeTestToken__factory, TokenLock, TokenLock__factory, TokenBridge, TokenBridge__factory, Token, Token__factory } from "../typechain";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  if (network.name == "polygon_mainnet" || network.name == "mumbai_testnet") {
    const BridgeTestTokenFactory = (await ethers.getContractFactory("BridgeTestToken")) as BridgeTestToken__factory;
    const BridgeTestToken = (await BridgeTestTokenFactory.deploy(ethers.utils.parseEther("10000000"))) as BridgeTestToken;
    console.log("Token Addrress on Polygon ", BridgeTestToken.address);
    const TokenLockFactory = (await ethers.getContractFactory("TokenLock")) as TokenLock__factory;
    const TokenLock = (await TokenLockFactory.deploy(BridgeTestToken.address)) as TokenLock;
    console.log("Token Lock Address on Ethereum ", TokenLock.address);
  } else if (network.name == "bsc_mainnet" || network.name == "bsc_testnet") {
    const TokenFactory = (await ethers.getContractFactory("Token")) as Token__factory;
    const Token = (await TokenFactory.deploy()) as Token;
    console.log("Token Address on BSC ", Token.address);
    const TokenBridgeFactory = (await ethers.getContractFactory("TokenBridge")) as TokenBridge__factory;
    const TokenBridge = (await TokenBridgeFactory.deploy(Token.address)) as TokenBridge;
    console.log("Token Bridge Addrress on BSC ", TokenBridge.address);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
