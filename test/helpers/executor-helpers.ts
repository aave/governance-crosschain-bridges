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

  // PolygonBridgeExecutor
  UnauthorizedChildOrigin = 'UnauthorizedChildOrigin()',

  // L2BridgeExecutor
  UnauthorizedEthereumExecutor = 'UnauthorizedEthereumExecutor()',
}
