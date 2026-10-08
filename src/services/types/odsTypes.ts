export interface OdsPractitioner {
  id: string;
  name: string;
  role: string;
  roleName: string;
  type: string;
  lastChangeDate: string;
  practitionerInactive: boolean;
  inactiveRole?: string[];
  '1'?: string;
  '6'?: string;
  number6?: string;
  ME1?: string;
}

export interface OdsPractitionerResponse {
  pracArray: OdsPractitioner[];
  pracCodeSystemUpdatedAt: string;
}

export interface OdsOrganisationMain {
  id: string;
  name: string;
  inactive: boolean;
  country: string;
  role: string[];
  opStartDate: string;
  opEndDate: string;
  legStartDate: string;
  legEndDate: string;
  primaryRole: string;
  primaryRoleName: string;
  roleName: string[];
  assigningAuth: string;
  orgRecordClass: string;
  refOnly: boolean;
  status: string;
  town: string;
  address1: string;
  address2: string;
  address3: string;
  postcode: string;
  telephone: string;
  lastChangeDate: string;
  isbn: string;
  uprn?: string;
  CA?: string;
  LSOA11?: string;
  RE2?: string;
  RE3?: string;
  RE4?: string;
  RE6?: string;
  RE8?: string[];
  RE9?: string[];
  RE11?: string;
  EW?: string;
  PC?: string;
  LA?: string;
  LAName?: string;
  PCO?: string;
  PCOName?: string;
  ICB?: string;
  ICBName?: string;
  GOR?: string;
  GORName?: string;
  NHSER?: string;
  NHSERName?: string;
  isASubDivisionOfName: string;
  isASubDivisionOfPrimaryRoleName: string;
  isASubDivisionOfLegalStartDate: string;
  isASubDivisionOfLegalEndDate: string;
  isDirectedByName: string;
  isDirectedByPrimaryRoleName: string;
  isDirectedByLegalStartDate: string;
  isDirectedByLegalEndDate: string;
  isCommissionedByName: string;
  isCommissionedByPrimaryRoleName: string;
  isCommissionedByLegalStartDate: string;
  isCommissionedByLegalEndDate: string;
  isOperatedByName: string;
  isOperatedByPrimaryRoleName: string;
  isOperatedByLegalStartDate: string;
  isOperatedByLegalEndDate: string;
  isPartnerToName: string[];
  isPartnerToPrimaryRoleName: string[];
  isPartnerToLegalStartDate: string[];
  isPartnerToLegalEndDate: string[];
  isPartnerToCode: string[];
  isNominatedPayeeForName: string[];
  isNominatedPayeeForPrimaryRoleName: string[];
  isNominatedPayeeForLegalStartDate: string[];
  isNominatedPayeeForLegalEndDate: string[];
  isNominatedPayeeForCode: string[];
  isConstituentOfName: string;
  isConstituentOfPrimaryRoleName: string;
  isConstituentOfLegalStartDate: string;
  isConstituentOfLegalEndDate: string;
  operatedByOrgName?: string;
  commissionerOrgName?: string;
  [key: string]: unknown;
}

export interface OdsIgManagement {
  display: string;
  igManagementRole: string;
  email?: string;
  name: string;
}

export interface OdsOrganisationPractitioner {
  code: string;
  name: string;
  roleCode: string;
  roleName: string;
  joinDate: string;
  leftDate: string;
  type: string;
}

export interface OdsOrganisationResponse {
  main: OdsOrganisationMain;
  relationship: null;
  igManagement: OdsIgManagement[];
  practitioners: OdsOrganisationPractitioner[];
  predecessor: null;
  successor: null;
}

export interface OrganisationReportSearchResponse {
  orgArray: OdsOrganisationMain[];
  orgCodeSystemUpdatedAt: string;
}

export interface OrganisationReportSearch {
  searchQueryName: string;
  searchQueryCode: string;
  searchQueryAddress: string;
  searchQueryTown: string;
  searchQueryPostCode: string;
  searchQueryPrimaryRoleCodes: string;
  searchQueryNonPrimaryRoleCodes: string;
  searchQueryIsActive: string;
  lastChangeDateStart: string | null;
  lastChangeDateEnd: string | null;
  getNumberOfRecords: boolean;
}
