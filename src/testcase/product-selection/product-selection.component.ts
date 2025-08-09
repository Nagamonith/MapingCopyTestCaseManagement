import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-product-selection',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './product-selection.component.html',
  styleUrl: './product-selection.component.css'
})
export class ProductSelectionComponent {
  products = [
    { id: '2', name: 'Qualis SPC' },
    { id: '3', name: 'MSA' },
    { id: '4', name: 'FMEA' },
    { id: '5', name: 'Wizard' },
    { id: '6', name: 'APQP' }
  ];

  newProductName = '';
  showAddForm = false;

  contextMenuIndex: number | null = null;
  menuX = 0;
  menuY = 0;

  editingIndex: number | null = null;
  editedProductName = '';

  constructor(private router: Router) {
    // Close context menu on outside click
    document.addEventListener('click', () => {
      this.contextMenuIndex = null;
    });
  }

  toggleAddProduct() {
    this.showAddForm = true;
  }

  saveProduct() {
    if (!this.newProductName.trim()) return;
    const newId = (this.products.length + 1).toString();
    this.products.push({ id: newId, name: this.newProductName });
    this.newProductName = '';
    this.showAddForm = false;
  }

  clearForm() {
    this.newProductName = '';
    this.showAddForm = false;
  }

  selectProduct(product: any) {
    localStorage.setItem('productId', product.id);
    localStorage.setItem('productName', product.name);
    this.router.navigate(['/tester']);
  }

  onRightClick(event: MouseEvent, index: number) {
    event.preventDefault();
    this.contextMenuIndex = index;
    this.menuX = event.clientX;
    this.menuY = event.clientY;
  }

  startEdit(index: number) {
    this.editingIndex = index;
    this.editedProductName = this.products[index].name;
    this.contextMenuIndex = null; // Close right-click menu
  }

  saveEdit(index: number) {
    if (this.editedProductName.trim()) {
      this.products[index].name = this.editedProductName.trim();
    }
    this.editingIndex = null;
  }

  cancelEdit() {
    this.editingIndex = null;
  }

  deleteProduct(index: number) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.products.splice(index, 1);
    }
    this.contextMenuIndex = null;
    if (this.editingIndex === index) {
      this.editingIndex = null;
    }
  }
}
