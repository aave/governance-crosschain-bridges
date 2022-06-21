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
	updateFxChild(address) envfree
	updateFxRootSender(address) envfree
	getFxRootSender() envfree
	getFxChild() envfree
	getActionsSetCount() returns(uint256) envfree
	getCurrentState(uint256) returns (uint8)
	getActionsSetExecutionTime(uint256) returns (uint256) envfree
	ID2actionHash(uint256, uint256) returns (bytes32) envfree
	getActionsSetLength(uint256) returns (uint256) envfree
	getActionSetWithDelegate(uint256, uint256) returns (bool) envfree
	getActionsSetTarget(uint256, uint256) returns (address) envfree
	getActionsSetCalldata(uint256, uint256) returns (bytes) envfree
	noDelegateCalls(uint256) envfree
	getActionsSetExecuted(uint256) returns (bool) envfree
	getActionsSetCanceled(uint256) returns (bool) envfree
	processMessageFromRoot(uint256, address, bytes)

	executeDelegateCall(address, bytes) => NONDET
	delegatecall(bytes) => NONDET
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
		f.selector == updateMaximumDelay(uint256).selector ||
		f.selector == updateFxChild(address).selector ||
		f.selector == updateFxRootSender(address).selector);
	
////////////////////////////////////////////////////////////////////////////
//                       Rules                                            //
////////////////////////////////////////////////////////////////////////////
// Verified (except delegatecall)
// https://prover.certora.com/output/41958/9f83cdb60dd8ee97166b/?anonymousKey=954a34aaa44992fcb7550314ee2e142534aa6fa8
invariant properDelay()
	getDelay() >= getMinimumDelay() && getDelay() <= getMaximumDelay()

// Verified (except delegatecall)
// https://prover.certora.com/output/41958/905d3245bd302fbc339a/?anonymousKey=57538c2acd74733d09a823a655f2399235a35198
invariant actionNotCanceledAndExecuted(uint256 setID)
	! (getActionsSetCanceled(setID) && getActionsSetExecuted(setID))
	{
		preserved { require setID < getActionsSetCount(); }
	}
	
// Only the current contract (executor) can change its variables.
// Verified (exepct delegate call)
// https://prover.certora.com/output/41958/42913aaf7b3cf27076cd/?anonymousKey=177039a798fc5fcf998020246e8e4e997355febf
rule whoChangedStateVariables(method f)
filtered{f -> !f.isView}
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
	processMessageFromRoot(e, args);

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

// Queue cannot cancel an action set.
// Verified
// https://prover.certora.com/output/41958/8123508132af65dab125/?anonymousKey=bffc0a16295e7bccdafb2b5eb9bba6a5f90c8968
rule queueCannotCancel()
{
	env e;
	calldataarg args;
	uint256 actionsSetId;

	require getCurrentState(e, actionsSetId) != 2;
		processMessageFromRoot(e, args);
	assert getCurrentState(e, actionsSetId) != 2;
}

// execute cannot cancel another set.
// Verified
// https://prover.certora.com/output/41958/eb21ccb2cc29dbc4e2fb/?anonymousKey=0dd6892ecb82e5df42b9f5e3ffe431419ec004c4
rule executeCannotCancel()
{
	env e;
	calldataarg args;
	uint256 setCall;
	uint256 setCanceled;

	require getCurrentState(e, setCanceled) == 0;
	require getGuardian() != _mock(e);
	
	execute(e, setCall);

	assert getCurrentState(e, setCanceled) != 2;
}

// an ID is never queued twice (after being executed once)
// Verified (for a simpler actionHash calculation - less arguments):
// https://prover.certora.com/output/41958/2fffa39eecae3bef46f4/?anonymousKey=9da4cce5c925087fd8e13a97646f9f8d6420a643
rule noIncarnations()
{
	env e; env e2; env e3;
	calldataarg args;
	calldataarg args2;

	uint256 actionsSetId = getActionsSetCount();
	processMessageFromRoot(e, args);
	execute(e2, actionsSetId);
	processMessageFromRoot@withrevert(e3, args2);
	assert !(getCurrentState(e3, actionsSetId) == 0);
}

// Once executed, an actions set ID remains executed forever.
// Verified (execpt delegate):
// https://prover.certora.com/output/41958/82a7a598594f67804b91/?anonymousKey=ebc5b375934595f5c8315460be4fe66db7877d79
// Verified (for execute):
// https://prover.certora.com/output/41958/8292edd79fdfe44fa0e9/?anonymousKey=fbd57f179fa107431847150f148bd5e0a9911841
rule executedForever(method f, uint256 actionsSetId)
{
	env e; env e2;
	calldataarg args;
	require actionsSetId < getActionsSetCount();
	require getCurrentState(e, actionsSetId) == 1;
		f(e, args);
	assert getCurrentState(e2, actionsSetId) == 1;
} 

// After calling to queue, the new action set
// must be set as 'queued'.
// Verified:
// https://prover.certora.com/output/41958/b1be0924672f96f653d2/?anonymousKey=edd773b04d29b67b3d07e14449c437f8b130bcc2
rule queuedStateConsistency()
{
	env e;
	calldataarg args;
	uint256 id = getActionsSetCount();
	require !getActionsSetCanceled(id) && !getActionsSetExecuted(id);
	processMessageFromRoot(e, args);
	assert getCurrentState(e, id) == 0;
}

// Queue must increase action set by 1.
// Verified 
// https://prover.certora.com/output/41958/a56d0720f3c484ed1edd/?anonymousKey=aabe878e790200011529f5a1861f844ac335b61d
rule queuedChangedCounter()
{
	env e;
	calldataarg args;
	uint256 count1 = getActionsSetCount();
		processMessageFromRoot(e, args);
	uint256 count2 = getActionsSetCount();

	assert count1 < max_uint => count2 == count1+1;
}

// A set status can be changed from 'queued' to 'canceled'
// via the "cancel" function only.
// Verified
// https://prover.certora.com/output/41958/92acf4198a0c8f6f76c7/?anonymousKey=6ea0ba77ee8dc58f66cd4a031e0ae2e3fb007259
rule onlyCancelCanCancel(method f, uint actionsSetId)
filtered{f -> !f.isView && 
		f.selector != 
		executeDelegateCall(address, bytes).selector}
{
	env e;
	calldataarg args;
	require getGuardian() != _mock(e);

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
	processMessageFromRoot(e, args);
	execute@withrevert(e, actionsSetId);
	assert lastReverted;
}

// An action set cannot transform from 'queued' to 'executed'
// by a function different than "execute(uint256)".
// Verified
// https://prover.certora.com/output/41958/2a588a30aaf6e5894cbb/?anonymousKey=43a8f4ecddfa051095094ce41fa9b0a8de7bd8ab
rule executedValidTransition1(method f, uint256 actionsSetId)
filtered{f -> !f.isView && f.selector != execute(uint256).selector}
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
// Verified
// https://prover.certora.com/output/41958/d0d548f73a83cc1312a5/?anonymousKey=c897f275b2245e2bb46293303d42aa478cf8ed79
rule gracePeriodChangedAffectsExecution(uint256 actionsSetId)
{
	env e; env e2;
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
	processMessageFromRoot(e, args);
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
	processMessageFromRoot(e1, args);
	// Change the delay period.
	uint256 delay1 = getDelay();
		updateDelay(e1, delay);
	uint256 delay2 = getDelay();
	// Try to queue second set, with same arguments.
	processMessageFromRoot@withrevert(e2, args);

	assert t1 + delay1 == t2 + delay2 => lastReverted;
}

// Can two batches with same arguments be queued twice? No:
// https://prover.certora.com/output/41958/ba7c9281ca7e72605d07/?anonymousKey=61fd6a4fe7e02555c7d4281f33ff1ed929489136
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
	processMessageFromRoot(e1, args);
	// Update some state variable.
		f(e1, argsUpdate);
	// Try to queue second set, with same arguments.
	processMessageFromRoot@withrevert(e2, args);

	assert !lastReverted;
}

// After a call to queue, the action hash should
// be marked as 'queued'.
// Verified:
// https://prover.certora.com/output/41958/a8443477d3d8ebd3cee0/?anonymousKey=4592ee5a7523f9fc5c16f3912bec17d9d3169898
rule afterQueueHashQueued(bytes32 actionHash)
{
	env e;
	calldataarg args;
	uint256 actionsSetId = getActionsSetCount();

	bool queueBefore = isActionQueued(e, actionHash);
		processMessageFromRoot(e, args);
	bool queuedAfter = isActionQueued(e, actionHash);
		
	assert (actionHash == ID2actionHash(actionsSetId, 0) ||
			actionHash == ID2actionHash(actionsSetId, 1))
			<=> !queueBefore && queuedAfter;
}

// Only queued actions can be executed.
// Assuming it was originally queued by 'queue'
// See rule 'afterQueueHashQueued'.
// Assuming only two actions per set.
// Verified:
// https://prover.certora.com/output/41958/329c1f3ad698fb17fa1b/?anonymousKey=13c7356bcfa64092c0b1a328d8deb11984cee6ec
rule onlyQueuedAreExecuted(bytes32 actionHash, uint256 actionsSetId)
{
	env e2; env e;
	calldataarg args;

	require isActionQueued(e, actionHash);
	// This is true in general, guardian is not a contract (is EOA).
	require getGuardian() != _mock(e);
		execute(e2, actionsSetId);
	bool queuedAfter = isActionQueued(e2, actionHash);
	
	assert (actionHash == ID2actionHash(actionsSetId, 0) ||
			actionHash == ID2actionHash(actionsSetId, 1)) 
			<=> !queuedAfter;
}

// Check if queue cannot be called twice with same arguments.
// Verified for a shortened version of actionHash:
// https://prover.certora.com/output/41958/1ac11966c892af00c371/?anonymousKey=2db6d6b9673ef511de38c33eef701c172ead8ce4
rule actionDuplicate()
{
	env e; calldataarg args;
	uint256 actionsSetId = getActionsSetCount();

	processMessageFromRoot(e, args);
	processMessageFromRoot@withrevert(e, args);
	assert lastReverted;
}

// Reachable.
rule processMessageFromRootReachability()
{
	env e; calldataarg args;
	uint256 actionsSetId = getActionsSetCount();

	processMessageFromRoot(e, args);
	assert false;
}
