export const L1_BRIDGE_MESSAGE_MANAGER = [
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
      "name": "InvalidInitialization",
      "inputs": []
    },
    {
      "type": "error",
      "name": "NotInitializing",
      "inputs": []
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "AdapterAdded",
      "inputs": [
        {
          "type": "address",
          "name": "adapter",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "AdapterRemoved",
      "inputs": [
        {
          "type": "address",
          "name": "adapter",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "DepositMessageSent",
      "inputs": [
        {
          "type": "uint256",
          "name": "vaultNonce",
          "indexed": true
        },
        {
          "type": "address",
          "name": "l1Vault",
          "indexed": true
        },
        {
          "type": "address",
          "name": "l2Vault",
          "indexed": true
        },
        {
          "type": "address",
          "name": "receiver",
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
      "name": "MessageReceived",
      "inputs": [
        {
          "type": "bytes",
          "name": "payload",
          "indexed": false
        },
        {
          "type": "address",
          "name": "adapter",
          "indexed": true
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "MessageReceivedAndProcessed",
      "inputs": [
        {
          "type": "bytes",
          "name": "payload",
          "indexed": false
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "MessageWithdrawalExecuted",
      "inputs": [
        {
          "type": "uint256",
          "name": "vaultNonce",
          "indexed": true
        },
        {
          "type": "address",
          "name": "l1Vault",
          "indexed": true
        },
        {
          "type": "address",
          "name": "receiver",
          "indexed": true
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
      "name": "PeerMessageManagerSet",
      "inputs": [
        {
          "type": "address",
          "name": "peer",
          "indexed": true
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
      "name": "VaultRemovedFromWhitelist",
      "inputs": [
        {
          "type": "address",
          "name": "vault",
          "indexed": true
        }
      ]
    },
    {
      "type": "event",
      "anonymous": false,
      "name": "VaultWhitelisted",
      "inputs": [
        {
          "type": "address",
          "name": "vault",
          "indexed": true
        }
      ]
    },
    {
      "type": "function",
      "name": "ADAPTER_MANAGER_ROLE",
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
      "name": "VAULT_MANAGER_ROLE",
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
      "name": "addAdapter",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "_adapter"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "deactivateVaultPair",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "l1Vault"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "getAdapters",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [],
      "outputs": [
        {
          "type": "address[]",
          "name": ""
        }
      ]
    },
    {
      "type": "function",
      "name": "getMessageInfo",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "bytes32",
          "name": "payloadHash"
        }
      ],
      "outputs": [
        {
          "type": "bool",
          "name": "status"
        },
        {
          "type": "address",
          "name": "vault"
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
      "name": "getVaultPair",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "vault"
        }
      ],
      "outputs": [
        {
          "type": "address",
          "name": "l1Vault"
        },
        {
          "type": "address",
          "name": "l2Vault"
        },
        {
          "type": "bool",
          "name": "isActive"
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
          "name": "_initialOwner"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "messageInfo",
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
          "name": "status"
        },
        {
          "type": "address",
          "name": "vault"
        },
        {
          "type": "uint256",
          "name": "confirmations"
        }
      ]
    },
    {
      "type": "function",
      "name": "pairVaults",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "l1Vault"
        },
        {
          "type": "address",
          "name": "l2Vault"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "peerMessageManager",
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
      "name": "quoteDepositFee",
      "constant": true,
      "stateMutability": "view",
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "l1Vault"
        },
        {
          "type": "address",
          "name": "receiver"
        },
        {
          "type": "uint256",
          "name": "shares"
        }
      ],
      "outputs": [
        {
          "type": "uint256",
          "name": "totalFee"
        }
      ]
    },
    {
      "type": "function",
      "name": "receiveMessage",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "bytes",
          "name": "payload"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "removeAdapter",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "_adapter"
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
      "name": "requiredConfirmations",
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
      "name": "sendDepositMessage",
      "constant": false,
      "stateMutability": "payable",
      "payable": true,
      "inputs": [
        {
          "type": "address",
          "name": "l1Vault"
        },
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
          "name": "vaultNonce"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "setPeerMessageManager",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "address",
          "name": "peer"
        }
      ],
      "outputs": []
    },
    {
      "type": "function",
      "name": "setRequiredConfirmations",
      "constant": false,
      "payable": false,
      "inputs": [
        {
          "type": "uint256",
          "name": "_required"
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
      "name": "vaultPairs",
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
          "type": "address",
          "name": "l1Vault"
        },
        {
          "type": "address",
          "name": "l2Vault"
        },
        {
          "type": "bool",
          "name": "isActive"
        }
      ]
    }
  ]