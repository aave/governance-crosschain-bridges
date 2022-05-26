certoraRun contracts/bridges/OptimismBridgeExecutor.sol:OptimismBridgeExecutor \
    --verify OptimismBridgeExecutor:certora/specs/complexity.spec \
    --solc solc8.10 \
    --optimistic_loop \
    --staging  \
    --msg "OptimismBridgeExecutor complexity check"

certoraRun contracts/bridges/ArbitrumBridgeExecutor.sol:ArbitrumBridgeExecutor \
    --verify ArbitrumBridgeExecutor:certora/specs/complexity.spec \
    --solc solc8.10 \
    --optimistic_loop \
    --staging  \
    --msg "ArbitrumBridgeExecutor complexity check"

certoraRun contracts/bridges/BridgeExecutorBase.sol:BridgeExecutorBase \
    --verify BridgeExecutorBase:certora/specs/complexity.spec \
    --solc solc8.10 \
    --optimistic_loop \
    --staging  \
    --msg "BridgeExecutorBase complexity check"

certoraRun contracts/bridges/L2BridgeExecutor.sol:L2BridgeExecutor \
    --verify L2BridgeExecutor:certora/specs/complexity.spec \
    --solc solc8.10 \
    --optimistic_loop \
    --staging  \
    --msg "L2BridgeExecutor complexity check"
