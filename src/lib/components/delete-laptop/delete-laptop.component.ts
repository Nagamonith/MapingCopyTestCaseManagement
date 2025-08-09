import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LaptopService } from '../../../app/services/laptop.service';
import { catchError, of } from 'rxjs';



@Component({
  selector: 'app-delete-laptop',
  templateUrl: './delete-laptop.component.html',
  styleUrls: ['./delete-laptop.component.css']
})
export class DeleteLaptopComponent implements OnInit {
  laptopId!: number;

  constructor(
    private route: ActivatedRoute,
    private laptopService: LaptopService,
    private router: Router
  ) {}


  ngOnInit(): void {
  this.laptopId = Number(this.route.snapshot.paramMap.get('id'));
  const confirmed = window.confirm('Are you sure you want to delete this Asset?');

  if (confirmed) {
    this.laptopService.deleteLaptop(this.laptopId).pipe(
      catchError((err) => {
       
        this.router.navigate(['assets/dashboard']);
        return of(null); // Prevent further execution
      })
    ).subscribe((res) => {
      if (res !== null) {
        alert('Asset deleted successfully!');
      }
      this.router.navigate(['assets/dashboard']);
    });
  } else {
    this.router.navigate(['assets/dashboard']);
  }
}
}
