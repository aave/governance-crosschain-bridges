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
