import { AlertReason, DevicesState } from '../../database';

export function getAlertReason(fromState: DevicesState, toState: DevicesState): AlertReason {
  if (toState === 'OFFLINE') return 'DEVICE_OFFLINE';
  if (fromState === 'OFFLINE') return 'DEVICE_RECOVERED';
  if (toState === 'NORMAL') return 'TEMPERATURE_RECOVERED';
  if (toState === 'DEFROST') return 'DEFROST_DETECTED';
  if (toState === 'WARNING') return 'WARNING_TEMPERATURE';
  if (toState === 'CRITICAL') return 'CRITICAL_TEMPERATURE';
  throw new Error(`Unhandled state transition: ${fromState} -> ${toState}`);
}
