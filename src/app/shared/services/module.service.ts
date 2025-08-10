import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { 
  ProductModule, 
  CreateModuleRequest, 
  ModuleAttribute, 
  ModuleAttributeRequest, 
  UpdateModuleRequest 
} from 'src/app/shared/modles/module.model';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IdResponse } from '../modles/product.model';

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  // Product Modules endpoints
  getModulesByProduct(productId: string): Observable<ProductModule[]> {
    if (!productId) {
      return throwError(() => new Error('Product ID is required'));
    }
    
    return this.http.get<ProductModule[]>(
      `${this.apiUrl}/products/${productId}/modules`
    ).pipe(
      catchError(error => {
        console.error('Error fetching modules:', error);
        return throwError(() => new Error('Failed to fetch modules'));
      })
    );
  }

  getModuleById(productId: string, id: string): Observable<ProductModule> {
    if (!productId || !id) {
      return throwError(() => new Error('Product ID and Module ID are required'));
    }
    
    return this.http.get<ProductModule>(
      `${this.apiUrl}/products/${productId}/modules/${id}`
    ).pipe(
      catchError(error => {
        console.error('Error fetching module:', error);
        return throwError(() => new Error('Failed to fetch module'));
      })
    );
  }

  createModule(productId: string, module: CreateModuleRequest): Observable<IdResponse> {
    if (!productId) {
      return throwError(() => new Error('Product ID is required'));
    }
    
    return this.http.post<IdResponse>(
      `${this.apiUrl}/products/${productId}/modules`, 
      module
    ).pipe(
      catchError(error => {
        console.error('Error creating module:', error);
        return throwError(() => new Error('Failed to create module'));
      })
    );
  }

  updateModule(
    productId: string, 
    moduleId: string, 
    request: UpdateModuleRequest
  ): Observable<ProductModule> {
    if (!productId || !moduleId) {
      return throwError(() => new Error('Product ID and Module ID are required'));
    }
    
    return this.http.put<ProductModule>(
      `${this.apiUrl}/products/${productId}/modules/${moduleId}`, 
      request
    ).pipe(
      catchError(error => {
        console.error('Error updating module:', error);
        return throwError(() => new Error('Failed to update module'));
      })
    );
  }

  deleteModule(productId: string, id: string): Observable<void> {
    if (!productId || !id) {
      return throwError(() => new Error('Product ID and Module ID are required'));
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/products/${productId}/modules/${id}`
    ).pipe(
      catchError(error => {
        console.error('Error deleting module:', error);
        return throwError(() => new Error('Failed to delete module'));
      })
    );
  }

  // Module Attributes endpoints
  getModuleAttributes(moduleId: string): Observable<ModuleAttribute[]> {
    if (!moduleId) {
      return throwError(() => new Error('Module ID is required'));
    }
    
    return this.http.get<ModuleAttribute[]>(
      `${this.apiUrl}/modules/${moduleId}/attributes`
    ).pipe(
      catchError(error => {
        console.error('Error fetching module attributes:', error);
        return throwError(() => new Error('Failed to fetch module attributes'));
      })
    );
  }

  createModuleAttribute(
    moduleId: string, 
    request: ModuleAttributeRequest
  ): Observable<IdResponse> {
    if (!moduleId) {
      return throwError(() => new Error('Module ID is required'));
    }
    
    return this.http.post<IdResponse>(
      `${this.apiUrl}/modules/${moduleId}/attributes`, 
      request
    ).pipe(
      catchError(error => {
        console.error('Error creating module attribute:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to create module attribute'));
      })
    );
  }

  updateModuleAttribute(
    moduleId: string, 
    attributeId: string, 
    attribute: ModuleAttributeRequest
  ): Observable<ModuleAttribute> {
    if (!moduleId || !attributeId) {
      return throwError(() => new Error('Module ID and Attribute ID are required'));
    }
    
    return this.http.put<ModuleAttribute>(
      `${this.apiUrl}/modules/${moduleId}/attributes/${attributeId}`, 
      attribute
    ).pipe(
      catchError(error => {
        console.error('Error updating module attribute:', error);
        return throwError(() => new Error('Failed to update module attribute'));
      })
    );
  }

  deleteModuleAttribute(moduleId: string, attributeId: string): Observable<void> {
    if (!moduleId || !attributeId) {
      return throwError(() => new Error('Module ID and Attribute ID are required'));
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/modules/${moduleId}/attributes/${attributeId}`
    ).pipe(
      catchError(error => {
        console.error('Error deleting module attribute:', error);
        return throwError(() => new Error('Failed to delete module attribute'));
      })
    );
  }
}