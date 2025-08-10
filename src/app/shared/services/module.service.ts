import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ProductModule, CreateModuleRequest, ModuleAttribute, ModuleAttributeRequest, UpdateModuleRequest } from 'src/app/shared/modles/module.model';
import { catchError, Observable, throwError } from 'rxjs';
import { IdResponse } from '../modles/product.model';

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private apiUrl = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) { }

  getModulesByProduct(productId: string): Observable<ProductModule[]> {
  return this.http.get<ProductModule[]>(`${this.apiUrl}/${productId}/modules`).pipe(
    catchError(error => {
      console.error('Error fetching modules:', error);
      return throwError(() => new Error('Failed to fetch modules'));
    })
  );
}
  getModuleById(productId: string, id: string): Observable<ProductModule> {
    return this.http.get<ProductModule>(`${this.apiUrl}/${productId}/modules/${id}`);
  }

  createModule(productId: string, module: CreateModuleRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/${productId}/modules`, module);
  }

  updateModule(productId: string, moduleId: string, request: UpdateModuleRequest): Observable<ProductModule> {
    return this.http.put<ProductModule>(`${this.apiUrl}/${productId}/modules/${moduleId}`, request);
  }

  deleteModule(productId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${productId}/modules/${id}`);
  }

getModuleAttributes(moduleId: string): Observable<ModuleAttribute[]> {
  return this.http.get<ModuleAttribute[]>(
    `${this.apiUrl}/api/modules/${moduleId}/attributes`
  );
}

  createModuleAttribute(moduleId: string, attribute: ModuleAttributeRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${environment.apiUrl}/api/modules/${moduleId}/attributes`, attribute);
  }

  updateModuleAttribute(moduleId: string, attributeId: string, attribute: ModuleAttributeRequest): Observable<ModuleAttribute> {
  return this.http.put<ModuleAttribute>(
    `${environment.apiUrl}/api/modules/${moduleId}/attributes/${attributeId}`,
    { ...attribute, id: attributeId } // Ensure ID is included
  );
}

 deleteModuleAttribute(moduleId: string, attributeId: string): Observable<void> {
  if (!moduleId || !attributeId) {
    return throwError(() => new Error('Both moduleId and attributeId are required'));
  }
  
  const url = `${environment.apiUrl}/api/modules/${moduleId}/attributes/${attributeId}`;
  console.log('DELETE URL:', url); // Debug log
  
  return this.http.delete<void>(url).pipe(
    catchError(error => {
      console.error('API Error:', error);
      return throwError(() => error);
    })
  );
}
}