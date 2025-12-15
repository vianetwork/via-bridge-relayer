# Via Bridge Relayer

A TypeScript-based blockchain bridge relayer that monitors and processes bridge events between Ethereum and Via networks. The relayer loads bridge initiation events from a subgraph, processes them, and maintains a comprehensive database of all bridge operations.

## Features

- **Subgraph Integration**: Loads bridge initiation events (`MessageSent`) from L1 and L2 subgraphs
- **Automatic Transaction Processing**: Processes bridge transactions automatically with configurable workers
- **Database Integration**: Stores all transactions in PostgreSQL with TypeORM
- **Reliable RPC Connections**: Uses ethers.js with failover provider support for stable blockchain connectivity
- **Comprehensive Logging**: Detailed logging with Winston for monitoring and debugging
- **Event-driven Architecture**: React to bridge events with proper status tracking

## Supported Events

### Ethereum Bridge (L1)
- `MessageSent`: Bridge initiation event (loaded from L1 subgraph)
- `MessageWithdrawalExecuted`: Bridge finalization event (loaded from L1 subgraph)

### Via Bridge (L2)
- `MessageSent`: Bridge initiation event (loaded from L2 subgraph)
- `DepositExecuted`: Bridge finalization event (loaded from L2 subgraph)

## Prerequisites

- Node.js 18+ 
- PostgreSQL database with subgraph data
- Access to Ethereum and Via RPC endpoints
- Bridge contract addresses
- Relayer private key for transaction signing

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd via-relayer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Create the database:
```bash
npm run create-db
```

5. Run database migrations:
```bash
npm run migration:run
```

## Configuration

Copy `.env.example` to `.env` and configure the following variables:

### Network Configuration
- `ETH_URL`: Ethereum RPC URL (e.g., `http://localhost:8545` or `https://mainnet.infura.io/v3/YOUR-PROJECT-ID`)
- `VIA_URL`: Via RPC URL (e.g., `http://localhost:8546`)
- `ETH_FALLBACK_URLS`: Comma-separated fallback Ethereum RPC URLs
- `VIA_FALLBACK_URLS`: Comma-separated fallback Via RPC URLs

### Contract Addresses
- `ETHEREUM_BRIDGE_ADDRESS`: Address of the Ethereum bridge contract
- `VIA_BRIDGE_ADDRESS`: Address of the Via bridge contract

### Relayer Configuration
- `RELAYER_PRIVATE_KEY`: Private key of the relayer wallet for signing transactions
- `WORKER_POLLING_INTERVAL`: Polling interval for worker threads (in milliseconds)
- `ETH_WAIT_BLOCK_CONFIRMATIONS`: Block confirmations for Ethereum events
- `VIA_WAIT_BLOCK_CONFIRMATIONS`: Block confirmations for Via events
- `TRANSACTION_BATCH_SIZE`: Number of events to process per batch

### Database Configuration
- `DATABASE_URL`: Complete PostgreSQL connection string (alternative to individual settings)
- `DATABASE_HOST`: Database host (default: localhost)
- `DATABASE_PORT`: Database port (default: 5432)
- `DATABASE_USER`: Database username (default: postgres)
- `DATABASE_PASSWORD`: Database password (default: postgres)
- `DATABASE_NAME`: Database name

### Subgraph Configuration
- `L1_GRAPH_SCHEMA`: PostgreSQL schema for L1 subgraph data (e.g., `sgd3`)
- `L2_GRAPH_SCHEMA`: PostgreSQL schema for L2 subgraph data (e.g., `sgd2`)

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Database Operations
```bash
# Create database
npm run create-db

# Generate migration
npm run migration:generate

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Monitoring
```bash
# Watch for TypeScript changes
npm run watch

# Development with auto-restart
npm run dev:watch
```

## How It Works

### Bridge Transaction Flow

The Via Bridge Relayer facilitates cross-chain token transfers between Ethereum and Via networks through a systematic monitoring and processing flow:

#### 1. **Event Loading from Subgraph**
```
Subgraph indexes MessageSent events from bridge contracts
    ↓
Relayer queries subgraph database for new events
    ↓
Events are filtered by block number (with confirmations)
    ↓
Events are processed in order
```

#### 2. **Transaction Processing**
```
BridgeInitiatedHandler picks up MessageSent events
    ↓
Checks if transaction already exists in database
    ↓
Calls receiveMessage() on destination bridge contract
    ↓
Creates transaction record with PENDING status
```

#### 3. **Finalization Monitoring**
```
BridgeFinalizeHandler queries for executed events
    ↓
Matches executed events to pending transactions
    ↓
Updates transaction status to FINALIZED
```

### Transaction Status Flow

```
NEW → PENDING → FINALIZED
         ↓
       FAILED
```

- **NEW**: Event detected but not yet processed
- **PENDING**: Transaction sent to destination chain, awaiting confirmation
- **FINALIZED**: Transaction confirmed on destination chain
- **FAILED**: Transaction failed during processing

### Detailed Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐
│   L1 Subgraph   │    │   L2 Subgraph   │
│  (Ethereum)     │    │     (Via)       │
└─────────────────┘    └─────────────────┘
         │                       │
         │ MessageSent           │ MessageSent
         │ events                │ events
         ▼                       ▼
┌─────────────────────────────────────────┐
│        BridgeInitiatedHandler           │
│  ┌─────────────────────────────────────┐│
│  │  - Query events from subgraph       ││
│  │  - Check for duplicates             ││
│  │  - Send to destination chain        ││
│  │  - Record in transactions table     ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           Database Layer                │
│  ┌─────────────────────────────────────┐│
│  │      Transactions Table             ││
│  │  - bridgeInitiatedTransactionHash  ││
│  │  - finalizedTransactionHash        ││
│  │  - status, origin, payload         ││
│  │  - originBlockNumber, blockNumber  ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        BridgeFinalizeHandler            │
│  ┌─────────────────────────────────────┐│
│  │  - Query executed events            ││
│  │  - Match to pending transactions    ││
│  │  - Update status to FINALIZED       ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Key Features

- **Subgraph-based Event Detection**: Events are loaded from indexed subgraph data for reliability
- **Duplicate Prevention**: Transactions are checked by hash before processing
- **Block Confirmation**: Events are only processed after sufficient block confirmations
- **Status Tracking**: Complete visibility into transaction processing status
- **Cross-Chain Coordination**: Ensures both chains are synchronized during bridge operations

## Architecture

### Core Components

1. **Transaction Service** (`transaction/`): Manages worker threads for processing bridge transactions
2. **Transaction Processor** (`transaction.processor.ts`): Orchestrates handler creation and batch processing
3. **Handlers** (`transaction/handlers/`):
   - `BridgeInitiatedHandler`: Processes new bridge initiation events
   - `BridgeSendFinalizeHandler`: Handles sending finalization transactions
   - `BridgeFinalizeHandler`: Monitors and updates finalized transactions
4. **Database Layer** (`database/`): TypeORM-based data persistence
5. **Repositories**:
   - `TransactionRepository`: Main transaction records
   - `L1MessageSentRepository`: L1 subgraph MessageSent events
   - `L2MessageSentRepository`: L2 subgraph MessageSent events
   - `DepositExecutedRepository`: L2 DepositExecuted events
   - `MessageWithdrawalExecutedRepository`: L1 MessageWithdrawalExecuted events

### Database Schema

The relayer maintains the following key table:

**transactions**
- `id`: Primary key
- `origin`: Bridge origin (Ethereum=0, Via=1)
- `status`: Transaction status (New, Pending, Finalized, Failed)
- `bridgeInitiatedTransactionHash`: Original transaction hash
- `finalizedTransactionHash`: Relayer's finalization transaction hash
- `blockNumber`: Finalization block number
- `originBlockNumber`: Original event block number
- `payload`: Message payload
- `eventType`: Type of bridge event
- `subgraphId`: ID from subgraph

### Worker Architecture

The relayer uses a worker-based architecture for processing transactions:
- **Transaction Workers**: Process bridge transactions for each status type
- **Parallel Processing**: Separate workers for Ethereum and Via origins
- **Configurable Polling**: Adjustable polling interval for worker threads

## API Reference

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ETH_URL` | Ethereum RPC URL | `http://host.docker.internal:8545` | Yes |
| `VIA_URL` | Via RPC URL | `http://host.docker.internal:8546` | Yes |
| `ETHEREUM_BRIDGE_ADDRESS` | Ethereum bridge contract address | - | Yes |
| `VIA_BRIDGE_ADDRESS` | Via bridge contract address | - | Yes |
| `RELAYER_PRIVATE_KEY` | Relayer wallet private key | - | Yes |
| `WORKER_POLLING_INTERVAL` | Worker polling interval (ms) | `5000` | No |
| `ETH_WAIT_BLOCK_CONFIRMATIONS` | Ethereum block confirmations | `6` | No |
| `VIA_WAIT_BLOCK_CONFIRMATIONS` | Via block confirmations | `6` | No |
| `TRANSACTION_BATCH_SIZE` | Events per batch | `25` | No |
| `L1_GRAPH_SCHEMA` | L1 subgraph schema | `sgd3` | No |
| `L2_GRAPH_SCHEMA` | L2 subgraph schema | `sgd2` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | No |
| `DATABASE_HOST` | Database host | `localhost` | No |
| `DATABASE_PORT` | Database port | `5432` | No |
| `DATABASE_USER` | Database username | `postgres` | No |
| `DATABASE_PASSWORD` | Database password | `postgres` | No |
| `DATABASE_NAME` | Database name | `via_relayer` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `ENABLE_FILE_LOGGING` | Enable file logging | `true` | No |

## Development

### Project Structure
```
src/
├── common/           # Common utilities and workers
├── contracts/        # Contract ABIs and interfaces
├── database/         # Database configuration and repositories
├── entities/         # TypeORM entities
├── migrations/       # Database migrations
├── transaction/      # Transaction processing logic
│   └── handlers/     # Event handlers
├── transformers/     # Data transformers
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

### Running Tests
```bash
npm test
```

### Logging

The relayer uses Winston for logging with the following levels:
- `error`: Error messages
- `warn`: Warning messages
- `info`: Information messages
- `debug`: Debug messages

Logs are output to console by default, with optional file logging in production.

### Production Considerations
- Set `NODE_ENV=production`
- Configure database connection pooling
- Set up log rotation for file logging
- Monitor RPC provider connection health
- Set up alerts for bridge event processing failures
- Configure appropriate worker polling intervals for your network conditions

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**
   - Check network connectivity to blockchain endpoints
   - Verify RPC URLs are correct and accessible
   - Check firewall settings
   - Monitor rate limits on RPC providers

2. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure database and subgraph schemas exist

3. **Missing Events**
   - Check subgraph indexing status
   - Verify subgraph schema names in configuration
   - Check block confirmation settings

4. **Transaction Failures**
   - Verify relayer wallet has sufficient gas tokens
   - Check relayer private key is valid
   - Monitor for contract-level restrictions

### Monitoring

The relayer provides comprehensive logging for monitoring:
- RPC provider connection status
- Event processing statistics
- Database operation status
- Transaction processing metrics
- Worker thread activity and health

## Docker

Run with Docker Compose:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Via Relayer application

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For support and questions, please check the documentation or create an issue in the repository.
