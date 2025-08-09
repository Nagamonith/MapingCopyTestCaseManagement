import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ProductModule, CreateModuleRequest, ModuleAttribute, ModuleAttributeRequest, UpdateModuleRequest } from 'src/app/shared/modles/module.model';
import { Observable } from 'rxjs';
import { IdResponse } from '../modles/product.model';

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private apiUrl = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) { }

  getModulesByProduct(productId: string): Observable<ProductModule[]> {
    return this.http.get<ProductModule[]>(`${this.apiUrl}/${productId}/modules`);
  }

  getModuleById(productId: string, id: string): Observable<ProductModule> {
    return this.http.get<ProductModule>(`${this.apiUrl}/${productId}/modules/${id}`);
  }

  createModule(productId: string, module: CreateModuleRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/${productId}/modules`, module);
  }

// In your module service (module.service.ts), update the method signature:
updateModule(productId: string, moduleId: string, request: UpdateModuleRequest): Observable<ProductModule> {
  return this.http.put<ProductModule>(`${this.apiUrl}/products/${productId}/modules/${moduleId}`, request);
}
  deleteModule(productId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${productId}/modules/${id}`);
  }

  getModuleAttributes(moduleId: string): Observable<ModuleAttribute[]> {
    return this.http.get<ModuleAttribute[]>(`${environment.apiUrl}/api/modules/${moduleId}/attributes`);
  }

  createModuleAttribute(moduleId: string, attribute: ModuleAttributeRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${environment.apiUrl}/api/modules/${moduleId}/attributes`, attribute);
  }

  deleteModuleAttribute(moduleId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/modules/${moduleId}/attributes/${id}`);
  }
}