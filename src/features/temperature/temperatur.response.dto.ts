export class TemperatureResponseDto {
  public readonly id!: string;
  public readonly deviceId!: string;
  public readonly temperature!: string;
  public readonly recordedAt!: Date;
  public readonly receivedAt!: Date;
  public readonly crestedAt!: Date;

  constructor(partial: Partial<TemperatureResponseDto>) {
    Object.assign(this, partial);
  }
}
