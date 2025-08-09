import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule, FormsModule, FormGroup, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { ManualTestCaseStep, TestCase, TestCaseResult, TestCaseDetailResponse, CreateTestCaseRequest, UpdateTestCaseRequest, TestCaseAttribute } from 'src/app/shared/modles/test-case.model';
import { ModuleAttribute, ModuleAttributeRequest, ProductModule, CreateModuleRequest } from 'src/app/shared/modles/module.model';
import { AlertComponent } from "src/app/shared/alert/alert.component";
import { ChangeDetectorRef } from '@angular/core';
import { ModuleService } from 'src/app/shared/services/module.service';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

interface TestCaseFilter {
  slNo: string;
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
  testCases = signal<TestCaseDetailResponse[]>([]);
  filteredTestCases = signal<TestCaseDetailResponse[]>([]);
  versions = signal<string[]>([]);
  filter = signal<TestCaseFilter>({
    slNo: '',
    testCaseId: '',
    useCase: '',
    version: ''
  });
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'warning';
  isConfirmAlert = false;
  pendingDeleteId: string | null = null;

  // Module attributes management
  moduleAttributes = signal<ModuleAttribute[]>([]);
  showModuleAttributesForm = signal(false);
  currentModuleAttribute = signal<ModuleAttribute | null>(null);

  form = this.fb.group({
    id: [''],
    moduleId: ['', Validators.required],
    version: ['v1.0', Validators.required],
    testCaseId: ['', [Validators.required, Validators.pattern(/^TC\d+/)]],
    useCase: ['', Validators.required],
    scenario: ['', Validators.required],
    steps: this.fb.array([this.createStep()], Validators.required),
    result: ['Pending' as TestCaseResult],
    actual: [''],
    remarks: [''],
    testType: ['Manual'],
    testTool: [''],
    attributes: this.fb.array([])
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const moduleId = params.get('moduleId');
      if (moduleId) {
        this.selectedModule.set(moduleId);
        this.form.patchValue({ moduleId: moduleId });
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

  ngOnInit(): void {
    this.printData();
  }

  get steps(): FormArray {
    return this.form.get('steps') as FormArray;
  }

  get attributes(): FormArray {
    return this.form.get('attributes') as FormArray;
  }

  createStep(stepText: string = '', expectedResult: string = ''): FormGroup {
    return this.fb.group({
      steps: [stepText, Validators.required],
      expectedResult: [expectedResult, Validators.required]
    });
  }

  addStep(): void {
    this.steps.push(this.createStep());
  }

  removeStep(index: number): void {
    this.steps.removeAt(index);
    if (this.steps.length === 0) {
      this.addStep();
    }
  }

  loadModules(productId: string): void {
    this.moduleService.getModulesByProduct(productId).subscribe({
      next: (modules) => {
        this.modules.set(modules);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading modules:', err);
        this.showAlertMessage('Failed to load modules', 'error');
      }
    });
  }
loadTestCases(moduleId: string): void {
  this.testCaseService.getTestCasesByModule(moduleId).pipe(
    switchMap(testCases => {
      // If you need detailed information for each test case
      const detailRequests = testCases.map(tc => 
        this.testCaseService.getTestCaseDetail(moduleId, tc.id).pipe(
          catchError(err => {
            console.error(`Error loading details for test case ${tc.id}`, err);
            return of(null); // Return null for failed requests
          })
        )
      );
      
      return forkJoin(detailRequests).pipe(
        map((details: any[]) => details.filter(d => d !== null) as TestCaseDetailResponse[]
      ));
    }),
    catchError(err => {
      console.error('Error loading test cases:', err);
      return of([]); // Return empty array on error
    })
  ).subscribe({
    next: (testCaseDetails) => {
      this.testCases.set(testCaseDetails);
      this.applyFilters();
      this.loadVersions();
    },
    error: (err) => {
      console.error('Error in test case loading:', err);
      this.showAlertMessage('Failed to load test cases', 'error');
    }
  });
}

  loadVersions(): void {
    const versions = new Set<string>();
    this.testCases().forEach(tc => {
      if (tc.version) {
        versions.add(tc.version);
      }
    });
    this.versions.set(Array.from(versions));
  }

  loadModuleAttributes(moduleId: string): void {
    this.moduleService.getModuleAttributes(moduleId).subscribe({
      next: (attributes) => {
        this.moduleAttributes.set(attributes);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading module attributes:', err);
        this.showAlertMessage('Failed to load module attributes', 'error');
      }
    });
  }

  getUniqueAttributeNames(): string[] {
    const attributeNames = new Set<string>();
    this.moduleAttributes().forEach(attr => {
      if (attr.key) {
        attributeNames.add(attr.key);
      }
    });
    return Array.from(attributeNames);
  }

  updateFilter<K extends keyof TestCaseFilter>(key: K, value: string): void {
    this.filter.update(current => ({
      ...current,
      [key]: value
    }));
    this.applyFilters();
  }

  private applyFilters(): void {
    const { slNo, testCaseId, useCase, version } = this.filter();
    const filtered = this.testCases().filter(tc => 
      (!testCaseId || (tc.testCaseId && tc.testCaseId.toLowerCase().includes(testCaseId.toLowerCase()))) &&
      (!useCase || (tc.useCase && tc.useCase.toLowerCase().includes(useCase.toLowerCase()))) &&
      (!version || tc.version === version)
    );
    this.filteredTestCases.set(filtered);
  }

  getModuleName(moduleId: string): string {
    const module = this.modules().find(m => m.id === moduleId);
    return module?.name || 'Unknown Module';
  }

  getAttributeValue(testCase: TestCaseDetailResponse, key: string): string {
    const attr = testCase.attributes?.find(a => a.key === key);
    return attr ? attr.value || '' : '';
  }

  addAttribute(key = '', value = ''): void {
    this.attributes.push(
      this.fb.group({
        key: [key, Validators.required],
        value: [value, Validators.required]
      })
    );
  }

  openForm(): void {
    this.form.reset();
    this.attributes.clear();
    this.steps.clear();
    this.addStep();
    
    this.form.patchValue({
      moduleId: this.selectedModule(),
      version: this.versions()[0] || 'v1.0',
      result: 'Pending',
      testType: 'Manual'
    });
    
    this.moduleAttributes().forEach(attr => {
      this.addAttribute(attr.key, '');
    });
    
    this.isEditing.set(true);
  }

  startEditing(testCase: TestCaseDetailResponse): void {
    this.form.reset();
    this.attributes.clear();
    this.steps.clear();

    this.form.patchValue({
      id: testCase.id,
      moduleId: testCase.moduleId,
      version: testCase.version,
      testCaseId: testCase.testCaseId,
      useCase: testCase.useCase,
      scenario: testCase.scenario,
      result: testCase.result as TestCaseResult || 'Pending',
      actual: testCase.actual || '',
      remarks: testCase.remarks || '',
      testType: testCase.testType || 'Manual'
    });

    // Add steps
    if (testCase.steps && testCase.steps.length) {
      testCase.steps.forEach(step => {
        this.steps.push(this.createStep(step.steps, step.expectedResult));
      });
    } else {
      this.addStep();
    }

    // Add attributes
    this.moduleAttributes().forEach(attr => {
      const existingValue = testCase.attributes?.find(a => a.key === attr.key)?.value || '';
      this.addAttribute(attr.key, existingValue);
    });

    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.form.reset();
    this.attributes.clear();
    this.steps.clear();
    this.isEditing.set(false);
  }

  saveTestCase(): void {
    this.markFormGroupTouched(this.form);

    if (this.form.invalid) {
      console.log('Form errors:', this.form.errors);
      this.showAlertMessage('Please fill all required fields correctly', 'error');
      return;
    }

    const formValue = this.form.value;

    const attributes: TestCaseAttribute[] = this.attributes.value.map((attr: any) => ({
      key: attr.key,
      value: attr.value
    }));

    const steps: ManualTestCaseStep[] = this.steps.value.map((step: any) => ({
      testCaseId: formValue.testCaseId || '',
      steps: step.steps,
      expectedResult: step.expectedResult
    }));

    if (formValue.id) {
      // Update existing test case
      const updateRequest: UpdateTestCaseRequest = {
        useCase: formValue.useCase || undefined,
        scenario: formValue.scenario || undefined,
        testType: formValue.testType || undefined,
        result: formValue.result || undefined,
        actual: formValue.actual || undefined,
        remarks: formValue.remarks || undefined,
        steps: steps,
        attributes: attributes.length ? attributes : undefined
      };

      this.testCaseService.updateTestCase(this.selectedModule(), formValue.id, updateRequest)
        .subscribe({
          next: () => {
            this.showAlertMessage('Test case updated successfully!', 'success');
            this.loadTestCases(this.selectedModule());
            this.cancelEditing();
          },
          error: (err) => {
            console.error('Error updating test case:', err);
            this.showAlertMessage('Error updating test case', 'error');
          }
        });
    } else {
      // Create new test case
      const createRequest: CreateTestCaseRequest = {
        moduleId: this.selectedModule(),
        version: formValue.version || 'v1.0',
        testCaseId: formValue.testCaseId || '',
        useCase: formValue.useCase || '',
        scenario: formValue.scenario || '',
        testType: formValue.testType || 'Manual',
        steps: steps
      };

      this.testCaseService.createTestCase(this.selectedModule(), createRequest)
        .subscribe({
          next: () => {
            this.showAlertMessage('Test case created successfully!', 'success');
            this.loadTestCases(this.selectedModule());
            this.cancelEditing();
          },
          error: (err) => {
            console.error('Error creating test case:', err);
            this.showAlertMessage('Error creating test case', 'error');
          }
        });
    }
  }

  openModuleAttributes(): void {
    const moduleId = this.selectedModule();
    if (!moduleId) return;
    this.showModuleAttributesForm.set(true);
  }

  addModuleAttribute(): void {
    this.currentModuleAttribute.set({
      id: '',
      moduleId: this.selectedModule(),
      name: '',
      key: '',
      type: 'text',
      isRequired: false
    });
  }

  editModuleAttribute(attribute: ModuleAttribute): void {
    this.currentModuleAttribute.set({...attribute});
  }

  saveModuleAttribute(): void {
    const attribute = this.currentModuleAttribute();
    if (!attribute) return;
    
    if (!attribute.name || !attribute.key) {
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

    if (attribute.id) {
      // Update existing attribute
      this.moduleService.deleteModuleAttribute(attribute.moduleId, attribute.id)
        .subscribe({
          next: () => {
            this.moduleService.createModuleAttribute(attribute.moduleId, request)
              .subscribe({
                next: () => {
                  this.loadModuleAttributes(this.selectedModule());
                  this.currentModuleAttribute.set(null);
                  this.showAlertMessage('Attribute updated successfully', 'success');
                },
                error: (err) => {
                  console.error('Error updating attribute:', err);
                  this.showAlertMessage('Error updating attribute', 'error');
                }
              });
          },
          error: (err) => {
            console.error('Error deleting old attribute:', err);
            this.showAlertMessage('Error updating attribute', 'error');
          }
        });
    } else {
      // Create new attribute
      this.moduleService.createModuleAttribute(attribute.moduleId, request)
        .subscribe({
          next: () => {
            this.loadModuleAttributes(this.selectedModule());
            this.currentModuleAttribute.set(null);
            this.showAlertMessage('Attribute added successfully', 'success');
          },
          error: (err) => {
            console.error('Error creating attribute:', err);
            this.showAlertMessage('Error creating attribute', 'error');
          }
        });
    }
  }

  deleteModuleAttribute(attributeId: string): void {
    this.moduleService.deleteModuleAttribute(this.selectedModule(), attributeId)
      .subscribe({
        next: () => {
          this.loadModuleAttributes(this.selectedModule());
          this.showAlertMessage('Attribute deleted successfully', 'success');
        },
        error: (err) => {
          console.error('Error deleting attribute:', err);
          this.showAlertMessage('Error deleting attribute', 'error');
        }
      });
  }

  closeModuleAttributeForm(): void {
    this.currentModuleAttribute.set(null);
    this.showModuleAttributesForm.set(false);
  }

  deleteTestCase(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.alertMessage = 'Are you sure you want to delete this test case?';
    this.alertType = 'warning';
    this.isConfirmAlert = true;
    this.showAlert = true;
    this.pendingDeleteId = id;
    this.cdr.detectChanges();
  }

  handleConfirmDelete(): void {
    if (this.pendingDeleteId) {
      this.testCaseService.deleteTestCase(this.selectedModule(), this.pendingDeleteId)
        .subscribe({
          next: () => {
            this.loadTestCases(this.selectedModule());
            this.pendingDeleteId = null;
            this.showAlertMessage('Test case deleted successfully!', 'success');
          },
          error: (err) => {
            console.error('Error deleting test case:', err);
            this.showAlertMessage('Error deleting test case', 'error');
          }
        });
    }
  }

  handleCancelDelete(): void {
    this.showAlert = false;
    this.isConfirmAlert = false;
    this.pendingDeleteId = null;
    this.cdr.detectChanges(); 
  }

  goBack(): void {
    const queryParams = this.productId() ? { productId: this.productId() } : undefined;
    this.router.navigate(['/tester/add-testcases'], { queryParams });
  }

  private showAlertMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    this.isConfirmAlert = false;
    
    setTimeout(() => {
      this.showAlert = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  printData(): void {
    console.log('Selected module:', this.selectedModule());
    console.log('Current test cases:', this.testCases());
  }
}