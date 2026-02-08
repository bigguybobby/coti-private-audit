import { createConfig, http } from "wagmi";
import { CELO_SEPOLIA } from "./contract";
import { getDefaultConfig } from "connectkit";

const celoSepoliaChain = {
  ...CELO_SEPOLIA,
  rpcUrls: {
    default: { http: ["https://celo-sepolia.drpc.org"] },
  },
};

export const config = createConfig(
  getDefaultConfig({
    chains: [celoSepoliaChain as any],
    transports: {
      [celoSepoliaChain.id]: http("https://celo-sepolia.drpc.org"),
    },
    walletConnectProjectId: "privateaudit-demo",
    appName: "PrivateAudit",
    appDescription: "Privacy-Preserving Smart Contract Audit Dashboard",
  })
);
