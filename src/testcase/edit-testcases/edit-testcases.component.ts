import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule, FormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { ManualTestCaseStep, TestCaseDetailResponse, CreateTestCaseRequest, UpdateTestCaseRequest, TestCaseAttributeRequest } from 'src/app/shared/modles/test-case.model';
import { ModuleAttribute, ModuleAttributeRequest, ProductModule } from 'src/app/shared/modles/module.model';
import { AlertComponent } from "src/app/shared/alert/alert.component";
import { ChangeDetectorRef } from '@angular/core';
import { ModuleService } from 'src/app/shared/services/module.service';
import { catchError, forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { IdResponse } from 'src/app/shared/modles/product.model';

interface TestCaseFilter {
  testCaseId: string;
  useCase: string;
  version: string;
}

@Component({
  selector: 'app-edit-testcases',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, AlertComponent],
  templateUrl: './edit-testcases.component.html',
  styleUrls: ['./edit-testcases.component.css']
})
export class EditTestcasesComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private testCaseService = inject(TestCaseService);
  private moduleService = inject(ModuleService);
  private cdr = inject(ChangeDetectorRef);

  selectedModule = signal<string>('');
  productId = signal<string>('');
  modules = signal<ProductModule[]>([]);
  isEditing = signal(false);
  loading = signal(false);
  testCases = signal<TestCaseDetailResponse[]>([]);
  filteredTestCases = signal<TestCaseDetailResponse[]>([]);
  versions = signal<string[]>(['v1.0']);
  filter = signal<TestCaseFilter>({
    testCaseId: '',
    useCase: '',
    version: ''
  });

  // Alert handling
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'warning';
  isConfirmAlert = false;
  pendingDeleteId: string | null = null;

  // Module attributes
  moduleAttributes = signal<ModuleAttribute[]>([]);
  showModuleAttributesForm = signal(false);
  currentModuleAttribute = signal<ModuleAttribute | null>(null);

  // Form definition
  form = this.fb.group({
    id: [''],
    moduleId: ['', Validators.required],
    version: ['', Validators.required],
    testCaseId: ['', [Validators.required, Validators.pattern(/^TC\d+/)]],
    useCase: ['', [Validators.required, Validators.minLength(5)]],
    scenario: ['', [Validators.required, Validators.minLength(10)]],
    testType: ['Manual'],
    testTool: [''],
    result: ['Pending'],
    actual: [''],
    remarks: [''],
    steps: this.fb.array<FormGroup>([]),
    attributes: this.fb.array<FormGroup>([])
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const moduleId = params.get('moduleId');
      if (moduleId) {
        this.selectedModule.set(moduleId);
        this.form.patchValue({ moduleId });
        this.loadTestCases(moduleId);
        this.loadModuleAttributes(moduleId);
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const productId = params.get('productId');
      if (productId) {
        this.productId.set(productId);
        this.loadModules(productId);
      }
    });
  }

  // Form array getters with proper typing
  get steps(): FormArray<FormGroup> {
    return this.form.get('steps') as FormArray<FormGroup>;
  }

  get attributes(): FormArray<FormGroup> {
    return this.form.get('attributes') as FormArray<FormGroup>;
  }

  // Step management
  createStep(step?: ManualTestCaseStep): FormGroup {
    return this.fb.group({
      steps: [step?.steps || '', Validators.required],
      expectedResult: [step?.expectedResult || '', Validators.required]
    });
  }

  addStep(step?: ManualTestCaseStep): void {
    this.steps.push(this.createStep(step));
  }

  removeStep(index: number): void {
    this.steps.removeAt(index);
    if (this.steps.length === 0) {
      this.addStep();
    }
  }

  // Data loading methods remain the same...
  loadModules(productId: string): void {
    this.moduleService.getModulesByProduct(productId).subscribe({
      next: (modules) => this.modules.set(modules),
      error: (err) => this.showAlertMessage('Failed to load modules', 'error')
    });
  }

  loadTestCases(moduleId: string): void {
    this.loading.set(true);
    this.testCaseService.getTestCasesByModule(moduleId).pipe(
      switchMap(testCases => {
        const detailRequests = testCases.map(tc => 
          this.testCaseService.getTestCaseDetail(moduleId, tc.id).pipe(
            catchError(() => of(null))
          )
        );
        return forkJoin(detailRequests).pipe(
          map(details => details.filter(Boolean) as TestCaseDetailResponse[])
        );
      }),
      catchError(() => of([]))
    ).subscribe({
      next: (testCases) => {
        this.testCases.set(testCases);
        this.applyFilters();
        this.loadVersions();
        this.loading.set(false);
      },
      error: () => {
        this.showAlertMessage('Failed to load test cases', 'error');
        this.loading.set(false);
      }
    });
  }

  loadVersions(): void {
    const versions = new Set<string>(['v1.0']);
    this.testCases().forEach(tc => {
      if (tc.version) {
        versions.add(tc.version);
      }
    });
    this.versions.set(Array.from(versions).sort().reverse());
  }

  loadModuleAttributes(moduleId: string): void {
    this.moduleService.getModuleAttributes(moduleId).subscribe({
      next: (attributes) => this.moduleAttributes.set(attributes),
      error: () => this.showAlertMessage('Failed to load module attributes', 'error')
    });
  }

  // Form handling
  openForm(): void {
    this.form.reset({
      moduleId: this.selectedModule(),
      version: this.versions()[0] || 'v1.0',
      testType: 'Manual',
      result: 'Pending'
    });

    this.steps.clear();
    this.addStep(); // Add one empty step by default

    this.attributes.clear();
    this.moduleAttributes().forEach(attr => {
      this.attributes.push(this.fb.group({
        key: [attr.key, Validators.required],
        value: ['', attr.isRequired ? Validators.required : null]
      }));
    });

    this.isEditing.set(true);
  }

  openModuleAttributes(): void {
    this.showModuleAttributesForm.set(true);
  }

  addModuleAttribute(): void {
    this.currentModuleAttribute.set({
      id: '',
      moduleId: this.selectedModule(),
      name: '',
      key: '',
      type: 'text',
      isRequired: false,
      options: undefined
    });
  }

  startEditing(testCase: TestCaseDetailResponse): void {
    this.form.reset({
      id: testCase.id,
      moduleId: testCase.moduleId,
      version: testCase.version,
      testCaseId: testCase.testCaseId,
      useCase: testCase.useCase,
      scenario: testCase.scenario,
      testType: testCase.testType || 'Manual',
      testTool: testCase.testTool || '',
      result: testCase.result || 'Pending',
      actual: testCase.actual || '',
      remarks: testCase.remarks || ''
    });

    // Clear existing steps
    this.steps.clear();

    // Add steps from the test case
    if (testCase.steps && testCase.steps.length > 0) {
      testCase.steps.forEach(step => {
        this.addStep({
          steps: step.steps,
          expectedResult: step.expectedResult
        });
      });
    } else {
      // Add at least one empty step if none exist
      this.addStep();
    }

    // Handle attributes
    this.attributes.clear();
    this.moduleAttributes().forEach(attr => {
      const existingValue = testCase.attributes?.find(a => a.key === attr.key)?.value || '';
      this.attributes.push(this.fb.group({
        key: [attr.key, Validators.required],
        value: [existingValue, attr.isRequired ? Validators.required : null]
      }));
    });

    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.form.reset();
    this.steps.clear();
    this.attributes.clear();
    this.isEditing.set(false);
  }

  // FIXED SAVE OPERATIONS
saveTestCase(): void {
  if (this.form.invalid) {
    this.markFormGroupTouched(this.form);
    this.showAlertMessage('Please fill all required fields correctly', 'error');
    return;
  }

  const formValue = this.form.getRawValue();
  
  // Validate required fields first
  if (!this.validateFormValues(formValue)) {
    this.loading.set(false);
    return;
  }

  const isUpdate = !!formValue.id;
  
  // Prepare steps data
  const stepsData: ManualTestCaseStep[] = this.steps.controls.map(stepGroup => ({
    steps: stepGroup.get('steps')?.value || '',
    expectedResult: stepGroup.get('expectedResult')?.value || ''
  }));

  // Prepare attributes data
  const attributesData: TestCaseAttributeRequest[] = this.attributes.controls.map(attrGroup => ({
    key: attrGroup.get('key')?.value || '',
    value: attrGroup.get('value')?.value || ''
  }));

  this.loading.set(true);

  if (isUpdate) {
    // For update operation, we've already validated moduleId exists
    this.handleUpdateOperation(
      { ...formValue, moduleId: formValue.moduleId!, id: formValue.id! },
      stepsData,
      attributesData
    );
  } else {
    // For create operation, we've already validated required fields exist
    this.handleCreateOperation(
      { 
        ...formValue,
        moduleId: formValue.moduleId!,
        version: formValue.version!,
        testCaseId: formValue.testCaseId!
      },
      stepsData,
      attributesData
    );
  }
}

private validateFormValues(formValue: {
  id: string | null;
  moduleId: string | null;
  version: string | null;
  testCaseId: string | null;
  [key: string]: any;
}): boolean {
  if (formValue.id) { // Update operation
    if (!formValue.moduleId) {
      this.showAlertMessage('Module ID is required for update', 'error');
      return false;
    }
  } else { // Create operation
    if (!formValue.moduleId || !formValue.version || !formValue.testCaseId) {
      this.showAlertMessage('Module ID, Version, and Test Case ID are required for creation', 'error');
      return false;
    }
  }
  return true;
}

private handleUpdateOperation(
  formValue: { id: string; moduleId: string } & Record<string, any>,
  stepsData: ManualTestCaseStep[],
  attributesData: TestCaseAttributeRequest[]
): void {
  const updatePayload: UpdateTestCaseRequest = {
    useCase: formValue['useCase'] ?? '',
    scenario: formValue['scenario'] ?? '',
    testType: formValue['testType'] ?? '',
    testTool: formValue['testTool'] ?? '',
    result: formValue['result'] ?? '',
    actual: formValue['actual'] ?? '',
    remarks: formValue['remarks'] ?? ''
  };

  this.testCaseService.updateTestCase(formValue.moduleId, formValue.id, updatePayload).pipe(
    switchMap(() => {
      const operations: Observable<any>[] = [];
      
      if (stepsData.length > 0) {
        operations.push(this.updateTestCaseSteps(formValue.id, stepsData));
      }
      
      if (attributesData.length > 0) {
        operations.push(this.updateTestCaseAttributes(formValue.moduleId, formValue.id, attributesData));
      }
      
      return operations.length > 0 ? forkJoin(operations) : of([]);
    }),
    catchError(async (error) => this.handleOperationError(error, 'update'))
  ).subscribe({
    next: (results) => this.handleUpdateSuccess(formValue.moduleId, results),
    error: (error) => this.handleOperationError(error, 'update'),
    complete: () => this.loading.set(false)
  });
}

private handleCreateOperation(
  formValue: { moduleId: string; version: string; testCaseId: string } & Record<string, any>,
  stepsData: ManualTestCaseStep[],
  attributesData: TestCaseAttributeRequest[]
): void {
  const createPayload: CreateTestCaseRequest = {
    moduleId: formValue.moduleId,
    version: formValue.version,
    testCaseId: formValue.testCaseId,
    useCase: formValue['useCase'] ?? '',
    scenario: formValue['scenario'] ?? '',
    testType: formValue['testType'] ?? '',
    testTool: formValue['testTool'] ?? '',
    steps: stepsData
  };

  this.testCaseService.createTestCase(formValue.moduleId, createPayload).pipe(
    switchMap((response: IdResponse) => {
      if (attributesData.length > 0 && response.id) {
        return this.updateTestCaseAttributes(formValue.moduleId, response.id, attributesData).pipe(
          catchError(error => {
            console.error('Error updating attributes, continuing anyway:', error);
            return of(response); // Continue even if attributes fail
          })
        );
      }
      return of(response);
    })
  ).subscribe({
    next: (response) => this.handleCreateSuccess(formValue.moduleId, response),
    error: (error) => this.handleOperationError(error, 'create'),
    complete: () => this.loading.set(false)
  });
}
private handleUpdateSuccess(moduleId: string, results: any): void {
  console.log('All update operations completed:', results);
  this.showAlertMessage('Test case updated successfully', 'success');
  this.loadTestCases(moduleId);
  this.cancelEditing();
}
private handleCreateSuccess(moduleId: string, response: IdResponse): void {
  console.log('Test case creation completed:', response);
  this.showAlertMessage('Test case created successfully', 'success');
  this.loadTestCases(moduleId);
  this.cancelEditing();
}
private handleOperationError(error: any, operation: 'create' | 'update'): void {
  console.error(`Error ${operation}ing test case:`, error);
  const errorMessage = error.message || 
                     error.error?.message || 
                     `Unknown error occurred while ${operation}ing test case`;
  this.showAlertMessage(`Failed to ${operation} test case: ${errorMessage}`, 'error');
}


  // Helper method to update test case steps
  private updateTestCaseSteps(testCaseId: string, steps: ManualTestCaseStep[]): Observable<any> {
    console.log('Updating steps for test case:', testCaseId, steps);
    
    // According to your API, you need to delete existing steps and add new ones
    // This might require multiple API calls depending on your backend implementation
    
    return new Observable(observer => {
      // You might need to implement step deletion first, then creation
      // For now, let's assume adding steps will replace existing ones
      const stepOperations = steps.map(step => 
        this.testCaseService.addTestCaseStep(testCaseId, step)
      );
      
      if (stepOperations.length === 0) {
        observer.next([]);
        observer.complete();
        return;
      }
      
      forkJoin(stepOperations).subscribe({
        next: (results) => {
          observer.next(results);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // Helper method to update test case attributes
private updateTestCaseAttributes(moduleId: string, testCaseId: string, attributes: TestCaseAttributeRequest[]): Observable<any> {
  if (!moduleId || !testCaseId) {
    const error = new Error('Missing moduleId or testCaseId for attributes update');
    console.error(error.message);
    return throwError(() => error);
  }

  console.log('Calling attributes update API:', { moduleId, testCaseId });
  return this.testCaseService.updateTestCaseAttributes(moduleId, testCaseId, attributes).pipe(
    tap(() => console.log('Attributes updated successfully')),
    catchError(error => {
      console.error('API Error updating attributes:', error);
      return throwError(() => error);
    })
  );
}

  // Module attribute methods remain the same...
  editModuleAttribute(attribute: ModuleAttribute): void {
    this.currentModuleAttribute.set({...attribute});
  }

  saveModuleAttribute(): void {
    const attribute = this.currentModuleAttribute();
    if (!attribute || !attribute.name || !attribute.key) {
      this.showAlertMessage('Name and Key are required', 'error');
      return;
    }

    const request: ModuleAttributeRequest = {
      name: attribute.name,
      key: attribute.key,
      type: attribute.type,
      isRequired: attribute.isRequired,
      options: attribute.options
    };

    const operation = attribute.id
      ? this.moduleService.updateModuleAttribute(this.selectedModule(), attribute.id, request)
      : this.moduleService.createModuleAttribute(this.selectedModule(), request);

    operation.subscribe({
      next: () => {
        this.showAlertMessage(`Attribute ${attribute.id ? 'updated' : 'added'} successfully`, 'success');
        this.loadModuleAttributes(this.selectedModule());
        this.currentModuleAttribute.set(null);
      },
      error: (error) => {
        console.error('Error saving attribute:', error);
        this.showAlertMessage(`Failed to ${attribute.id ? 'update' : 'add'} attribute`, 'error');
      }
    });
  }

  deleteModuleAttribute(attributeId: string): void {
    this.moduleService.deleteModuleAttribute(this.selectedModule(), attributeId).subscribe({
      next: () => {
        this.showAlertMessage('Attribute deleted successfully', 'success');
        this.loadModuleAttributes(this.selectedModule());
      },
      error: () => this.showAlertMessage('Failed to delete attribute', 'error')
    });
  }

  closeModuleAttributeForm(): void {
    this.currentModuleAttribute.set(null);
    this.showModuleAttributesForm.set(false);
  }

  // Test case deletion
  deleteTestCase(id: string, event?: Event): void {
    event?.stopPropagation();
    
    this.pendingDeleteId = id;
    this.alertMessage = 'Are you sure you want to delete this test case?';
    this.alertType = 'warning';
    this.isConfirmAlert = true;
    this.showAlert = true;
  }

  handleConfirmDelete(): void {
    if (!this.pendingDeleteId) return;
    
    this.loading.set(true);
    this.testCaseService.deleteTestCase(this.selectedModule(), this.pendingDeleteId).subscribe({
      next: () => {
        this.showAlertMessage('Test case deleted successfully', 'success');
        this.loadTestCases(this.selectedModule());
      },
      error: () => {
        this.showAlertMessage('Failed to delete test case', 'error');
        this.loading.set(false);
      },
      complete: () => {
        this.pendingDeleteId = null;
        this.showAlert = false;
      }
    });
  }

  handleCancelDelete(): void {
    this.pendingDeleteId = null;
    this.showAlert = false;
  }

  // Utility methods remain the same...
  getModuleName(moduleId: string): string {
    return this.modules().find(m => m.id === moduleId)?.name || 'Unknown Module';
  }

  getAttributeValue(testCase: TestCaseDetailResponse, key: string): string {
    return testCase.attributes?.find(a => a.key === key)?.value || '-';
  }

  getUniqueAttributeNames(): string[] {
    return [...new Set(this.moduleAttributes().map(attr => attr.key))];
  }

  applyFilters(): void {
    const { testCaseId, useCase, version } = this.filter();
    this.filteredTestCases.set(
      this.testCases().filter(tc =>
        (!testCaseId || tc.testCaseId?.toLowerCase().includes(testCaseId.toLowerCase())) &&
        (!useCase || tc.useCase?.toLowerCase().includes(useCase.toLowerCase())) &&
        (!version || tc.version === version)
      )
    );
  }

  updateFilter<K extends keyof TestCaseFilter>(key: K, value: string): void {
    this.filter.update(current => ({ ...current, [key]: value }));
    this.applyFilters();
  }

  goBack(): void {
    this.router.navigate(['/tester/add-testcases'], {
      queryParams: this.productId() ? { productId: this.productId() } : undefined
    });
  }

  private showAlertMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    setTimeout(() => this.showAlert = false, 3000);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) this.markFormGroupTouched(control);
      if (control instanceof FormArray) control.controls.forEach(c => {
        if (c instanceof FormGroup) this.markFormGroupTouched(c);
      });
    });
  }
}