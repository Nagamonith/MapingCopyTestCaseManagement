import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LaptopService } from '../../../app/services/laptop.service';

@Component({
  selector: 'app-edit-laptop',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-laptop.component.html',
  styleUrls: ['./edit-laptop.component.css']
})
export class EditLaptopComponent implements OnInit {
  laptopForm: FormGroup;
  laptopId!: number;
  commentAdded = false;


    showCommentModal = false;
  commentForm!: FormGroup;


  fieldLabels: { [key: string]: string } = {
    assetTag: 'Asset Tag',
    employeeId: 'Employee ID',
    empName: 'Employee Name',
    make: 'Manufacturer',
    model: 'Model',
    cpu: 'CPU',
    os: 'Operating System',
    ram: 'RAM',
    hdd: 'HDD',
    ssd: 'SSD',
    mouse: 'Mouse',
    company: 'Company',
    phone: 'Phone Number',
    email: 'Email',
    comments: 'Comments',
    invoiceDate: 'Issued Date',
    physicalIPAddress: 'Physical IP Address',
    hostName: 'Host Name',
    otherItems: 'Other Items'
    
  };
 

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private laptopService: LaptopService
  ) {
    this.laptopForm = this.fb.group({
      assetTag: ['', Validators.required],
      employeeId: ['', Validators.required],
      empName: ['', Validators.required],
      make: ['', Validators.required],
      model: ['', Validators.required],
      cpu: ['', Validators.required],
      os: ['', Validators.required],
      ram: ['', Validators.required],
      hdd: ['', Validators.required],
      ssd: ['', Validators.required],
      mouse: ['', Validators.required],
      company: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      comments: [''],
      invoiceDate: ['', Validators.required],
      physicalIPAddress: ['', Validators.required],
      hostName: ['', Validators.required],
      otherItems: ['']
    });
  }
 
  apiBaseUrl = JSON.parse(sessionStorage.getItem('config') || '{}').url;
  ngOnInit(): void {
    this.laptopId = +this.route.snapshot.paramMap.get('id')!;
    this.http.get<any>(`${this.apiBaseUrl}/api/Device/GetLaptopDetailsById/${this.laptopId}`)
      .subscribe(data => {
        this.laptopForm.patchValue(data.deviceDetails);
        
      });
      this.commentForm = this.fb.group({
      date: [this.getToday(), Validators.required],
      commentor: ['', Validators.required],
      comment: ['', Validators.required]
    });

  }
    onSubmit(): void {
    if (this.laptopForm.valid) {
      const updatedLaptop = {
        id: this.laptopId,
        deviceDetails: this.laptopForm.value
      };
      this.laptopService.updateLaptop(updatedLaptop).subscribe(() => {
        alert('Laptop updated successfully!');
        this.router.navigate(['assets/dashboard']);
      });
    }
  }

  goToDashboard() {
    this.router.navigate(['assets/dashboard']);
  }

   getToday(): string {
    const today = new Date();
    return today.toISOString().substring(0, 10);
  }

  openCommentModal() {
    this.showCommentModal = true;
    this.commentForm.reset({ date: this.getToday() });
  }

  closeCommentModal() {
    this.showCommentModal = false;
  }

  submitComment() {
    if (this.commentForm.valid) {
      const payload = {
        assetId: this.laptopId,
        ...this.commentForm.value
      };

      this.http.post(`${this.apiBaseUrl}/api/Device/AddComment`, payload).subscribe(() => {
        alert('Comment added!');

         this.commentAdded = true;
        this.closeCommentModal();
      });
    }
  }
}
// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
// import { ActivatedRoute, Router } from '@angular/router';
// import { CommonModule } from '@angular/common';
// import { LaptopService } from '../../../app/services/laptop.service';

// @Component({
//   selector: 'app-edit-laptop',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule],
//   templateUrl: './edit-laptop.component.html',
//   styleUrls: ['./edit-laptop.component.css']
// })
// export class EditLaptopComponent implements OnInit {
//   laptopForm: FormGroup;
//   laptopId!: number;
//   commentAdded = false;

//   showCommentModal = false;
//   commentForm!: FormGroup;

//   fieldLabels: { [key: string]: string } = {
//     assetTag: 'Asset Tag',
//     employeeId: 'Employee ID',
//     empName: 'Employee Name',
//     make: 'Make',
//     model: 'Model',
//     cpu: 'CPU',
//     os: 'Operating System',
//     ram: 'RAM',
//     hdd: 'HDD',
//     ssd: 'SSD',
//     mouse: 'Mouse',
//     company: 'Company',
//     phone: 'Phone Number',
//     email: 'Email',
//     comments: 'Comments',
//     invoiceDate: 'Invoice Date',
//     physicalIPAddress: 'Physical IP Address',
//     hostName: 'Host Name',
//     otherItems: 'Other Items'
//   };

//   constructor(
//     private fb: FormBuilder,
//     private route: ActivatedRoute,
//     private router: Router,
//     private laptopService: LaptopService
//   ) {
//     this.laptopForm = this.fb.group({
//       assetTag: ['', Validators.required],
//       employeeId: ['', Validators.required],
//       empName: ['', Validators.required],
//       make: ['', Validators.required],
//       model: ['', Validators.required],
//       cpu: ['', Validators.required],
//       os: ['', Validators.required],
//       ram: ['', Validators.required],
//       hdd: ['', Validators.required],
//       ssd: ['', Validators.required],
//       mouse: ['', Validators.required],
//       company: ['', Validators.required],
//       phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
//       email: ['', [Validators.required, Validators.email]],
//       comments: [''],
//       invoiceDate: ['', Validators.required],
//       physicalIPAddress: ['', Validators.required],
//       hostName: ['', Validators.required],
//       otherItems: ['']
//     });
//   }

//   ngOnInit(): void {
//     this.laptopId = +this.route.snapshot.paramMap.get('id')!;
//     this.laptopService.getLaptopById(this.laptopId).subscribe(data => {
//       this.laptopForm.patchValue(data.deviceDetails);
//     });

//     this.commentForm = this.fb.group({
//       date: [this.getToday(), Validators.required],
//       commentor: ['', Validators.required],
//       comment: ['', Validators.required]
//     });
//   }

//   onSubmit(): void {
//     if (this.laptopForm.valid) {
//       const updatedLaptop = {
//         id: this.laptopId,
//         deviceDetails: this.laptopForm.value
//       };
//       this.laptopService.updateLaptop(updatedLaptop).subscribe(() => {
//         alert('Laptop updated successfully!');
//         this.router.navigate(['assets/dashboard']);
//       });
//     }
//   }

//   goToDashboard() {
//     this.router.navigate(['assets/dashboard']);
//   }

//   getToday(): string {
//     const today = new Date();
//     return today.toISOString().substring(0, 10);
//   }

//   openCommentModal() {
//     this.showCommentModal = true;
//     this.commentForm.reset({ date: this.getToday() });
//   }

//   closeCommentModal() {
//     this.showCommentModal = false;
//   }

//   submitComment() {
//     if (this.commentForm.valid) {
//       const payload = {
//         assetId: this.laptopId,
//         ...this.commentForm.value
//       };

//       this.laptopService.addComment(payload).subscribe(() => {
//         alert('Comment added!');
//         this.commentAdded = true;
//         this.closeCommentModal();
//       });
//     }
//   }
// }
