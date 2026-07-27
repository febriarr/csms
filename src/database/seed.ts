import { db } from './client';
import { devices, InsertDevices } from './schema/devices';

const deviceSeeds: InsertDevices[] = [
  {
    code: 'FRZ-001',
    name: 'Freezer Ruang Produksi A',
    location: 'Gudang Utama - Lantai 1',
    normalMinTemperature: -20,
    normalMaxTemperature: -15,
    defrostMinTemperature: -14,
    defrostMaxTemperature: -5,
    warningMinTemperature: -4,
    warningMaxTemperature: 0,
    criticalMinTemperature: 1,
    state: 'NORMAL',
    isActive: true,
    stateChangedAt: new Date(),
    lastSeenAt: new Date(),
  },
  {
    code: 'FRZ-002',
    name: 'Freezer Ruang Produksi B',
    location: 'Gudang Utama - Lantai 1',
    normalMinTemperature: -20,
    normalMaxTemperature: -15,
    defrostMinTemperature: -14,
    defrostMaxTemperature: -5,
    warningMinTemperature: -4,
    warningMaxTemperature: 0,
    criticalMinTemperature: 1,
    state: 'DEFROST',
    isActive: true,
    stateChangedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 menit lalu
    lastSeenAt: new Date(),
  },
  {
    code: 'CHL-001',
    name: 'Chiller Bahan Baku',
    location: 'Gudang Utama - Lantai 1',
    normalMinTemperature: 2,
    normalMaxTemperature: 8,
    defrostMinTemperature: 9,
    defrostMaxTemperature: 12,
    warningMinTemperature: 13,
    warningMaxTemperature: 16,
    criticalMinTemperature: 17,
    state: 'NORMAL',
    isActive: true,
    stateChangedAt: new Date(),
    lastSeenAt: new Date(),
  },
  {
    code: 'CHL-002',
    name: 'Chiller Display Toko',
    location: 'Area Penjualan - Lantai 1',
    normalMinTemperature: 2,
    normalMaxTemperature: 8,
    defrostMinTemperature: 9,
    defrostMaxTemperature: 12,
    warningMinTemperature: 13,
    warningMaxTemperature: 16,
    criticalMinTemperature: 17,
    state: 'WARNING',
    isActive: true,
    stateChangedAt: new Date(Date.now() - 1000 * 60 * 10), // 10 menit lalu
    lastSeenAt: new Date(),
  },
  {
    code: 'FRZ-003',
    name: 'Freezer Cold Storage',
    location: 'Gudang Utama - Lantai 2',
    normalMinTemperature: -20,
    normalMaxTemperature: -15,
    defrostMinTemperature: -14,
    defrostMaxTemperature: -5,
    warningMinTemperature: -4,
    warningMaxTemperature: 0,
    criticalMinTemperature: 1,
    state: 'CRITICAL',
    isActive: true,
    stateChangedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 menit lalu
    lastSeenAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    code: 'FRZ-004',
    name: 'Freezer Cadangan',
    location: 'Gudang Utama - Lantai 2',
    normalMinTemperature: -20,
    normalMaxTemperature: -15,
    defrostMinTemperature: -14,
    defrostMaxTemperature: -5,
    warningMinTemperature: -4,
    warningMaxTemperature: 0,
    criticalMinTemperature: 1,
    state: 'OFFLINE',
    isActive: true,
    stateChangedAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 jam lalu
    lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    code: 'CHL-003',
    name: 'Chiller Non-Aktif (Maintenance)',
    location: 'Gudang Utama - Lantai 1',
    normalMinTemperature: 2,
    normalMaxTemperature: 8,
    defrostMinTemperature: 9,
    defrostMaxTemperature: 12,
    warningMinTemperature: 13,
    warningMaxTemperature: 16,
    criticalMinTemperature: 17,
    state: 'OFFLINE',
    isActive: false,
    stateChangedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 hari lalu
    lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
];

async function seedDevices() {
  console.log('🌱 Seeding devices...');

  try {
    const inserted = await db.insert(devices).values(deviceSeeds).returning();

    console.log(`✅ Berhasil insert ${inserted.length} devices`);
    inserted.forEach((d: any) => console.log(`   - ${d.code} (${d.name}) [${d.state}]`));
  } catch (error) {
    console.error('❌ Gagal seeding devices:', error);
    throw error;
  }
}

seedDevices()
  .then(() => {
    console.log('🎉 Seed devices selesai');
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
