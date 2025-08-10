import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule, FormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { ManualTestCaseStep, TestCaseDetailResponse, CreateTestCaseRequest, UpdateTestCaseRequest, TestCaseAttributeRequest } from 'src/app/shared/modles/test-case.model';
import { ModuleAttribute, ProductModule } from 'src/app/shared/modles/module.model';
import { AlertComponent } from "src/app/shared/alert/alert.component";
import { ChangeDetectorRef } from '@angular/core';
import { ModuleService } from 'src/app/shared/services/module.service';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

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

  // Data loading
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

    this.steps.clear();
    testCase.steps?.forEach(step => this.addStep(step));

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

  // Save operations
saveTestCase(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.showAlertMessage('Please fill all required fields correctly', 'error');
      return;
    }

    const formValue = this.form.getRawValue();
    const payload: CreateTestCaseRequest | UpdateTestCaseRequest = {
      ...formValue,
      moduleId: formValue.moduleId!,
      version: formValue.version!,
      testCaseId: formValue.testCaseId!,
      useCase: formValue.useCase!,
      scenario: formValue.scenario!,
      testType: formValue.testType!,
      testTool: formValue.testTool || '',
      steps: this.steps.value as ManualTestCaseStep[],
      attributes: this.attributes.value as TestCaseAttributeRequest[]
    };

    this.loading.set(true);

 const operation$: Observable<unknown> = formValue.id 
  ? this.testCaseService.updateTestCase(formValue.moduleId!, formValue.id, payload as UpdateTestCaseRequest)
  : this.testCaseService.createTestCase(formValue.moduleId!, payload as CreateTestCaseRequest);

    operation$.subscribe({
      next: () => {
        this.showAlertMessage(`Test case ${formValue.id ? 'updated' : 'created'} successfully`, 'success');
        this.loadTestCases(formValue.moduleId!);
        this.cancelEditing();
      },
      error: () => {
        this.showAlertMessage(`Failed to ${formValue.id ? 'update' : 'create'} test case`, 'error');
        this.loading.set(false);
      }
    });
  }

  // Module attributes management
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

  editModuleAttribute(attribute: ModuleAttribute): void {
    this.currentModuleAttribute.set({...attribute});
  }

  saveModuleAttribute(): void {
    const attribute = this.currentModuleAttribute();
    if (!attribute || !attribute.name || !attribute.key) {
      this.showAlertMessage('Name and Key are required', 'error');
      return;
    }

    const request = {
      name: attribute.name,
      key: attribute.key,
      type: attribute.type,
      isRequired: attribute.isRequired,
      options: attribute.options
    };

    const operation = attribute.id
      ? this.moduleService.updateModuleAttribute(attribute.moduleId, attribute.id, request)
      : this.moduleService.createModuleAttribute(attribute.moduleId, request);

    operation.subscribe({
      next: () => {
        this.showAlertMessage(`Attribute ${attribute.id ? 'updated' : 'added'} successfully`, 'success');
        this.loadModuleAttributes(this.selectedModule());
        this.currentModuleAttribute.set(null);
      },
      error: () => this.showAlertMessage(`Failed to ${attribute.id ? 'update' : 'add'} attribute`, 'error')
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

  // Utility methods
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