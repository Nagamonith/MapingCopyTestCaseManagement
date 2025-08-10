import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TestSuiteService } from 'src/app/shared/services/test-suite.service';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { TestSuite, TestSuiteResponse, CreateTestSuiteRequest, AssignTestCasesRequest } from 'src/app/shared/modles/test-suite.model';
import { TestCaseDetailResponse, TestCaseResponse } from 'src/app/shared/modles/test-case.model';
import { AlertComponent } from 'src/app/shared/alert/alert.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductModule } from 'src/app/shared/modles/module.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, of, tap, forkJoin, map, switchMap } from 'rxjs';

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
        this.testSuites.set(suites);
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
        this.modules.set(modules);
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
    this.suiteName = '';
    this.suiteDescription = '';
    this.selectedModuleId = '';
    this.selectedTestCases.set([]);
    this.availableTestCases.set([]);
  }

  startEditSuite(suiteId: string): void {
    this.isLoadingSuites.set(true);
    this.testSuiteService.getTestSuiteById(this.currentProductId(), suiteId).pipe(
      tap((suite) => {
        if (suite) {
          this.mode.set('edit');
          this.selectedSuiteId.set(suiteId);
          this.suiteName = suite.name;
          this.suiteDescription = suite.description || '';
          this.selectedModuleId = '';
          
          // Load test cases for the suite
          this.testSuiteService.getTestCasesForSuite(suiteId).pipe(
            tap((testCases) => {
              this.selectedTestCases.set(testCases);
              this.isLoadingSuites.set(false);
              
              if (testCases.length > 0) {
                const firstTestCase = testCases[0];
                this.loadTestCasesForModule(firstTestCase.moduleId);
              }
            }),
            catchError(err => {
              console.error('Failed to load suite test cases:', err);
              this.isLoadingSuites.set(false);
              return of([]);
            })
          ).subscribe();
        }
      }),
      catchError(err => {
        console.error('Failed to load test suite:', err);
        this.showAlertMessage('Failed to load test suite details', 'error');
        this.isLoadingSuites.set(false);
        return of(null);
      })
    ).subscribe();
  }

  cancelEdit(): void {
    this.mode.set('list');
    this.selectedSuiteId.set('');
    this.selectedModuleId = '';
    this.selectedTestCases.set([]);
    this.availableTestCases.set([]);
  }

  onModuleSelect(moduleId: string): void {
    this.selectedModuleId = moduleId;
    this.loadTestCasesForModule(moduleId);
  }

  private loadTestCasesForModule(moduleId: string): void {
    this.isLoadingTestCases.set(true);
    this.testCaseService.getTestCasesByModule(moduleId).pipe(
      switchMap(list => {
        if (!list || list.length === 0) return of([] as TestCaseDetailResponse[]);
        return forkJoin(
          list.map(tc => this.testCaseService.getTestCaseDetail(moduleId, tc.id).pipe(
            catchError(() => of(null))
          ))
        ).pipe(map(details => details.filter(d => !!d) as TestCaseDetailResponse[]));
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

  toggleTestCaseSelection(testCase: TestCaseDetailResponse, isChecked: boolean): void {
    if (isChecked) {
      this.selectedTestCases.update(current => [...current, testCase]);
    } else {
      this.selectedTestCases.update(current => 
        current.filter(tc => tc.id !== testCase.id)
      );
    }
  }

  handleCheckboxChange(testCase: TestCaseDetailResponse, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.toggleTestCaseSelection(testCase, isChecked);
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
    if (!this.suiteName.trim()) {
      this.showAlertMessage('Test suite name is required', 'error');
      return;
    }

    if (!this.currentProductId()) {
      this.showAlertMessage('Product ID is required', 'error');
      return;
    }

    if (this.selectedTestCases().length === 0) {
      this.showAlertMessage('Please select at least one test case', 'error');
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
      tap((response) => {
        if (response && response.id) {
          this.assignTestCasesToSuite(response.id);
        }
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
      tap(() => {
        this.assignTestCasesToSuite(this.selectedSuiteId());
      }),
      catchError(err => {
        console.error('Failed to update test suite:', err);
        this.showAlertMessage('Failed to update test suite', 'error');
        this.isSaving.set(false);
        return of(false);
      })
    ).subscribe();
  }

  private assignTestCasesToSuite(suiteId: string): void {
    const request: AssignTestCasesRequest = {
      testCaseIds: this.selectedTestCases().map(tc => tc.id)
    };

    this.testSuiteService.assignTestCasesToSuite(suiteId, request).pipe(
      tap(() => {
        this.showAlertMessage(
          `Test suite ${this.mode() === 'add' ? 'created' : 'updated'} successfully`,
          'success'
        );
        this.loadTestSuites();
        this.isSaving.set(false);
        setTimeout(() => this.cancelEdit(), 1000);
      }),
      catchError(err => {
        console.error('Failed to assign test cases:', err);
        this.showAlertMessage(
          `Test suite ${this.mode() === 'add' ? 'created' : 'updated'} but failed to assign test cases`,
          'warning'
        );
        this.loadTestSuites();
        this.isSaving.set(false);
        setTimeout(() => this.cancelEdit(), 1000);
        return of(null);
      })
    ).subscribe();
  }

  confirmDeleteSuite(suiteId: string): void {
    this.pendingDeleteId.set(suiteId);
    this.alertMessage.set('Are you sure you want to delete this test suite?');
    this.alertType.set('warning');
    this.isConfirmAlert.set(true);
    this.showAlert.set(true);
  }

  handleConfirmDelete(): void {
    const suiteId = this.pendingDeleteId();
    if (!suiteId || !this.currentProductId()) {
      this.showAlert.set(false);
      return;
    }

    this.testSuiteService.deleteTestSuite(this.currentProductId(), suiteId).pipe(
      tap(() => {
        this.showAlertMessage('Test suite deleted successfully', 'success');
        this.loadTestSuites();
      }),
      catchError(err => {
        console.error('Failed to delete test suite:', err);
        this.showAlertMessage('Failed to delete test suite', 'error');
        return of(null);
      })
    ).subscribe();

    this.pendingDeleteId.set(null);
    this.isConfirmAlert.set(false);
    this.showAlert.set(false);
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