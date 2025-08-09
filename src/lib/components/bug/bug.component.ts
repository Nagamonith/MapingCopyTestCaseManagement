import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

// Interfaces for API data
export interface BugTask {
  target_version: string;
  bug_id: number;
  task_id: number;
  task_title: string;
  relationship_type: number;
  start_date: string;
  end_date: string;
  resource_name: string;
  task_resource_name: string;
  // Add/remove fields as needed
}


export interface BugSummary {
  Summary: string;
  bug_id: number;
  target_version: string;
  Actual_Hours: number;
  Estimates_Hours: string;
  Analysis_hours: number;
  Design_hours: number;
  Coding_hours: number;
  Testing_hours: number;
  Demo_Review_hours: number;
  Release_hours: number;
  Documentation_hours: number;
  Training_hours: number;
  // Add/remove fields as needed
}

export interface TimeTracking {
  user_id: number;
  realname: string;
  total_spent: number;
  // Add/remove fields as needed
}

@Component({
  selector: 'app-bug',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './bug.component.html',
  styleUrls: ['./bug.component.css']
})
export class BugComponent implements OnInit {
  bugTasks: BugTask[] = [];
  bugSummaries: BugSummary[] = [];
  bugTrackings: TimeTracking[] = [];

  bugId: number | null = null;
  version: string = '';
  apiBaseUrl = JSON.parse(sessionStorage.getItem('config') || '{}').url;
  showSprintMatrixModal = true;
  dataLoaded = false;
  notFound = false;


  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.showSprintMatrixModal = false;
    this.bugTasks = [];
    this.bugSummaries = [];
    this.bugTrackings = [];
    this.dataLoaded = false;
  }

  openSprintMatrixModal(): void {
    this.showSprintMatrixModal = true;
    this.dataLoaded = false;
    this.bugId = null;
    this.version = '';
  }

  closeSprintMatrixModal(): void {
    this.showSprintMatrixModal = false;
  }

  loadData(): void {
    const params = [];
    if (this.bugId !== null && this.bugId !== undefined) params.push(`bguid=${this.bugId}`);
    if (this.version) params.push(`btversion=${this.version}`);
    const query = params.length ? `?${params.join('&')}` : '';

    this.http.get<any>(`${this.apiBaseUrl}/api/Bug/GetAllBugDataRaw${query}`)
      .subscribe((result: any) => {
        this.bugTasks = result.bugTaskDetails || [];
        this.bugSummaries = result.bugTimeSummary || [];
        this.bugTrackings = result.timeTracking || [];
        this.showSprintMatrixModal = false;
        this.dataLoaded = true;
      });
  }
  closeNotFoundModal(): void {
    this.notFound = false;
  this.openSprintMatrixModal();
  }
  
  openGanttChartModal(): void {
    this.router.navigate(['assets/gantt-editor']);
  }
}