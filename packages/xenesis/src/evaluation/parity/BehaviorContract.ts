export type ParityStatus =
  | "not_started"
  | "designed"
  | "implemented"
  | "unit_tested"
  | "scenario_tested"
  | "parity_verified"
  | "intentionally_upgraded"
  | "intentionally_excluded";

export type ParityRisk = "low" | "medium" | "high" | "critical";

export interface BehaviorContract {
  id: string;
  given: string;
  when: string;
  then: string;
  observable: string[];
  forbidden: string[];
  reference: string[];
  referenceOracleFixture?: string;
  xenesisTarget: string[];
  tests: string[];
}

export interface FeatureParityItem {
  id: string;
  sourceFeatureId: string;
  xenesisFeatureId: string;
  status: ParityStatus;
  risk: ParityRisk;
  behaviorContracts: BehaviorContract[];
  upgradeReason?: string;
  exclusionReason?: string;
}

export interface FeatureParityMatrix {
  version: 1;
  generatedAt: string;
  items: FeatureParityItem[];
}
