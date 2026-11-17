import type {
  SeatClassCode,
  SeatClassInventory,
  StationOption,
  TrainScheduleItem,
} from '../src/types/railway.ts';

export const ORTP_STATIONS: StationOption[] = [
  { code: 'YGN', nameEn: 'Yangon', nameMm: 'ရန်ကုန်', region: 'Yangon Region' },
  { code: 'BGO', nameEn: 'Bago', nameMm: 'ပဲခူး', region: 'Bago Region' },
  { code: 'TGO', nameEn: 'Toungoo', nameMm: 'တောင်ငူ', region: 'Bago Region' },
  { code: 'NPT', nameEn: 'Naypyitaw', nameMm: 'နေပြည်တော်', region: 'Naypyitaw Union Territory' },
  { code: 'THZ', nameEn: 'Thazi', nameMm: 'သာစည်', region: 'Mandalay Region' },
  { code: 'MDL', nameEn: 'Mandalay', nameMm: 'မန္တလေး', region: 'Mandalay Region' },
  { code: 'PYY', nameEn: 'Pyay', nameMm: 'ပြည်', region: 'Bago Region' },
  { code: 'MLM', nameEn: 'Mawlamyine', nameMm: 'မော်လမြိုင်', region: 'Mon State' },
];

interface BaseTrainTemplate {
  id: string;
  trainNumber: string;
  trainNameEn: string;
  trainNameMm: string;
  corridorEn: string;
  corridorMm: string;
  trainType: 'DEMU' | 'Express' | 'Special' | 'Mail';
  stops: Array<{
    code: string;
    dep: string | null;
    arr: string | null;
  }>;
  classes: Array<{
    classCode: SeatClassCode;
    classNameEn: string;
    classNameMm: string;
    baseFareYgnNpt: number;
    baseFareYgnMdl: number;
    coachName: string;
  }>;
}

const TRAIN_TEMPLATES: BaseTrainTemplate[] = [
  {
    id: 'MR-11-UP',
    trainNumber: '11 Up',
    trainNameEn: 'No. 11 Up Express',
    trainNameMm: 'အမှတ်(၁၁)အဆန်',
    corridorEn: 'Yangon - Mandalay',
    corridorMm: 'ရန်ကုန် - မန္တလေး',
    trainType: 'Express',
    stops: [
      { code: 'YGN', dep: '05:30', arr: null },
      { code: 'BGO', dep: '07:20', arr: '07:15' },
      { code: 'TGO', dep: '11:00', arr: '10:55' },
      { code: 'NPT', dep: '13:40', arr: '13:30' },
      { code: 'THZ', dep: '16:25', arr: '16:20' },
      { code: 'MDL', dep: null, arr: '20:00' },
    ],
    classes: [
      {
        classCode: 'ordinary',
        classNameEn: 'Ordinary Class',
        classNameMm: 'ရိုးရိုးတန်း',
        baseFareYgnNpt: 10000,
        baseFareYgnMdl: 15000,
        coachName: 'Ordinary',
      },
      {
        classCode: 'upper',
        classNameEn: 'Upper Class',
        classNameMm: 'အထက်တန်း',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 28000,
        coachName: 'Upper',
      },
    ],
  },
  {
    id: 'MR-03-UP',
    trainNumber: '3 Up',
    trainNameEn: 'No. 3 Up DEMU',
    trainNameMm: 'အမှတ်(၃)အဆန်',
    corridorEn: 'Yangon - Mandalay',
    corridorMm: 'ရန်ကုန် - မန္တလေး',
    trainType: 'DEMU',
    stops: [
      { code: 'YGN', dep: '06:00', arr: null },
      { code: 'BGO', dep: '07:25', arr: '07:20' },
      { code: 'TGO', dep: '09:35', arr: '09:30' },
      { code: 'NPT', dep: '11:10', arr: '11:00' },
      { code: 'THZ', dep: '13:35', arr: '13:30' },
      { code: 'MDL', dep: null, arr: '16:00' },
    ],
    classes: [
      {
        classCode: 'upper',
        classNameEn: 'Upper Class (DEMU)',
        classNameMm: 'အထက်တန်း (DEMU)',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 32000,
        coachName: 'DEMU Upper',
      },
      {
        classCode: 'first_demu',
        classNameEn: 'First Class (DEMU)',
        classNameMm: 'ပထမတန်း (DEMU)',
        baseFareYgnNpt: 28000,
        baseFareYgnMdl: 46000,
        coachName: 'DEMU First',
      },
    ],
  },
  {
    id: 'MR-05-UP',
    trainNumber: '5 Up',
    trainNameEn: 'No. 5 Up DEMU',
    trainNameMm: 'အမှတ်(၅)အဆန်',
    corridorEn: 'Yangon - Mandalay',
    corridorMm: 'ရန်ကုန် - မန္တလေး',
    trainType: 'DEMU',
    stops: [
      { code: 'YGN', dep: '07:00', arr: null },
      { code: 'BGO', dep: '08:25', arr: '08:20' },
      { code: 'TGO', dep: '10:35', arr: '10:30' },
      { code: 'NPT', dep: '12:10', arr: '12:00' },
      { code: 'THZ', dep: '14:35', arr: '14:30' },
      { code: 'MDL', dep: null, arr: '17:00' },
    ],
    classes: [
      {
        classCode: 'upper',
        classNameEn: 'Upper Class (DEMU)',
        classNameMm: 'အထက်တန်း (DEMU)',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 32000,
        coachName: 'DEMU Upper',
      },
      {
        classCode: 'first_demu',
        classNameEn: 'First Class (DEMU)',
        classNameMm: 'ပထမတန်း (DEMU)',
        baseFareYgnNpt: 28000,
        baseFareYgnMdl: 46000,
        coachName: 'DEMU First',
      },
    ],
  },
  {
    id: 'MR-09-UP',
    trainNumber: '9 Up',
    trainNameEn: 'No. 9 Up DEMU',
    trainNameMm: 'အမှတ်(၉)အဆန်',
    corridorEn: 'Yangon - Mandalay',
    corridorMm: 'ရန်ကုန် - မန္တလေး',
    trainType: 'DEMU',
    stops: [
      { code: 'YGN', dep: '08:30', arr: null },
      { code: 'BGO', dep: '09:55', arr: '09:50' },
      { code: 'TGO', dep: '12:05', arr: '12:00' },
      { code: 'NPT', dep: '13:40', arr: '13:30' },
      { code: 'THZ', dep: '16:05', arr: '16:00' },
      { code: 'MDL', dep: null, arr: '18:30' },
    ],
    classes: [
      {
        classCode: 'upper',
        classNameEn: 'Upper Class (DEMU)',
        classNameMm: 'အထက်တန်း (DEMU)',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 32000,
        coachName: 'DEMU Upper',
      },
      {
        classCode: 'first_demu',
        classNameEn: 'First Class (DEMU)',
        classNameMm: 'ပထမတန်း (DEMU)',
        baseFareYgnNpt: 28000,
        baseFareYgnMdl: 46000,
        coachName: 'DEMU First',
      },
    ],
  },
  {
    id: 'MR-31-UP',
    trainNumber: '31 Up',
    trainNameEn: 'No. 31 Up DEMU',
    trainNameMm: 'အမှတ်(၃၁)အဆန်',
    corridorEn: 'Yangon - Naypyitaw',
    corridorMm: 'ရန်ကုန် - နေပြည်တော်',
    trainType: 'DEMU',
    stops: [
      { code: 'YGN', dep: '10:00', arr: null },
      { code: 'BGO', dep: '11:25', arr: '11:20' },
      { code: 'TGO', dep: '13:35', arr: '13:30' },
      { code: 'NPT', dep: null, arr: '15:00' },
    ],
    classes: [
      {
        classCode: 'upper',
        classNameEn: 'Upper Class (DEMU)',
        classNameMm: 'အထက်တန်း (DEMU)',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 19000,
        coachName: 'DEMU Upper',
      },
      {
        classCode: 'first_demu',
        classNameEn: 'First Class (DEMU)',
        classNameMm: 'ပထမတန်း (DEMU)',
        baseFareYgnNpt: 28000,
        baseFareYgnMdl: 28000,
        coachName: 'DEMU First',
      },
    ],
  },
  {
    id: 'MR-07-UP',
    trainNumber: '7 Up',
    trainNameEn: 'No. 7 Up DEMU',
    trainNameMm: 'အမှတ်(၇)အဆန်',
    corridorEn: 'Yangon - Naypyitaw',
    corridorMm: 'ရန်ကုန် - နေပြည်တော်',
    trainType: 'DEMU',
    stops: [
      { code: 'YGN', dep: '12:30', arr: null },
      { code: 'BGO', dep: '13:55', arr: '13:50' },
      { code: 'TGO', dep: '16:05', arr: '16:00' },
      { code: 'NPT', dep: null, arr: '17:30' },
    ],
    classes: [
      {
        classCode: 'upper',
        classNameEn: 'Upper Class (DEMU)',
        classNameMm: 'အထက်တန်း (DEMU)',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 19000,
        coachName: 'DEMU Upper',
      },
      {
        classCode: 'first_demu',
        classNameEn: 'First Class (DEMU)',
        classNameMm: 'ပထမတန်း (DEMU)',
        baseFareYgnNpt: 28000,
        baseFareYgnMdl: 28000,
        coachName: 'DEMU First',
      },
    ],
  },
  {
    id: 'MR-NPT-SPL-UP',
    trainNumber: 'NPT Spl Up',
    trainNameEn: 'Naypyitaw Up Special',
    trainNameMm: 'နေပြည်တော်အဆန်အထူး',
    corridorEn: 'Yangon - Naypyitaw',
    corridorMm: 'ရန်ကုန် - နေပြည်တော်',
    trainType: 'Special',
    stops: [
      { code: 'YGN', dep: '13:00', arr: null },
      { code: 'BGO', dep: '14:25', arr: '14:20' },
      { code: 'TGO', dep: '16:35', arr: '16:30' },
      { code: 'NPT', dep: null, arr: '18:00' },
    ],
    classes: [
      {
        classCode: 'upper',
        classNameEn: 'Upper Class (Special)',
        classNameMm: 'အထက်တန်း (အထူး)',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 19000,
        coachName: 'Special Upper',
      },
      {
        classCode: 'first_demu',
        classNameEn: 'First Class (Special)',
        classNameMm: 'ပထမတန်း (အထူး)',
        baseFareYgnNpt: 28000,
        baseFareYgnMdl: 28000,
        coachName: 'Special First',
      },
    ],
  },
  {
    id: 'MR-04-DN',
    trainNumber: '4 Down',
    trainNameEn: 'No. 4 Down DEMU',
    trainNameMm: 'အမှတ်(၄)အစုန်',
    corridorEn: 'Mandalay - Yangon',
    corridorMm: 'မန္တလေး - ရန်ကုန်',
    trainType: 'DEMU',
    stops: [
      { code: 'MDL', dep: '06:00', arr: null },
      { code: 'THZ', dep: '08:25', arr: '08:20' },
      { code: 'NPT', dep: '11:00', arr: '10:50' },
      { code: 'TGO', dep: '12:35', arr: '12:30' },
      { code: 'BGO', dep: '14:40', arr: '14:35' },
      { code: 'YGN', dep: null, arr: '16:00' },
    ],
    classes: [
      {
        classCode: 'upper',
        classNameEn: 'Upper Class (DEMU)',
        classNameMm: 'အထက်တန်း (DEMU)',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 32000,
        coachName: 'DEMU Upper',
      },
      {
        classCode: 'first_demu',
        classNameEn: 'First Class (DEMU)',
        classNameMm: 'ပထမတန်း (DEMU)',
        baseFareYgnNpt: 28000,
        baseFareYgnMdl: 46000,
        coachName: 'DEMU First',
      },
    ],
  },
  {
    id: 'MR-32-DN',
    trainNumber: '32 Down',
    trainNameEn: 'No. 32 Down DEMU',
    trainNameMm: 'အမှတ်(၃၂)အစုန်',
    corridorEn: 'Naypyitaw - Yangon',
    corridorMm: 'နေပြည်တော် - ရန်ကုန်',
    trainType: 'DEMU',
    stops: [
      { code: 'NPT', dep: '12:00', arr: null },
      { code: 'TGO', dep: '13:35', arr: '13:30' },
      { code: 'BGO', dep: '15:40', arr: '15:35' },
      { code: 'YGN', dep: null, arr: '17:00' },
    ],
    classes: [
      {
        classCode: 'upper',
        classNameEn: 'Upper Class (DEMU)',
        classNameMm: 'အထက်တန်း (DEMU)',
        baseFareYgnNpt: 19000,
        baseFareYgnMdl: 19000,
        coachName: 'DEMU Upper',
      },
      {
        classCode: 'first_demu',
        classNameEn: 'First Class (DEMU)',
        classNameMm: 'ပထမတန်း (DEMU)',
        baseFareYgnNpt: 28000,
        baseFareYgnMdl: 28000,
        coachName: 'DEMU First',
      },
    ],
  },
  {
    id: 'MR-71-UP',
    trainNumber: '71 Up',
    trainNameEn: 'No. 71 Up Pyay Express',
    trainNameMm: 'အမှတ်(၇၁)အဆန် (ပြည်)',
    corridorEn: 'Yangon - Pyay',
    corridorMm: 'ရန်ကုန် - ပြည်',
    trainType: 'Express',
    stops: [
      { code: 'YGN', dep: '13:15', arr: null },
      { code: 'PYY', dep: null, arr: '20:45' },
    ],
    classes: [
      {
        classCode: 'ordinary',
        classNameEn: 'Ordinary Class',
        classNameMm: 'ရိုးရိုးတန်း',
        baseFareYgnNpt: 7500,
        baseFareYgnMdl: 7500,
        coachName: 'Ordinary',
      },
      {
        classCode: 'upper',
        classNameEn: 'Upper Class',
        classNameMm: 'အထက်တန်း',
        baseFareYgnNpt: 14500,
        baseFareYgnMdl: 14500,
        coachName: 'Upper',
      },
    ],
  },
  {
    id: 'MR-81-UP',
    trainNumber: '81 Up',
    trainNameEn: 'No. 81 Up Mawlamyine Express',
    trainNameMm: 'အမှတ်(၈၁)အဆန် (မော်လမြိုင်)',
    corridorEn: 'Yangon - Mawlamyine',
    corridorMm: 'ရန်ကုန် - မော်လမြိုင်',
    trainType: 'Express',
    stops: [
      { code: 'YGN', dep: '08:00', arr: null },
      { code: 'BGO', dep: '09:45', arr: '09:40' },
      { code: 'MLM', dep: null, arr: '17:30' },
    ],
    classes: [
      {
        classCode: 'ordinary',
        classNameEn: 'Ordinary Class',
        classNameMm: 'ရိုးရိုးတန်း',
        baseFareYgnNpt: 9000,
        baseFareYgnMdl: 9000,
        coachName: 'Ordinary',
      },
      {
        classCode: 'upper',
        classNameEn: 'Upper Class',
        classNameMm: 'အထက်တန်း',
        baseFareYgnNpt: 18000,
        baseFareYgnMdl: 18000,
        coachName: 'Upper',
      },
    ],
  },
];

export function resolveStationCode(input: string): string {
  const normalized = input.trim().toLowerCase();
  const match = ORTP_STATIONS.find(
    (s) =>
      s.code.toLowerCase() === normalized ||
      s.nameEn.toLowerCase() === normalized ||
      s.nameMm === input.trim() ||
      s.nameEn.toLowerCase().includes(normalized) ||
      s.nameMm.includes(input.trim()),
  );
  return match ? match.code : 'YGN';
}

export function getStationByCode(code: string): StationOption {
  return ORTP_STATIONS.find((s) => s.code === code) ?? ORTP_STATIONS[0];
}

function computeDuration(dep: string, arr: string): string {
  const [dh, dm] = dep.split(':').map(Number);
  const [ah, am] = arr.split(':').map(Number);
  let diffMins = ah * 60 + am - (dh * 60 + dm);
  if (diffMins < 0) diffMins += 24 * 60;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function findAdjacentSeatGroup(
  availableSeats: string[],
  neededCount: number,
): string[] {
  if (neededCount <= 0 || availableSeats.length === 0) return [];
  const sorted = [...availableSeats].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return na !== nb ? na - nb : a.localeCompare(b);
  });

  if (neededCount === 1) return [sorted[0]];
  if (sorted.length < neededCount) return sorted;

  for (let i = 0; i <= sorted.length - neededCount; i += 1) {
    let consecutive = true;
    for (let k = 1; k < neededCount; k += 1) {
      const prevNum = parseInt(sorted[i + k - 1].replace(/\D/g, ''), 10);
      const currNum = parseInt(sorted[i + k].replace(/\D/g, ''), 10);
      if (Number.isNaN(prevNum) || Number.isNaN(currNum) || currNum !== prevNum + 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      return sorted.slice(i, i + neededCount);
    }
  }

  return sorted.slice(0, neededCount);
}

export function queryRouteScheduleOnly(
  originInput: string,
  destinationInput: string,
): TrainScheduleItem[] {
  const originCode = resolveStationCode(originInput);
  const destCode = resolveStationCode(destinationInput);
  const isLongMdl =
    (originCode === 'YGN' && destCode === 'MDL') ||
    (originCode === 'MDL' && destCode === 'YGN');

  const matching: TrainScheduleItem[] = [];

  for (const t of TRAIN_TEMPLATES) {
    const originIdx = t.stops.findIndex((s) => s.code === originCode);
    const destIdx = t.stops.findIndex((s) => s.code === destCode);

    if (originIdx !== -1 && destIdx !== -1 && originIdx < destIdx) {
      const originStop = t.stops[originIdx];
      const destStop = t.stops[destIdx];
      const depTime = originStop.dep ?? originStop.arr ?? '06:00';
      const arrTime = destStop.arr ?? destStop.dep ?? '12:00';
      const duration = computeDuration(depTime, arrTime);

      const seatClasses: SeatClassInventory[] = t.classes.map((cls) => ({
        classCode: cls.classCode,
        classNameEn: cls.classNameEn,
        classNameMm: cls.classNameMm,
        fareMmk: isLongMdl ? cls.baseFareYgnMdl : cls.baseFareYgnNpt,
        coachName: cls.coachName,
        isLiveSeatData: false,
        availableCount: null,
        availableSeatNumbers: [],
        occupiedSeatNumbers: [],
        recommendedSeats: [],
      }));

      const minFare = Math.min(...seatClasses.map((c) => c.fareMmk));
      const segmentStops = t.stops
        .slice(originIdx, destIdx + 1)
        .map((st) => getStationByCode(st.code));

      matching.push({
        id: t.id,
        trainNumber: t.trainNumber,
        trainNameEn: t.trainNameEn,
        trainNameMm: t.trainNameMm,
        corridorEn: t.corridorEn,
        corridorMm: t.corridorMm,
        originCode,
        destinationCode: destCode,
        departureTime: depTime,
        arrivalTime: arrTime,
        duration,
        startingFareMmk: minFare,
        trainType: t.trainType,
        stopsEn: segmentStops.map((s) => s.nameEn),
        stopsMm: segmentStops.map((s) => s.nameMm),
        seatClasses,
      });
    }
  }

  return matching.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}
