import { SelectDevices, SelectTemperature } from '../../../../database';

export type RuleDevice = Pick<SelectDevices, 'id' | 'name' | 'normalMinTemperature' | 'normalMaxTemperature'>;

export type RuleTemperature = Pick<SelectTemperature, 'temperature' | 'recordedAt'>;
