import React from 'react';
import '../styles/Navbar.css';
import '../styles/ConnectButton.css';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useSDK } from '@metamask/sdk-react';

function Navbar({ setPage, isOwner, pyusdBalance }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading } = useConnect();
  const { disconnect } = useDisconnect();
  const { sdk } = useSDK();

  const handleConnect = async () => {
    try {
      if (sdk) {
        await sdk.connect();
      } else {
        connect({ connector: connectors[0] });
      }
    } catch (err) {
      console.warn(`failed to connect..`, err);
    }
  };

  return (
    <div className="navbar">
      <div className="navbar-logo" onClick={() => setPage('home')}>
        <span className="logo-text">No Risk Pot</span>
        <span className="logo-subtitle">Zero Loss Lottery</span>
      </div>

      <div className="navbar-right">
        <div className="navbar-links">
          <button className="nav-link" onClick={() => setPage('home')}>Home</button>
          <button className="nav-link" onClick={() => setPage('buy')}>Buy Tickets</button>
          <button className="nav-link" onClick={() => setPage('claim')}>Claim Funds</button>
          {isOwner && (
            <button className="nav-link admin" onClick={() => setPage('admin')}>Admin Panel</button>
          )}
        </div>
        
        {isConnected ? (
          <div className="wallet-container">
            <div className="wallet-info">
              <div className="wallet-balance">{parseFloat(pyusdBalance).toFixed(2)} USDC</div>
              <div className="wallet-address">{`${address.slice(0, 6)}...${address.slice(-4)}`}</div>
            </div>
            <button className="disconnect-btn" onClick={() => disconnect()}>Disconnect</button>
          </div>
        ) : (
          <button className="connect-btn-main" disabled={isLoading} onClick={handleConnect}>
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </div>
  );
}

export default Navbar;