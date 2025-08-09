import { TestRun } from 'src/app/shared/modles/test-run.model';

export const DUMMY_TEST_RUNS: TestRun[] = [
  {
    id: 'run1',
    productId: '1', // ✅ Refers to 'Qualis SPC'
    name: 'Login Feature Test Run',
    description: 'Full regression test for login functionality',
    testSuites: [
      {
        id: 'suite1',
        name: 'Login Test Suite'
      }
    ],
    status: 'Completed',
    createdAt: new Date('2025-03-01'),
    updatedAt: new Date('2025-03-01'),
    createdBy: 'admin@test.com'
  },
  {
    id: 'run2',
    productId: '2', // ✅ Refers to 'MSA'
    name: 'Measurement Test Run',
    description: 'Testing MSA module functionality',
    testSuites: [
      {
        id: 'suite2',
        name: 'MSA Suite'
      }
    ],
    status: 'Not Started',
    createdAt: new Date('2025-04-01'),
    updatedAt: new Date('2025-04-01'),
    createdBy: 'qa@team.com'
  },
  {
    id: 'run3',
    productId: '3', // ✅ Refers to 'FMEA'
    name: 'FMEA Sanity Run',
    description: 'Quick sanity check for FMEA features',
    testSuites: [
      {
        id: 'suite3',
        name: 'FMEA Suite'
      }
    ],
    status: 'In Progress',
    createdAt: new Date('2025-04-10'),
    updatedAt: new Date(),
    createdBy: 'tester@example.com'
  }
];
