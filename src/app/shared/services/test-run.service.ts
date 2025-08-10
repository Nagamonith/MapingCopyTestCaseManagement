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
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IdResponse } from '../modles/product.model';

@Injectable({
  providedIn: 'root'
})
export class TestRunService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  getTestRuns(productId: string): Observable<TestRunResponse[]> {
    if (!productId) {
      return throwError(() => new Error('Product ID is required'));
    }
    
    return this.http.get<TestRunResponse[]>(
      `${this.apiUrl}/products/${productId}/testruns`
    ).pipe(
      catchError(error => {
        console.error('Error fetching test runs:', error);
        return throwError(() => new Error('Failed to fetch test runs'));
      })
    );
  }

  getTestRunById(productId: string, id: string): Observable<TestRunResponse> {
    if (!productId || !id) {
      return throwError(() => new Error('Product ID and Test Run ID are required'));
    }
    
    return this.http.get<TestRunResponse>(
      `${this.apiUrl}/products/${productId}/testruns/${id}`
    ).pipe(
      catchError(error => {
        console.error('Error fetching test run:', error);
        return throwError(() => new Error('Failed to fetch test run'));
      })
    );
  }

  createTestRun(productId: string, run: CreateTestRunRequest): Observable<IdResponse> {
    if (!productId) {
      return throwError(() => new Error('Product ID is required'));
    }
    
    return this.http.post<IdResponse>(
      `${this.apiUrl}/products/${productId}/testruns`, 
      run
    ).pipe(
      catchError(error => {
        console.error('Error creating test run:', error);
        return throwError(() => new Error('Failed to create test run'));
      })
    );
  }

  deleteTestRun(productId: string, id: string): Observable<void> {
    if (!productId || !id) {
      return throwError(() => new Error('Product ID and Test Run ID are required'));
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/products/${productId}/testruns/${id}`
    ).pipe(
      catchError(error => {
        console.error('Error deleting test run:', error);
        return throwError(() => new Error('Failed to delete test run'));
      })
    );
  }

  updateTestRunStatus(
    productId: string, 
    testRunId: string, 
    status: TestRunStatus
  ): Observable<void> {
    if (!productId || !testRunId) {
      return throwError(() => new Error('Product ID and Test Run ID are required'));
    }
    
    return this.http.put<void>(
      `${this.apiUrl}/products/${productId}/testruns/${testRunId}/status`,
      status
    ).pipe(
      catchError(error => {
        console.error('Error updating test run status:', error);
        return throwError(() => new Error('Failed to update test run status'));
      })
    );
  }

  getTestRunResults(testRunId: string): Observable<TestRunResultResponse[]> {
    if (!testRunId) {
      return throwError(() => new Error('Test Run ID is required'));
    }
    
    return this.http.get<TestRunResultResponse[]>(
      `${this.apiUrl}/testruns/${testRunId}/results`
    ).pipe(
      catchError(error => {
        console.error('Error fetching test run results:', error);
        return throwError(() => new Error('Failed to fetch test run results'));
      })
    );
  }

  addTestRunResult(
    testRunId: string, 
    result: TestRunResultResponse
  ): Observable<void> {
    if (!testRunId) {
      return throwError(() => new Error('Test Run ID is required'));
    }
    
    return this.http.post<void>(
      `${this.apiUrl}/testruns/${testRunId}/results`, 
      result
    ).pipe(
      catchError(error => {
        console.error('Error adding test run result:', error);
        return throwError(() => new Error('Failed to add test run result'));
      })
    );
  }

  assignTestSuitesToRun(
    testRunId: string, 
    request: AssignTestSuitesRequest
  ): Observable<void> {
    if (!testRunId) {
      return throwError(() => new Error('Test Run ID is required'));
    }
    
    return this.http.post<void>(
      `${this.apiUrl}/testruns/${testRunId}/testsuites`, 
      request
    ).pipe(
      catchError(error => {
        console.error('Error assigning test suites:', error);
        return throwError(() => new Error('Failed to assign test suites'));
      })
    );
  }

  removeTestSuiteFromRun(
    testRunId: string, 
    testSuiteId: string
  ): Observable<void> {
    if (!testRunId || !testSuiteId) {
      return throwError(() => new Error('Test Run ID and Test Suite ID are required'));
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/testruns/${testRunId}/testsuites/${testSuiteId}`
    ).pipe(
      catchError(error => {
        console.error('Error removing test suite:', error);
        return throwError(() => new Error('Failed to remove test suite'));
      })
    );
  }

  updateTestRun(
    productId: string,
    testRunId: string,
    _run: CreateTestRunRequest,
    status: { status: TestRunStatus }
  ): Observable<void> {
    return this.updateTestRunStatus(productId, testRunId, status.status);
  }

  getAssignedTestSuites(testRunId: string): Observable<string[]> {
    if (!testRunId) {
      return throwError(() => new Error('Test Run ID is required'));
    }
    
    return this.http.get<string[]>(
      `${this.apiUrl}/testruns/${testRunId}/testsuites`
    ).pipe(
      catchError(error => {
        console.error('Error fetching assigned test suites:', error);
        return throwError(() => new Error('Failed to fetch assigned test suites'));
      })
    );
  }

  assignTestSuites(testRunId: string, suiteIds: string[]): Observable<void> {
    if (!testRunId) {
      return throwError(() => new Error('Test Run ID is required'));
    }
    
    return this.http.post<void>(
      `${this.apiUrl}/testruns/${testRunId}/testsuites`,
      { testSuiteIds: suiteIds }
    ).pipe(
      catchError(error => {
        console.error('Error assigning test suites:', error);
        return throwError(() => new Error('Failed to assign test suites'));
      })
    );
  }
}