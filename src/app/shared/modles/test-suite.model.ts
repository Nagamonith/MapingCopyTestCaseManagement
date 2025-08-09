// test-suite.model.ts
import { TestCase, TestCaseResponse } from "./test-case.model";

export interface TestSuite {
  id: string;
  productId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  testCases?: TestCase[];
}

export interface TestSuiteResponse {
  id: string;
  productId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
    testCases?: TestCaseResponse[];
}

export interface TestSuiteWithCasesResponse extends TestSuiteResponse {
  testCases?: TestCaseResponse[];
}

export interface CreateTestSuiteRequest {
  name: string;
  description?: string;
  isActive: boolean;
}

export interface AssignTestCasesRequest {
  testCaseIds: string[];
}

export type { TestCase };
