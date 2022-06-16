certoraRun certora/harness/OptimismHarness.sol \
    certora/harness/DummyERC20A.sol \
    certora/harness/DummyERC20B.sol \
    --verify OptimismHarness:certora/specs/OptimismBridge.spec \
    --solc solc8.10 \
    --optimistic_loop \
    --loop_iter 2 \
    --cloud \
    --settings -contractRecursionLimit=1 \
    --rule executedForever \
    --rule_sanity advanced \
    --send_only \
    --msg "executedForever execute"  
# py ../EVMVerifier/scripts/certoraRun.py contracts/bridges/OptimismBridgeExecutor.sol \
