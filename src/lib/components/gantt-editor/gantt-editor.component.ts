
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DxGanttModule } from 'devextreme-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gantt-editor',
  standalone: true,
  templateUrl: './gantt-editor.component.html',
  styleUrls: ['./gantt-editor.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DxGanttModule]
})
export class GanttEditorComponent {
  ganttForm: FormGroup;
  ganttChartVisible = false;
  ganttChartLoading = false;
  ganttChartData: any[] = [];
  skippedTasks: any[] = [];
  ganttDependencies: any[] = [];
  ganttResources: any[] = [];
  ganttAssignments: any[] = [];
  selectedResourceId: number | null = null;
  selectedTypeId: string | null = null;
  filteredTasks: any[] = [];
  validChartTasks: any[] = [];
  apiBaseUrl = JSON.parse(sessionStorage.getItem('config') || '{}').url;
  ganttTypes: any[] = [];
  showTaskModal = false;
  selectedTask: any = null;
  ganttChartReady: boolean | undefined;
  showGrid: boolean = true;

  projectNames = [
    'Web DSM', 'Test Automation', 'Security', 'Sales&Marketing', 'Qualis Wizard',
    'Qualis Saas', 'Qualis Gage', 'Qualis FMEA', 'Qualis APQP', 'Qualis 4.0 SPC',
    'OEE', 'Licensing Integration', 'IT Support', 'DSM', 'DIS', 'DataLyzer Reporting',
    'DataLyzer Mould Application', 'Datalyzer License Management', 'DataLyzer FMEA',
    'DataLyzer Console', 'DataLyzer COA', 'Datalyzer Cloud', 'Archive Qualis Admin',
    'AI_MLOPS'
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.ganttForm = this.fb.group({
      projectName: [this.projectNames[0], Validators.required],
      targetVersion: ['']
    });
  }

  showGanttChart() {
    const projectName = this.ganttForm.value.projectName;
    const targetVersion = this.ganttForm.value.targetVersion;
    console.log("show grid")
    if (!projectName || !targetVersion) {
      alert('Project Name and Target Version are required!');
      return;
    }

    this.ganttChartLoading = true;
    this.ganttChartVisible = true;
    this.ganttChartData = [];
    this.skippedTasks = [];
    this.ganttDependencies = [];
    this.ganttResources = [];
    this.ganttAssignments = [];
    this.ganttTypes = [];
    this.ganttChartReady = false;

    const params: any = { projectName, targetVersion };

    this.http.get<any>(`${this.apiBaseUrl}/api/gantt/chart`, { params }).subscribe({
      next: (data) => {
        const seenIds = new Set<string>();
        this.ganttChartData = (data.tasks || []).filter((task: any) => {
          const idStr = String(task.id);
          if (seenIds.has(idStr)) return false;
          seenIds.add(idStr);
          return true;
        });

        this.ganttResources = data.resources || [];
        this.ganttAssignments = data.assignments || [];
        this.ganttDependencies = data.dependencies || [];
        this.skippedTasks = (data.tasks || []).filter((t: any) => !t.start || !t.end);

        // Extract unique types for type filter dropdown
        const typeSet = new Set(this.ganttChartData.map(t => t.type).filter(Boolean));
        this.ganttTypes = Array.from(typeSet).map(t => ({ id: t, text: t }));

        this.applyCombinedFilter();
        this.cdr.markForCheck();

        this.validChartTasks = this.filteredTasks.filter(t => !!t.start && !!t.end);

        if (this.validChartTasks.length === 0) {
          this.ganttChartReady = false;
          this.ganttChartLoading = false;
          alert('Please fill in all required fields (start and end dates) for at least one task.');
          return;
        }

        setTimeout(() => {
          this.ganttChartReady = true;
          this.ganttChartLoading = false;
          this.cdr.markForCheck();
        }, 0);
      },
      error: () => {
        alert('Error loading Gantt data');
        this.ganttChartLoading = false;
      }
    });
  }

  applyCombinedFilter() {
    this.filteredTasks = this.ganttChartData.filter(task => {
      const matchesResource = !this.selectedResourceId ||
        this.ganttAssignments.some(a => a.taskId === task.id && a.resourceId === this.selectedResourceId);
      const matchesType = !this.selectedTypeId || task.type === this.selectedTypeId;
      return matchesResource && matchesType;
    });
  }

  onResourceFilterChange() {
    this.applyCombinedFilter();
  }

  onTypeFilterChange() {
    this.applyCombinedFilter();
  }

  getResourceName(taskId: number): string {
    const assignment = this.ganttAssignments.find(a => a.taskId === taskId);
    const resource = assignment ? this.ganttResources.find(r => r.id === assignment.resourceId) : null;
    return resource ? resource.text : '-';
  }

  getOriginalMergeDate(taskId: number): string {
    const task = this.ganttChartData.find(t => t.id === taskId);
    return task ? task.originalEnd || '-' : '-';
  }

  onRowDblClick(task: any) {
    this.selectedTask = { ...task };
    const dep = this.ganttDependencies.find(dep => dep.successorId === task.id);
    this.selectedTask.dependency = dep ? dep.predecessorId : null;
    this.showTaskModal = true;
  }

  closeTaskModal() {
    this.showTaskModal = false;
    this.selectedTask = null;
  }

  saveTask(task: any) {
    const assignment = this.ganttAssignments.find(a => a.taskId === task.id);
    const resource = assignment ? this.ganttResources.find(r => r.id === assignment.resourceId) : null;
    const resource_Name = resource ? resource.text : null;
    const payload = { ...task, resource_Name };

    this.http.post(`${this.apiBaseUrl}/api/gantt/save-task`, payload).subscribe({
      next: () => {
        alert('Task saved!');
        this.showGanttChart(); // Reload data
      },
      error: () => alert('Error saving task')
    });
  }

  toggleView() {
    this.showGrid = !this.showGrid;
  }
}
