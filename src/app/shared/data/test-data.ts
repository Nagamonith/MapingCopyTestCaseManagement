// src/app/shared/data/dummy-data.ts
export interface TestCase {
  id: string;
  slNo: number;
  moduleId: string;
  version: string;
  testCaseId: string;
  useCase: string;
  scenario: string;
  steps: string;
  expected: string;
  result?: 'Pass' | 'Fail' | 'Pending' | 'Blocked';
  actual?: string;
  remarks?: string;
  attributes: TestCaseAttribute[];
  uploads?: string[];
}

export interface TestCaseAttribute {
  key: string;
  value: string;
}

export interface ProductModule {
  id: string;
  productId: string;
  version: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  createdAt: Date;
}

export const DUMMY_PRODUCTS: Product[] = [
  { id: '1', name: 'Qualis SPC', createdAt: new Date() },
  { id: '2', name: 'MSA', createdAt: new Date() },
  { id: '3', name: 'FMEA', createdAt: new Date() },
  { id: '4', name: 'Wizard', createdAt: new Date() },
  { id: '5', name: 'APQP', createdAt: new Date() }
];

export const DUMMY_MODULES: ProductModule[] = [
  { id: 'mod1', productId: '1', version: 'v1.0', name: 'Login Module' },
  { id: 'mod2', productId: '1', version: 'v1.0', name: 'Reports Module' },
  { id: 'mod3', productId: '2', version: 'v1.0', name: 'Profile Module' },
  { id: 'mod4', productId: '2', version: 'v1.1', name: 'Cart Module' },
  { id: 'mod5', productId: '3', version: 'v2.0', name: 'Search Module' },
  { id: 'mod6', productId: '3', version: 'v2.0', name: 'Upload Module' },
  { id: 'mod7', productId: '3', version: 'v2.1', name: 'Settings Module' },
];

export const DUMMY_TEST_CASES: TestCase[] = [
  {
    id: '1',
    slNo: 1,
    moduleId: 'mod1',
    version: 'v1.0',
    testCaseId: 'TC101',
    useCase: 'Login Functionality',
    scenario: 'User logs in with valid credentials',
    steps: '1. Enter username\n2. Enter password\n3. Click login',
    expected: 'Dashboard should be displayed',
    result: 'Pending',
    actual: '',
    remarks: '',
    attributes: [],
    uploads: []
  },
  // Include all other test cases here...
];