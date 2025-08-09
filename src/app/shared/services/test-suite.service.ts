import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { 
  TestSuite, 
  TestSuiteResponse, 
  TestSuiteWithCasesResponse, 
  CreateTestSuiteRequest,
  AssignTestCasesRequest
} from '../modles/test-suite.model';
import { Observable } from 'rxjs';
import { IdResponse } from '../modles/product.model';
import { TestCaseDetailResponse } from '../modles/test-case.model';

@Injectable({
  providedIn: 'root'
})
export class TestSuiteService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getTestSuites(productId: string): Observable<TestSuiteResponse[]> {
    return this.http.get<TestSuiteResponse[]>(`${this.apiUrl}/api/products/${productId}/testsuites`);
  }

  getTestSuiteById(productId: string, id: string): Observable<TestSuiteResponse> {
    return this.http.get<TestSuiteResponse>(`${this.apiUrl}/api/products/${productId}/testsuites/${id}`);
  }

  createTestSuite(productId: string, suite: CreateTestSuiteRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/api/products/${productId}/testsuites`, suite);
  }

  updateTestSuite(productId: string, id: string, suite: CreateTestSuiteRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/api/products/${productId}/testsuites/${id}`, suite);
  }

  deleteTestSuite(productId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/products/${productId}/testsuites/${id}`);
  }

  getTestSuiteWithCases(testSuiteId: string): Observable<TestSuiteWithCasesResponse> {
    return this.http.get<TestSuiteWithCasesResponse>(`${this.apiUrl}/api/testsuites/${testSuiteId}/testcases`);
  }

  assignTestCasesToSuite(testSuiteId: string, request: AssignTestCasesRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/testsuites/${testSuiteId}/testcases`, request);
  }

  removeTestCaseFromSuite(testSuiteId: string, testCaseId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/testsuites/${testSuiteId}/testcases/${testCaseId}`);
  }
  getTestCasesForSuite(suiteId: string): Observable<TestCaseDetailResponse[]> {
  return this.http.get<TestCaseDetailResponse[]>(`${this.apiUrl}/api/testsuites/${suiteId}/testcases`);
}
}