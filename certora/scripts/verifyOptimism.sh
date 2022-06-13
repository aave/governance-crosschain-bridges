certoraRun certora/harness/OptimismHarness.sol \
    certora/harness/DummyERC20A.sol \
    certora/harness/DummyERC20B.sol \
    --verify OptimismHarness:certora/specs/OptimismBridge.spec \
    --solc solc8.10 \
    --optimistic_loop \
    --loop_iter 3 \
    --staging \
    --settings -contractRecursionLimit=1 \
    --rule independentQueuedActions \
    --rule_sanity advanced \
    --send_only \
    --msg "independentQueuedActions"  
# py ../EVMVerifier/scripts/certoraRun.py contracts/bridges/OptimismBridgeExecutor.sol \
