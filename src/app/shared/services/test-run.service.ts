import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { 
  TestRun, 
  TestRunResponse, 
  CreateTestRunRequest,
  TestRunResultResponse,
  AssignTestSuitesRequest,
  TestRunStatus
} from '../modles/test-run.model';
import { Observable } from 'rxjs';
import { IdResponse } from '../modles/product.model';

@Injectable({
  providedIn: 'root'
})
export class TestRunService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getTestRuns(productId: string): Observable<TestRunResponse[]> {
    return this.http.get<TestRunResponse[]>(`${this.apiUrl}/api/products/${productId}/testruns`);
  }

  getTestRunById(productId: string, id: string): Observable<TestRunResponse> {
    return this.http.get<TestRunResponse>(`${this.apiUrl}/api/products/${productId}/testruns/${id}`);
  }

  createTestRun(productId: string, run: CreateTestRunRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/api/products/${productId}/testruns`, run);
  }

  deleteTestRun(productId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/products/${productId}/testruns/${id}`);
  }

  updateTestRunStatus(productId: string, testRunId: string, status: TestRunStatus): Observable<void> {
    // API expects a plain string body per Swagger
    return this.http.put<void>(
      `${this.apiUrl}/api/products/${productId}/testruns/${testRunId}/status`,
      status
    );
  }

  getTestRunResults(testRunId: string): Observable<TestRunResultResponse[]> {
    return this.http.get<TestRunResultResponse[]>(`${this.apiUrl}/api/testruns/${testRunId}/results`);
  }

  addTestRunResult(testRunId: string, result: TestRunResultResponse): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/testruns/${testRunId}/results`, result);
  }

  assignTestSuitesToRun(testRunId: string, request: AssignTestSuitesRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/testruns/${testRunId}/testsuites`, request);
  }

  removeTestSuiteFromRun(testRunId: string, testSuiteId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/testruns/${testRunId}/testsuites/${testSuiteId}`);
  }
  // No direct API to update name/description in Swagger. Provide a helper that updates status only.
  updateTestRun(
    productId: string,
    testRunId: string,
    _run: CreateTestRunRequest,
    status: { status: TestRunStatus }
  ): Observable<void> {
    return this.updateTestRunStatus(productId, testRunId, status.status);
  }
 getAssignedTestSuites(testRunId: string): Observable<string[]> {
  return this.http.get<string[]>(
    `${this.apiUrl}/api/testruns/${testRunId}/testsuites`
  );
}

assignTestSuites(testRunId: string, suiteIds: string[]): Observable<void> {
  return this.http.post<void>(
    `${this.apiUrl}/api/testruns/${testRunId}/testsuites`,
    { testSuiteIds: suiteIds }
  );
}
  // test-run.service.ts
// In test-run.service.ts

}