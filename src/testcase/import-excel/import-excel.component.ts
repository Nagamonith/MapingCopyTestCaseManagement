// import-excel.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { ModuleService } from 'src/app/shared/services/module.service';
import { ProductService } from 'src/app/shared/services/product.service';
import { CreateTestCaseRequest, TestCaseAttributeRequest, ManualTestCaseStep, TestCaseDetailResponse } from 'src/app/shared/modles/test-case.model';
import { ProductModule } from 'src/app/shared/modles/module.model';
import { IdResponse } from 'src/app/shared/modles/product.model';

@Component({
  selector: 'app-import-excel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-excel.component.html',
  styleUrls: ['./import-excel.component.css']
})
export class ImportExcelComponent {
  fileName = signal<string>('');
  sheetNames = signal<string[]>([]);
  sheetData = signal<Record<string, any[]> | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  currentProduct = signal<{ id: string, name: string } | null>(null);
  modules = signal<ProductModule[]>([]);
  selectedModule = signal<string>('');
  version = signal<string>('1.0'); // Default version

  private router = inject(Router);
  private testCaseService = inject(TestCaseService);
  private moduleService = inject(ModuleService);
  private productService = inject(ProductService);

  constructor() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { productId: string, productName: string };

    if (state) {
      this.currentProduct.set({
        id: state.productId,
        name: state.productName
      });
      this.loadModules(state.productId);
    }
  }

  private loadModules(productId: string) {
    this.moduleService.getModulesByProduct(productId).subscribe({
      next: (modules) => this.modules.set(modules),
      error: (err) => this.errorMessage.set('Failed to load modules')
    });
  }

  handleFileInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.fileName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const binary = e.target.result;
        const workbook = XLSX.read(binary, { type: 'binary' });

        const allSheets: Record<string, any[]> = {};
        workbook.SheetNames.forEach((sheet) => {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' });
          allSheets[sheet] = rows;
        });

        this.sheetNames.set(workbook.SheetNames);
        this.sheetData.set(allSheets);
      } catch (error) {
        this.errorMessage.set('Error processing Excel file. Please try again.');
        console.error('Error processing Excel:', error);
      } finally {
        this.isLoading.set(false);
      }
    };

    reader.onerror = () => {
      this.errorMessage.set('Error reading file. Please try again.');
      this.isLoading.set(false);
    };

    reader.readAsBinaryString(file);
  }

  onSelectSheet(sheetName: string) {
    const product = this.currentProduct();
    const data = this.sheetData();

    if (!product) {
      this.errorMessage.set('No product selected. Please select a product first.');
      return;
    }

    if (!data || !data[sheetName]) {
      this.errorMessage.set('Selected sheet has no data or sheet not found');
      return;
    }

    const firstRow = data[sheetName][0];
    const navigationData = {
      sheetColumns: Object.keys(firstRow),
      sheetData: data[sheetName],
      productId: product.id,
      productName: product.name,
      moduleId: this.selectedModule(),
      version: this.version()
    };

    this.router.navigate(['/tester/mapping', encodeURIComponent(sheetName)], {
      state: navigationData
    }).catch(error => {
      console.error('Navigation error:', error);
      this.errorMessage.set('Failed to navigate. Please try again.');
    });
  }
async saveData() {
  if (!this.sheetData()) {
    this.errorMessage.set('No data to save');
    return;
  }

  if (!this.selectedModule()) {
    this.errorMessage.set('Please select a module first');
    return;
  }

  this.isLoading.set(true);
  this.errorMessage.set('');

  try {
    const moduleId = this.selectedModule();
    const version = this.version();
    const data = this.sheetData();

    if (!data) return;

    // Process each sheet
    for (const sheetName of Object.keys(data)) {
      const rows = data[sheetName];
      
      // Process each row in the sheet
      for (const row of rows) {
        // First create the test case
        const testCaseRequest: CreateTestCaseRequest = {
          moduleId: moduleId,
          version: version,
          testCaseId: row['TestCaseID'] || this.generateTestCaseId(),
          useCase: row['UseCase'] || '',
          scenario: row['Scenario'] || '',
          testType: row['TestType'] || 'Manual',
          testTool: row['TestTool'] || '',
          steps: this.parseSteps(row)
        };

        const createdTestCase = await this.createTestCase(testCaseRequest);
        
        // Then add attributes if they exist
        const attributes = this.parseAttributes(row);
        if (attributes.length > 0) {
          await this.addAttributes(createdTestCase.id, attributes);
        }
      }
    }

    alert('Test cases imported successfully!');
  } catch (error) {
    console.error('Error saving data:', error);
    this.errorMessage.set('Failed to save test cases');
  } finally {
    this.isLoading.set(false);
  }
}

  private async createTestCase(request: CreateTestCaseRequest): Promise<TestCaseDetailResponse> {
  try {
    // First create the test case and get the ID
    const idResponse = await this.testCaseService.createTestCaseAndSteps(request.moduleId, request).toPromise();
    
    if (!idResponse) {
      throw new Error('Failed to create test case');
    }

    // Then fetch the full details using the ID
    const testCaseDetail = await this.testCaseService.getTestCaseById(request.moduleId, idResponse.id).toPromise();
    
    if (!testCaseDetail) {
      throw new Error('Failed to fetch created test case');
    }

    return testCaseDetail;
  } catch (error) {
    console.error('Error creating test case:', error);
    throw error;
  }
}
private addAttributes(testCaseId: string, attributes: TestCaseAttributeRequest[]): Promise<void[]> {
  return Promise.all(
    attributes.map(attr => 
      new Promise<void>((resolve, reject) => {
        this.testCaseService.addTestCaseAttribute(testCaseId, attr).subscribe({
          next: () => resolve(),
          error: (err) => reject(err)
        });
      })
    )
  );
}

  private generateTestCaseId(): string {
    return 'TC-' + Math.random().toString(36).substring(2, 9);
  }

  private parseSteps(row: any): ManualTestCaseStep[] {
    if (!row['Steps']) return [];
    
    try {
      return JSON.parse(row['Steps']);
    } catch {
      // If not JSON, try to parse as string
      return [{
        testCaseId: '',
        steps: row['Steps'] || '',
        expectedResult: row['ExpectedResult'] || ''
      }];
    }
  }

  private parseAttributes(row: any): TestCaseAttributeRequest[] {
    const attributes: TestCaseAttributeRequest[] = [];
    
    // Add all non-standard fields as attributes
    const standardFields = ['TestCaseID', 'UseCase', 'Scenario', 'TestType', 'TestTool', 'Steps', 'ExpectedResult'];
    
    for (const key in row) {
      if (!standardFields.includes(key) && row[key]) {
        attributes.push({
          key: key,
          value: row[key].toString()
        });
      }
    }
    
    return attributes;
  }



  onCancelSheet(sheetName: string) {
    const updated = this.sheetNames().filter((name) => name !== sheetName);
    this.sheetNames.set(updated);

    const updatedData = { ...this.sheetData() };
    delete updatedData[sheetName];
    this.sheetData.set(Object.keys(updatedData).length ? updatedData : null);
  }
}