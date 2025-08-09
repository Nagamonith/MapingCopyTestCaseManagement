import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { UploadResponse } from '../modles/upload.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = `${environment.apiUrl}/api/uploads`;

  constructor(private http: HttpClient) { }

  uploadFile(file: File, testCaseId?: string): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('File', file);
    if (testCaseId) {
      formData.append('TestCaseId', testCaseId);
    }
    return this.http.post<UploadResponse>(this.apiUrl, formData);
  }

  getUpload(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}`, { responseType: 'blob' });
  }

  deleteUpload(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}