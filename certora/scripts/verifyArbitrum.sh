certoraRun certora/harness/ArbitrumHarness.sol \
    certora/harness/DummyERC20A.sol \
    certora/harness/DummyERC20B.sol \
    certora/harness/mockTarget.sol \
    --verify ArbitrumHarness:certora/specs/Optimism_ArbitrumBridge.spec \
    --link mockTarget:_executor=ArbitrumHarness \
            mockTarget:_tokenA=DummyERC20A \
            mockTarget:_tokenB=DummyERC20B \
            ArbitrumHarness:_mock=mockTarget \
    --solc solc8.10 \
    --optimistic_loop \
    --loop_iter 2 \
    --staging \
    --settings -contractRecursionLimit=1 \
    --send_only \
    --debug \
    --typecheck_only \
    --msg "Arbitrum all"  
# py ../EVMVerifier/scripts/certoraRun.py contracts/bridges/OptimismBridgeExecutor.sol \
#     

