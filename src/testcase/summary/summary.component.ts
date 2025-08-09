import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TestCaseService } from 'src/app/shared/services/test-case.service';
import { ProductService } from 'src/app/shared/services/product.service';
import { combineLatest, map, Observable, of, switchMap } from 'rxjs';
import { ProductModule } from 'src/app/shared/modles/module.model';
import { TestCaseResponse } from 'src/app/shared/modles/test-case.model';
import { Product } from 'src/app/shared/modles/product.model';

interface SummaryData {
  modules: ProductModule[];
  versions: string[];
  testMatrix: Record<string, number>;
  versionTotals: Record<string, number>;
}

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.css'],
})
export class SummaryComponent {
  private testCaseService = inject(TestCaseService);
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private router = inject(Router);

  selectedProductId = signal<string>('');

  // Data signals
  summaryData = signal<SummaryData | null>(null);
  currentProduct = signal<Product | null>(null);

  // Computed properties for template
  modules = computed(() => this.summaryData()?.modules || []);
  versions = computed(() => this.summaryData()?.versions || []);
  testMatrix = computed(() => this.summaryData()?.testMatrix || {});
  versionTotals = computed(() => this.summaryData()?.versionTotals || {});

  constructor() {
    // Watch for productId changes
    effect(() => {
      const productId = this.selectedProductId();
      if (productId) {
        this.loadData(productId);
        this.loadProduct(productId);
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['productId']) {
        this.selectedProductId.set(params['productId']);
      }
    });
  }

  private loadData(productId: string): void {
    combineLatest([
      this.testCaseService.getModulesByProduct(productId),
      this.testCaseService.getTestCasesByProduct(productId)
    ]).pipe(
      map(([modules, testCases]) => {
        if (!modules || !testCases) return null;

        const versions = Array.from(new Set(testCases.map(tc => tc.version)));
        const moduleIds = modules.map(m => m.id);
        
        const testMatrix: Record<string, number> = {};
        const versionTotals: Record<string, number> = {};

        // Initialize version totals
        versions.forEach(ver => versionTotals[ver] = 0);

        for (const tc of testCases) {
          if (moduleIds.includes(tc.moduleId)) {
            const key = `${tc.moduleId}-${tc.version}`;
            testMatrix[key] = (testMatrix[key] || 0) + 1;
            versionTotals[tc.version] = (versionTotals[tc.version] || 0) + 1;
          }
        }

        return {
          modules,
          versions,
          testMatrix,
          versionTotals
        };
      })
    ).subscribe({
      next: (data) => this.summaryData.set(data),
      error: (err) => console.error('Error loading summary data:', err)
    });
  }

  private loadProduct(productId: string): void {
    this.productService.getProductById(productId).subscribe({
      next: (product) => this.currentProduct.set(product),
      error: (err) => console.error('Error loading product:', err)
    });
  }

  // Template helper methods
  getCount(modId: string, ver: string): number {
    return this.testMatrix()[`${modId}-${ver}`] || 0;
  }

  getVersionTotal(ver: string): number {
    return this.versionTotals()[ver] || 0;
  }

  getProductName(): string {
    return this.currentProduct()?.name || 'Selected Product';
  }

  navigateToModule(moduleId: string): void {
    this.router.navigate(['/tester/modules', moduleId], {
      queryParams: { 
        productId: this.selectedProductId(),
        loadAllVersions: true 
      }
    });
  }
}