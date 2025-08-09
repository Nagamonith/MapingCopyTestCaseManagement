// test-case.model.ts
export type TestCaseResult = 'Pass' | 'Fail' | 'Pending' | 'Blocked';

export interface ManualTestCaseStep {
  testCaseId: string;
  steps: string;
  expectedResult: string;
}

export interface TestCaseAttribute {
  key: string;
  value: string;
  type?: string;  // Optional to match ModuleAttribute
  isRequired?: boolean; // Optional to match ModuleAttribute
}

export interface TestCase {
  id: string;
  moduleId: string;
  version: string;
  testCaseId: string;
  useCase: string;
  scenario: string;
  testType: 'Manual' | 'Automation';
  testTool?: string;
  steps?: ManualTestCaseStep[];
  result?: TestCaseResult;
  actual?: string;
  remarks?: string;
  attributes?: TestCaseAttribute[];
  uploads?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestCaseResponse {
  id: string;
  moduleId: string;
  version: string;
  testCaseId: string;
  useCase: string;
  scenario: string;
  testType: string;
  testTool?: string;
  result?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestCaseDetailResponse extends TestCaseResponse {
  steps?: ManualTestCaseStep[];
  attributes?: TestCaseAttribute[];
  uploads?: string[];
  testSuiteIds?: string[];
  actual?: string;          // Add this
  remarks?: string;         // Add this
}
export interface CreateTestCaseRequest {
  moduleId: string;
  version?: string;
  testCaseId: string;
  useCase: string;
  scenario: string;
  testType: string;
  testTool?: string;
  steps?: ManualTestCaseStep[];
}

export interface UpdateTestCaseRequest {
  useCase?: string;
  scenario?: string;
  testType?: string;
  testTool?: string;  // Make sure this is optional
  result?: string;
  actual?: string;
  remarks?: string;
  steps?: ManualTestCaseStep[];
  attributes?: TestCaseAttribute[];
}

export interface TestCaseAttributeRequest {
  key: string;
  value: string;
}

export interface TestCaseAttributeResponse {
  key: string;
  value: string;
}