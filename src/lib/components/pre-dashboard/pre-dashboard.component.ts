import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

interface AssetSummary {
  type: string;
  count: number;
}

@Component({
  selector: 'app-pre-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pre-dashboard.component.html',
  styleUrls: ['./pre-dashboard.component.css']
})
export class PreDashboardComponent implements OnInit {
  essentialAssetTypes: string[] = [
    'Server',
    'Laptop',
    'Charger',
    'Keyboard',
    'Mouse',
    'Pendrive',
    'Software License',
    'Chair',
    'AC',
    'Refrigerator',
    'Monitor',
    'Switch',
    'Router',
    'Firewall',
    'Antivirus',
    'Office 365',
    'Software License',
    'Asset Disposal',
    'Other'
  ];

  requiredFieldsMap: { [type: string]: string[] } = {
    'Server': ['Serial Number', 'IP Address', 'Server Type','Make', 'Host Name', 'Server Name','Operating System','RAM','Date of Purchase','Processor','HDD', 'Ownership'],
    'Laptop': ['Serial Number', 'Laptop Make','Employee Name', 'Laptop Alloted date', 'Ownership(company/personal)', 'Remarks'],
    'Charger': ['Brand', 'Power'],
    'Keyboard': ['Brand', 'Type'],
    'Mouse': ['Brand', 'Type'],
    'Pendrive': ['Brand', 'Capacity'],
    'Chair': ['Type', 'Color'],
    'AC': ['Brand', 'Capacity'],
    'Refrigerator': ['Brand', 'Capacity'],
    'Monitor': ['Brand', 'Size'],
    'Switch':['Make','Host IP Address','Date of Purchase','Model','Host Name','Ownership'],
    'Router': ['Make', 'Host IP Address', 'Date of Purchase', 'Model', 'Host Name', 'Ownership'],
    'Firewall': ['Make', 'Host IP Address', 'Date of Purchase', 'Expire On','Model', 'Serial Number','Registered Email','Ownership'],
    'Antivirus': ['Reg Email ID', 'Reg. Mobile No','Date of Purchase', 'Expires On', 'Ownership'], 
    'Office 365':['Reg Email ID', 'Reg. Mobile No','License Type','Started On', 'Expires On', 'No of License Procured','Account ID','Ownership'], 
    'Software License': ['Reg Email ID', 'Software Name', 'Renewal Period','Started On', 'Expires On', 'No of License Procured','Ownership'],
    'Asset Disposal': ['Asset Id', 'Asset Type', 'Disposed Date', 'Disposed By', 'Remarks'],
    'Other': []
  };

  employeeIdField: string = '';
  assetTypes: string[] = [];
  selectedAssetType: string = '';
  assetSummaries: AssetSummary[] = [];
  apiBaseUrl = JSON.parse(sessionStorage.getItem('config') || '{}').url;

  // For adding new asset type
  showAddTypeModal = false;
  newAssetType = '';

  // For dynamic fields
  showAddAssetModal = false;
  dynamicFields: { key: string, value: string }[] = [];
  newFieldName = '';
  searchEmployeeId: string = '';
  filteredAssets: any[] = [];
  showSearchModal = false;
  isLoading = false;
  searchError = '';
  assetIdField: string = '';
  activeTab: string = 'add';
  vendors: any[] = [];
selectedVendorId: string = '';
  

  constructor(private http: HttpClient, private router: Router,private pageTitleService: PageTitleService) {}

  ngOnInit() {
    this.pageTitleService.setTitle('Assest Management');
    this.fetchAssetTypes();
    this.fetchAssetSummaries();
     this.fetchVendors();
  }

  
fetchVendors() {
  this.http.get<any[]>(`${this.apiBaseUrl}/api/assets/vendors`)
    .subscribe(data => {
      this.vendors = data.map(v => {
        try {
          return { ...JSON.parse(v.data), Id: v.id, Name: JSON.parse(v.data).Name || `Vendor ${v.id}` };
        } catch {
          return { Id: v.id, Name: `Vendor ${v.id}` };
        }
      });
    });
}

  fetchAssetTypes() {
    this.http.get<string[]>(`${this.apiBaseUrl}/api/assets/types`)
      .subscribe(types => {
        const allTypes = [...this.essentialAssetTypes, ...types];
        this.assetTypes = Array.from(new Set(allTypes));
      });
  }

  fetchAssetSummaries() {
    this.http.get<AssetSummary[]>(`${this.apiBaseUrl}/api/assets/summary`)
      .subscribe(data => this.assetSummaries = data);
  }

  onAssetTypeChange() {
    // Optionally fetch details for the selected type
  }

  exportReport() {
    window.open(`${this.apiBaseUrl}/api/assets/export?type=${this.selectedAssetType}`, '_blank');
  }

  exportOverallReport() {
    window.open(`${this.apiBaseUrl}/api/assets/export-all`, '_blank');
  }

  openAddTypeModal() {
    this.showAddTypeModal = true;
    this.newAssetType = '';
  }

  addAssetType() {
    if (this.newAssetType && !this.assetTypes.includes(this.newAssetType)) {
      this.http.post(
        `${this.apiBaseUrl}/api/assets/types`,
        `"${this.newAssetType}"`,
        { headers: { 'Content-Type': 'application/json' }, responseType: 'text' }
      ).subscribe(() => {
        this.fetchAssetTypes();
        this.showAddTypeModal = false;
      });
    }
  }

  openAddAssetModal() {
    this.showAddAssetModal = true;
    this.dynamicFields = [];
    this.newFieldName = '';
    this.employeeIdField = '';
    this.assetIdField = '';
     this.selectedVendorId = ''; 
    const required = this.requiredFieldsMap[this.selectedAssetType] || [];
    this.dynamicFields = required.map(key => ({ key, value: '' }));
  }

  saveAsset() {
    if (!this.assetIdField || !this.assetIdField.trim()) {
      alert('AssetId is required.');
      return;
    }
    const assetData: any = {};
    this.dynamicFields.forEach(f => assetData[f.key] = f.value);
    assetData.EmployeeId = this.employeeIdField;
    assetData.AssetId = this.assetIdField;
    assetData.VendorId = this.selectedVendorId;
    const payload = {
      type: this.selectedAssetType,
      data: JSON.stringify(assetData),
      employeeId: this.employeeIdField,
      assetId: this.assetIdField
    };
    this.http.post(`${this.apiBaseUrl}/api/assets`, payload)
      .subscribe({
        next: () => {
          this.showAddAssetModal = false;
          this.fetchAssetSummaries();
        },
        error: (err) => {
          alert(err.error || 'Failed to add asset.');
        }
      });
  }

  addField() {
    if (this.newFieldName && !this.dynamicFields.some(f => f.key === this.newFieldName)) {
      this.dynamicFields.push({ key: this.newFieldName, value: '' });
      this.newFieldName = '';
    }
  }
  
  removeField(idx: number) {
    this.dynamicFields.splice(idx, 1);
  }

  goToAssetDashboardWithType(type: string) {
    this.router.navigate(['/assets/asset-dashboard'], { queryParams: { type } });
  }

  get totalAssetCount(): number {
    return this.assetSummaries.reduce((sum, summary) => sum + summary.count, 0);
  }

  goToVendorDashboard() {
    window.location.href = '/assets/vendor-dashboard';
  }

  goToEmployeeDashboard() {
    window.location.href = '/assets/employee-dashboard';
  }

  goToAssetDashboard() {
    this.router.navigate(['/assets/asset-dashboard']);
  }

  goToMainDashboard() {
    this.router.navigate(['/assets/dashboard']);
  } 
  searchEmployeeAssets(employeeId: string) {
    if (!employeeId || !employeeId.trim()) {
      this.filteredAssets = [];
      this.showSearchModal = false;
      return;
    }
    this.isLoading = true;
    this.http.get<any[]>(`${this.apiBaseUrl}/api/assets/by-employee/${employeeId.trim()}`)
      .subscribe({
        next: data => {
          this.filteredAssets = data.map(a => ({ ...JSON.parse(a.data), Type: a.type, Id: a.id }));
          this.showSearchModal = true;
          this.isLoading = false;
        },
        error: err => {
          this.filteredAssets = [];
          this.showSearchModal = true;
          this.isLoading = false;
          this.searchError = 'Failed to fetch assets. Please try again.';
        }
      });
  }

  closeSearchModal() {
    this.showSearchModal = false;
    this.searchEmployeeId = '';
  }
  // ...existing code...
getDisplayKeys(asset: any): string[] {
  if (!asset) return [];
  return Object.keys(asset);
}
getAssetKeys(asset: any): string[] {
  return asset ? Object.keys(asset) : [];
}
}