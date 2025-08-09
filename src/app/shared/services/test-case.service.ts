import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { 
  TestCase, 
  TestCaseResponse, 
  TestCaseDetailResponse, 
  CreateTestCaseRequest, 
  UpdateTestCaseRequest,
  ManualTestCaseStep,
  TestCaseAttribute,
  TestCaseAttributeRequest,
  TestCaseAttributeResponse
} from '../modles/test-case.model';
import { map, Observable } from 'rxjs';
import { IdResponse, ProductVersionResponse } from '../modles/product.model';
import { CreateModuleRequest, ProductModule, UpdateModuleRequest } from '../modles/module.model';
import { ModuleService } from './module.service'; // Make sure the path is correct

@Injectable({
  providedIn: 'root'
})
export class TestCaseService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private moduleService: ModuleService // Now properly injected
  ) { }

 getTestCasesByModule(moduleId: string): Observable<TestCaseResponse[]> {
  return this.http.get<TestCaseResponse[]>(
    `${this.apiUrl}/api/modules/${moduleId}/testcases`
  );
}

  getTestCaseById(moduleId: string, id: string): Observable<TestCaseDetailResponse> {
    return this.http.get<TestCaseDetailResponse>(`${this.apiUrl}/api/modules/${moduleId}/testcases/${id}`);
  }

 createTestCase(moduleId: string, testCase: CreateTestCaseRequest): Observable<IdResponse> {
  return this.http.post<IdResponse>(
    `${this.apiUrl}/api/modules/${moduleId}/testcases`, 
    testCase
  );
}

  updateTestCase(moduleId: string, id: string, testCase: UpdateTestCaseRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/api/modules/${moduleId}/testcases/${id}`, testCase);
  }

  deleteTestCase(moduleId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/modules/${moduleId}/testcases/${id}`);
  }

  getTestCaseSteps(testCaseId: string): Observable<ManualTestCaseStep[]> {
    return this.http.get<ManualTestCaseStep[]>(`${this.apiUrl}/api/testcases/${testCaseId}/steps`);
  }

  addTestCaseStep(testCaseId: string, step: ManualTestCaseStep): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/testcases/${testCaseId}/steps`, step);
  }

  deleteTestCaseStep(testCaseId: string, stepId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/testcases/${testCaseId}/steps/${stepId}`);
  }

  getTestCaseAttributes(testCaseId: string): Observable<TestCaseAttributeResponse[]> {
    return this.http.get<TestCaseAttributeResponse[]>(`${this.apiUrl}/api/testcases/${testCaseId}/attributes`);
  }

  addTestCaseAttribute(testCaseId: string, attribute: TestCaseAttributeRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/testcases/${testCaseId}/attributes`, attribute);
  }

  deleteTestCaseAttribute(testCaseId: string, key: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/testcases/${testCaseId}/attributes/${key}`);
  }

  getTestCaseDetailByModule(moduleId: string): Observable<TestCaseDetailResponse[]> {
    return this.http.get<TestCaseDetailResponse[]>(`${this.apiUrl}/api/modules/${moduleId}/testcases/detail`);
  }

  getModulesByProduct(productId: string): Observable<ProductModule[]> {
    return this.moduleService.getModulesByProduct(productId);
  }
  getTestCasesByProduct(productId: string): Observable<TestCaseResponse[]> {
  return this.http.get<TestCaseResponse[]>(`${this.apiUrl}/api/products/${productId}/testcases`);
}
createModule(productId: string, module: CreateModuleRequest): Observable<IdResponse> {
  return this.http.post<IdResponse>(
    `${this.apiUrl}/api/products/${productId}/modules`, 
    module
  );
  
}
getTestCaseDetail(moduleId: string, testCaseId: string): Observable<TestCaseDetailResponse> {
  return this.http.get<TestCaseDetailResponse>(
    `${this.apiUrl}/api/modules/${moduleId}/testcases/${testCaseId}`
  );
}
getProductVersions(productId: string): Observable<ProductVersionResponse[]> {
  return this.http.get<ProductVersionResponse[]>(`${this.apiUrl}/products/${productId}/versions`);
}
// In test-case.service.ts
getVersionsByModule(moduleId: string): Observable<string[]> {
  return this.getTestCasesByModule(moduleId).pipe(
    map((testCases: any[]) => [...new Set(testCases.map(tc => tc.version))] // Get unique versions
  ));
}
  updateModule(productId: string, moduleId: string, request: UpdateModuleRequest): Observable<ProductModule> {
    return this.http.put<ProductModule>(
      `${this.apiUrl}/api/products/${productId}/modules/${moduleId}`, 
      request
    );
  }

  deleteModule(productId: string, moduleId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/api/products/${productId}/modules/${moduleId}`
    );
  }

}

export type { ProductModule };
