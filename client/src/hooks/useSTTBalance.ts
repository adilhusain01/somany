import { useAccount, useContractRead } from 'wagmi'
import { formatEther } from 'viem'

const STT_CONTRACT = '0x238bEa9242f4a8d264346d24515A4f8633f06a76'
const CHAIN_ID = 50312 // Somnia Testnet

const ERC20_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function useSTTBalance() {
  const { address } = useAccount()

  const { data: balance, isLoading } = useContractRead({
    address: STT_CONTRACT as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: {
      enabled: !!address,
    },
  })

  return {
    balance: balance ? Number(formatEther(balance)) : 0,
    isLoading
  }
}