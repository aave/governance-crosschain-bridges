certoraRun certora/harness/OptimismHarness.sol \
    certora/harness/DummyERC20A.sol \
    certora/harness/DummyERC20B.sol \
    --verify OptimismHarness:certora/specs/OptimismBridge.spec \
    --solc solc8.10 \
    --optimistic_loop \
    --loop_iter 3 \
    --cloud \
    --settings -contractRecursionLimit=1 \
    --rule actionNotCanceledAndExecuted \
    --send_only \
    --msg "actionNotCanceledAndExecuted"  
# py ../EVMVerifier/scripts/certoraRun.py contracts/bridges/OptimismBridgeExecutor.sol \
