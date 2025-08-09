

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LaptopService } from '../../../app/services/laptop.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-laptop',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-laptop.component.html',
  styleUrls: ['./add-laptop.component.css']
})
// export class AddLaptopComponent {
//   laptopForm: FormGroup;
//    fieldLabels: { [key: string]: string } = {
//  };
// ...existing code...
export class AddLaptopComponent {
  laptopForm: FormGroup;
  fieldLabels: { [key: string]: string } = {
    assetTag: 'Asset Tag',
    employeeId: 'Employee ID',
    empName: 'Employee Name',
    make: 'Make',
    model: 'Model',
    cpu: 'CPU',
    os: 'Operating System',
    ram: 'RAM',
    hdd: 'HDD',
    ssd: 'SSD',
    mouse: 'Mouse',
    company: 'Company',
    phone: 'Phone Number',
    email: 'Email Address',
    comments: 'Comments',
    invoiceDate: 'Issued Date',
    physicalIPAddress: 'Physical IP Address',
    hostName: 'Host Name',
    otherItems: 'Other Items'
  };

  fieldPlaceholders: { [key: string]: string } = {
    assetTag: ' LAP12345',
    employeeId: 'e.g. 1001',
    empName: 'Enter full name',
    make: 'e.g. Dell, HP',
    model: 'e.g. Latitude 5400',
    cpu: 'e.g. Intel i5',
    os: 'e.g. Windows 11 Pro',
    ram: 'e.g. 16GB',
    hdd: 'e.g. 1TB',
    ssd: 'e.g. 512GB',
    mouse: 'e.g. Provided',
    company: 'e.g. Datalyzer',
    phone: '10-digit number',
    email: 'e.g. user@company.com',
    comments: 'Any additional notes',
    invoiceDate: 'YYYY-MM-DD',
    physicalIPAddress: 'e.g. 192.168.1.10',
    hostName: 'e.g. LAPTOP-1234',
    otherItems: 'e.g. Dock, Bag'
  };
fieldOrder: string[] = [
  'assetTag',
  'employeeId',
  'empName',
  'make',
  'model',
  'cpu',
  'os',
  'ram',
  'hdd',
  'ssd',
  'mouse',
  'company',
  'phone',
  'email',
  'comments',
  'invoiceDate',
  'physicalIPAddress',
  'hostName',
  'otherItems'
];

  constructor(
    private fb: FormBuilder,
    private laptopService: LaptopService,
    private router: Router
  ) {
    this.laptopForm = this.fb.group({
     
      assetTag: ['', Validators.required],
  employeeId: ['', Validators.required],
  empName:  ['', Validators.required],
  make: ['', Validators.required],
  model: ['', Validators.required],
  cpu: ['', Validators.required],
  os: ['', Validators.required],
  ram: ['', Validators.required],
  hdd: ['', Validators.required],
  ssd: ['', Validators.required],
  mouse: ['', Validators.required],
  company:  ['', Validators.required],
  phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  email: ['', [Validators.required, Validators.email]],
  comments: [''],
  invoiceDate: ['', Validators.required],
  physicalIPAddress: ['', Validators.required],
  hostName: ['', Validators.required],
  otherItems: ['']
    });
  }

  onSubmit(): void {
    if (this.laptopForm.valid) {
      const newLaptop = {
        id: 0, // Let backend generate ID
        deviceDetails: this.laptopForm.value
      };

      this.laptopService.addLaptop(newLaptop).subscribe({
        next: () => {
          const confirmed = window.confirm('Laptop added successfully! Go back to dashboard?');
          if (confirmed) {
            this.router.navigate(['assets/dashboard']);
          }
        },
        error: (err) => {
          alert('Error adding laptop: ' + err.message);
        }
      });
    }
  }
  goToDashboard() {
  this.router.navigate(['assets/dashboard']);  }
}


