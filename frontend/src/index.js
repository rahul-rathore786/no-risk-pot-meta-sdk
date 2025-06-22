import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WagmiConfig, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { MetaMaskProvider } from '@metamask/sdk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config }>  
        <MetaMaskProvider
            debug={false}
            sdkOptions={{
              dappMetadata: {
                name: "No Risk Pot",
                url: window.location.href,
              }
            }}
          > 
            <App />
          </MetaMaskProvider>
      </WagmiConfig>
    </QueryClientProvider>
  </React.StrictMode>
);
