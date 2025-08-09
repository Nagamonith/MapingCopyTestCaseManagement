  import { TestSuite, TestCaseRef } from 'src/app/shared/modles/test-suite.model';

  export const DUMMY_TEST_SUITES: TestSuite[] = [
    {
      id: 'suite1',
      productId: 'prod1',
      name: 'Login Test Suite',
      description: 'All login related test cases',
      isActive: true,
      testCases: [
        {
          id: 'tcid1', // Unique DB ID of TestCase
          testCaseId: 'TC101',
          moduleId: 'mod1',
          version: 'v1.0'
        },
        {
          id: 'tcid2',
          testCaseId: 'TC102',
          moduleId: 'mod1',
          version: 'v1.1'
        }
      ],
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-15')
    },
    {
      id: 'suite2',
      productId: 'prod1',
      name: 'Report Generation Suite',
      description: 'Test cases for report functionality',
      isActive: true,
      testCases: [
        {
          id: 'tcid3',
          testCaseId: 'TC102',
          moduleId: 'mod2',
          version: 'v1.0'
        },
        {
          id: 'tcid4',
          testCaseId: 'TC116',
          moduleId: 'mod6',
          version: 'v1.0'
        }
      ],
      createdAt: new Date('2025-02-20'),
      updatedAt: new Date('2025-03-10')
    }
  ];
