export class ResponseTemperatureDTO {
  public readonly id!: string;
  public readonly deviceId!: string;
  public readonly temperature!: number;
  public readonly recordedAt!: Date;
  public readonly receivedAt!: Date;

  constructor(partial: Partial<ResponseTemperatureDTO>) {
    Object.assign(this, partial);
  }
}
