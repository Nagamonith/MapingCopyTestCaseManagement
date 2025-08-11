import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TestSuiteService } from 'src/app/shared/services/test-suite.service';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { TestSuiteResponse, CreateTestSuiteRequest, AssignTestCasesRequest } from 'src/app/shared/modles/test-suite.model';
import { TestCaseDetailResponse, TestCaseResponse } from 'src/app/shared/modles/test-case.model';
import { AlertComponent } from 'src/app/shared/alert/alert.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductModule } from 'src/app/shared/modles/module.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, of, tap, forkJoin, map, switchMap, finalize, Observable, EMPTY } from 'rxjs';

@Component({
  selector: 'app-test-suite',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AlertComponent],
  templateUrl: './test-suite.component.html',
  styleUrls: ['./test-suite.component.css']
})
export class TestSuiteComponent {
  private testSuiteService = inject(TestSuiteService);
  private testCaseService = inject(TestCaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Form fields
  suiteName = '';
  suiteDescription = '';
  selectedModuleId = '';

  // State signals
  mode = signal<'list' | 'add' | 'edit'>('list');
  selectedSuiteId = signal<string>('');
  selectedTestCases = signal<TestCaseDetailResponse[]>([]);
  testSuites = signal<TestSuiteResponse[]>([]);
  currentProductId = signal<string>('');
  modules = signal<ProductModule[]>([]);
  availableTestCases = signal<TestCaseDetailResponse[]>([]);

  // Alert signals
  showAlert = signal(false);
  alertMessage = signal('');
  alertType = signal<'success' | 'error' | 'warning'>('success');
  isConfirmAlert = signal(false);
  pendingDeleteId = signal<string | null>(null);

  // Loading states
  isLoadingSuites = signal(false);
  isLoadingModules = signal(false);
  isLoadingTestCases = signal(false);
  isSaving = signal(false);
  isDeleting = signal(false);

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const productId = params.get('productId');
      if (productId) {
        this.currentProductId.set(productId);
        this.loadTestSuites();
        this.loadModulesForCurrentProduct();
      }
    });
  }

  private loadTestSuites(): void {
    if (!this.currentProductId()) return;

    this.isLoadingSuites.set(true);
    this.testSuiteService.getTestSuites(this.currentProductId()).pipe(
      tap((suites) => {
        this.testSuites.set(suites || []);
        this.isLoadingSuites.set(false);
      }),
      catchError(err => {
        console.error('Failed to load test suites:', err);
        this.showAlertMessage('Failed to load test suites', 'error');
        this.isLoadingSuites.set(false);
        return of([]);
      })
    ).subscribe();
  }

  private loadModulesForCurrentProduct(): void {
    if (!this.currentProductId()) return;

    this.isLoadingModules.set(true);
    this.testCaseService.getModulesByProduct(this.currentProductId()).pipe(
      tap((modules) => {
        this.modules.set(modules || []);
        this.isLoadingModules.set(false);
      }),
      catchError(err => {
        console.error('Failed to load modules:', err);
        this.showAlertMessage('Failed to load modules', 'error');
        this.isLoadingModules.set(false);
        return of([]);
      })
    ).subscribe();
  }

  startAddNewSuite(): void {
    this.mode.set('add');
    this.resetForm();
  }

  private resetForm(): void {
    this.suiteName = '';
    this.suiteDescription = '';
    this.selectedModuleId = '';
    this.selectedTestCases.set([]);
    this.availableTestCases.set([]);
  }

  startEditSuite(suiteId: string): void {
    this.isLoadingSuites.set(true);
    this.selectedSuiteId.set(suiteId);

    // Get suite details and its test cases
    forkJoin([
      this.testSuiteService.getTestSuiteById(this.currentProductId(), suiteId),
      this.testSuiteService.getTestSuiteWithCases(suiteId)
    ]).pipe(
      tap(([suite, suiteWithCases]) => {
        if (suite) {
          this.mode.set('edit');
          this.suiteName = suite.name || '';
          this.suiteDescription = suite.description || '';
          
          // Extract test cases from the suite with cases response
          const testCases = suiteWithCases?.testCases || [];
          
          // Convert TestCaseResponse to TestCaseDetailResponse format
          const detailedTestCases: TestCaseDetailResponse[] = testCases.map(tc => ({
            ...tc,
            steps: [],
            expected: [],
            attributes: [],
            attachments: [],
            testSuiteIds: []
          }));
          
          this.selectedTestCases.set(detailedTestCases);
          
          // If there are test cases, set the module and load available test cases
          if (detailedTestCases.length > 0) {
            this.selectedModuleId = detailedTestCases[0].moduleId || '';
            if (this.selectedModuleId) {
              this.loadTestCasesForModule(this.selectedModuleId);
            }
          }
        }
        this.isLoadingSuites.set(false);
      }),
      catchError(err => {
        console.error('Failed to load test suite:', err);
        this.showAlertMessage('Failed to load test suite details', 'error');
        this.isLoadingSuites.set(false);
        return of([null, null]);
      })
    ).subscribe();
  }

  cancelEdit(): void {
    this.mode.set('list');
    this.selectedSuiteId.set('');
    this.resetForm();
  }

  onModuleSelect(moduleId: string): void {
    this.selectedModuleId = moduleId;
    if (moduleId) {
      this.loadTestCasesForModule(moduleId);
    } else {
      this.availableTestCases.set([]);
    }
  }

  private loadTestCasesForModule(moduleId: string): void {
    if (!moduleId) return;
    
    this.isLoadingTestCases.set(true);
    this.testCaseService.getTestCasesByModule(moduleId).pipe(
      switchMap(testCases => {
        if (!testCases || testCases.length === 0) {
          return of([]);
        }
        // Get detailed information for each test case
        return forkJoin(
          testCases.map(tc => 
            this.testCaseService.getTestCaseDetail(moduleId, tc.id).pipe(
              catchError(err => {
                console.error(`Failed to load details for test case ${tc.id}:`, err);
                return of(null);
              })
            )
          )
        ).pipe(
          map(details => details.filter(d => d !== null) as TestCaseDetailResponse[])
        );
      }),
      tap((testCases) => {
        this.availableTestCases.set(testCases);
        this.isLoadingTestCases.set(false);
      }),
      catchError(err => {
        console.error('Failed to load test cases:', err);
        this.showAlertMessage('Failed to load test cases', 'error');
        this.isLoadingTestCases.set(false);
        return of([]);
      })
    ).subscribe();
  }

  handleCheckboxChange(testCase: TestCaseDetailResponse, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.toggleTestCaseSelection(testCase, isChecked);
  }

  toggleTestCaseSelection(testCase: TestCaseDetailResponse, isChecked: boolean): void {
    if (isChecked) {
      // Add if not already selected
      if (!this.isTestCaseSelected(testCase)) {
        this.selectedTestCases.update(current => [...current, testCase]);
      }
    } else {
      // Remove if selected
      this.selectedTestCases.update(current => 
        current.filter(tc => tc.id !== testCase.id)
      );
    }
  }

  isTestCaseSelected(testCase: TestCaseDetailResponse): boolean {
    return this.selectedTestCases().some(tc => tc.id === testCase.id);
  }

  removeSelectedTestCase(testCaseId: string): void {
    this.selectedTestCases.update(current =>
      current.filter(tc => tc.id !== testCaseId)
    );
  }

  saveTestSuite(): void {
    // Validation
    if (!this.suiteName.trim()) {
      this.showAlertMessage('Test suite name is required', 'error');
      return;
    }

    if (!this.currentProductId()) {
      this.showAlertMessage('Product ID is required', 'error');
      return;
    }

    this.isSaving.set(true);

    if (this.mode() === 'add') {
      this.createTestSuite();
    } else {
      this.updateTestSuite();
    }
  }

  private createTestSuite(): void {
    const request: CreateTestSuiteRequest = {
      name: this.suiteName,
      description: this.suiteDescription,
      isActive: true
    };

    this.testSuiteService.createTestSuite(this.currentProductId(), request).pipe(
      switchMap(response => {
        console.log('Test suite created:', response);
        if (response?.id && this.selectedTestCases().length > 0) {
          console.log('Assigning test cases to suite:', this.selectedTestCases().map(tc => tc.id));
          return this.assignTestCasesToSuite(response.id).pipe(
            map(() => response),
            catchError(err => {
              console.error('Failed to assign test cases:', err);
              // Still show success for suite creation but warn about test case assignment
              this.showAlertMessage('Test suite created but failed to assign some test cases', 'warning');
              return of(response);
            })
          );
        }
        return of(response);
      }),
      tap(response => {
        if (response) {
          if (this.selectedTestCases().length === 0) {
            this.showAlertMessage('Test suite created successfully', 'success');
          } else {
            this.showAlertMessage('Test suite created and test cases assigned successfully', 'success');
          }
          this.loadTestSuites();
          setTimeout(() => this.cancelEdit(), 1000);
        }
        this.isSaving.set(false);
      }),
      catchError(err => {
        console.error('Failed to create test suite:', err);
        this.showAlertMessage('Failed to create test suite', 'error');
        this.isSaving.set(false);
        return of(null);
      })
    ).subscribe();
  }

  private updateTestSuite(): void {
    const request: CreateTestSuiteRequest = {
      name: this.suiteName,
      description: this.suiteDescription,
      isActive: true
    };

    this.testSuiteService.updateTestSuite(
      this.currentProductId(),
      this.selectedSuiteId(),
      request
    ).pipe(
      switchMap(() => {
        // For update, we need to handle existing test case assignments
        if (this.selectedTestCases().length > 0) {
          return this.assignTestCasesToSuite(this.selectedSuiteId()).pipe(
            catchError(err => {
              console.error('Failed to assign test cases during update:', err);
              this.showAlertMessage('Test suite updated but failed to assign some test cases', 'warning');
              return of(null);
            })
          );
        }
        return of(null);
      }),
      tap(() => {
        this.showAlertMessage('Test suite updated successfully', 'success');
        this.loadTestSuites();
        setTimeout(() => this.cancelEdit(), 1000);
        this.isSaving.set(false);
      }),
      catchError(err => {
        console.error('Failed to update test suite:', err);
        this.showAlertMessage('Failed to update test suite', 'error');
        this.isSaving.set(false);
        return of(null);
      })
    ).subscribe();
  }

  private assignTestCasesToSuite(suiteId: string): Observable<void> {
    const testCaseIds = this.selectedTestCases()
      .map(tc => tc.id)
      .filter(id => id && id.trim() !== '') as string[];
    
    console.log('Test case IDs to assign:', testCaseIds);
    
    if (testCaseIds.length === 0) {
      console.log('No valid test case IDs to assign');
      return of(void 0);
    }

    const request: AssignTestCasesRequest = {
      testCaseIds: testCaseIds
    };

    console.log('Assigning test cases with request:', request);

    return this.testSuiteService.assignTestCasesToSuite(suiteId, request).pipe(
      tap(() => {
        console.log('Test cases assigned successfully');
      }),
      catchError(err => {
        console.error('Failed to assign test cases:', err);
        throw err; // Re-throw to be handled by the calling method
      })
    );
  }

  confirmDeleteSuite(suiteId: string): void {
    this.pendingDeleteId.set(suiteId);
    this.alertMessage.set('Are you sure you want to delete this test suite?');
    this.alertType.set('warning');
    this.isConfirmAlert.set(true);
    this.showAlert.set(true);
  }

  handleConfirmDelete(forceDelete = false): void {
    const suiteId = this.pendingDeleteId();
    if (!suiteId || !this.currentProductId()) {
      this.showAlert.set(false);
      return;
    }

    this.isDeleting.set(true);
    this.showAlert.set(false);

    this.testSuiteService.deleteTestSuite(this.currentProductId(), suiteId, forceDelete).pipe(
      tap(() => {
        this.showAlertMessage('Test suite deleted successfully', 'success');
        this.loadTestSuites();
      }),
      catchError(err => {
        if (err.status === 404) {
          this.showAlertMessage('Test suite endpoint not found', 'error');
        }
        else if (err.status === 409 || err.message.includes('referenced')) {
          this.alertMessage.set(
            'This test suite contains references. Delete anyway?'
          );
          this.alertType.set('warning');
          this.isConfirmAlert.set(true);
          this.showAlert.set(true);
        }
        else {
          this.showAlertMessage(err.message || 'Failed to delete test suite', 'error');
        }
        return EMPTY;
      }),
      finalize(() => {
        this.isDeleting.set(false);
        this.pendingDeleteId.set(null);
      })
    ).subscribe();
  }

  handleCancelDelete(): void {
    this.showAlert.set(false);
    this.isConfirmAlert.set(false);
    this.pendingDeleteId.set(null);
  }

  private showAlertMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    this.showAlert.set(true);
    setTimeout(() => this.showAlert.set(false), 3000);
  }

  getModuleName(moduleId: string): string {
    const module = this.modules().find(m => m.id === moduleId);
    return module ? module.name : 'Unknown Module';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}