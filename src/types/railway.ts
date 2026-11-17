export type TripType = 'one-way' | 'round-trip';

export type SeatClassCode = 'ordinary' | 'upper' | 'first_demu' | 'sleeper';

export type SeatDataSource =
  | 'unavailable'
  | 'live_portal'
  | 'imported_screenshot'
  | 'imported_page';

export interface StationOption {
  code: string;
  nameEn: string;
  nameMm: string;
  region: string;
}

export interface SeatClassInventory {
  classCode: SeatClassCode;
  classNameEn: string;
  classNameMm: string;
  fareMmk: number;
  coachName: string;
  isLiveSeatData: boolean;
  availableCount: number | null;
  availableSeatNumbers: string[];
  occupiedSeatNumbers: string[];
  recommendedSeats: string[];
}

export interface TrainScheduleItem {
  id: string;
  trainNumber: string;
  trainNameEn: string;
  trainNameMm: string;
  corridorEn: string;
  corridorMm: string;
  originCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  startingFareMmk: number;
  trainType: 'DEMU' | 'Express' | 'Special' | 'Mail';
  stopsEn: string[];
  stopsMm: string[];
  seatClasses: SeatClassInventory[];
}

export interface EvaluatedTrainResult extends TrainScheduleItem {
  isRouteMatch: boolean;
  isTimeMatch: boolean;
  isSeatCountMatch: boolean | null; // null when live seat numbers are not yet imported
  isClassMatch: boolean;
  isFullyCompatible: boolean;
  compatibilityReason: string;
  totalSeatsRequired: number;
  bestMatchingClass: SeatClassInventory | null;
  totalEstimatedFareMmk: number;
}

export interface PortalProbeResult {
  targetUrl: string;
  reachable: boolean;
  httpStatus: number | null;
  latencyMs: number;
  portalTitle: string | null;
  deepCheckSummary: string;
  mode: 'live_portal' | 'geo_blocked_timeout';
  note: string;
  checkedAt: string;
}

export interface CheckSeatsRequest {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  tripType: TripType;
  adults: number;
  children: number;
  infants: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  preferredClass?: SeatClassCode | 'any';
  naturalQuery?: string;
  targetUrl?: string;
}

export interface CheckSeatsResponse {
  query: CheckSeatsRequest;
  seatDataSource: SeatDataSource;
  parsedFromNaturalLanguage: boolean;
  probe: PortalProbeResult;
  trains: EvaluatedTrainResult[];
  returnTrains?: EvaluatedTrainResult[];
  aiSummary: {
    headline: string;
    recommendation: string;
    compatibleTrainCount: number;
    bestOptionTrainId: string | null;
    bestOptionSeats: string[];
    warnings: string[];
  };
}

export interface CoachSeatCell {
  seatNumber: string;
  status: 'available' | 'occupied' | 'recommended';
}

export interface CoachMapResponse {
  trainId: string;
  trainNameEn: string;
  trainNameMm: string;
  date: string;
  classCode: SeatClassCode;
  classNameEn: string;
  classNameMm: string;
  coachName: string;
  fareMmk: number;
  isLiveSeatData: boolean;
  seats: CoachSeatCell[];
  availableCount: number;
  recommendedSeats: string[];
}

export interface LiveSeatExtractionItem {
  trainNameMm: string;
  trainNameEn: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  corridorMm: string;
  startingFareMmk: number;
  coachName: string;
  classNameEn: string;
  classCode: SeatClassCode;
  availableSeatNumbers: string[];
  occupiedSeatNumbers: string[];
}

export interface ScreenshotExtractionResponse {
  extractedQuery: {
    origin: string;
    destination: string;
    date: string;
    tripType: TripType;
    adults: number;
    children: number;
    infants: number;
    rawPassengerText: string;
  };
  pageType: 'schedule_list' | 'seat_selection_map';
  extractedTrains: LiveSeatExtractionItem[];
  notes: string;
  sourceLabel: string;
  sourceType: 'imported_screenshot' | 'imported_page';
}
