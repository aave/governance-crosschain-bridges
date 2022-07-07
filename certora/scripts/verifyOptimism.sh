certoraRun certora/harness/OptimismHarness.sol \
    certora/harness/DummyERC20A.sol \
    certora/harness/DummyERC20B.sol \
    certora/harness/mockTarget.sol \
    --verify OptimismHarness:certora/specs/OptimismBridge.spec \
    --link mockTarget:_executor=OptimismHarness \
            mockTarget:_tokenA=DummyERC20A \
            mockTarget:_tokenB=DummyERC20B \
            OptimismHarness:_mock=mockTarget \
    --solc solc8.10 \
    --optimistic_loop \
    --loop_iter 2 \
    --staging \
    --rule_sanity basic \
    --rule queuePriviliged \
    --settings -contractRecursionLimit=1 \
    --send_only \
    --msg "Optimisim queuePriviliged"  
# py ../EVMVerifier/scripts/certoraRun.py contracts/bridges/OptimismBridgeExecutor.sol \
#     

