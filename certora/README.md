## Verification Overview
The current directory contains Certora's formal verification of AAVE's L2 bridge protocol.
In this directory you will find three subdirectories:

1. specs - Contains all the specification files that were written by Certora for the bridge protocol. We have created two spec files, `Optimism_ArbitrumBridge.spec`, `PolygonBridge.spec`, the first is used to verify Optimism and Arbitrum executors and the second for Polygon. The choice for this separation relies on the contracts inhertiance of these three bridges protocols.
We emphasize that essentially the rules in both specs are the same (by context, name and logical idea), but the implementation might be a bit different due to implementation differences (for example the name given to the 'external queue' function.) 

2. scripts - Contains all the necessary run scripts to execute the spec files on the Certora Prover. These scripts composed of a run command of Certora Prover, contracts to take into account in the verification context, declaration of the compiler and a set of additional settings. Each script is named after the bridge type it verifies. Note that the Optimism and Arbitrum bridges are verified by the same spec file, but have separate scripts.

3. harness - Contains all the inheriting contracts that add/simplify functionalities to the original contract. You will also find a set of symbolic and dummy implementations of external contracts on which the executors rely.
These harnesses, i.e. extensions/simplifications, are necessary to run the verifications. Assumptions and under-approximations are also done in a few places, in order to supply partial coverage where full coverage is not achievable.
One harness worth explaining is the mockTarget and mockTargetPoly contracts that were created in order to simualte the low-level calls of the executed transactions. 

</br>

---

## Running Instructions
To run a verification job:

1. Open terminal and `cd` your way to the main AAVE L2 repository.

2. Run the script you'd like to get results for:
    ```
    sh certora/scripts/verifyOptimism.sh
    ```

</br>
