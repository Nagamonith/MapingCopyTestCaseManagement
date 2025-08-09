import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import * as XLSX from 'xlsx';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { ModuleService } from 'src/app/shared/services/module.service';
import { ProductModule } from 'src/app/shared/modles/module.model';
import { ProductVersionRequest, IdResponse } from 'src/app/shared/modles/product.model';
import { catchError, of } from 'rxjs';
import { ManualTestCaseStep, TestCaseAttribute, TestCaseDetailResponse } from 'src/app/shared/modles/test-case.model';

@Component({
  selector: 'app-add-testcases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './add-testcases.component.html',
  styleUrls: ['./add-testcases.component.css']
})
export class AddTestcasesComponent implements OnInit {
  private testCaseService = inject(TestCaseService);
  private moduleService = inject(ModuleService);
  private route = inject(ActivatedRoute);

  selectedModule = signal<string | null>(null);
  selectedVersion = signal<string | null>(null);
  showAddModuleForm = false;
  showAddVersionForm = false;
  newModuleName = '';
  newVersionName = 'v1.0';
  productId = signal<string | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  modules = signal<ProductModule[]>([]);
  versions = signal<string[]>([]);

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.productId.set(params.get('productId'));
      this.loadModules();
    });
  }

  loadModules() {
    const productId = this.productId();
    if (productId) {
      this.isLoading.set(true);
      this.moduleService.getModulesByProduct(productId).pipe(
        catchError(err => {
          this.errorMessage.set('Failed to load modules');
          console.error(err);
          return of([]);
        })
      ).subscribe(modules => {
        this.modules.set(modules);
        this.isLoading.set(false);
      });
    }
  }

  onModuleChange(moduleId: string): void {
    this.selectedModule.set(moduleId);
    this.selectedVersion.set(null);
    this.loadVersionsForModule(moduleId);
    this.resetForms();
  }

  loadVersionsForModule(moduleId: string) {
    this.isLoading.set(true);
    this.testCaseService.getTestCasesByModule(moduleId).pipe(
      catchError(err => {
        this.errorMessage.set('Failed to load versions');
        console.error(err);
        return of([]);
      })
    ).subscribe(testCases => {
      const uniqueVersions = [...new Set(testCases.map(tc => tc.version))];
      this.versions.set(uniqueVersions);
      this.isLoading.set(false);
    });
  }

  addNewVersion(): void {
    if (!this.newVersionName.trim()) {
      this.errorMessage.set('Version name is required');
      return;
    }

    if (!this.selectedModule()) {
      this.errorMessage.set('Please select a module first');
      return;
    }

    const module = this.modules().find(m => m.id === this.selectedModule());
    if (!module) return;

    this.isLoading.set(true);
    const versionRequest: ProductVersionRequest = {
      version: this.newVersionName,
      isActive: true
    };

    this.moduleService.createModule(module.productId, {
      productId: module.productId,
      name: this.newModuleName,
      version: this.newVersionName,
      isActive: true
    }).pipe(
      catchError(err => {
        this.errorMessage.set('Failed to add version');
        console.error(err);
        return of({ id: '' } as IdResponse);
      })
    ).subscribe(response => {
      if (response.id) {
        this.selectedVersion.set(this.newVersionName);
        this.loadModules(); // Refresh modules list
        this.loadVersionsForModule(this.selectedModule()!); // Refresh versions list
      }
      this.isLoading.set(false);
      this.resetForms();
    });
  }

exportToExcel(): void {
  if (!this.selectedModule()) {
    this.errorMessage.set('Please select a module first');
    return;
  }

  const module = this.modules().find(m => m.id === this.selectedModule());
  if (!module) return;

  this.isLoading.set(true);
  // Use getTestCaseDetailByModule instead of getTestCasesByModule
  this.testCaseService.getTestCaseDetailByModule(module.id).pipe(
    catchError(err => {
      this.errorMessage.set('Failed to load test cases');
      console.error(err);
      return of([]);
    })
  ).subscribe((testCases: TestCaseDetailResponse[]) => {
    const wb = XLSX.utils.book_new();

    // Group test cases by version
    const testCasesByVersion = testCases.reduce((acc, tc) => {
      if (!acc[tc.version]) {
        acc[tc.version] = [];
      }
      acc[tc.version].push(tc);
      return acc;
    }, {} as Record<string, TestCaseDetailResponse[]>);

    // Create a worksheet for each version
    Object.entries(testCasesByVersion).forEach(([version, cases]) => {
      const formattedData = cases.map(tc => {
        const stepText = tc.steps?.map((step: ManualTestCaseStep, idx: number) =>
          `${idx + 1}. ${step.steps} → ${step.expectedResult}`
        ).join('\n') || '';

        const attributes = tc.attributes?.reduce((acc: Record<string, string>, attr: TestCaseAttribute) => {
          acc[attr.key] = attr.value;
          return acc;
        }, {}) || {};

        return {
          'Test Case ID': tc.testCaseId,
          'Use Case': tc.useCase,
          'Scenario': tc.scenario,
          'Steps': stepText,
          'Result': tc.result || '',
          'Actual': tc.actual || '',
          'Remarks': tc.remarks || '',
          ...attributes
        };
      });

      if (formattedData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(formattedData);
        XLSX.utils.book_append_sheet(wb, ws, version);
      }
    });

    XLSX.writeFile(wb, `${module.name.replace(/\s+/g, '_')}_Test_Cases.xlsx`);
    this.isLoading.set(false);
  });
}

  private resetForms(): void {
    this.showAddModuleForm = false;
    this.showAddVersionForm = false;
    this.newModuleName = '';
    this.newVersionName = 'v1.0';
    this.errorMessage.set(null);
  }
}