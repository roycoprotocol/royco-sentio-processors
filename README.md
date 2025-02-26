## Royco Vault Markets

### Pools

```sql
SELECT
    chainId as chain_id,
    toUnixTimestamp(blockTimestamp) AS timestamp,
    blockNumber AS creation_block_number,
    strategyVaultContractAddress AS strategy_vault_contract_address,
    underlyingPoolAddress AS liquidity_pool_address,
    receiptTokenAddress AS strategy_vault_receipt_token_address,
    receiptTokenDecimals AS strategy_vault_receipt_token_decimals,
    receiptTokenSymbol AS strategy_vault_receipt_token_symbol
FROM
    `PoolVault`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

### Position Snapshot

#### Daily

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    formatDateTime(toDateTime(blockTimestamp), '%Y-%m-%d') as block_date,
    chainId as chain_id,
    strategyVaultContractAddress AS strategy_vault_contract_address,
    userAddress AS user_address,
    liquidityPoolAddress AS liquidity_pool_address,
    underlyingTokenAddress AS underlying_token_address,
    underlyingTokenIndex AS underlying_token_index,
    underlyingTokenAmount AS underlying_token_amount,
    underlyingTokenAmountUsd AS underlying_token_amount_usd,
    totalFeesUsd AS total_fees_usd
FROM
    `DailyPositionSnapshotVault`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

#### Hourly

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    formatDateTime(toDateTime(blockTimestamp), '%Y-%m-%d %H:00:00') as block_date,
    chainId as chain_id,
    strategyVaultContractAddress AS strategy_vault_contract_address,
    userAddress AS user_address,
    liquidityPoolAddress AS liquidity_pool_address,
    underlyingTokenAddress AS underlying_token_address,
    underlyingTokenIndex AS underlying_token_index,
    underlyingTokenAmount AS underlying_token_amount,
    underlyingTokenAmountUsd AS underlying_token_amount_usd,
    totalFeesUsd AS total_fees_usd
FROM
    `HourlyPositionSnapshotVault`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

### Pool Snapshot

#### Daily

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    formatDateTime(toDateTime(blockTimestamp), '%Y-%m-%d') as block_date,
    chainId as chain_id,
    strategyVaultContractAddress AS strategy_vault_contract_address,
    liquidityPoolAddress AS liquidity_pool_address,
    underlyingTokenAddress AS underlying_token_address,
    underlyingTokenIndex AS underlying_token_index,
    underlyingTokenAmount AS underlying_token_amount,
    underlyingTokenAmountUsd AS underlying_token_amount_usd,
    totalFeesUsd AS total_fees_usd
FROM
    `DailyPoolSnapshotVault`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

#### Hourly

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    formatDateTime(toDateTime(blockTimestamp), '%Y-%m-%d %H:00:00') as block_date,
    chainId as chain_id,
    strategyVaultContractAddress AS strategy_vault_contract_address,
    liquidityPoolAddress AS liquidity_pool_address,
    underlyingTokenAddress AS underlying_token_address,
    underlyingTokenIndex AS underlying_token_index,
    underlyingTokenAmount AS underlying_token_amount,
    underlyingTokenAmountUsd AS underlying_token_amount_usd,
    totalFeesUsd AS total_fees_usd
FROM
    `HourlyPoolSnapshotVault`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

### ERC-20 LP Token Transfer Events

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    chainId AS chain_id,
    blockNumber AS block_number,
    logIndex AS log_index,
    transactionHash AS transaction_hash,
    fromAddress AS from_address,
    toAddress AS to_address,
    poolAddress AS pool_address,
    amount AS amount,
    eventType AS event_type
FROM
    `LPTokenEventVault`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

### Events

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    chainId AS chain_id,
    blockNumber AS block_number,
    logIndex AS log_index,
    transactionHash AS transaction_hash,
    userAddress AS user_address,
    poolAddress AS pool_address,
    underlyingTokenAddress AS underlying_token_address,
    amount AS amount,
    amountUsd AS amount_usd,
    eventType AS event_type
FROM
    `UserEventVault`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

### Incentive Claim Data

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    chainId AS chain_id,
    transactionHash AS transaction_hash,
    logIndex AS log_index,
    transactionSigner AS transaction_signer,
    userAddress AS user_address,
    claimedTokenAddress AS claimed_token_address,
    amount AS amount,
    amountUsd AS amount_usd,
    0 AS other_incentive_usd
FROM
    `IncentiveClaimVault`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

## Royco Recipe Markets

### Pools

The receipt token details are left as empty strings ("") or 0, depending on the column data type because recipe markets don't issue receipt tokens.

```sql
SELECT
    chainId as chain_id,
    toUnixTimestamp(blockTimestamp) AS timestamp,
    blockNumber AS creation_block_number,
    underlyingTokenAddress AS underlying_token_address,
    underlyingTokenIndex AS underlying_token_index,
    underlyingTokenSymbol AS underlying_token_symbol,
    underlyingTokenDecimals AS underlying_token_decimals	,
    receiptTokenAddress AS receipt_token_address,
    receiptTokenSymbol AS receipt_token_symbol,
    receiptTokenDecimals AS receipt_token_decimals,
    poolAddress AS pool_address,
    poolSymbol AS pool_symbol
FROM
    `PoolRecipe`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

### Position Snapshot

Not required because liquidity can't be tracked in the recipe markets -- as discussed on Telegram.

### Pool Snapshot

#### Daily

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    formatDateTime(toDateTime(blockTimestamp), '%Y-%m-%d') as block_date,
    chainId as chain_id,
    underlyingTokenAddress AS underlying_token_address,
    underlyingTokenIndex AS underlying_token_index,
    poolAddress AS pool_address,
    underlyingTokenAmount AS underlying_token_amount,
    underlyingTokenAmountUsd AS underlying_token_amount_usd,
    totalFeesUsd AS total_fees_usd
FROM
    `DailyPoolSnapshotRecipe`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

#### Hourly

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    formatDateTime(toDateTime(blockTimestamp), '%Y-%m-%d %H:00:00') as block_date,
    chainId as chain_id,
    underlyingTokenAddress AS underlying_token_address,
    underlyingTokenIndex AS underlying_token_index,
    poolAddress AS pool_address,
    underlyingTokenAmount AS underlying_token_amount,
    underlyingTokenAmountUsd AS underlying_token_amount_usd,
    totalFeesUsd AS total_fees_usd
FROM
    `HourlyPoolSnapshotRecipe`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

### Events

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    chainId AS chain_id,
    blockNumber AS block_number,
    logIndex AS log_index,
    transactionHash AS transaction_hash,
    userAddress AS user_address,
    takerAddress AS taker_address,
    poolAddress AS pool_address,
    underlyingTokenAddress AS underlying_token_address,
    amount AS amount,
    amountUsd AS amount_usd,
    eventType AS event_type
FROM
    `UserEventRecipe`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```

### Incentive Claim Data

```sql
SELECT
    toUnixTimestamp(blockTimestamp) AS timestamp,
    chainId AS chain_id,
    transactionHash AS transaction_hash,
    logIndex AS log_index,
    transactionSigner AS transaction_signer,
    userAddress AS user_address,
    claimedTokenAddress AS claimed_token_address,
    amount AS amount,
    amountUsd AS amount_usd,
    0 AS other_incentive_usd
FROM
    `IncentiveClaimRecipe`
WHERE
    toUnixTimestamp(blockTimestamp) > TIMESTAMP('{{timestamp}}')
```
