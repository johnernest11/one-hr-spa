export enum BloodType {
  NA = '',
  APositive = 'A+',
  ANegative = 'A-',
  BPositive = 'B+',
  BNegative = 'B-',
  ABPositive = 'AB+',
  ABNegative = 'AB-',
  OPositive = 'O+',
  ONegative = 'O-',
}

export enum SexType {
  MALE = 'Male',
  FEMALE = 'female',
}

export enum ExtensionType {
  NA = '',
  SR = 'SR',
  JR = 'JR',
  I = 'I',
  II = 'II',
  III = 'III',
  IV = 'IV',
  V = 'V',
}

export enum FilipinoByType {
  NATURALIZATION = 'NATURALIZATION',
  BIRTH = 'BIRTH',
}

export enum CountryType {
  USA = 'USA',
  CANADA = 'Canada',
  JAPAN = 'Japan',
}

export interface Option {
  label: string
  value: BloodType | SexType | ExtensionType | FilipinoByType | CountryType
}

export const bloodTypeOptions: Option[] = [
  { label: 'N/A', value: BloodType.NA },
  { label: 'A+', value: BloodType.APositive },
  { label: 'A-', value: BloodType.ANegative },
  { label: 'B+', value: BloodType.BPositive },
  { label: 'B-', value: BloodType.BNegative },
  { label: 'AB+', value: BloodType.ABPositive },
  { label: 'AB-', value: BloodType.ABNegative },
  { label: 'O+', value: BloodType.OPositive },
  { label: 'O-', value: BloodType.ONegative },
]

export const SexTypeOptions: Option[] = [
  { label: 'Male', value: SexType.MALE },
  { label: 'Female', value: SexType.FEMALE },
]

export const ExtensionTypeOptions: Option[] = [
  { label: 'N/A', value: ExtensionType.NA },
  { label: 'Sr', value: ExtensionType.SR },
  { label: 'Jr', value: ExtensionType.JR },
  { label: 'II', value: ExtensionType.II },
  { label: 'III', value: ExtensionType.III },
  { label: 'IV', value: ExtensionType.IV },
  { label: 'V', value: ExtensionType.V },
]

export const FilipinobyTypeOptions: Option[] = [
  { label: 'NATURALIZATION', value: FilipinoByType.NATURALIZATION },
  { label: 'BIRTH', value: FilipinoByType.BIRTH },
]

export const CountryTypeOptions: Option[] = [
  { label: 'USA', value: CountryType.USA },
  { label: 'Canada', value: CountryType.CANADA },
  { label: 'Japan', value: CountryType.JAPAN },
]
