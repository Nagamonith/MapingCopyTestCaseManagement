import { Component, computed, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { TestRunService } from 'src/app/shared/services/test-run.service';
import { TestSuiteService } from 'src/app/shared/services/test-suite.service';
import { ActivatedRoute } from '@angular/router';
import { of, BehaviorSubject, switchMap, combineLatest, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
  private testCaseService = inject(TestCaseService);
  private testRunService = inject(TestRunService);
  private testSuiteService = inject(TestSuiteService);
  private route = inject(ActivatedRoute);

  // Signals for selections and UI state
  selectedModule = signal<string>('');
  filterStatus = signal<'All' | 'Pass' | 'Fail' | 'Pending'>('All');
  selectedProductId = signal<string>('');
  showTestRunResults = signal(false);
  selectedTestRunId = signal<string>('');
  selectedSuiteId = signal<string>('');
  expandedSuites = signal<Set<string>>(new Set());

  // BehaviorSubjects to trigger API calls
  private productId$ = new BehaviorSubject<string>('');
  private moduleId$ = new BehaviorSubject<string>('');

  // Data streams
  modules$ = this.productId$.pipe(
    switchMap(productId => productId ? this.testCaseService.getModulesByProduct(productId) : of([]))
  );

  testCases$ = this.moduleId$.pipe(
    switchMap(moduleId => moduleId ? this.testCaseService.getTestCasesByModule(moduleId) : of([]))
  );

  testRuns$ = this.productId$.pipe(
    switchMap(productId => productId ? this.testRunService.getTestRuns(productId) : of([]))
  );

  // Signals holding the latest fetched data
  modules = signal<any[]>([]);
  testCases = signal<any[]>([]);
  testRuns = signal<any[]>([]);

  // Computed filtered test cases based on filterStatus
  filteredTestCases = computed(() => {
    const status = this.filterStatus();
    return this.testCases().filter(tc =>
      status === 'All' ? true : tc.result === status
    );
  });

  // Stats based on testCases signal
  stats = computed(() => {
    const cases = this.testCases();
    return {
      total: cases.length,
      pass: cases.filter(tc => tc.result === 'Pass').length,
      fail: cases.filter(tc => tc.result === 'Fail').length,
      pending: cases.filter(tc => !tc.result || tc.result === 'Pending').length
    };
  });

  // Computed test run stats for selected test run
  testRunStats = signal<any | null>(null);

  // Computed test cases of selected suite
  suiteTestCases = signal<any[]>([]);

  constructor() {
    // Sync BehaviorSubjects with signals
    effect(() => {
      this.productId$.next(this.selectedProductId());
    });

    effect(() => {
      this.moduleId$.next(this.selectedModule());
    });

    // Subscribe to observables and update signals
    this.modules$.subscribe(modules => this.modules.set(modules));
    this.testCases$.subscribe(testCases => this.testCases.set(testCases));
    this.testRuns$.subscribe(testRuns => this.testRuns.set(testRuns));

    // Watch for selectedTestRunId changes to update testRunStats
    effect(() => {
      const runId = this.selectedTestRunId();
      const productId = this.selectedProductId();
      if (!runId || !productId) {
        this.testRunStats.set(null);
        this.suiteTestCases.set([]);
        return;
      }
      // Load detailed test run stats asynchronously
      this.loadTestRunStats(productId, runId);
    });

    // Watch selectedSuiteId to load suite test cases
    effect(() => {
      const suiteId = this.selectedSuiteId();
      if (!suiteId) {
        this.suiteTestCases.set([]);
        return;
      }
      this.loadSuiteTestCases(suiteId);
    });

    // Set selectedProductId from query params on initialization
    this.route.queryParams.subscribe(params => {
      if (params['productId']) {
        this.selectedProductId.set(params['productId']);
      }
    });
  }

  ngOnInit() {}

  private async loadTestRunStats(productId: string, runId: string) {
    try {
      const testRun = await firstValueFrom(this.testRunService.getTestRunById(productId, runId));
      if (!testRun) {
        this.testRunStats.set(null);
        return;
      }

      let totalCases = 0;
      let passedCases = 0;
      let failedCases = 0;
      let pendingCases = 0;

      const suiteStatsPromises = testRun.testSuites.map(async (suite: any) => {
        const suiteCases = await firstValueFrom(this.testSuiteService.getTestCasesForSuite(suite.id));

        const suiteTotal = suiteCases.length;
        const suitePassed = suiteCases.filter((tc: any) => tc.result === 'Pass').length;
        const suiteFailed = suiteCases.filter((tc: any) => tc.result === 'Fail').length;
        const suitePending = suiteTotal - suitePassed - suiteFailed;

        totalCases += suiteTotal;
        passedCases += suitePassed;
        failedCases += suiteFailed;
        pendingCases += suitePending;

        return {
          suiteId: suite.id,
          suiteName: suite.name,
          total: suiteTotal,
          passed: suitePassed,
          failed: suiteFailed,
          pending: suitePending,
          completion: suiteTotal > 0 ? Math.round((suitePassed / suiteTotal) * 100) : 0
        };
      });

      const suiteStats = await Promise.all(suiteStatsPromises);

      this.testRunStats.set({
        runName: testRun.name,
        total: totalCases,
        passed: passedCases,
        failed: failedCases,
        pending: pendingCases,
        completion: totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0,
        suiteStats: suiteStats,
        metadata: {
          description: testRun.description || '',
          createdBy: testRun.createdBy || '',
          createdAt: testRun.createdAt ? new Date(testRun.createdAt).toLocaleDateString() : '',
          updatedAt: testRun.updatedAt ? new Date(testRun.updatedAt).toLocaleDateString() : '',
          status: testRun.status || ''
        }
      });
    } catch (error) {
      console.error('Error loading test run stats:', error);
      this.testRunStats.set(null);
    }
  }

  private async loadSuiteTestCases(suiteId: string) {
    try {
      const cases = await firstValueFrom(this.testSuiteService.getTestCasesForSuite(suiteId));
      this.suiteTestCases.set(cases);
    } catch (error) {
      console.error('Error loading suite test cases:', error);
      this.suiteTestCases.set([]);
    }
  }

  async getModuleName(moduleId: string): Promise<string> {
    const modules = this.modules();
    return modules.find(m => m.id === moduleId)?.name || 'Unknown Module';
  }

  async getSelectedSuiteName(): Promise<string> {
    const stats = this.testRunStats();
    if (!stats) return '';
    const suite = stats.suiteStats.find((s: any) => s.suiteId === this.selectedSuiteId());
    return suite ? suite.suiteName : '';
  }

  toggleSuiteExpansion(suiteId: string): void {
    const expanded = new Set(this.expandedSuites());
    if (expanded.has(suiteId)) {
      expanded.delete(suiteId);
    } else {
      expanded.add(suiteId);
    }
    this.expandedSuites.set(expanded);
  }

  isSuiteExpanded(suiteId: string): boolean {
    return this.expandedSuites().has(suiteId);
  }

  copyTestCaseLink(testCaseId: string): void {
    const baseUrl = window.location.origin;
    const copyUrl = `${baseUrl}/tester/view-testcase/${testCaseId}`;

    navigator.clipboard.writeText(copyUrl).then(() => {
      alert('Test case link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  async exportResults(): Promise<void> {
    const modules = this.modules();
    const module = modules.find(m => m.id === this.selectedModule());
    if (!module) return;

    const testCases = this.filteredTestCases();

    const data = testCases.map((tc, index) => ({
      'Sl.No': index + 1,
      'Test Case ID': tc.testCaseId,
      'Use Case': tc.useCase,
      'Scenario': tc.scenario,
      'Steps': tc.steps?.map((s: any) => s.steps).join('\n') || '',
      'Expected': tc.steps?.map((s: any) => s.expectedResult).join('\n') || '',
      'Result': tc.result || '',
      'Actual': tc.actual || '',
      'Remarks': tc.remarks || '',
      ...tc.attributes?.reduce((acc: Record<string, string>, attr: any) => {
        acc[attr.key] = attr.value;
        return acc;
      }, {} as Record<string, string>)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Results');
    XLSX.writeFile(wb, `${module.name}_Test_Results.xlsx`);
  }

  async exportAllTestSuites(): Promise<void> {
    const stats = this.testRunStats();
    if (!stats) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Test Run Name', stats.runName],
      ['Description', stats.metadata.description],
      ['Created By', stats.metadata.createdBy],
      ['Created At', stats.metadata.createdAt],
      ['Updated At', stats.metadata.updatedAt],
      ['Status', stats.metadata.status],
      [],
      ['Total Test Cases', stats.total],
      ['Passed', stats.passed],
      ['Failed', stats.failed],
      ['Pending', stats.pending],
      ['Completion %', stats.completion]
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Add sheets for each suite
    for (const suite of stats.suiteStats) {
      const suiteCases = await firstValueFrom(this.testSuiteService.getTestCasesForSuite(suite.suiteId));

      const suiteData = suiteCases?.map((testCase: any) => ({
        'Sl.No': testCase.slNo,
        'Test Case ID': testCase.testCaseId,
        'Use Case': testCase.useCase,
        'Scenario': testCase.scenario,
        'Steps': testCase.steps?.map((s: any) => s.steps).join('\n') || '',
        'Expected': testCase.steps?.map((s: any) => s.expectedResult).join('\n') || '',
        'Result': testCase.result || 'Pending',
        'Actual': testCase.actual || '',
        'Remarks': testCase.remarks || ''
      })) || [];

      const suiteWs = XLSX.utils.json_to_sheet(suiteData);
      XLSX.utils.book_append_sheet(wb, suiteWs, suite.suiteName.substring(0, 31));
    }

    XLSX.writeFile(wb, `${stats.runName}_All_Test_Suites.xlsx`);
  }

  async exportSingleSuite(suiteId: string): Promise<void> {
    const stats = this.testRunStats();
    if (!stats) return;

    const suite = stats.suiteStats.find((s: any) => s.suiteId === suiteId);
    if (!suite) return;

    const suiteCases = await firstValueFrom(this.testSuiteService.getTestCasesForSuite(suiteId));

    if (!suiteCases || suiteCases.length === 0) {
      alert('No test cases found in this suite');
      return;
    }

    const data = suiteCases.map((testCase: any) => ({
      'Sl.No': testCase.slNo,
      'Test Case ID': testCase.testCaseId,
      'Use Case': testCase.useCase,
      'Scenario': testCase.scenario,
      'Steps': testCase.steps?.map((s: any) => s.steps).join('\n') || '',
      'Expected': testCase.steps?.map((s: any) => s.expectedResult).join('\n') || '',
      'Result': testCase.result || 'Pending',
      'Actual': testCase.actual || '',
      'Remarks': testCase.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, suite.suiteName.substring(0, 31));
    XLSX.writeFile(wb, `${suite.suiteName}_Test_Cases.xlsx`);
  }
}
