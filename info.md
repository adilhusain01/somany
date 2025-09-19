What is a smart account?
info
"Smart accounts" are now available in MetaMask Extension v12.17.0 and above. Learn more about how to switch to a smart account and revert back to a standard account here.

To execute actions in crypto, you need an account. This is what MetaMask is for—your permissions and identity manager that helps you grant access to apps easily.

The crypto wallet space has greatly evolved since MetaMask was born in 2016, and will unequivocally continue to do so. New EIPs (Ethereum Improvement Proposals) have been put forth, debated, and agreed upon; new wallet applications have grown to support all kinds of use cases; new standards are being implemented to make transacting on web3 easier, safer, and more efficient.

MetaMask has been thinking about how to give our users more flexibility and scalability in tandem with the Ethereum community since, well, forever.

Thanks to the culmination of various EIPs and tooling frameworks, smart accounts are available in MetaMask.

MetaMask use smart account features modal
popup

Types of crypto accounts:
There are 2 account types when you think of “wallets”:

EOAs (Externally Owned Accounts): These are standard accounts controlled by private keys. Think MetaMask, Ledger, Rabby, where you custody a 12-word phrase.
SCAs (Smart Contract Accounts): These are programmable accounts powered by a smart contract. They are a newer, more customizable account type that lets you do way more than a traditional EOA.
EOAs—or standard accounts—are what most people use. We’ve become familiar with custodying a Secret Recovery Phrase (SRP), initiating transactions, and accruing reputation to our accounts but this type of account is limited in capabilities and security models compared to smart accounts.

Smart account adoption has been slower in part because it requires new account management knowledge, security models, and permissions standards and also because it historically didn’t meet most users where they were at.

But today, tech upgrades and account enhancements are making important functionality possible even to those of us using standard accounts like MetaMask, making it smart-ish, i.e., granting EOAs capabilities that smart contracts can perform while maintaining the basic public/private key account nature.

Smart accounts, or programmable accounts, are what all crypto wallets are moving toward.

But let’s rewind a bit, what exactly can smart accounts unlock that my basic account can’t?

Benefits of smart accounts
Transaction batching: Combining several steps (like approving and swapping a token) into one, saving fees and time.
Gas abstraction: Paying for gas in any token you want (example: DAI instead of ETH if you ran out) and maybe even removing the friction of paying for gas yourself if someone wants to “sponsor” it for you.
Subscriptions: Approving specific tokens to specific dapps at specific times. Just set it once and forget it.
Limit orders: Purchasing parameters! How convenient would it be to set your own trading rules? (example: If ETH hits $1500 (cry), buy 1 ETH).
Multisig: Approving a transaction requires multiple signers in order for it to execute, adding friction to moving funds. This is safer as your account doesn’t have a single point of failure when it comes to scams.
Social recovery: Writing 12 secret words on a paper is kind of wild. It can get lost, stolen, burned, you name it. Social recovery allows trusted guardians to recover your account for you if that unfortunate scenario ever happens.
Auto-approvals: Granting access to a specific dapp for a set time or amount means you don’t need to manually confirm transactions every single time.
note
These are some general benefits smart accounts have over standard accounts. These features are not all available in MetaMask yet.

How are smart accounts possible?
Okay, so now you understand what smart accounts can do for you. A lot! Including stuff that hasn’t even been thought of yet.

MetaMask has an ambitious roadmap to make programmable accounts aka smart accounts the norm. We want to enable you to define your own terms, express your agency in enforceable ways, and generally have your wallet work in your favor.

Through various EIPs, ERCs, and powerful open-ended permissions systems, smart accounts are coming to MetaMask. This has been years in the making, and we’re excited to build and support the new wave of account management.

MetaMask Delegation Framework: Unlike traditional wallets, which rely on private keys for every transaction, MetaMask delegator “gator” accounts use ERC-4337 smart contracts to govern account logic.

EIP-7702: This allows EOAs to inherit some smart account functionality like atomic batched transactions and paying for gas in any token you want! Learn more about upgrading your account to enable this functionality in this guide.

ERC-7710: This proposes a standard interface for smart accounts to grant permissions, enhancing flexibility and scalability.

ERC-7715: This defines an interface by which apps might ask for permission from your account, reducing the need for manual transaction approvals and enabling transactions even when you’re offline.

Thanks, devs. ❤️

What are MetaMask smart accounts?
MetaMask can grant your account certain smart functionality with EIP-7702. If you decide to switch your standard account to a “smart account” within the wallet, it will still technically remain an EOA. Your funds don’t move and your account(s) are still governed by your SRP/private keys. You STILL need to keep this safe, as always.

You’ll use your account as you normally have in the past; it’s just more superpowered now.

Switching to a smart account simply points your basic account (example: metamask.eth, governed by the SRP) to a specific MetaMask smart contract that will perform these functions for you, thereby granting you some “smart account” benefits without migrating your funds or changing your address.

Think of it like a diligent robot working in your favor that you can fire and rehire at any time. The robot is programmed to do your bidding. It cannot control your standard account funds, but it can spend certain amounts on your behalf if you allow it to. You still have the key (SRP) that fully controls the account.

You will be prompted to “switch to a smart account” within MetaMask directly when prompted by a dapp or network that is smart account prepared. (example: Uniswap batching an approve+swap transaction request).

info
We are using “smart account” generally here to refer to the capabilities your account will now have, previously only available to smart contract aficionados. This does not “turn” your account into a smart contract. We’re not at full smart account capabilities from scratch yet.

Once this is enabled, your account is primed to benefit from smart account functionality that rolls out in the ecosystem as long as the networks and dapps you interact with adopt these new methods. (Following certain standards, protocols, and interfaces to request permissions).

MetaMask Delegator smart contract
Upgrading or switching your account to a “smart account” points your existing EOA to a MetaMask Delegator smart contract (0x63c0c19a282a1b52b07dd5a65b58948a07dae32b) that can perform functionalities like batching transactions, paying for gas in any token, and more.

Deployed implementation: https://etherscan.io/address/0x63c0c19a282a1b52b07dd5a65b58948a07dae32b#code
Github: https://github.com/MetaMask/delegation-framework/blob/v1.3.0/src/EIP7702/EIP7702DeleGatorCore.sol