import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { 
  TestSuite, 
  TestSuiteResponse, 
  TestSuiteWithCasesResponse, 
  CreateTestSuiteRequest,
  AssignTestCasesRequest
} from '../modles/test-suite.model';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { IdResponse } from '../modles/product.model';
import { TestCaseDetailResponse } from '../modles/test-case.model';

@Injectable({
  providedIn: 'root'
})
export class TestSuiteService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  getTestSuites(productId: string): Observable<TestSuiteResponse[]> {
    if (!productId) {
      return throwError(() => new Error('Product ID is required'));
    }
    
    return this.http.get<TestSuiteResponse[]>(
      `${this.apiUrl}/api/products/${productId}/testsuites`
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
      `${this.apiUrl}/api/products/${productId}/testsuites/${id}`
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
    
    console.log('Creating test suite with request:', suite);
    
    return this.http.post<IdResponse>(
      `${this.apiUrl}/api/products/${productId}/testsuites`, 
      suite
    ).pipe(
      tap(response => {
        console.log('Test suite creation response:', response);
      }),
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
      `${this.apiUrl}/api/products/${productId}/testsuites/${id}`, 
      suite
    ).pipe(
      catchError(error => {
        console.error('Error updating test suite:', error);
        return throwError(() => new Error('Failed to update test suite'));
      })
    );
  }

  deleteTestSuite(productId: string, testSuiteId: string, forceDelete: boolean = true): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/api/products/${productId}/testsuites/${testSuiteId}`,
      {
        params: { forceDelete: forceDelete.toString() }
      }
    ).pipe(
      catchError((error) => {
        if (error.status === 409) {
          return throwError(() => new Error(error.error?.error || 'Cannot delete test suite with references'));
        }
        if (error.status === 404) {
          return throwError(() => new Error('Test suite not found'));
        }
        return throwError(() => new Error('Failed to delete test suite'));
      })
    );
  }

  getTestSuiteWithCases(testSuiteId: string): Observable<TestSuiteWithCasesResponse> {
    if (!testSuiteId) {
      return throwError(() => new Error('Test Suite ID is required'));
    }
    
    return this.http.get<TestSuiteWithCasesResponse>(
      `${this.apiUrl}/api/testsuites/${testSuiteId}/testcases`
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
    
    if (!request.testCaseIds || request.testCaseIds.length === 0) {
      return throwError(() => new Error('At least one test case ID is required'));
    }

    console.log('Assigning test cases to suite:', {
      testSuiteId,
      request,
      url: `${this.apiUrl}/api/testsuites/${testSuiteId}/testcases`
    });
    
    return this.http.post<void>(
      `${this.apiUrl}/api/testsuites/${testSuiteId}/testcases`, 
      request
    ).pipe(
      tap(() => {
        console.log('Test cases assigned successfully');
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error assigning test cases:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          url: error.url
        });
        
        let errorMessage = 'Failed to assign test cases';
        if (error.status === 400) {
          errorMessage = error.error?.message || 'Bad request - check test case IDs';
        } else if (error.status === 404) {
          errorMessage = 'Test suite not found';
        } else if (error.status === 500) {
          errorMessage = 'Server error occurred while assigning test cases';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  removeTestCaseFromSuite(testSuiteId: string, testCaseId: string): Observable<void> {
    if (!testSuiteId || !testCaseId) {
      return throwError(() => new Error('Test Suite ID and Test Case ID are required'));
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/api/testsuites/${testSuiteId}/testcases/${testCaseId}`
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

    return this.http.get<TestSuiteWithCasesResponse>(
      `${this.apiUrl}/api/testsuites/${suiteId}/testcases`
    ).pipe(
      map(response => {
        if (!response.testCases) {
          throw new Error('Test cases array is undefined');
        }
        return response.testCases;
      }),
      catchError(error => {
        console.error('Error fetching test cases:', error);
        return throwError(() => new Error('Failed to fetch test cases'));
      })
    );
  }

  // This method seems redundant with assignTestCasesToSuite
  addTestCasesToSuite(testSuiteId: string, testCaseIds: string[]): Observable<void> {
    if (!testSuiteId) {
      return throwError(() => new Error('Test Suite ID is required'));
    }
    
    return this.http.post<void>(
      `${this.apiUrl}/api/testsuites/${testSuiteId}/testcases`,
      { testCaseIds }
    ).pipe(
      catchError(error => {
        console.error('Error adding test cases:', error);
        return throwError(() => new Error('Failed to add test cases'));
      })
    );
  }
}