import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import web3Abi from "web3-eth-abi";
import { BridgeTestToken, BridgeTestToken__factory, TokenLock, TokenLock__factory, TokenBridge, TokenBridge__factory, Token, Token__factory } from "../typechain";
const sigUtil = require("@metamask/eth-sig-util");
const AdminPK = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // accounts[0] is the admin
describe("Token Bridge", async () => {
  let owner: Signer,
    accounts1: Signer,
    accounts2: Signer,
    bridgeTestTokenFactory: BridgeTestToken__factory,
    bridgeTestToken: BridgeTestToken,
    tokenLockFactory: TokenLock__factory,
    tokenLock: TokenLock,
    tokenBridgeFactory: TokenBridge__factory,
    tokenBridge: TokenBridge,
    TokenFactory: Token__factory,
    Token: Token,
    accounts1_addr: string,
    accounts2_addr: string;
  const domainType = [
    {
      name: "name",
      type: "string",
    },
    {
      name: "version",
      type: "string",
    },
    {
      name: "verifyingContract",
      type: "address",
    },
    {
      name: "salt",
      type: "bytes32",
    },
  ];

  const metaTransactionType = [
    {
      name: "nonce",
      type: "uint256",
    },
    {
      name: "from",
      type: "address",
    },
    {
      name: "functionSignature",
      type: "bytes",
    },
  ];

  const depositABI = {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "lockTxHash",
        type: "string",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  };

  const releaseTokensABI = {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "burnTxHash",
        type: "string"
      }
    ],
    name: "releaseTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  };

  const getTransactionData = async (nonce: string, abi: any, domainData: any, params: Array<any>) => {
    // @ts-ignore
    const functionSignature = web3Abi.encodeFunctionCall(abi, params);
    let message = {
      nonce: parseInt(nonce),
      from: params[0],
      functionSignature,
    };
    const dataToSign = {
      types: {
        EIP712Domain: domainType,
        MetaTransaction: metaTransactionType,
      },
      domain: domainData,
      primaryType: "MetaTransaction",
      message: message,
    };
    const signature = sigUtil.signTypedData({
      privateKey: Buffer.from(AdminPK, "hex"),
      data: dataToSign,
      version: sigUtil.SignTypedDataVersion.V3,
    });

    let r = signature.slice(0, 66);
    let s = "0x".concat(signature.slice(66, 130));
    let V = "0x".concat(signature.slice(130, 132));
    let v = parseInt(V);

    if (![27, 28].includes(v)) v += 27;

    return {
      r,
      s,
      v,
      functionSignature,
    };
  };

  before(async () => {
    bridgeTestTokenFactory = await ethers.getContractFactory("BridgeTestToken");
    bridgeTestToken = await bridgeTestTokenFactory.deploy(ethers.utils.parseEther("10000000"));
    tokenLockFactory = (await ethers.getContractFactory("TokenLock")) as TokenLock__factory;
    tokenLock = await tokenLockFactory.deploy(bridgeTestToken.address);
    TokenFactory = await ethers.getContractFactory("Token");
    Token = await TokenFactory.deploy();
    tokenBridgeFactory = await ethers.getContractFactory("TokenBridge") as TokenBridge__factory;
    tokenBridge = await tokenBridgeFactory.deploy(Token.address);
    [owner, accounts1, accounts2] = await ethers.getSigners();
    accounts1_addr = await accounts1.getAddress();
    accounts2_addr = await accounts2.getAddress();
  });
  it("Transfer Tokens on TestToken to Users", async () => {
    await bridgeTestToken.transfer(accounts1_addr, ethers.utils.parseEther("100000.0"));
    await bridgeTestToken.transfer(accounts2_addr, ethers.utils.parseEther("300000.0"));
    const account1Balance = ethers.utils.formatEther(await bridgeTestToken.balanceOf(accounts1_addr));
    const account2Balance = ethers.utils.formatEther(await bridgeTestToken.balanceOf(accounts2_addr));
    expect(account1Balance).eq("100000.0");
    expect(account2Balance).eq("300000.0");
  });
  it("Lock Test Tokens on tokenLock", async () => {
    await bridgeTestToken.connect(accounts1).approve(tokenLock.address, ethers.utils.parseEther("100000.0"));
    await bridgeTestToken.connect(accounts2).approve(tokenLock.address, ethers.utils.parseEther("300000.0"));
    await tokenLock.connect(accounts1).lockTokens(ethers.utils.parseEther("100000.0"));
    await tokenLock.connect(accounts2).lockTokens(ethers.utils.parseEther("300000.0"));
    const account1Balance = ethers.utils.formatEther(await bridgeTestToken.balanceOf(accounts1_addr));
    const account2Balance = ethers.utils.formatEther(await bridgeTestToken.balanceOf(accounts2_addr));
    expect(account1Balance).eq("0.0");
    expect(account2Balance).eq("0.0");
  });
  it("Set Bridge Contract As Admin on the Token", async () => {
    await Token.setDepositAdmin(tokenBridge.address);
  });
  it("Bridge Tokens on Token Bridge for Accounts 1", async () => {
    let name = "tokenBridge";
    let nonce = (await tokenBridge.getNonce(accounts1_addr)).toString();
    let version = "1";
    let chainId = (await tokenBridge.getChainId()).toString();
    let domainData = {
      name: name,
      version: version,
      verifyingContract: tokenBridge.address,
      salt: "0x" + parseInt(chainId).toString(16).padStart(64, "0"),
    };

    let { r, s, v, functionSignature } = await getTransactionData(nonce, depositABI, domainData, [accounts1_addr, ethers.utils.parseEther("100000.0"), "lockHashMeta1"]);
    await tokenBridge.connect(accounts1).executeMetaTransaction(functionSignature, r, s, v);
    const account1Balance = ethers.utils.formatEther(await Token.balanceOf(accounts1_addr));
    expect(account1Balance).eq("100000.0");
  });
  it("Bridge Tokens on Token Bridge for Accounts 2", async () => {
    let name = "tokenBridge";
    let nonce = (await tokenBridge.getNonce(accounts2_addr)).toString();
    let version = "1";
    let chainId = (await tokenBridge.getChainId()).toString();
    let domainData = {
      name: name,
      version: version,
      verifyingContract: tokenBridge.address,
      salt: "0x" + parseInt(chainId).toString(16).padStart(64, "0"),
    };

    let { r, s, v, functionSignature } = await getTransactionData(nonce, depositABI, domainData, [accounts2_addr, ethers.utils.parseEther("300000.0"), "lockHashMeta2"]);
    await tokenBridge.connect(accounts2).executeMetaTransaction(functionSignature, r, s, v);
    const account2Balance = ethers.utils.formatEther(await Token.balanceOf(accounts2_addr));
    expect(account2Balance).eq("300000.0");
  });
  it("Burn Tokens on Token for Account 1 and Account 2", async () => {
    await Token.connect(accounts1).burn(ethers.utils.parseEther("100000.0"));
    const account1Balance = ethers.utils.formatEther(await Token.balanceOf(accounts1_addr));
    expect(account1Balance).eq("0.0");
    await Token.connect(accounts2).burn(ethers.utils.parseEther("300000.0"));
    const account2Balance = ethers.utils.formatEther(await Token.balanceOf(accounts2_addr));
    expect(account2Balance).eq("0.0");
  });
  it("Release Test Tokens on tokenLock for Accounts 1", async () => {
    let name = "tokenLock";
    let nonce = (await tokenLock.getNonce(accounts1_addr)).toString();
    let version = "1";
    let chainId = (await tokenLock.getChainId()).toString();
    let domainData = {
      name: name,
      version: version,
      verifyingContract: tokenLock.address,
      salt: "0x" + parseInt(chainId).toString(16).padStart(64, "0"),
    };

    let { r, s, v, functionSignature } = await getTransactionData(nonce, releaseTokensABI, domainData, [accounts1_addr, ethers.utils.parseEther("100000.0"), "burntHashMeta1"]);
    await tokenLock.connect(accounts1).executeMetaTransaction(functionSignature, r, s, v);  
    const account1Balance = ethers.utils.formatEther(await bridgeTestToken.balanceOf(accounts1_addr));
    expect(account1Balance).eq("100000.0");
  });
  it("Release Test Tokens on tokenLock for Accounts 2", async () => {
    let name = "tokenLock";
    let nonce = (await tokenLock.getNonce(accounts2_addr)).toString();
    let version = "1";
    let chainId = (await tokenLock.getChainId()).toString();
    let domainData = {
      name: name,
      version: version,
      verifyingContract: tokenLock.address,
      salt: "0x" + parseInt(chainId).toString(16).padStart(64, "0"),
    };

    let { r, s, v, functionSignature } = await getTransactionData(nonce, releaseTokensABI, domainData, [accounts2_addr, ethers.utils.parseEther("300000.0"), "burntHashMeta2"]);
    await tokenLock.connect(accounts2).executeMetaTransaction(functionSignature, r, s, v);  
    const account2Balance = ethers.utils.formatEther(await  bridgeTestToken.balanceOf(accounts2_addr));
    expect(account2Balance).eq("300000.0");
  });
});
