import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";
import contractAddresses from "./contracts/addresses.json";
import { useAccount, useWalletClient } from "wagmi";

// Components
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import BuyTickets from "./pages/BuyTickets";
import AdminPanel from "./pages/AdminPanel";
import ClaimFunds from "./pages/ClaimFunds";
// import { ConnectButton } from "./components/ConnectButton";

// Contract ABIs
import ZeroLossLotteryABI from "./artifacts/contracts/ZeroLossLottery.sol/ZeroLossLottery.json";
import ERC20ABI from "./contracts/ERC20ABI.json";

// PYUSD token has 6 decimals
const PYUSD_DECIMALS = 6;

function App() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // State variables
  const [signer, setSigner] = useState(null);
  const [lotteryContract, setLotteryContract] = useState(null);
  const [pyusdContract, setPyusdContract] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [page, setPage] = useState("home");
  const [lotteryData, setLotteryData] = useState({
    totalTickets: 0,
    interestPool: 0,
    drawCompleted: false,
    userTickets: 0,
    pyusdBalance: 0,
    isWinner: 0,
    hasClaimed: false,
  });

  useEffect(() => {
    if (walletClient) {
      const { account, chain, transport } = walletClient;
      const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
      };
      const provider = new ethers.providers.Web3Provider(transport, network);
      const signer = provider.getSigner(account.address);
      setSigner(signer);
    } else {
      setSigner(null);
    }
  }, [walletClient]);

  // Helper function to format PYUSD amounts (6 decimals)
  const formatPyusd = (amount) => {
    return ethers.utils.formatUnits(amount, PYUSD_DECIMALS);
  };

  // Helper function to parse PYUSD amounts (6 decimals)
  const parsePyusd = (amount) => {
    return ethers.utils.parseUnits(amount.toString(), PYUSD_DECIMALS);
  };

  // Refresh lottery data
  const refreshLotteryData = async (lottery, pyusd, userAddress) => {
    if (!lottery || !pyusd || !userAddress) return;

    try {
      const [
        totalTickets,
        interestPool,
        drawCompleted,
        userTickets,
        pyusdBalance,
        isWinner,
        hasClaimed,
      ] = await Promise.all([
        lottery.totalTickets(),
        lottery.interestPool(),
        lottery.drawCompleted(),
        lottery.tickets(userAddress),
        pyusd.balanceOf(userAddress),
        lottery.isWinner(userAddress),
        lottery.hasClaimed(userAddress),
      ]);

      setLotteryData({
        totalTickets: totalTickets.toNumber(),
        interestPool: formatPyusd(interestPool),
        drawCompleted,
        userTickets: userTickets.toNumber(),
        pyusdBalance: formatPyusd(pyusdBalance),
        isWinner: isWinner,
        hasClaimed,
      });
    } catch (error) {
      console.error("Error refreshing lottery data:", error);
    }
  };

  useEffect(() => {
    const setupContracts = async () => {
      if (isConnected && signer && address) {
        const lotteryAddr = contractAddresses.ZeroLossLottery;
        const pyusdAddr = contractAddresses.PYUSD;

        const lottery = new ethers.Contract(
          lotteryAddr,
          ZeroLossLotteryABI.abi,
          signer
        );
        setLotteryContract(lottery);

        const pyusd = new ethers.Contract(pyusdAddr, ERC20ABI, signer);
        setPyusdContract(pyusd);

        const owner = await lottery.owner();
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
      } else {
        setLotteryContract(null);
        setPyusdContract(null);
        setIsOwner(false);
      }
    };

    setupContracts();
  }, [isConnected, signer, address]);

  useEffect(() => {
    if (address && lotteryContract && pyusdContract) {
      refreshLotteryData(lotteryContract, pyusdContract, address);

      // Set up event listeners
      const ticketsPurchasedFilter = lotteryContract.filters.TicketsPurchased();
      const interestAddedFilter = lotteryContract.filters.InterestAdded();
      const drawCompletedFilter = lotteryContract.filters.DrawCompleted();
      const fundsClaimedFilter = lotteryContract.filters.FundsClaimed();

      const refresh = () =>
        refreshLotteryData(lotteryContract, pyusdContract, address);

      lotteryContract.on(ticketsPurchasedFilter, refresh);
      lotteryContract.on(interestAddedFilter, refresh);
      lotteryContract.on(drawCompletedFilter, refresh);
      lotteryContract.on(fundsClaimedFilter, refresh);

      return () => {
        lotteryContract.off(ticketsPurchasedFilter, refresh);
        lotteryContract.off(interestAddedFilter, refresh);
        lotteryContract.off(drawCompletedFilter, refresh);
        lotteryContract.off(fundsClaimedFilter, refresh);
      };
    }
  }, [address, lotteryContract, pyusdContract]);

  // Render different pages based on state
  const renderPage = () => {
    if (!isConnected) {
      return (
        <div className="center-message">
          Please connect your wallet to use the application.
        </div>
      );
    }
    switch (page) {
      case "buy":
        return (
          <BuyTickets
            lotteryContract={lotteryContract}
            pyusdContract={pyusdContract}
            lotteryData={lotteryData}
            refreshData={() =>
              refreshLotteryData(lotteryContract, pyusdContract, address)
            }
            parsePyusd={parsePyusd}
          />
        );
      case "admin":
        return isOwner ? (
          <AdminPanel
            lotteryContract={lotteryContract}
            pyusdContract={pyusdContract}
            lotteryData={lotteryData}
            refreshData={() =>
              refreshLotteryData(lotteryContract, pyusdContract, address)
            }
            parsePyusd={parsePyusd}
          />
        ) : (
          <div className="error-message">
            You are not authorized to access this page.
          </div>
        );
      case "claim":
        return (
          <ClaimFunds
            lotteryContract={lotteryContract}
            lotteryData={lotteryData}
            refreshData={() =>
              refreshLotteryData(lotteryContract, pyusdContract, address)
            }
          />
        );
      default:
        return (
          <Home lotteryData={lotteryData} setPage={setPage} isOwner={isOwner} />
        );
    }
  };

  return (
    <div className="app">
      <Navbar
        setPage={setPage}
        isOwner={isOwner}
        pyusdBalance={lotteryData.pyusdBalance}
      />
      <div className="container">{renderPage()}</div>
    </div>
  );
}

export default App;
