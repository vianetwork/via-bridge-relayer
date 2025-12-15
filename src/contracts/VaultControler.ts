export const VAULT_CONTROLLER_ABI = [
    {
      "type": "constructor",
      "stateMutability": "undefined",
      "payable": false,
      "inputs": []
    },
    {
      "type": "error",
      "name": "AccessControlBadConfirmation",
      "inputs": []
    },
    {
      "type": "error",
      "name": "AccessControlUnauthorizedAccount",
      "inputs": [
        {
          "type": "address",
          "name": "account"
        },
        {
          "type": "bytes32",
          "name": "neededRole"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC20InsufficientAllowance",
      "inputs": [
        {
          "type": "address",
          "name": "spender"
        },
        {
          "type": "uint256",
          "name": "allowance"
        },
        {
          "type": "uint256",
          "name": "needed"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC20InsufficientBalance",
      "inputs": [
        {
          "type": "address",
          "name": "sender"
        },
        {
          "type": "uint256",
          "name": "balance"
        },
        {
          "type": "uint256",
          "name": "needed"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC20InvalidApprover",
      "inputs": [
        {
          "type": "address",
          "name": "approver"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC20InvalidReceiver",
      "inputs": [
        {
          "type": "address",
          "name": "receiver"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC20InvalidSender",
      "inputs": [
        {
          "type": "address",
          "name": "sender"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC20InvalidSpender",
      "inputs": [
        {
          "type": "address",
          "name": "spender"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC4626ExceededMaxDeposit",
      "inputs": [
        {
          "type": "address",
          "name": "receiver"
        },
        {
          "type": "uint256",
          "name": "assets"
        },
        {
          "type": "uint256",
          "name": "max"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC4626ExceededMaxMint",
      "inputs": [
        {
          "type": "address",
          "name": "receiver"
        },
        {
          "type": "uint256",
          "name": "shares"
        },
        {
          "type": "uint256",
          "name": "max"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC4626ExceededMaxRedeem",
      "inputs": [
        {
          "type": "address",
          "name": "owner"
        },
        {
          "type": "uint256",
          "name": "shares"
        },
        {
          "type": "uint256",
          "name": "max"
        }
      ]
    },
    {
      "type": "error",
      "name": "ERC4626ExceededMaxWithdraw",
      "inputs": [
        {
          "type": "address",
          "name": "owner"
        },
        {
          "type": "uint256",
          "name": "assets"
        },
        {
          "type": "uint256",
          "name": "max"
        }
      ]
    },
    {
      "type": "error",
      "name": "InvalidInitialization",
      "inputs": []
    },
    {
      "type": "error",
      "name": "NotInitializing",
      "inputs": []
    },
    {
      "type": "error",
      "name": "ReentrancyGuardReentrantCall",
      "inputs": []
    },
    {
      "type": "error",
      "name": "SafeERC20FailedOperation",
      "inputs": [
        {
          "type": "address",
          "name": "token"
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "Approval",
      "inputs": [
        {
          "type": "address",
          "name": "owner",
          "indexed": true
        },
        {
          "type": "address",
          "name": "spender",
          "indexed": true
        },
        {
          "type": "uint256",
          "name": "value",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "Deposit",
      "inputs": [
        {
          "type": "address",
          "name": "sender",
          "indexed": true
        },
        {
          "type": "address",
          "name": "owner",
          "indexed": true
        },
        {
          "type": "uint256",
          "name": "assets",
          "indexed": false
        },
        {
          "type": "uint256",
          "name": "shares",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "Deposited",
      "inputs": [
        {
          "type": "uint256",
          "name": "nonce",
          "indexed": true
        },
        {
          "type": "address",
          "name": "sender",
          "indexed": true
        },
        {
          "type": "address",
          "name": "receiver",
          "indexed": true
        },
        {
          "type": "uint256",
          "name": "assets",
          "indexed": false
        },
        {
          "type": "uint256",
          "name": "shares",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "DepositedToStrategy",
      "inputs": [
        {
          "type": "address",
          "name": "strategy",
          "indexed": true
        },
        {
          "type": "uint256",
          "name": "amount",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "Initialized",
      "inputs": [
        {
          "type": "uint64",
          "name": "version",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "L1BridgeMessageManagerUpdated",
      "inputs": [
        {
          "type": "address",
          "name": "newManager",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "L2VaultUpdated",
      "inputs": [
        {
          "type": "address",
          "name": "newL2Vault",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "Rebalanced",
      "inputs": [
        {
          "type": "uint256",
          "name": "bufferAmount",
          "indexed": false
        },
        {
          "type": "uint256",
          "name": "strategiesAmount",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "RoleAdminChanged",
      "inputs": [
        {
          "type": "bytes32",
          "name": "role",
          "indexed": true
        },
        {
          "type": "bytes32",
          "name": "previousAdminRole",
          "indexed": true
        },
        {
          "type": "bytes32",
          "name": "newAdminRole",
          "indexed": true
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "RoleGranted",
      "inputs": [
        {
          "type": "bytes32",
          "name": "role",
          "indexed": true
        },
        {
          "type": "address",
          "name": "account",
          "indexed": true
        },
        {
          "type": "address",
          "name": "sender",
          "indexed": true
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "RoleRevoked",
      "inputs": [
        {
          "type": "bytes32",
          "name": "role",
          "indexed": true
        },
        {
          "type": "address",
          "name": "account",
          "indexed": true
        },
        {
          "type": "address",
          "name": "sender",
          "indexed": true
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "StrategyAdded",
      "inputs": [
        {
          "type": "address",
          "name": "strategy",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "StrategyRemoved",
      "inputs": [
        {
          "type": "address",
          "name": "strategy",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "Transfer",
      "inputs": [
        {
          "type": "address",
          "name": "from",
          "indexed": true
        },
        {
          "type": "address",
          "name": "to",
          "indexed": true
        },
        {
          "type": "uint256",
          "name": "value",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "Withdraw",
      "inputs": [
        {
          "type": "address",
          "name": "sender",
          "indexed": true
        },
        {
          "type": "address",
          "name": "receiver",
          "indexed": true
        },
        {
          "type": "address",
          "name": "owner",
          "indexed": true
        },
        {
          "type": "uint256",
          "name": "assets",
          "indexed": false
        },
        {
          "type": "uint256",
          "name": "shares",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "WithdrawalClaimed",
      "inputs": [
        {
          "type": "address",
          "name": "receiver",
          "indexed": true
        },
        {
          "type": "uint256",
          "name": "shares",
          "indexed": false
        },
        {
          "type": "uint256",
          "name": "assets",
          "indexed": false
        },
        {
          "type": "uint256",
          "name": "exchangeRate",
          "indexed": false
        },
        {
          "type": "bytes32",
          "name": "messageHash",
          "indexed": true
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "WithdrawalFromStrategyForWithdrawals",
      "inputs": [
        {
          "type": "address",
          "name": "strategy",
          "indexed": false
        },
        {
          "type": "uint256",
          "name": "amount",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "WithdrawalStateUpdated",
      "inputs": [
        {
          "type": "uint256",
          "name": "l1Batch",
          "indexed": true
        },
        {
          "type": "uint256",
          "name": "exchangeRate",
          "indexed": false
        },
        {
          "type": "uint256",
          "name": "messageCount",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "WithdrawnFromBuffer",
      "inputs": [
        {
          "type": "uint256",
          "name": "amount",
          "indexed": false
        },
        {
          "type": "address",
          "name": "receiver",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "YieldTargetPercentageUpdated",
      "inputs": [
        {
          "type": "uint256",
          "name": "newPercentage",
          "indexed": false
        }
      ]
    },
    {
      "type": "function",
      "name": "DEFAULT_ADMIN_ROLE",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "bytes32",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "RELAYER_ROLE",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "bytes32",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "addStrategy",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "strategy"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "allowance",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "owner"
        },
        {
          "type": "address",
          "name": "spender"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "approve",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "spender"
        },
        {
          "type": "uint256",
          "name": "value"
        }
      ],
      "outputs": [
        {
          "type": "bool",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "asset",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "address",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "balanceOf",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "account"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "batchExchangeRate",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "bufferBalance",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "claimWithdrawal",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "nonce"
        },
        {
          "type": "uint256",
          "name": "shares"
        },
        {
          "type": "address",
          "name": "l1Receiver"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "convertToAssets",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "shares"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "convertToShares",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "assets"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "decimals",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "uint8",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "deposit",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": ""
        },
        {
          "type": "address",
          "name": ""
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "depositNonce",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "depositWithBridge",
      "constant": false,
      "stateMutability": "payable",
      "payable": true,
      "inputs": [
        {
          "type": "uint256",
          "name": "assets"
        },
        {
          "type": "address",
          "name": "receiver"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": "shares"
        }
      ]
    },
    {
      "type": "function",
      "name": "getRoleAdmin",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "bytes32",
          "name": "role"
        }
      ],
      "outputs": [
        {
          "type": "bytes32",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "grantRole",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "bytes32",
          "name": "role"
        },
        {
          "type": "address",
          "name": "account"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "hasRole",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "bytes32",
          "name": "role"
        },
        {
          "type": "address",
          "name": "account"
        }
      ],
      "outputs": [
        {
          "type": "bool",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "initialize",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "_asset"
        },
        {
          "type": "string",
          "name": "_name"
        },
        {
          "type": "string",
          "name": "_symbol"
        },
        {
          "type": "address",
          "name": "_initialOwner"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "l1BridgeMessageManager",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "address",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "maxDeposit",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": ""
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "maxMint",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": ""
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "maxRedeem",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "owner"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "maxWithdraw",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "owner"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "mint",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "shares"
        },
        {
          "type": "address",
          "name": "receiver"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "name",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "string",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "previewDeposit",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "assets"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "previewMint",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "shares"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "previewRedeem",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "shares"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "previewWithdraw",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "assets"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "redeem",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "shares"
        },
        {
          "type": "address",
          "name": "receiver"
        },
        {
          "type": "address",
          "name": "owner"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "removeStrategy",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "strategy"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "renounceRole",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "bytes32",
          "name": "role"
        },
        {
          "type": "address",
          "name": "callerConfirmation"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "revokeRole",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "bytes32",
          "name": "role"
        },
        {
          "type": "address",
          "name": "account"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "setL1BridgeMessageManager",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "_l1BridgeMessageManager"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "setYieldTargetPercentage",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "percentage"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "supportsInterface",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "bytes4",
          "name": "interfaceId"
        }
      ],
      "outputs": [
        {
          "type": "bool",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "symbol",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "string",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "totalAssets",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "totalSupply",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "transfer",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "to"
        },
        {
          "type": "uint256",
          "name": "value"
        }
      ],
      "outputs": [
        {
          "type": "bool",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "transferFrom",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "from"
        },
        {
          "type": "address",
          "name": "to"
        },
        {
          "type": "uint256",
          "name": "value"
        }
      ],
      "outputs": [
        {
          "type": "bool",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "updateWithdrawalState",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "bytes32[]",
          "name": "hashes"
        },
        {
          "type": "uint256",
          "name": "l1BatchNumber"
        },
        {
          "type": "uint256",
          "name": "totalShares"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "withdraw",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "assets"
        },
        {
          "type": "address",
          "name": "receiver"
        },
        {
          "type": "address",
          "name": "owner"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "withdrawAssetsFromStrategy",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "strategy"
        },
        {
          "type": "uint256",
          "name": "amount"
        },
        {
          "type": "bool",
          "name": "isForWithdrawal"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "withdrawBalance",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "withdrawalInfo",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "bytes32",
          "name": ""
        }
      ],
      "outputs": [
        {
          "type": "bool",
          "name": "isClaimed"
        },
        {
          "type": "uint256",
          "name": "batchNumber"
        }
      ]
    },
    {
      "type": "function",
      "name": "yieldTargetPercentage",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "uint256",
          "name": ""
        }
      ]
    },
    {
      "type": "receive",
      "stateMutability": "payable"
    }
  ];