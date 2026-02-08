import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { getDefaultConfig } from "connectkit";

// COTI Devnet (testnet)
export const cotiDevnet = defineChain({
  id: 7082400,
  name: "COTI Devnet",
  nativeCurrency: { name: "COTI", symbol: "COTI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://devnet.coti.io/rpc"] },
  },
  blockExplorers: {
    default: { name: "COTI Explorer", url: "https://explorer-devnet.coti.io" },
  },
  testnet: true,
});

// Sepolia for testing
export const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
});

export const config = createConfig(
  getDefaultConfig({
    chains: [sepolia, cotiDevnet],
    transports: {
      [sepolia.id]: http(),
      [cotiDevnet.id]: http(),
    },
    walletConnectProjectId: "0", // placeholder — works without for dev
    appName: "COTI Private Audit",
    appDescription: "Privacy-Preserving Smart Contract Audit Dashboard",
  })
);

// Contract deployed on Sepolia
export const PRIVATE_AUDIT_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const; // will be updated after deploy
