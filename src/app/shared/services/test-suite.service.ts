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
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IdResponse } from '../modles/product.model';
import { TestCaseDetailResponse } from '../modles/test-case.model';

@Injectable({
  providedIn: 'root'
})
export class TestSuiteService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  getTestSuites(productId: string): Observable<TestSuiteResponse[]> {
    if (!productId) {
      return throwError(() => new Error('Product ID is required'));
    }
    
    return this.http.get<TestSuiteResponse[]>(
      `${this.apiUrl}/products/${productId}/testsuites`
    ).pipe(
      catchError(error => {
        console.error('Error fetching test suites:', error);
        return throwError(() => new Error('Failed to fetch test suites'));
      })
    );
  }

  getTestSuiteById(productId: string, id: string): Observable<TestSuiteResponse> {
    if (!productId || !id) {
      return throwError(() => new Error('Product ID and Test Suite ID are required'));
    }
    
    return this.http.get<TestSuiteResponse>(
      `${this.apiUrl}/products/${productId}/testsuites/${id}`
    ).pipe(
      catchError(error => {
        console.error('Error fetching test suite:', error);
        return throwError(() => new Error('Failed to fetch test suite'));
      })
    );
  }

  createTestSuite(productId: string, suite: CreateTestSuiteRequest): Observable<IdResponse> {
    if (!productId) {
      return throwError(() => new Error('Product ID is required'));
    }
    
    return this.http.post<IdResponse>(
      `${this.apiUrl}/products/${productId}/testsuites`, 
      suite
    ).pipe(
      catchError(error => {
        console.error('Error creating test suite:', error);
        return throwError(() => new Error('Failed to create test suite'));
      })
    );
  }

  updateTestSuite(productId: string, id: string, suite: CreateTestSuiteRequest): Observable<void> {
    if (!productId || !id) {
      return throwError(() => new Error('Product ID and Test Suite ID are required'));
    }
    
    return this.http.put<void>(
      `${this.apiUrl}/products/${productId}/testsuites/${id}`, 
      suite
    ).pipe(
      catchError(error => {
        console.error('Error updating test suite:', error);
        return throwError(() => new Error('Failed to update test suite'));
      })
    );
  }

  deleteTestSuite(productId: string, id: string): Observable<void> {
    if (!productId || !id) {
      return throwError(() => new Error('Product ID and Test Suite ID are required'));
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/products/${productId}/testsuites/${id}`
    ).pipe(
      catchError(error => {
        console.error('Error deleting test suite:', error);
        return throwError(() => new Error('Failed to delete test suite'));
      })
    );
  }

  getTestSuiteWithCases(testSuiteId: string): Observable<TestSuiteWithCasesResponse> {
    if (!testSuiteId) {
      return throwError(() => new Error('Test Suite ID is required'));
    }
    
    return this.http.get<TestSuiteWithCasesResponse>(
      `${this.apiUrl}/testsuites/${testSuiteId}/testcases`
    ).pipe(
      catchError(error => {
        console.error('Error fetching test suite with cases:', error);
        return throwError(() => new Error('Failed to fetch test suite with cases'));
      })
    );
  }

  assignTestCasesToSuite(testSuiteId: string, request: AssignTestCasesRequest): Observable<void> {
    if (!testSuiteId) {
      return throwError(() => new Error('Test Suite ID is required'));
    }
    
    return this.http.post<void>(
      `${this.apiUrl}/testsuites/${testSuiteId}/testcases`, 
      request
    ).pipe(
      catchError(error => {
        console.error('Error assigning test cases:', error);
        return throwError(() => new Error('Failed to assign test cases'));
      })
    );
  }

  removeTestCaseFromSuite(testSuiteId: string, testCaseId: string): Observable<void> {
    if (!testSuiteId || !testCaseId) {
      return throwError(() => new Error('Test Suite ID and Test Case ID are required'));
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/testsuites/${testSuiteId}/testcases/${testCaseId}`
    ).pipe(
      catchError(error => {
        console.error('Error removing test case:', error);
        return throwError(() => new Error('Failed to remove test case'));
      })
    );
  }

  getTestCasesForSuite(suiteId: string): Observable<TestCaseDetailResponse[]> {
    if (!suiteId) {
      return throwError(() => new Error('Suite ID is required'));
    }
    
    return this.http.get<TestCaseDetailResponse[]>(
      `${this.apiUrl}/testsuites/${suiteId}/testcases`
    ).pipe(
      catchError(error => {
        console.error('Error fetching test cases for suite:', error);
        return throwError(() => new Error('Failed to fetch test cases for suite'));
      })
    );
  }

  addTestCasesToSuite(testSuiteId: string, testCaseIds: string[]): Observable<void> {
    if (!testSuiteId) {
      return throwError(() => new Error('Test Suite ID is required'));
    }
    
    return this.http.post<void>(
      `${this.apiUrl}/testsuites/${testSuiteId}/testcases`,
      { testCaseIds }
    ).pipe(
      catchError(error => {
        console.error('Error adding test cases:', error);
        return throwError(() => new Error('Failed to add test cases'));
      })
    );
  }
}