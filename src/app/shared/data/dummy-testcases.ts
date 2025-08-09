

import { TestCase } from 'src/app/shared/modles/testcase.model';

export const DUMMY_TEST_CASES: TestCase[] = [
  {
    id: '1',
    moduleId: 'mod1',
    version: 'v1.0',
    testCaseId: 'TC101',
    useCase: 'Login Functionality',
    scenario: 'User logs in with valid credentials',
    testType: 'Manual',
    steps: [
      {
        testCaseId: 'TC101',
        steps: 'Enter username and password, then click login',
        expectedResult: 'Dashboard should be displayed',
      }
    ],
    result: 'Pending',
    actual: '',
    remarks: '',
    attributes: [
      { key: 'Priority', value: 'High' },
      { key: 'Browser', value: 'Chrome' }
    ],
    uploads: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    moduleId: 'mod2',
    version: 'v1.0',
    testCaseId: 'TC102',
    useCase: 'Generate Report',
    scenario: 'User generates a monthly report',
    testType: 'WebAPI',
    steps: [
      {
        testCaseId: 'TC102',
        steps: 'Send POST request to /api/report with correct parameters',
        expectedResult: 'Returns status 200 with report data'
      }
    ],
    result: 'Pending',
    actual: '',
    remarks: '',
    attributes: [
      { key: 'Priority', value: 'Medium' },
      { key: 'Environment', value: 'Staging' }
    ],
    uploads: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export type { TestCase };
