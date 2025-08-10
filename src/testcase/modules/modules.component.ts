import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef,
  inject,
  signal,
  computed,
  WritableSignal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { AlertComponent } from "src/app/shared/alert/alert.component";
import { TestSuiteService } from 'src/app/shared/services/test-suite.service';
import { TestRunService } from 'src/app/shared/services/test-run.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ProductModule } from 'src/app/shared/modles/module.model';
import { ModuleService } from 'src/app/shared/services/module.service';
import { ProductService } from 'src/app/shared/services/product.service';
import { TestCase, TestCaseDetailResponse, TestCaseResponse, UpdateTestCaseRequest, TestCaseAttributeResponse, TestCaseResult } from 'src/app/shared/modles/test-case.model';
import { TestSuite, TestSuiteResponse, TestSuiteWithCasesResponse } from 'src/app/shared/modles/test-suite.model';
import { TestRun, TestRunResponse, TestRunStatus } from 'src/app/shared/modles/test-run.model';
import { IdResponse } from 'src/app/shared/modles/product.model';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

interface Filter {
  slNo: string;
  testCaseId: string;
  useCase: string;
  result: string;
  attributeKey?: string;
  attributeValue?: string;
}

type TestCaseField = keyof Omit<TestCase, 'attributes'> | `attr_${string}`;

interface TableColumn {
  field: TestCaseField | 'attributes' | string;
  header: string;
  width: number;
  noResize?: boolean;
  isAttribute?: boolean;
}

interface UploadedFile {
  url: string;
  loaded: boolean;
}

interface TestRunProgress {
  total: number;
  completed: number;
}

@Component({
  selector: 'app-modules',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, AlertComponent],
  templateUrl: './modules.component.html',
  styleUrls: ['./modules.component.css']
})
export class ModulesComponent implements OnInit, OnDestroy, AfterViewInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private testCaseService = inject(TestCaseService);
  private testSuiteService = inject(TestSuiteService);
  private testRunService = inject(TestRunService);
  private moduleService = inject(ModuleService);
  private productService = inject(ProductService);
  private cdRef = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);

  // State signals
  selectedModule = signal<string | null>(null);
  selectedVersion = '';
  availableVersions: string[] = [];
  versionTestCases = signal<TestCase[]>([]);
  showViewTestCases = false;
  showStartTesting = false;
  showTestSuites = false;
  showTestRuns = false;
  availableAttributes: string[] = [];
  attributeColumns: TableColumn[] = [];
  testRunProgress: WritableSignal<TestRunProgress> = signal({ total: 0, completed: 0 });

  // Data signals
  modules = signal<ProductModule[]>([]);
  testSuites = signal<TestSuite[]>([]);
  testCasePool = signal<TestCase[]>([]);
  testRuns = signal<TestRun[]>([]);
  formArray = new FormArray<FormGroup>([]);
  uploads: UploadedFile[][] = [];
  selectedTestRunId = signal<string | null>(null);
  viewingSuiteId = signal<string | null>(null);

  // Suite selection
  selectedSuiteIds: string[] = [];
  allSuitesSelected = false;

  // Computed properties
  selectedTestSuite = computed(() => {
    if (!this.selectedModule() || !this.showTestSuites) return null;
    return this.testSuites().find(s => s.id === this.selectedModule());
  });

  selectedTestRun = computed(() => {
    if (!this.selectedTestRunId()) return null;
    return this.testRuns().find(r => r.id === this.selectedTestRunId());
  });

  filter: Filter = {
    slNo: '',
    testCaseId: '',
    useCase: '',
    result: '',
  };

  popupIndex: number | null = null;
  popupField: 'actual' | 'remarks' | null = null;
  isPopupOpen: boolean = false;

  isResizing = false;
  currentResizeColumn: TableColumn | null = null;
  startX = 0;
  startWidth = 0;

  scrollContainer: HTMLElement | null = null;
  canScrollLeft = false;
  canScrollRight = false;

  // Alert properties
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' | 'info' = 'success';
  showAlert = false;
  alertDuration = 3000;
  private alertTimeout: any;

  private boundHandleClick = this.handleDocumentClick.bind(this);
  private boundOnResize = this.onResize.bind(this);
  private boundStopResize = this.stopResize.bind(this);
  private productId = signal<string | null>(null);
  selectedProductId = signal<string | null>(null);

  // Fixed column definitions with proper field mappings
  viewColumns: TableColumn[] = [
    { field: 'slNo', header: 'Sl No', width: 80, noResize: true },
    { field: 'version', header: 'Version', width: 100 },
    { field: 'useCase', header: 'Use Case', width: 150 },
    { field: 'testCaseId', header: 'Test Case ID', width: 120 },
    { field: 'scenario', header: 'Scenario', width: 200 },
    { field: 'steps', header: 'Steps', width: 200 },
    { field: 'expected', header: 'Expected', width: 200 }
  ];

  testColumns: TableColumn[] = [
    { field: 'slNo', header: 'Sl No', width: 80, noResize: true },
    { field: 'version', header: 'Version', width: 100 },
    { field: 'useCase', header: 'Use Case', width: 150 },
    { field: 'testCaseId', header: 'Test Case ID', width: 120 },
    { field: 'scenario', header: 'Scenario', width: 200 },
    { field: 'steps', header: 'Steps', width: 200 },
    { field: 'expected', header: 'Expected', width: 200 }
  ];

  // Computed filtered modules
  filteredModules = computed(() => {
    const pid = this.selectedProductId();
    const allModules = this.modules();
    
    if (!pid) return allModules;
    
    return allModules.filter(m => m.productId === pid);
  });

  ngOnInit(): void {
    this.initializeData();
    
    this.route.queryParamMap.subscribe(queryParams => {
      const productId = queryParams.get('productId');
      this.selectedProductId.set(productId);
      
      const shouldLoadAll = queryParams.get('loadAllVersions') === 'true';
      if (shouldLoadAll && this.selectedModule() && !this.showTestSuites) {
        this.selectedVersion = 'all';
        this.onVersionChange();
      }
    });

    this.route.paramMap.subscribe((pm: ParamMap) => {
      const modId = pm.get('moduleId');
      const fallback = this.filteredModules().length ? this.filteredModules()[0].id : null;
      this.onSelectionChange(modId ?? fallback ?? '');
    });

    window.addEventListener('resize', this.updateScrollButtons.bind(this));
  }

  private initializeData(): void {
    this.loadModules();
    this.loadTestSuites();
    this.loadTestRuns();
  }

  private loadModules(): void {
    this.moduleService.getModulesByProduct(this.selectedProductId() || '')
      .pipe(
        catchError(error => {
          this.showAlertMessage('Failed to load modules', 'error');
          return of([]);
        })
      )
      .subscribe(modules => {
        this.modules.set(modules);
        this.extractAvailableAttributes();
        this.initializeAttributeColumns();
      });
  }
  private convertTestSuiteResponseToTestSuite(response: TestSuiteResponse): TestSuite {
  return {
    ...response,
    testCases: response.testCases?.map(tc => this.convertTestCaseResponseToTestCase(tc)) || []
  };
}
private convertTestCaseResponseToTestCase(response: TestCaseResponse): TestCase {
  return {
    ...response,
    testType: response.testType === 'Manual' || response.testType === 'Automation' 
      ? response.testType 
      : 'Manual', // Default to 'Manual' if invalid value
    result: this.parseTestCaseResult(response.result),
    steps: [],
    attributes: [],
    uploads: [],
    actual: '',
    remarks: ''
  };
}

 private loadTestSuites(): void {
  this.testSuiteService.getTestSuites(this.selectedProductId() || '')
    .pipe(
      catchError(error => {
        this.showAlertMessage('Failed to load test suites', 'error');
        return of([] as TestSuiteResponse[]); // Explicitly type the empty array
      }),
      map((responses: TestSuiteResponse[]) => 
        responses.map(res => this.convertTestSuiteResponseToTestSuite(res))
      )
    )
    .subscribe(suites => {
      this.testSuites.set(suites);
    });
}
private loadTestRuns(): void {
  this.testRunService.getTestRuns(this.selectedProductId() || '')
    .pipe(
      catchError(error => {
        this.showAlertMessage('Failed to load test runs', 'error');
        return of([]);
      }),
      map((responses: TestRunResponse[]) => 
        responses.map(res => this.convertTestRunResponseToTestRun(res))
      )
    )
    .subscribe(runs => {
      this.testRuns.set(runs);
    });
}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.scrollContainer = document.querySelector('.table-container');
      this.updateScrollButtons();
    }, 200);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.boundHandleClick);
    document.removeEventListener('mousemove', this.boundOnResize);
    document.removeEventListener('mouseup', this.boundStopResize);
    window.removeEventListener('resize', this.updateScrollButtons.bind(this));
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
  }

  // Suite selection methods
  isSuiteSelected(suiteId: string): boolean {
    return this.selectedSuiteIds.includes(suiteId);
  }

  toggleSuiteSelection(suiteId: string): void {
    if (this.isSuiteSelected(suiteId)) {
      this.selectedSuiteIds = this.selectedSuiteIds.filter(id => id !== suiteId);
    } else {
      this.selectedSuiteIds = [...this.selectedSuiteIds, suiteId];
    }
    this.allSuitesSelected = false;
  }

  toggleSelectAllSuites(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.allSuitesSelected = isChecked;
    
    if (isChecked) {
      this.selectedSuiteIds = this.selectedTestRun()?.testSuites.map(s => s.id) || [];
    } else {
      this.selectedSuiteIds = [];
    }
  }

  areAllSuitesSelected(): boolean {
    if (!this.selectedTestRun()?.testSuites?.length) return false;
    return this.selectedSuiteIds.length === this.selectedTestRun()!.testSuites.length;
  }

  hasSelectedSuites(): boolean {
    return this.selectedSuiteIds.length > 0;
  }

  // Suite status methods
  isSuiteComplete(suiteId: string): boolean {
    const suiteCases = this.getTestCasesForSuite(suiteId);
    return suiteCases.length > 0 && suiteCases.every(tc => tc.result === 'Pass');
  }

  isSuiteInProgress(suiteId: string): boolean {
    const suiteCases = this.getTestCasesForSuite(suiteId);
    const completedCases = suiteCases.filter(tc => tc.result && tc.result !== 'Pending');
    return completedCases.length > 0 && completedCases.length < suiteCases.length;
  }

  isSuiteNotStarted(suiteId: string): boolean {
    const suiteCases = this.getTestCasesForSuite(suiteId);
    return suiteCases.every(tc => !tc.result || tc.result === 'Pending');
  }

  getSuiteCompletedCount(suiteId: string): number {
    const suiteCases = this.getTestCasesForSuite(suiteId);
    return suiteCases.filter(tc => tc.result === 'Pass' || tc.result === 'Fail').length;
  }

  getTestCasesForSuite(suiteId: string): TestCase[] {
    const suite = this.testSuites().find(s => s.id === suiteId);
    return suite?.testCases || [];
  }

  getSuiteName(suiteId: string): string {
    const suite = this.testSuites().find(s => s.id === suiteId);
    return suite?.name || 'Unknown Suite';
  }

  getSuiteDescription(suiteId: string): string {
    const suite = this.testSuites().find(s => s.id === suiteId);
    return suite?.description || '';
  }

  getSuiteTestCaseCount(suiteId: string): number {
    const suite = this.testSuites().find(s => s.id === suiteId);
    return suite?.testCases?.length || 0;
  }

  // View and start testing methods
  viewAllSelectedCases(): void {
    let cases: TestCase[] = [];
    
    if (this.allSuitesSelected) {
      cases = this.selectedTestRun()?.testSuites.flatMap(suite => 
        this.getTestCasesForSuite(suite.id)
      ) || [];
    } else {
      cases = this.selectedSuiteIds.flatMap(suiteId => 
        this.getTestCasesForSuite(suiteId)
      );
    }
    
    this.versionTestCases.set(cases);
    this.showViewTestCases = true;
    this.showStartTesting = false;
    this.initializeFormForTestCases();
  }

  startTestingSelected(): void {
    let cases: TestCase[] = [];
    
    if (this.allSuitesSelected) {
      cases = this.selectedTestRun()?.testSuites.flatMap(suite => 
        this.getTestCasesForSuite(suite.id)
      ) || [];
    } else {
      cases = this.selectedSuiteIds.flatMap(suiteId => 
        this.getTestCasesForSuite(suiteId)
      );
    }
    
    this.versionTestCases.set(cases);
    this.showStartTesting = true;
    this.showViewTestCases = false;
    this.initializeFormForTestCases();
  }

  toggleSelectionMode(showSuites: boolean, showRuns: boolean): void {
    this.showTestSuites = showSuites;
    this.showTestRuns = showRuns;
    this.selectedModule.set(null);
    this.selectedTestRunId.set(null);
    this.viewingSuiteId.set(null);
    this.selectedVersion = '';
    this.versionTestCases.set([]);
    this.showViewTestCases = false;
    this.showStartTesting = false;
    this.formArray.clear();
    this.selectedSuiteIds = [];
    this.allSuitesSelected = false;
    
    if (showRuns) {
      this.loadTestRuns();
    }
  }

  onTestRunChange(runId: string): void {
    this.selectedTestRunId.set(runId);
    this.viewingSuiteId.set(null);
    this.selectedSuiteIds = [];
    this.allSuitesSelected = false;
    
    if (runId) {
      this.updateTestRunProgress();
    } else {
      this.versionTestCases.set([]);
      this.showViewTestCases = false;
      this.showStartTesting = false;
    }
  }

  // Selection change method
  onSelectionChange(id: string): void {
    if (!id) return;

    // Reset view states when changing selection
    this.showViewTestCases = false;
    this.showStartTesting = false;
    this.formArray.clear();
    this.uploads = [];

    if (this.showTestSuites) {
      this.handleTestSuiteSelection(id);
    } else if (this.showTestRuns) {
      this.onTestRunChange(id);
    } else {
      this.handleModuleSelection(id);
    }
  }

  private handleModuleSelection(id: string): void {
    if (!this.filteredModules().some(m => m.id === id)) return;

    this.selectedModule.set(id);
    this.loadModuleVersions(id);
  }

  private loadModuleVersions(moduleId: string): void {
    this.moduleService.getModuleById(this.selectedProductId() || '', moduleId)
      .pipe(
        catchError(error => {
          this.showAlertMessage('Failed to load module versions', 'error');
          return of(null);
        })
      )
      .subscribe(module => {
        if (module) {
          this.availableVersions = [module.version];
          this.loadTestCasesForModule(moduleId, module.version);
        }
      });
  }
  // Helper function to convert TestRunResponse to TestRun
private convertTestRunResponseToTestRun(response: TestRunResponse): TestRun {
  return {
    ...response,
    status: response.status as TestRunStatus,
    testSuites: response.testSuites || []
  };
}

// Helper function to convert TestCaseDetailResponse to TestCase
private convertTestCaseDetailToTestCase(response: TestCaseDetailResponse): TestCase {
  // For detailed responses
  return {
    ...response,
    testType: this.parseTestType(response.testType),
    result: this.parseTestCaseResult(response.result),
    steps: response.steps || [],
    attributes: response.attributes || [],
    uploads: response.uploads || [],
    actual: response.actual || '',
    remarks: response.remarks || ''
  };
}
  private loadTestCasesForModule(moduleId: string, version: string): void {
    this.testCaseService.getTestCasesByModule(moduleId)
      .pipe(
        catchError(() => of([])),
        switchMap(list => {
          if (!list || list.length === 0) return of([] as TestCaseDetailResponse[]);
          return forkJoin(
            list.map(tc => this.testCaseService.getTestCaseDetail(moduleId, tc.id).pipe(
              catchError(() => of(null))
            ))
          ).pipe(map(details => details.filter(d => !!d) as TestCaseDetailResponse[]));
        })
      )
      .subscribe(casesDetail => {
        const cases = casesDetail.map(res => this.convertTestCaseDetailToTestCase(res));
        this.testCasePool.set(cases);
        const filteredCases = cases.filter(tc => tc.moduleId === moduleId && tc.version === version);
        this.versionTestCases.set(filteredCases);
        this.initializeFormForTestCases();
      });
  }
// First, let's create proper type conversion functions at the top of your component



// Helper methods for type-safe parsing
private parseTestType(testType: string): 'Manual' | 'Automation' {
  return testType === 'Manual' || testType === 'Automation' ? testType : 'Manual';
}

private parseTestCaseResult(result?: string): TestCaseResult {
  return result === 'Pass' || result === 'Fail' || result === 'Blocked' 
    ? result 
    : 'Pending';
}

private getDefaultTestSuiteWithCases(suiteId: string, productId: string): TestSuiteWithCasesResponse {
  return {
    id: suiteId,
    productId: productId,
    name: 'Error loading suite',
    description: '',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    testCases: []
  };
}

private handleTestSuiteSelection(suiteId: string): void {
  const productId = this.selectedProductId() || '';
  
  this.testSuiteService.getTestSuiteById(productId, suiteId)
    .pipe(
      catchError(error => {
        this.showAlertMessage('Failed to load test suite', 'error');
        return of(null);
      })
    )
    .subscribe(suite => {
      if (suite) {
        this.selectedModule.set(suiteId);
        this.selectedVersion = '';
        this.showViewTestCases = true;
        this.showStartTesting = false;

        this.testSuiteService.getTestSuiteWithCases(suiteId)
          .pipe(
            catchError(error => {
              this.showAlertMessage('Failed to load test cases for suite', 'error');
              return of({
                ...this.getDefaultTestSuiteWithCases(suiteId, productId),
                testCases: []
              });
            }),
            map(response => ({
  ...response,
  testCases: (response.testCases || []).map(tc => 
    this.convertTestCaseDetailToTestCase({
      ...tc,
      expected: (tc as any).expected || '' // Provide default if missing
    } as TestCaseDetailResponse)
  )
}))
          )
          .subscribe(response => {
            this.versionTestCases.set(response.testCases);
            this.initializeFormForTestCases();
          });
      }
    });
  }

  private initializeFormForTestCases(): void {
    this.formArray.clear();
    this.uploads = [];

    this.versionTestCases().forEach(testCase => {
      this.formArray.push(
        this.fb.group({
          result: [testCase.result || 'Pending'],
          actual: [testCase.actual || ''],
          remarks: [testCase.remarks || '']
        })
      );
      
      this.uploads.push(
        testCase.uploads 
          ? testCase.uploads.map(url => ({ url, loaded: true })) 
          : []
      );
    });

    // Re-extract attributes after loading new test cases
    this.extractAvailableAttributes();
    this.initializeAttributeColumns();

    setTimeout(() => {
      this.updateScrollButtons();
      this.cdRef.detectChanges();
    }, 300);
  }

  onVersionChange(): void {
    const mod = this.selectedModule();
    let cases: TestCase[] = [];

    if (mod && !this.showTestSuites && !this.showTestRuns) {
      if (this.selectedVersion === 'all') {
        cases = this.testCasePool().filter(tc => tc.moduleId === mod);
      } else if (this.selectedVersion) {
        cases = this.testCasePool().filter(
          tc => tc.moduleId === mod && tc.version === this.selectedVersion
        );
      }
    }

    this.versionTestCases.set(cases);
    this.initializeFormForTestCases();
  }

  handleViewAction(): void {
    if (this.showTestRuns && this.selectedTestRun()?.testSuites?.length && !this.viewingSuiteId()) {
      this.viewAllSelectedCases();
    } else {
      this.showViewTestCases = true;
      this.showStartTesting = false;
    }
  }

  handleStartTesting(): void {
    if (this.showTestRuns) {
      this.startTestingSelected();
    } else {
      this.showStartTesting = true;
      this.showViewTestCases = false;
      this.initializeFormForTestCases();
    }
  }

  hasTestCasesToView(): boolean {
    if (this.showTestRuns) {
      return !!this.selectedTestRun()?.testSuites?.length;
    }
    
    if (this.selectedModule()) {
      const moduleCases = this.testCasePool().filter(
        tc => tc.moduleId === this.selectedModule()
      );
      return moduleCases.length > 0;
    }
    
    return false;
  }

  // Save method
  onSave(): void {
    const formValues = this.formArray.value;
    const testCases = this.versionTestCases();

    const updatedTestCases = testCases.map((tc, index) => ({
      ...tc,
      result: formValues[index]?.result || 'Pending',
      actual: formValues[index]?.actual || '',
      remarks: formValues[index]?.remarks || '',
      uploads: this.uploads[index]?.map(u => u.url) || [],
      testRunId: this.showTestRuns ? this.selectedTestRunId() : undefined
    }));

    const updateRequests = updatedTestCases.map(tc => {
      const updateData: UpdateTestCaseRequest = {
        useCase: tc.useCase,
        scenario: tc.scenario,
        testType: tc.testType,
        testTool: tc.testTool,
        result: tc.result,
        actual: tc.actual,
        remarks: tc.remarks,
        attributes: tc.attributes
      };

      return this.testCaseService.updateTestCase(tc.moduleId, tc.id, updateData)
        .pipe(
          catchError(error => {
            console.error('Failed to update test case:', error);
            return of(null);
          })
        );
    });

    forkJoin(updateRequests).subscribe(results => {
      const successCount = results.filter(r => r !== null).length;
      if (successCount > 0) {
        this.showAlertMessage(`${successCount} test case(s) updated successfully!`, 'success');
      }

      if (this.showTestRuns && this.selectedTestRunId()) {
        this.updateTestRunProgress();
      }

      // Reload test cases to get fresh data
      if (this.selectedModule()) {
        this.loadTestCasesForModule(this.selectedModule()!, this.selectedVersion);
      }
    });
  }

private updateTestRunProgress(): void {
  const selectedRun = this.selectedTestRun();
  if (!selectedRun) return;

  const suiteIds = selectedRun.testSuites.map(suite => suite.id);
  const runCases: TestCase[] = [];
  const productId = selectedRun.productId;
  
  const suiteRequests = suiteIds.map(suiteId => 
    this.testSuiteService.getTestSuiteWithCases(suiteId)
      .pipe(
        catchError(error => {
          console.error('Failed to load test suite cases:', error);
          return of({
            ...this.getDefaultTestSuiteWithCases(suiteId, productId),
            testCases: []
          });
        }),
        map(response => ({
          ...response,
          testCases: (response.testCases || []).map(tc => 
            this.convertTestCaseDetailToTestCase(tc)
          )
        }))
      )
  );

  forkJoin(suiteRequests).subscribe({
    next: responses => {
      responses.forEach(response => {
        runCases.push(...response.testCases);
      });

      const total = runCases.length;
      const completed = runCases.filter(tc =>
        tc.result === 'Pass' || tc.result === 'Fail'
      ).length;

      this.testRunProgress.set({ total, completed });

      let status: TestRunStatus = 'Not Started';
      if (total > 0 && completed === total) {
        status = 'Completed';
      } else if (completed > 0) {
        status = 'In Progress';
      }

      this.testRunService.updateTestRunStatus(
        productId,
        this.selectedTestRunId()!,
         status 
      ).pipe(
        catchError(error => {
          console.error('Failed to update test run status:', error);
          return of(null);
        })
      ).subscribe(() => this.loadTestRuns());
    },
    error: error => {
      console.error('Error loading test suite cases:', error);
    }
  });
}
  // Attribute handling methods
  extractAvailableAttributes(): void {
    const allAttributes = new Set<string>();
    this.versionTestCases().forEach(tc => {
      tc.attributes?.forEach(attr => {
        allAttributes.add(attr.key);
      });
    });
    this.availableAttributes = Array.from(allAttributes);
  }

  private initializeAttributeColumns(): void {
    this.attributeColumns = [];
    this.availableAttributes.forEach(key => {
      this.addAttributeColumn(key);
    });
  }

  addAttributeColumn(key: string): void {
    if (!this.attributeColumns.some(col => col.field === `attr_${key}`)) {
      this.attributeColumns.push({
        field: `attr_${key}`,
        header: key,
        width: 150,
        isAttribute: true
      });
    }
  }

  removeAttributeColumn(key: string): void {
    this.attributeColumns = this.attributeColumns.filter(
      col => col.field !== `attr_${key}`
    );
  }

  getAttributeValue(testCase: TestCase, key: string): string {
    const attr = testCase.attributes?.find(a => a.key === key);
    return attr ? attr.value : '';
  }

  // Cell value method with proper field handling
  getCellValue(testCase: TestCase, field: string, index?: number): string {
    if (field === 'slNo' && index !== undefined) {
      return (index + 1).toString();
    }
    
    if (field.startsWith('attr_')) {
      const attrKey = field.substring(5);
      return this.getAttributeValue(testCase, attrKey);
    }

    // Handle steps field specially
    if (field === 'steps') {
      if (testCase.steps && testCase.steps.length > 0) {
        return testCase.steps.map(step => step.steps).join('; ');
      }
      return '';
    }

    // Handle expected field
    if (field === 'expected') {
      if (testCase.steps && testCase.steps.length > 0) {
        return testCase.steps.map(step => step.expectedResult).join('; ');
      }
      return '';
    }

    const value = testCase[field as keyof TestCase];
    return value !== undefined && value !== null ? value.toString() : '';
  }

  onUpload(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (!this.uploads[index]) {
        this.uploads[index] = [];
      }

      Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          this.uploads[index].push({ 
            url: this.sanitizer.bypassSecurityTrustUrl(url) as string,
            loaded: false 
          });
          this.cdRef.detectChanges();
        };
        reader.readAsDataURL(file);
      });

      input.value = '';
    }
  }

  filteredTestCases(): TestCase[] {
    const mod = this.selectedModule();
    return mod && !this.showTestSuites && !this.showTestRuns
      ? this.testCasePool().filter(tc => tc.moduleId === mod) 
      : [];
  }

  // Filtering method with attribute support
  filteredAndSearchedTestCases(): TestCase[] {
    return (this.showTestSuites || this.showTestRuns ? this.versionTestCases() : this.filteredTestCases())
      .filter((tc, i) => {
        const form = this.formGroups()[i];
        const matchesSlNo = !this.filter.slNo || 
          (i + 1).toString().includes(this.filter.slNo);
        const matchesTestCaseId = !this.filter.testCaseId || 
          tc.testCaseId.toLowerCase().includes(this.filter.testCaseId.toLowerCase());
        const matchesUseCase = !this.filter.useCase || 
          tc.useCase.toLowerCase().includes(this.filter.useCase.toLowerCase());
        const matchesResult = !this.filter.result || 
          form.get('result')?.value === this.filter.result;
        
        const matchesAttribute = !this.filter.attributeKey || !this.filter.attributeValue ||
          this.getAttributeValue(tc, this.filter.attributeKey)
            .toLowerCase()
            .includes(this.filter.attributeValue.toLowerCase());

        return matchesSlNo && matchesTestCaseId && matchesUseCase && matchesResult && matchesAttribute;
      });
  }

  formGroups(): FormGroup[] {
    return this.formArray.controls as FormGroup[];
  }

  // Popup methods
  openPopup(index: number, field: 'actual' | 'remarks', event: MouseEvent) {
    event.stopPropagation();

    if (!(this.isPopupOpen && this.popupIndex === index && this.popupField === field)) {
      if (this.popupIndex !== null) {
        this.closePopup(this.popupIndex);
      }
      
      this.popupIndex = index;
      this.popupField = field;
      this.isPopupOpen = true;

      setTimeout(() => {
        document.addEventListener('click', this.boundHandleClick);
      });
    }
  }

  saveAndClosePopup(index: number): void {
    if (this.popupIndex === index) {
      this.cdRef.detectChanges();
      this.closePopup(index);
    }
  }

  closePopup(index: number) {
    if (this.popupIndex === index) {
      this.isPopupOpen = false;
      this.popupIndex = null;
      this.popupField = null;
      document.removeEventListener('click', this.boundHandleClick);
      this.cdRef.detectChanges();
    }
  }

  getFormControl(index: number, controlName: string): FormControl {
    const control = this.formGroups()[index].get(controlName);
    if (!control) throw new Error(`Form control '${controlName}' not found`);
    return control as FormControl;
  }

  private handleDocumentClick(event: MouseEvent) {
    if (this.isPopupOpen && this.popupIndex !== null) {
      const target = event.target as HTMLElement;
      const isInsidePopup = target.closest('.popup-box');
      const isPopupTrigger = target.closest('.popup-cell');
      
      if (!isInsidePopup && !isPopupTrigger) {
        this.closePopup(this.popupIndex);
      }
    }
  }

  // Scroll and resize methods
  scrollTable(offset: number): void {
    if (!this.scrollContainer) return;
    this.scrollContainer.scrollLeft += offset;
    this.updateScrollButtons();
  }

  updateScrollButtons(): void {
    if (!this.scrollContainer) return;
    const { scrollLeft, scrollWidth, clientWidth } = this.scrollContainer;
    this.canScrollLeft = scrollLeft > 0;
    this.canScrollRight = scrollLeft + clientWidth < scrollWidth;
    this.cdRef.detectChanges();
  }

  startResize(event: MouseEvent, column: TableColumn): void {
    if (column.noResize) return;

    this.isResizing = true;
    this.currentResizeColumn = column;
    this.startX = event.pageX;
    this.startWidth = column.width;

    event.preventDefault();
    event.stopPropagation();

    document.addEventListener('mousemove', this.boundOnResize);
    document.addEventListener('mouseup', this.boundStopResize);
  }

  onResize(event: MouseEvent): void {
    if (this.isResizing && this.currentResizeColumn) {
      const dx = event.pageX - this.startX;
      this.currentResizeColumn.width = Math.max(50, this.startWidth + dx);
      this.cdRef.detectChanges();
    }
  }

  stopResize(): void {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.boundOnResize);
    document.removeEventListener('mouseup', this.boundStopResize);
  }

  copyTestCaseLink(testCaseId: string): void {
    const copyUrl = `${window.location.origin}/tester/view-testcase/${testCaseId}`;
    navigator.clipboard.writeText(copyUrl)
      .then(() => {
        this.showAlertMessage('Link copied to clipboard!', 'success');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        this.showAlertMessage('Failed to copy link', 'error');
      });
  }

  showAlertMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    
    this.alertTimeout = setTimeout(() => {
      this.showAlert = false;
      this.cdRef.detectChanges();
    }, this.alertDuration);
  }

  onAlertClose(): void {
    this.showAlert = false;
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
  }

  onImageLoad(event: Event, rowIndex: number, fileIndex: number) {
    this.uploads[rowIndex][fileIndex].loaded = true;
    this.cdRef.detectChanges();
  }

  removeUpload(rowIndex: number, fileIndex: number) {
    this.uploads[rowIndex].splice(fileIndex, 1);
    this.cdRef.detectChanges();
  }

  getRunCompletionPercentage(): number {
    if (!this.selectedTestRunId()) return 0;
    
    const total = this.testRunProgress().total;
    const completed = this.testRunProgress().completed;
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  getCompletedCaseCount(): number {
    return this.testRunProgress().completed;
  }

  getTotalCaseCount(): number {
    return this.testRunProgress().total;
  }

  isImage(url: string): boolean {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  getFileName(url: string): string {
    if (!url) return '';
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    const filenamePart = lastPart.split(';')[0];
    return filenamePart.length > 20 
      ? filenamePart.substring(0, 17) + '...' 
      : filenamePart;
  }

  backToSuiteList(): void {
    this.showStartTesting = false;
    this.showViewTestCases = false;
    this.formArray.clear();
    this.uploads = [];
  }

  // Additional attribute management methods
  onAttributeFilterChange(): void {
    this.cdRef.detectChanges();
  }

  getAvailableAttributeKeys(): string[] {
    return this.availableAttributes;
  }

  addAttributeFilter(key: string): void {
    this.filter.attributeKey = key;
    this.filter.attributeValue = '';
  }

  removeAttributeFilter(): void {
    this.filter.attributeKey = undefined;
    this.filter.attributeValue = undefined;
  }

  hasAttributeFilter(): boolean {
    return !!this.filter.attributeKey;
  }

  // Utility method to get all unique attribute values for a specific key
  getAttributeValues(key: string): string[] {
    const values = new Set<string>();
    this.versionTestCases().forEach(tc => {
      const attr = tc.attributes?.find(a => a.key === key);
      if (attr && attr.value) {
        values.add(attr.value);
      }
    });
    return Array.from(values).sort();
  }

  // Method to toggle attribute column visibility
  toggleAttributeColumn(key: string): void {
    const exists = this.attributeColumns.some(col => col.field === `attr_${key}`);
    if (exists) {
      this.removeAttributeColumn(key);
    } else {
      this.addAttributeColumn(key);
    }
  }

  isAttributeColumnVisible(key: string): boolean {
    return this.attributeColumns.some(col => col.field === `attr_${key}`);
  }

  // Method to get all combined columns (regular + attribute)
  getAllViewColumns(): TableColumn[] {
    return [...this.viewColumns, ...this.attributeColumns];
  }

  getAllTestColumns(): TableColumn[] {
    return [...this.testColumns, ...this.attributeColumns];
  }

  // Enhanced method to get module name for display
  getModuleName(moduleId: string): string {
    const module = this.modules().find(m => m.id === moduleId);
    return module?.name || 'Unknown Module';
  }

  // Method to check if current view has test cases with attributes
  hasTestCasesWithAttributes(): boolean {
    return this.versionTestCases().some(tc => tc.attributes && tc.attributes.length > 0);
  }

  // Method to get attribute statistics
  getAttributeStats(): { [key: string]: { [value: string]: number } } {
    const stats: { [key: string]: { [value: string]: number } } = {};
    
    this.versionTestCases().forEach(tc => {
      tc.attributes?.forEach(attr => {
        if (!stats[attr.key]) {
          stats[attr.key] = {};
        }
        if (!stats[attr.key][attr.value]) {
          stats[attr.key][attr.value] = 0;
        }
        stats[attr.key][attr.value]++;
      });
    });
    
    return stats;
  }

  // Method to export test cases with attributes
  exportTestCasesWithAttributes(): void {
    const cases = this.filteredAndSearchedTestCases();
    const csvContent = this.generateCsvContent(cases);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_cases_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private generateCsvContent(testCases: TestCase[]): string {
    const headers = [
      'Test Case ID', 'Use Case', 'Scenario', 'Version', 'Result', 'Actual', 'Remarks'
    ];
    
    // Add attribute headers
    this.availableAttributes.forEach(attr => {
      headers.push(`Attribute: ${attr}`);
    });

    const rows = testCases.map(tc => {
      const row = [
        tc.testCaseId,
        tc.useCase,
        tc.scenario,
        tc.version,
        tc.result || 'Pending',
        tc.actual || '',
        tc.remarks || ''
      ];

      // Add attribute values
      this.availableAttributes.forEach(attr => {
        row.push(this.getAttributeValue(tc, attr));
      });

      return row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // Method to clear all filters
  clearAllFilters(): void {
    this.filter = {
      slNo: '',
      testCaseId: '',
      useCase: '',
      result: '',
      attributeKey: undefined,
      attributeValue: undefined
    };
  }

  // Method to check if any filters are active
  hasActiveFilters(): boolean {
    return !!(
      this.filter.slNo ||
      this.filter.testCaseId ||
      this.filter.useCase ||
      this.filter.result ||
      this.filter.attributeKey ||
      this.filter.attributeValue
    );
  }
}