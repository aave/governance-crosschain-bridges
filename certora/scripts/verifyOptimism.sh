certoraRun contracts/bridges/OptimismBridgeExecutor.sol \
    certora/harness/DummyERC20A.sol \
    certora/harness/DummyERC20B.sol \
    --verify OptimismBridgeExecutor:certora/specs/OptimismBridge.spec \
    --solc solc8.10 \
    --optimistic_loop \
    --loop_iter 2 \
    --staging \
    --rule checkQueuedBatch \
    --send_only \
    --msg "checkQueuedBatch"  
# py ../EVMVerifier/scripts/certoraRun.py contracts/bridges/OptimismBridgeExecutor.sol \
