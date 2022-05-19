export enum ExecutorErrors {
  // IExecutorBase
  InvalidInitParams = 'InvalidInitParams()',
  NotGuardian = 'NotGuardian()',
  OnlyCallableByThis = 'OnlyCallableByThis()',
  MinimumDelayTooLong = 'MinimumDelayTooLong()',
  MaximumDelayTooShort = 'MaximumDelayTooShort()',
  GracePeriodTooShort = 'GracePeriodTooShort()',
  DelayShorterThanMin = 'DelayShorterThanMin()',
  DelayLongerThanMax = 'DelayLongerThanMax()',
  OnlyQueuedActions = 'OnlyQueuedActions()',
  TimelockNotFinished = 'TimelockNotFinished()',
  InvalidActionsSetId = 'InvalidActionsSetId()',
  EmptyTargets = 'EmptyTargets()',
  InconsistentParamsLength = 'InconsistentParamsLength()',
  DuplicateAction = 'DuplicateAction()',
  InsufficientBalance = 'InsufficientBalance()',
  FailedActionExecution = 'FailedActionExecution()',

  // PolygonBridgeExecutor
  UnauthorizedChildOrigin = 'UnauthorizedChildOrigin()',

  // L2BridgeExecutor
  UnauthorizedEthereumExecutor = 'UnauthorizedEthereumExecutor()',
}

export enum ActionsSetState {
  Queued = 0,
  Executed = 1,
  Canceled = 2,
  Expired = 3,
}
