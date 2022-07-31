import "erc20.spec"
using DummyERC20A as erc20_A
using DummyERC20B as erc20_B

// Verification reports:
// Optimism:
// https://vaas-stg.certora.com/output/41958/aa361a2ea9e170a0f577/?anonymousKey=87cf9a705ef8f93f6d9403b56a447cf67404a2c1
// Arbitrum:
// https://vaas-stg.certora.com/output/41958/9a0c4f34d04cb0432b39/?anonymousKey=b2e095528d7156b7351ff711e3a888f31c7b1c11

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
	getActionsSetExecuted(uint256) returns (bool) envfree
	getActionsSetCanceled(uint256) returns (bool) envfree

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
		f.selector == updateMaximumDelay(uint256).selector);

////////////////////////////////////////////////////////////////////////////
//                       Rules                                            //
////////////////////////////////////////////////////////////////////////////
invariant properDelay()
	getMinimumDelay() <= getDelay() && getDelay() <= getMaximumDelay()

invariant actionNotCanceledAndExecuted(uint256 setID)
	! (getActionsSetCanceled(setID) && getActionsSetExecuted(setID))

invariant notCanceledNotExecuted(uint256 id)
	( !getActionsSetCanceled(id) && !getActionsSetExecuted(id) )
	{
		preserved{
			require id == getActionsSetCount();
		}
	}
	
invariant minDelayLtMaxDelay()
	getMinimumDelay() <= getMaximumDelay()

// Only the current contract (executor) can change its variables.
rule whoChangedStateVariables(method f)
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


// Queue cannot cancel an action set.
// Verified
// https://prover.certora.com/output/41958/8123508132af65dab125/?anonymousKey=bffc0a16295e7bccdafb2b5eb9bba6a5f90c8968
rule queueCannotCancel()
{
	env e;
	calldataarg args;
	uint256 actionsSetId;

	require getCurrentState(e, actionsSetId) != 2;
		queue2(e, args);
	assert getCurrentState(e, actionsSetId) != 2;
}

// execute cannot cancel another set.
rule executeCannotCancel()
{
	env e;
	calldataarg args;
	uint256 calledSet;
	uint256 canceledSet;

	require getCurrentState(e, canceledSet) != 2;
	require getGuardian() != _mock(e);
	
	execute(e, calledSet);

	assert getCurrentState(e, canceledSet) != 2;
}

// A three-part rule to prove that:
// An action set ID is never queued twice, after being executed once.

// First part:
// Prove that an actions set is marked as 'queued'
// After invoking queue2.
rule noIncarnations1()
{
	env e;
	calldataarg args;
	uint256 actionsSetId = getActionsSetCount();
	require actionsSetId < max_uint;
	requireInvariant notCanceledNotExecuted(actionsSetId);
	queue2(e, args);
	assert getCurrentState(e, actionsSetId) == 0
	&& actionsSetId < getActionsSetCount();
}

// Second part:
// Given the first part, after execute of that set,
// the same set cannot be marked as 'queued'.
rule noIncarnations2(uint256 actionsSetId)
{
	env e;
	execute(e, actionsSetId);
	assert getCurrentState(e, actionsSetId) != 0;
}

// Third part:
// Given the second part, while an action set is not marked
// as 'queued', calling queue2 with any arguments
// cannot set the same set to 'queued' again.
rule noIncarnations3(uint256 actionsSetId)
{
	env e;
	calldataarg args;
	require actionsSetId <= getActionsSetCount();
	require getCurrentState(e, actionsSetId) != 0;
	queue2(e, args);
	assert getCurrentState(e, actionsSetId) != 0;
}

// Once executed, an actions set ID remains executed forever.
rule executedForever(method f, uint256 actionsSetId)
{
	env e; env e2;
	calldataarg args;
	require getCurrentState(e, actionsSetId) == 1;
		f(e, args);
	assert getCurrentState(e2, actionsSetId) == 1;
} 

rule canceledForever(method f, uint256 actionsSetId)
{
	env e; env e2;
	calldataarg args;
	require getCurrentState(e, actionsSetId) == 2;
		f(e, args);
	assert getCurrentState(e2, actionsSetId) == 2;
}

rule expiredForever(method f, uint256 actionsSetId)
{
	env e; env e2;
	calldataarg args;
	require getCurrentState(e, actionsSetId) == 3;
	require e.block.timestamp <= e2.block.timestamp;
	 
	if (f.selector == updateGracePeriod(uint256).selector) {
		uint256 oldPeriod = getGracePeriod();
		updateGracePeriod(e, args);
		uint256 newPeriod = getGracePeriod();
		assert newPeriod <= oldPeriod =>
		getCurrentState(e2, actionsSetId) == 3;
	}
	else {
		f(e, args);
		assert getCurrentState(e2, actionsSetId) == 3;
	}	
} 

// After calling to queue, the new action set
// must be set as 'queued'.
rule queuedStateConsistency()
{
	env e;
	calldataarg args;
	uint256 id = getActionsSetCount();
	requireInvariant notCanceledNotExecuted(id);
	queue2(e, args);
	assert getCurrentState(e, id) == 0;
}

// Queue must increase action set by 1.
rule queuedChangedCounter()
{
	env e;
	calldataarg args;
	uint256 count1 = getActionsSetCount();
		queue2(e, args);
	uint256 count2 = getActionsSetCount();

	assert count1 < max_uint => count2 == count1+1;
}

// A set status can be changed from 'queued' to 'canceled'
// via the "cancel" function only.
rule onlyCancelCanCancel(method f, uint actionsSetId)
{
	env e;
	calldataarg args;
	require getGuardian() != _mock(e);
	// Replace by !=2
	require getCurrentState(e, actionsSetId) != 2;

		f(e, args);

	assert getCurrentState(e, actionsSetId) == 2
			=> f.selector == cancel(uint256).selector;
}

// Cancel only cancels one actions set.
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

// When delay is defined, No immediate execution after queue.
rule holdYourHorses()
{
	env e;
	calldataarg args;
	uint256 actionsSetId = getActionsSetCount();
	
	uint256 delay = getDelay();
	queue2(e, args);
	execute@withrevert(e, actionsSetId);
	assert delay > 0 => lastReverted;
}

// An action set cannot transform from 'queued' to 'executed'
// by a function different than "execute(uint256)".
rule executedValidTransition1(method f, uint256 actionsSetId)
filtered{f -> !f.isView}
{
	env e;
	calldataarg args;
	uint8 state1 = getCurrentState(e, actionsSetId);
		f(e, args);
	uint8 state2 = getCurrentState(e, actionsSetId);

	assert f.selector != execute(uint256).selector =>
	! (state1 == 0 && state2 == 1);
}

// If any action set was executed, then this set (and only it) must change 
// from 'queued' to 'executed'.
rule executedValidTransition2(uint256 actionsSetId)
{
	env e;
	uint actionsSetId2;
	uint8 state1 = getCurrentState(e, actionsSetId);
		execute(e, actionsSetId2);
	uint8 state2 = getCurrentState(e, actionsSetId);

	assert actionsSetId2 == actionsSetId <=> state1 == 0 && state2 == 1;
}

// Execute must fail if actions set state is expired.
rule executeFailsIfExpired(uint256 actionsSetId)
{
	env e;
	uint8 stateBefore = getCurrentState(e, actionsSetId);
	execute@withrevert(e, actionsSetId);
	bool executeReverted = lastReverted;
	assert stateBefore == 3 => executeReverted;
}

// Cannot execute before delay passed.
// Execution time must not change in this case.
rule executeRevertsBeforeDelay(method f)
filtered{f -> stateVariableUpdate(f)}
{
	env e; 
	env e2;
	calldataarg args;
	calldataarg args2;
	uint256 actionsSetId = getActionsSetCount();
	uint256 delay = getDelay();
	queue2(e, args);

	uint256 execTime1 = getActionsSetExecutionTime(actionsSetId);
		f(e2, args2);
	uint256 execTime2 = getActionsSetExecutionTime(actionsSetId);

	execute@withrevert(e2, actionsSetId);

	assert 
		(e2.block.timestamp < e.block.timestamp + delay => lastReverted)
		&& (execTime2 == execTime1);
}

// Two equal transaction sets in different blocks 
// can have the same execution time and therefore same hash.
// This leads to revert.
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

// Can two batches with same arguments be queued twice? No:
rule independentQueuedActions(method f)
filtered{f -> stateVariableUpdate(f)}
{
	env e1; env e2; env e3;
	calldataarg args;
	calldataarg argsUpdate;
	
	// Assume different blocks (block3 later than block1)
	require e1.block.timestamp < e3.block.timestamp;
	require e1.msg.sender == e3.msg.sender;
	require e3.msg.value == 0;
	require e3.block.timestamp + getDelay() < max_uint;

	storage initState = lastStorage; 
	queue2(e3, args);

	// queue first set.
	queue2(e1, args) at initState;
	// Update some state variable changing method.
		f(e2, argsUpdate);
	// Try to queue second set, with same arguments.
	queue2@withrevert(e3, args);

	assert !lastReverted;
}

// After a call to queue, the action hash should
// be marked as 'queued'.
rule afterQueueHashQueued(bytes32 actionHash)
{
	env e;
	calldataarg args;
	uint256 actionsSetId = getActionsSetCount();

	bool queueBefore = isActionQueued(e, actionHash);
		queue2(e, args);
	bool queuedAfter = isActionQueued(e, actionHash);
		
	assert (actionHash == ID2actionHash(actionsSetId, 0) ||
			actionHash == ID2actionHash(actionsSetId, 1))
			<=> !queueBefore && queuedAfter;
}

// Only queued actions can be executed.
// Assuming it was originally queued by 'queue'
// See rule 'afterQueueHashQueued'.
// Assuming only two actions per set.
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
rule actionDuplicate()
{
	env e; 
	calldataarg args;

	queue2(e, args);
	queue2@withrevert(e, args);
	assert lastReverted;
}

// Reachable.
rule queue2Reachability()
{
	env e; calldataarg args;

	queue2(e, args);
	assert false;
}

rule queuePriviliged()
{
	env e1;
	env e2;
	calldataarg args1;
	calldataarg args2;
	queue2(e1, args1);
	queue2@withrevert(e2, args2);
	assert e1.msg.sender != e2.msg.sender => lastReverted;
}

rule cancelPriviliged()
{
	env e1;
	env e2;
	calldataarg args1;
	calldataarg args2;
	cancel(e1, args1);
	cancel@withrevert(e2, args2);
	assert e1.msg.sender != e2.msg.sender => lastReverted;
}

// After updating a grace period, an action set execution reverts
// if and only if it's state is 'expired'.
/*
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
}*/