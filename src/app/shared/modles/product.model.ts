// product.model.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  isActive: boolean;
  versionCount?: number;
  moduleCount?: number;
  editing?: boolean;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  isActive: boolean;
}

export interface UpdateProductRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface IdResponse {
  id: string;
}

export interface ProductVersionRequest {
  version: string;
  isActive: boolean;
}

export interface ProductVersionResponse {
  productId: string;
  id: string;
  version: string;
  isActive: boolean;
  createdAt: Date;
}