
import { Component, OnInit, importProvidersFrom } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElementRef, HostListener, ViewChild } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { QRCodeComponent } from 'angularx-qrcode';

interface DeviceDetails {
 assetTag: number;
  employeeId: number;
  empName: string;
  make: string;
  model: string;
  cpu: string;
  os: string;
  ram: string;
  hdd: string;
  ssd: string;
  mouse: string;
  company: string;
  phone: string;
  email: string;
  comments: string;
  invoiceDate: string;
  physicalIPAddress: string;
  hostName: string;
  otherItems: string;
   features?: string[];
  status?: string; // Optional field for status
}

interface LaptopHistory {
   date: string;
  commentor: string;
  comment: string;
}

 
interface LaptopDto {
  id: number;
  deviceDetails: DeviceDetails;
}
// ...existing imports...
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule,FormsModule, QRCodeComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class LaptopDashboardComponent implements OnInit {
  isCardView = true;
  laptops: LaptopDto[] = [];
  allLaptops: LaptopDto[] = []; // To keep the unfiltered list
  laptopService: any;
  showHistoryModal = false;
  historyLaptop: LaptopDto | null = null;
  historyData: LaptopHistory[] = [];
  historyLoading = false;
  historyError = '';
  searchExpanded = false;
  searchEmployeeId: string = '';
  apiBaseUrl = JSON.parse(sessionStorage.getItem('config') || '{}').url;
  selectedLaptop: LaptopDto | null = null;
  showQrModal = false;
  qrAssetTag: number | null = null;

  constructor(private router: Router, private http: HttpClient) {}
  
  logoPath = 'assets/logo.png';
  ngOnInit() {
    const savedView = localStorage.getItem('dashboardViewMode');
    if (savedView === 'table') {
      this.isCardView = false;
    } else if (savedView === 'card') {
      this.isCardView = true;
    }
    this.loadLaptops();
  }
  setCardView(isCard: boolean) {
    this.isCardView = isCard;
    localStorage.setItem('dashboardViewMode', isCard ? 'card' : 'table');
  }

  loadLaptops() {
    this.http.get<LaptopDto[]>(`${this.apiBaseUrl}/api/Device/GetAllLaptopDetails`)
      .subscribe({
        next: (data) => {
          this.laptops = data;
          this.allLaptops = data; 
        },
        error: (err) => alert('Error loading laptops: ' + err.message)
      });
  }

  addLaptop() {
    this.router.navigate(['assets/add-laptop']);
  }
   
  editLaptop(id: number) {
    this.router.navigate(['assets/edit-laptop', id]); 
  }

  deleteLaptop(id: number) {
    this.router.navigate(['assets/delete-laptop', id]);
  }

  logout() {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }

  openModal(laptop: LaptopDto) {
    this.selectedLaptop = laptop;
  }

  closeModal() {
    this.selectedLaptop = null;
  }

  gotoPreDashboard() {
    this.router.navigate(['assets/pre-dashboard']);
  }

  openHistory(laptop: LaptopDto) {
  this.historyLaptop = laptop;
  this.showHistoryModal = true;
  this.historyLoading = true;
  this.historyError = '';
  this.http.get<LaptopHistory[]>(`${this.apiBaseUrl}/api/Device/GetComments/${laptop.id}`)
    .subscribe({
      next: data => {
        this.historyData = data;
        this.historyLoading = false;
      },
      error: err => {
        this.historyError = 'Failed to load history.';
        this.historyLoading = false;
      }
    });
}
  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  closeHistory() {
    this.showHistoryModal = false;
    this.historyLaptop = null;
    this.historyData = [];
    this.historyError = '';
  }

onSearch(event: Event) {
  event.preventDefault();
  const id = this.searchEmployeeId.trim().toLowerCase();
  if (id) {
    this.laptops = this.allLaptops.filter(l =>
      l.deviceDetails.employeeId.toString().toLowerCase().includes(id)
    );
  } else {
    this.laptops = this.allLaptops;
  }
}

  clearSearch() {
    this.searchEmployeeId = '';
    this.laptops = this.allLaptops;
    this.searchExpanded = false;
  }
  

  @ViewChild('searchContainer') searchContainer!: ElementRef;

  toggleSearch() {
    this.searchExpanded = !this.searchExpanded;
    // setTimeout(() => {
    //   if (this.searchExpanded) {
    //     const input = document.querySelector('.search-form-animated input') as HTMLInputElement;
    //     if (input) input.focus();
    //   }
    // });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (
      this.searchExpanded &&
      this.searchContainer &&
      !this.searchContainer.nativeElement.contains(event.target)
    ) {
      this.searchExpanded = false;
    }
  }


exportToExcel() {
  const data = this.laptops.map((l, idx) => ({
    'Sl.no': idx + 1,
    'Asset Name': 'Laptop',
    'Asset Features': [
      l.deviceDetails.make,
      l.deviceDetails.model,
      l.deviceDetails.cpu,
      l.deviceDetails.os,
      l.deviceDetails.ram,
      l.deviceDetails.hdd,
      l.deviceDetails.ssd
    ].filter(Boolean).join(', '), // Merge and skip empty values
    'Asset ID': l.deviceDetails.assetTag,
    'Asset Owner': 'IT admin',
    'Asset Custodian': l.deviceDetails.empName,
    'Employee ID': l.deviceDetails.employeeId,
    'Employee Phone Number': l.deviceDetails.phone,
    'Employee Email': l.deviceDetails.email,
    'Employee Department': 'Engineering',
    'Date of Issue': l.deviceDetails.invoiceDate,
    'Date of Return': '',
    
    'Status': l.deviceDetails.status || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, 'Datalyzer_Asset_Report.xlsx');
}

exportAllHistoryToExcel() {
  // Fetch all history for all laptops
  
  const requests = this.allLaptops.map(laptop =>
    this.http.get<LaptopHistory[]>(`${this.apiBaseUrl}/api/Device/GetComments/${laptop.id}`)
      .toPromise()
      .then(history => ({ 
        employeeId: laptop.deviceDetails.employeeId,
        empName: laptop.deviceDetails.empName,
        assetTag: laptop.deviceDetails.assetTag,
        history: history || []
      }))
  );

  Promise.all(requests).then(results => {
    // Flatten the data for Excel
    const data: any[] = [];
    results.forEach(item => {
      item.history.forEach((h: LaptopHistory) => {
        data.push({
          'Asset Tag': item.assetTag,
          'Employee ID': item.employeeId,
          'Employee Name': item.empName,
          'Date': h.date,
          'Commentor': h.commentor,
          'Comment': h.comment
        });
      });
    });

    if (data.length === 0) {
      alert('No history data found.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset History');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'Datalyzer_Asset_History_Report.xlsx');
  }).catch(() => {
    alert('Failed to export asset history.');
  });
}

 openQrModal(assetTag: number) {
    this.qrAssetTag = assetTag;
    this.showQrModal = true;
  }

  closeQrModal() {
    this.showQrModal = false;
    this.qrAssetTag = null;
  }

  downloadQrCode() {
    const qrCanvas = document.querySelector('#qrCanvas canvas') as HTMLCanvasElement;
    if (qrCanvas) {
      const url = qrCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `asset-${this.qrAssetTag}-qrcode.png`;
      a.click();
    }
  }
   get qrUrl(): string {
    if (!this.qrAssetTag) return '';
    const base = window.location.origin;
    return `${base}/asset-view/${this.qrAssetTag}`;
  }
}
