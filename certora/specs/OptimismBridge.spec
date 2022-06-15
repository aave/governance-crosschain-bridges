import "erc20.spec"
using DummyERC20A as erc20_A
using DummyERC20B as erc20_B

////////////////////////////////////////////////////////////////////////////
//                      Methods                                           //
////////////////////////////////////////////////////////////////////////////

methods {
	getDelay() returns (uint256) envfree 
	getGracePeriod() returns (uint256) envfree
	getMinimumDelay() returns (uint256) envfree
	getMaximumDelay() returns (uint256) envfree
	getGuardian() returns(address) envfree
	getActionsSetCount() returns(uint256) envfree
	getCurrentState(uint256) returns (uint8)
	getEthereumGovernanceExecutor() returns (address) envfree
	getActionsSetExecutionTime(uint256) returns (uint256) envfree
	ID2actionHash(uint256, uint256) returns (bytes32) envfree
	getActionsSetLength(uint256) returns (uint256) envfree
	getActionSetWithDelegate(uint256, uint256) returns (bool) envfree
	getActionsSetTarget(uint256, uint256) returns (address) envfree
	getActionsSetCalldata(uint256, uint256) returns (bytes) envfree
	queue(address[], uint256[], string[], bytes[], bool[])
	tokenA() returns (address) envfree
	tokenB() returns (address) envfree
	getTransferArguments() returns (address, address, uint256, uint256) envfree
	noDelegateCalls(uint256) envfree
	queueSingle(address, uint256, string, bytes, bool)
	getActionsSetExecuted(uint256) returns (bool) envfree
	getActionsSetCanceled(uint256) returns (bool) envfree

	executeDelegateCall(address, bytes) => NONDET
}

 // enum ActionsSetState 
 //   Queued,
 //   Executed,
 //   Canceled,
 //   Expired

////////////////////////////////////////////////////////////////////////////
//                       Ghosts and definitions                           //
////////////////////////////////////////////////////////////////////////////

definition stateVariableGetter(method f)
	returns bool = ( 
		f.selector == getDelay().selector ||
		f.selector == getGracePeriod().selector ||
		f.selector == getMinimumDelay().selector ||
		f.selector == getMaximumDelay().selector ||
		f.selector == getGuardian().selector ||
		f.selector == getActionsSetCount().selector);

definition stateVariableUpdate(method f)
	returns bool = (
		f.selector == updateDelay(uint256).selector ||
		f.selector == updateGuardian(address).selector ||
		f.selector == updateGracePeriod(uint256).selector ||
		f.selector == updateMinimumDelay(uint256).selector ||
		f.selector == updateMaximumDelay(uint256).selector);
	
////////////////////////////////////////////////////////////////////////////
//                       Rules                                            //
////////////////////////////////////////////////////////////////////////////
// Verified (except delegatecall)
//https://prover.certora.com/output/41958/f1066dfbd0f0f9a36f6e/?anonymousKey=23a23ad6e83268704b05c6ae5770f3ef2320d0d2
invariant properDelay()
	getDelay() >= getMinimumDelay() && getDelay() <= getMaximumDelay()
	filtered{f -> f.selector != 
		queue(address[], uint256[], string[], bytes[], bool[]).selector}

// Pass (except delegatecall)
// https://prover.certora.com/output/41958/48645057e3741b1d5a59/?anonymousKey=ae00cf28cd6c6de91fcaaa49706db4d56cf67aeb
invariant actionNotCanceledAndExecuted(uint256 setID)
	! (getActionsSetCanceled(setID) && getActionsSetExecuted(setID))
	filtered{f -> f.selector != 
		queue(address[], uint256[], string[], bytes[], bool[]).selector}
	{
		preserved { require setID < getActionsSetCount(); }
	}
	
// Only the current contract (executor) can change its variables.
// Verified
// https://prover.certora.com/output/41958/42913aaf7b3cf27076cd/?anonymousKey=177039a798fc5fcf998020246e8e4e997355febf
rule whoChangedStateVariables(method f)
filtered{f -> !f.isView && f.selector !=
queue(address[], uint256[], string[], bytes[], bool[]).selector}
{
	env e;
	calldataarg args;
	// State variables before
	uint256 delay1 = getDelay();
	uint256 period1 = getGracePeriod();
	uint256 minDelay1 = getMinimumDelay();
	uint256 maxDelay1 = getMaximumDelay();
	address guardian1 = getGuardian();
	// Call function
	f(e, args);
	// State variables after
	uint256 delay2 = getDelay();
	uint256 period2 = getGracePeriod();
	uint256 minDelay2 = getMinimumDelay();
	uint256 maxDelay2 = getMaximumDelay();
	address guardian2 = getGuardian();

	bool stateChanged = !( delay1 == delay2 &&
		 period1 == period2 &&
		 minDelay1 == minDelay2 &&
		 maxDelay1 == maxDelay2 &&
		 guardian1 == guardian2);

	assert stateChanged => e.msg.sender == currentContract,
		"Someone else changed state variables";
}

// Verified:
// https://prover.certora.com/output/41958/72618a1086584b9273ee/?anonymousKey=e8133886ff86eeb1f2d395b3f97460ff37dbc3cc
rule queueDoesntModifyStateVariables()
{
	env e;
	calldataarg args;
	// State variables before
	uint256 delay1 = getDelay();
	uint256 period1 = getGracePeriod();
	uint256 minDelay1 = getMinimumDelay();
	uint256 maxDelay1 = getMaximumDelay();
	address guardian1 = getGuardian();

	// Call queue with one action in the set.
	queue2(e, args);

	// State variables after
	uint256 delay2 = getDelay();
	uint256 period2 = getGracePeriod();
	uint256 minDelay2 = getMinimumDelay();
	uint256 maxDelay2 = getMaximumDelay();
	address guardian2 = getGuardian();

	bool stateIntact =  delay1 == delay2 &&
		 period1 == period2 &&
		 minDelay1 == minDelay2 &&
		 maxDelay1 == maxDelay2 &&
		 guardian1 == guardian2;

	assert stateIntact,
		"_queue changed state variables unexpectedly";
}

// Queue cannot cancel a action set.
// Verified
// https://prover.certora.com/output/41958/2933e2a125ff9002990a/?anonymousKey=81e99826b2e4bf7c95569e6e533ab108124ec8f2
rule queueCannotCancel()
{
	env e;
	calldataarg args;
	uint256 actionsSetId;

	require getCurrentState(e, actionsSetId) != 2;
	require getActionsSetLength(actionsSetId) == 1;
		queue2(e, args);
	assert getCurrentState(e, actionsSetId) != 2;
}

// To check
// execute was using reentrancyMock
rule executeCannotCancel()
{
	env e;
	calldataarg args;
	uint256 setCall;
	uint256 setCanceled;

	require getCurrentState(e, setCall) == 0;
	require getCurrentState(e, setCanceled) == 0;
	require getActionsSetLength(setCall) != 0 ;
	
	execute(e, setCall);

	assert getCurrentState(e, setCanceled) != 2;
}

// After calling to queue, the new action set
// must be set as 'queued'.
rule queuedStateConsistency()
{
	env e;
	calldataarg args;
	queue(e, args);
	uint256 id = getActionsSetCount();
	assert getCurrentState(e, id) == 0;
}

// Queue must increase action set by 1.
rule queuedChangedCounter()
{
	env e;
	calldataarg args;
	uint256 count1 = getActionsSetCount();
	queue(e, args);
	uint256 count2 = getActionsSetCount();

	assert count1 < max_uint => count2 == count1+1;
}

// A set status can be changed from 'ququed' to 'canceled'
// via the "cancel" function only.
// Check whether filter is necessary.
rule onlyCancelCanCancel(method f, uint actionsSetId)
filtered{f -> !f.isView && f.selector != execute(uint256).selector &&
f.selector != executeDelegateCall(address, bytes).selector}
{
	env e;
	calldataarg args;

	require getCurrentState(e, actionsSetId) == 0;

		f(e, args);

	assert getCurrentState(e, actionsSetId) == 2
			=> f.selector == cancel(uint256).selector;
}

// Verified
//https://prover.certora.com/output/41958/2a7e091c202f33ea185b/?anonymousKey=e0e44d154da2b0810ed0e61c573f8c8327d2bf1f
rule cancelExclusive(uint actionsSetId1, uint actionsSetId2)
{
	env e;
	uint8 stateBefore = getCurrentState(e, actionsSetId2);
		cancel(e, actionsSetId1);
	uint8 stateAfter = getCurrentState(e, actionsSetId2);

	assert actionsSetId1 != actionsSetId2 => stateBefore == stateAfter;
}

// Checks which functions change the state of a set.
rule whoChangesActionsSetState(method f, uint actionsSetId)
filtered {f -> !f.isView}
{
	env e;
	calldataarg args;

	uint8 state1 = getCurrentState(e, actionsSetId);
		f(e, args);
	uint8 state2 = getCurrentState(e, actionsSetId);

	assert state1 == state2, "${f} changed the state of an actions set.";
}

// No immediate execution after queue.
// Verified
// https://vaas-stg.certora.com/output/41958/b8f0fa4bc2da40e0cfa9/?anonymousKey=b02bd1f814aebb3299d0998dc3b74b5e2330d91d
rule holdYourHorses()
{
	env e;
	calldataarg args;
	uint256 actionsSetId = getActionsSetCount();
	require getDelay() > getMinimumDelay();
	queue2(e, args);
	execute@withrevert(e, actionsSetId);
	assert lastReverted;
}

// An action set cannot transform from 'queued' to 'executed'
// by a function different than "execute(uint256)".
// Verified
// https://prover.certora.com/output/41958/2a588a30aaf6e5894cbb/?anonymousKey=43a8f4ecddfa051095094ce41fa9b0a8de7bd8ab
rule executedValidTransition1(method f, uint256 actionsSetId)
filtered{f -> !f.isView && f.selector != execute(uint256).selector
&& f.selector != queue(address[], uint256[], string[], bytes[], bool[]).selector}
{
	env e;
	calldataarg args;
	uint8 state1 = getCurrentState(e, actionsSetId);
		f(e, args);
	uint8 state2 = getCurrentState(e, actionsSetId);

	assert ! (state1 == 0 && state2 == 1);
}

// If any action set was executed, then this set (and only it) must change 
// from 'queued' to 'executed'.
// Verified
// https://prover.certora.com/output/41958/b29d013afb7f6005075e/?anonymousKey=3560b8a76acbf3dae39e00e3823f8e5e2107a983
rule executedValidTransition2(uint256 actionsSetId)
{
	env e;
	calldataarg args;
	uint actionsSetId2;
	uint8 state1 = getCurrentState(e, actionsSetId);
		execute(e, actionsSetId2);
	uint8 state2 = getCurrentState(e, actionsSetId);

	assert actionsSetId2 == actionsSetId <=> state1 == 0 && state2 == 1;
}

// Execute must fail if actions set state is expired.
// Verified
// https://prover.certora.com/output/41958/73c979931151426b3b0e/?anonymousKey=7f42876a51f132726e0bc3178e54f9458184303c
rule executeFailsIfExpired(uint256 actionsSetId)
{
	env e;
	uint8 stateBefore = getCurrentState(e, actionsSetId);
	execute@withrevert(e, actionsSetId);
	bool executeReverted = lastReverted;
	assert stateBefore == 3 => executeReverted;
}

// After updating a grace period, an action set execution reverts
// if and only if it's state is 'expired'.
// Verified (ignoring executeDelegate)
// https://prover.certora.com/output/41958/d0d548f73a83cc1312a5/?anonymousKey=c897f275b2245e2bb46293303d42aa478cf8ed79
// NURIT : advise
rule gracePeriodChangedAffectsExecution(uint256 actionsSetId)
{
	env e;
	uint period;
	// Assume queued action set.
	require getCurrentState(e, actionsSetId) == 0;
	
	storage initialStorage = lastStorage;
	// Allow execution (assume does not revert)
	execute(e, actionsSetId);
	// Now check whether changing the grace period could lead to revert.
	updateGracePeriod(e, period) at initialStorage;
	uint8 stateAfterUpdate = getCurrentState(e, actionsSetId);

	execute@withrevert(e, actionsSetId);
	assert lastReverted <=> stateAfterUpdate == 3;
}


// Cannot execute before delay passed
// Verified
// https://prover.certora.com/output/41958/4a7b67ca44272625ae84/?anonymousKey=71c44b89cc998da418eea2c7d762239abdbca58d
rule executeRevertsBeforeDelay()
{
	env e; env e2;
	calldataarg args;
	uint256 actionsSetId = getActionsSetCount();
	queue2(e, args);
	execute@withrevert(e2, actionsSetId);
	bool executeFailed = lastReverted;
	assert e2.block.timestamp < e.block.timestamp + getDelay() 
			=> executeFailed;
}

// Two similar actions in different sets in different blocks
// should be successfully queued independently, regardless of 
// the other one queued status.
// Verified
// https://prover.certora.com/output/41958/e1dfce37087f84cf8ee4/?anonymousKey=1befab7e5310158a5d73ab58d7d79fd4dd12c76d
rule sameExecutionTimesReverts()
{
	env e1; env e2;
	calldataarg args;
	uint256 delay;
	uint256 t1 = e1.block.timestamp;
	uint256 t2 = e2.block.timestamp;

	// Assume different blocks (block2 later than block1)
	require t1 < t2;

	// queue first set.
	queue2(e1, args);
	// Change the delay period.
	uint256 delay1 = getDelay();
		updateDelay(e1, delay);
	uint256 delay2 = getDelay();
	// Try to queue second set, with same arguments.
	queue2@withrevert(e2, args);

	assert t1 + delay1 == t2 + delay2 => lastReverted;
}

rule independentQueuedActions(method f)
filtered{f -> stateVariableUpdate(f)}
{
	env e1; env e2;
	calldataarg args;
	calldataarg argsUpdate;
	require e2.msg.value == 0;

	// Assume different blocks (block2 later than block1)
	require e1.block.timestamp < e2.block.timestamp;

	// queue first set.
	queue2(e1, args);
	// Update some state variable.
		f(e1, argsUpdate);
	// Try to queue second set, with same arguments.
	queue2@withrevert(e2, args);

	assert !lastReverted;
}

// Only queued actions can be executed.
// Fails
rule onlyQueuedAreExecuted(uint256 actionsSetId)
{
	env e;
	uint i;
	bytes32 actionHash = ID2actionHash(actionsSetId, i);
	
	bool queuedBefore = isActionQueued(e, actionHash);
		execute(e, actionsSetId);
	bool queuedAfter = isActionQueued(e, actionHash);
	
	assert i < getActionsSetLength(actionsSetId) <=> 
			!queuedAfter;
}

// Check if queue cannot be called twice with same arguments.
// Verified for a shortened version of actionHash:
// https://prover.certora.com/output/41958/1ac11966c892af00c371/?anonymousKey=2db6d6b9673ef511de38c33eef701c172ead8ce4
rule actionDuplicate()
{
	env e; calldataarg args;
	uint256 actionsSetId = getActionsSetCount();

	queue2(e, args);
	queue2@withrevert(e, args);
	assert lastReverted;
}

// Checks whether reentrancy to the contract is possible
// execute was called with 'reentrancyMock'
rule reentrancyCheck()
{
	env e;
	uint256 actionSetID;
	require getActionsSetLength(actionSetID) !=0;
	execute@withrevert(e, actionSetID);
	assert e.msg.sender != currentContract => lastReverted;
}

rule queue2Reachability()
{
	env e; calldataarg args;
	uint256 actionsSetId = getActionsSetCount();

	queue2(e, args);
	assert false;
}