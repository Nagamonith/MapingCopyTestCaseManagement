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
import { map, Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
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

// In your TestCaseService
updateTestCase(moduleId: string, id: string, testCase: UpdateTestCaseRequest): Observable<IdResponse> {
  return this.http.put<IdResponse>(`${this.apiUrl}/api/modules/${moduleId}/testcases/${id}`, testCase);
}

createTestCase(moduleId: string, testCase: CreateTestCaseRequest): Observable<IdResponse> {
  return this.http.post<IdResponse>(`${this.apiUrl}/api/modules/${moduleId}/testcases`, testCase);
}
updateTestCaseAttributes(moduleId: string, testCaseId: string, attributes: TestCaseAttributeRequest[]): Observable<void> {
  return this.http.put<void>(`${this.apiUrl}/api/testcases/${testCaseId}/attributes`, attributes);
}
  deleteTestCase(moduleId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/modules/${moduleId}/testcases/${id}`);
  }

  getTestCaseSteps(testCaseId: string): Observable<ManualTestCaseStep[]> {
    return this.http.get<ManualTestCaseStep[]>(`${this.apiUrl}/api/testcases/${testCaseId}/steps`);
  }
addTestCaseStep(testCaseId: string, step: ManualTestCaseStep): Observable<any> {
  return this.http.post(`${this.apiUrl}/testcases/${testCaseId}/steps`, step);
}
deleteTestCaseStep(testCaseId: string, stepId: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/testcases/${testCaseId}/steps/${stepId}`);
}
getTestCaseAttributes(moduleId: string, testCaseId: string): Observable<TestCaseAttributeResponse[]> {
  return this.http.get<TestCaseAttributeResponse[]>(
    `${this.apiUrl}/api/testcases/${testCaseId}/attributes`
  );
}

  addTestCaseAttribute(testCaseId: string, attribute: TestCaseAttributeRequest): Observable<void> {
  return this.http.post<void>(`${this.apiUrl}/testcases/${testCaseId}/attributes`, attribute);
}

deleteTestCaseAttribute(testCaseId: string, key: string): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/testcases/${testCaseId}/attributes/${key}`);
}

  // Helper to get detailed cases for a module by fetching IDs first
  getTestCaseDetailByModule(moduleId: string): Observable<TestCaseDetailResponse[]> {
    return this.getTestCasesByModule(moduleId).pipe(
      map(list => list || []),
      // Fetch details for each case
      switchMap(list => list.length ? forkJoin(list.map(tc => this.getTestCaseDetail(moduleId, tc.id))) : of([] as TestCaseDetailResponse[]))
    ) as unknown as Observable<TestCaseDetailResponse[]>;
  }

  createTestCaseAndSteps(moduleId: string, request: CreateTestCaseRequest): Observable<IdResponse> {
    // Create without steps per Swagger, then add steps individually
    const { steps, ...createOnly } = request as any;
    return this.http.post<IdResponse>(`${this.apiUrl}/api/modules/${moduleId}/testcases`, createOnly).pipe(
      switchMap((idRes: IdResponse) => {
        if (steps && Array.isArray(steps) && idRes?.id) {
          const addSteps$ = steps.map((s: ManualTestCaseStep) =>
            this.addTestCaseStep(idRes.id!, { steps: s.steps, expectedResult: s.expectedResult } as any)
          );
          return forkJoin(addSteps$).pipe(map(() => idRes));
        }
        return of(idRes);
      })
    );
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
  ).pipe(
    map(response => {
      // Transform backend response to match frontend expectations
      if (response.steps && response.expected) {
        response.steps = response.steps.map((step, i) => ({
          ...step,
          expectedResult: response.expected[i]?.expectedResult || ''
        }));
      }
      return response;
    })
  );
}

getProductVersions(productId: string): Observable<ProductVersionResponse[]> {
  return this.http.get<ProductVersionResponse[]>(`${this.apiUrl}/api/products/${productId}/versions`);
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
  syncModuleAttributesToTestCases(moduleId: string): Observable<void> {
  return this.moduleService.getModuleAttributes(moduleId).pipe(
    switchMap(moduleAttributes => {
      // Use getTestCaseDetailByModule which returns TestCaseDetailResponse[]
      return this.getTestCaseDetailByModule(moduleId).pipe(
        switchMap(testCases => {
          const updateRequests = testCases.map(testCase => {
            // Get current attributes - now properly typed
            const currentAttributes = testCase.attributes || [];
            
            // Create new attributes from module
            const newAttributes = moduleAttributes.map(moduleAttr => {
              // Find if this attribute already exists in test case
              const existingAttr = currentAttributes.find(a => a.key === moduleAttr.key);
              
              return {
                key: moduleAttr.key,
                value: existingAttr?.value || '', // Preserve existing value if present
                name: moduleAttr.name,
                type: moduleAttr.type,
                isRequired: moduleAttr.isRequired
              };
            });

            // Merge with any existing attributes not from the module
            const nonModuleAttributes = currentAttributes.filter(
              attr => !moduleAttributes.some(mAttr => mAttr.key === attr.key)
            );
            
            const mergedAttributes = [...newAttributes, ...nonModuleAttributes];

            return this.updateTestCaseAttributes(
              moduleId, 
              testCase.id, 
              mergedAttributes.map(a => ({ 
                key: a.key, 
                value: a.value 
              }))
        )});
          
          return forkJoin(updateRequests).pipe(map(() => {}));
        })
      );
    }),
    catchError(error => {
      console.error('Error syncing module attributes:', error);
      return throwError(() => new Error('Failed to sync module attributes'));
    })
  );
}
  }


export type { ProductModule };
