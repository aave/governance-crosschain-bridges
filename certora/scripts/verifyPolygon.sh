certoraRun certora/harness/PolygonHarness.sol \
    certora/harness/DummyERC20A.sol \
    certora/harness/DummyERC20B.sol \
    certora/harness/mockTargetPoly.sol \
    --verify PolygonHarness:certora/specs/PolygonBridge.spec \
    --link mockTargetPoly:_executor=PolygonHarness \
        mockTargetPoly:_tokenA=DummyERC20A \
        mockTargetPoly:_tokenB=DummyERC20B \
        PolygonHarness:_mock=mockTargetPoly \
    --solc solc8.10 \
    --optimistic_loop \
    --loop_iter 2 \
    --cloud \
    --settings -contractRecursionLimit=1 \
    --rule_sanity advanced \
    --rule processMessageFromRootReachability \
    --send_only \
    --msg "processMessageFromRootReachability"  
# py ../EVMVerifier/scripts/certoraRun.py contracts/bridges/OptimismBridgeExecutor.sol \
