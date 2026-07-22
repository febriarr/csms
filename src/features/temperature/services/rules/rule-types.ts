import { SelectDevices, SelectTemperature } from '../../../../database';

export type RuleDevice = Pick<
  SelectDevices,
  | 'id'
  | 'name'
  | 'state'
  | 'normalMinTemperature'
  | 'normalMaxTemperature'
  | 'defrostMinTemperature'
  | 'defrostMaxTemperature'
  | 'warningMinTemperature'
  | 'warningMaxTemperature'
  | 'criticalMinTemperature'
>;

export type RuleTemperature = Pick<SelectTemperature, 'temperature' | 'recordedAt'>;
