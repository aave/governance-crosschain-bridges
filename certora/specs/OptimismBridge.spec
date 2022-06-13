import "erc20.spec"
using DummyERC20A as erc20_A
using DummyERC20B as erc20_B
using OptimismBridgeExecutor as optOrigin

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
	xDomainMessageSender() => CONSTANT
	queue(address[], uint256[], string[], bytes[], bool[])
	tokenA() returns (address) envfree
	tokenB() returns (address) envfree
	getTransferArguments() returns (address, address, uint256, uint256) envfree
	executeDelegateCall(address, bytes) => NONDET
	noDelegateCalls(uint256) envfree
	queueSingle(address, uint256, string, bytes, bool)
	getActionsSetExecuted(uint256) returns (bool) envfree
	getActionsSetCanceled(uint256) returns (bool) envfree
}

 //enum ActionsSetState 
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
	getDelay() >= getMinimumDelay() && getDelay() <= getMaximumDelay()
	filtered{f -> f.selector != execute(uint256).selector}

invariant actionNotCanceledAndExecuted(uint256 setID)
	! (getActionsSetCanceled(setID) && getActionsSetExecuted(setID))
	{
		preserved { require setID < getActionsSetCount(); }
	}
	
// Only the current contract (executor) can 
// change its variables.
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
	uint256 setCount1 = getActionsSetCount();
	address guardian1 = getGuardian();
	// Call function
	f(e, args);
	// State variables after
	uint256 delay2 = getDelay();
	uint256 period2 = getGracePeriod();
	uint256 minDelay2 = getMinimumDelay();
	uint256 maxDelay2 = getMaximumDelay();
	uint256 setCount2 = getActionsSetCount();
	address guardian2 = getGuardian();

	bool stateChanged = !( delay1 == delay2 &&
		 period1 == period2 &&
		 minDelay1 == minDelay2 &&
		 maxDelay1 == maxDelay2 &&
		 setCount1 == setCount2 &&
		 guardian1 == guardian2);

	assert stateChanged => e.msg.sender == currentContract,
		"Someone else changed state variables";
}

rule queueDoesntModifyStateVariables()
{
	env e;
	calldataarg args;
	// State variables before
	uint256 delay1 = getDelay();
	uint256 period1 = getGracePeriod();
	uint256 minDelay1 = getMinimumDelay();
	uint256 maxDelay1 = getMaximumDelay();
	uint256 setCount1 = getActionsSetCount();
	address guardian1 = getGuardian();

	// Call queue with one action in the set.
	require getActionsSetLength(setCount1) == 1;
	queue(e, args);

	// State variables after
	uint256 delay2 = getDelay();
	uint256 period2 = getGracePeriod();
	uint256 minDelay2 = getMinimumDelay();
	uint256 maxDelay2 = getMaximumDelay();
	uint256 setCount2 = getActionsSetCount();
	address guardian2 = getGuardian();

	bool stateIntact =  delay1 == delay2 &&
		 period1 == period2 &&
		 minDelay1 == minDelay2 &&
		 maxDelay1 == maxDelay2 &&
		 setCount1 == setCount2 &&
		 guardian1 == guardian2;

	assert stateIntact,
		"_queue changed state variables unexpectedly";
}

// Queue cannot cancel a action set
rule queueCannotCancel()
{
	env e;
	calldataarg args;
	uint256 actionsSetId;

	require getCurrentState(e, actionsSetId) != 2;
	require getActionsSetLength(actionsSetId) == 1;
		queue(e, args);
	assert getCurrentState(e, actionsSetId) != 2;
}

rule executeCannotCancel()
{
	env e;
	calldataarg args;
	uint256 setCall;
	uint256 setCanceled;

	require getCurrentState(e, setCall) == 0;
	require getCurrentState(e, setCanceled) == 0;
	require getActionsSetLength(setCall) == 1;
	require !getActionSetWithDelegate(setCall, 0);
	
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
rule executedValidTransition1(method f, uint256 actionsSetId)
filtered{f -> !f.isView && f.selector != execute(uint256).selector}
{
	env e;
	calldataarg args;
	uint8 state1 = getCurrentState(e,actionsSetId);
		f(e, args);
	uint8 state2 = getCurrentState(e, actionsSetId);

	assert ! (state1 == 0 && state2 == 1);
}

// If any action set was executed, then this set (and only it) must change 
// from 'queued' to 'executed'.
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
rule executeRevertsBeforeDelay()
{
	env e; env e2;
	calldataarg args;
	uint256 actionsSetId = getActionsSetCount();
	queue(e, args);
	execute@withrevert(e2, actionsSetId);
	bool executeFailed = lastReverted;
	assert e2.block.timestamp < e.block.timestamp + getDelay() 
			=> executeFailed;
}

// Two similar actions in different sets in different blocks
// should be successfully queued independently, regardless of 
// the other one queued status.
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
	queueSingle(e1, args);
	// Change the delay period.
	uint256 delay1 = getDelay();
		updateDelay(e1, delay);
	uint256 delay2 = getDelay();
	// Try to queue second set, with same arguments.
	queueSingle@withrevert(e2, args);

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
// Assumes a batch with a single action.
rule onlyQueuedAreExecuted(uint256 actionsSetId)
{
	env e;
	require getActionsSetLength(actionsSetId) == 1;
	bytes32 actionHash = ID2actionHash(actionsSetId, 0);

	bool queued = isActionQueued(e, actionHash);
	execute(e, actionsSetId);
	assert queued, "A non queued action was executed";
}

// Check if queue cannot be called twice with same arguments.
rule actionDuplicate()
{
	env e; calldataarg args;
	uint256 actionsSetId = getActionsSetCount();

	queue2(e, args);
	queue2@withrevert(e, args);
	assert lastReverted;
}

rule queue2Reachability()
{
	env e; calldataarg args;
	uint256 actionsSetId = getActionsSetCount();

	queue2(e, args);
	assert getActionsSetLength(actionsSetId) == 2;
}

rule mockReachability()
{
	env e;
	calldataarg args;
	mockTargetCall(e, args);
	assert false;
}
	
///////////////////////////////////////////////////////////////////////////
//                       Functions                           			//
///////////////////////////////////////////////////////////////////////////
