import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Product, CreateProductRequest, UpdateProductRequest, IdResponse, ProductVersionRequest, ProductVersionResponse } from 'src/app/shared/modles/product.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/api/Products`;

  constructor(private http: HttpClient) { }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(product: CreateProductRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(this.apiUrl, product);
  }

  updateProduct(id: string, product: UpdateProductRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  addProductVersion(productId: string, request: ProductVersionRequest): Observable<ProductVersionResponse> {
    // Correct base per Swagger: /api/products/{productId}/versions
    return this.http.post<ProductVersionResponse>(`${environment.apiUrl}/api/products/${productId}/versions`, request);
  }

  removeProductVersion(productId: string, versionId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/products/${productId}/versions/${versionId}`);
  }
}

export type { Product };
