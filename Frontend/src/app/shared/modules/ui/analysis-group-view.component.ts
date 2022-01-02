import {Component, Input, OnInit} from "@angular/core";
import {isNullOrUndefined} from "util";
import {OEDAApiService} from "../api/oeda-api.service";

@Component({
  selector: 'analysis-group-view',
  template: `
            <div class="col-md-4" style="padding-top: 20px">
              <div *ngIf="analysisImages && this.analysisImages.length > 0" class="sub-title">
                Select output
                <select
                  class="form-control"
                  [(ngModel)]="selectedId"
                  (ngModelChange)="onDropBoxChange($event)">
                  <option *ngFor="let local_image of analysisImages"
                          value="{{ local_image.id }}">{{ local_image.id}}
                  </option>
                </select>
              </div>
            </div>
        <div *ngIf="selectedImage" class="col-md-12" style="padding-top: 20px; padding-left: 2%">
          <div class="sub-title">Interval: {{selectedImage.interval}}</div>
          <div><img class="img-responsive"
                    *ngIf="selectedImage.image" [src]="selectedImage.image" alt="Loading image"></div>
        </div>
  `
})

export class AnalysisGroupViewComponent implements OnInit {
  @Input() experiment: any;
  @Input() algorithmName: string;
  @Input() algorithmAlias: string;
  @Input() step_no: any;

  selectedId = '';
  selectedImage: Image;

  analysisImages: Image[];


  constructor(private apiService: OEDAApiService) {

  }

  ngOnInit(): void {
    console.log("Rerendered");
    this.fetchAnalysisResults();
  }

  fetchAnalysisResults() {
    console.log("FetchAnalysis")
    if (!isNullOrUndefined(this.algorithmName)) {
      this.apiService.getAnalysis(this.experiment, this.step_no, this.algorithmName)
        .subscribe((analysisResult) => this.showAnalysis(analysisResult));
    }
  }

  showAnalysis(analysisResult: any) {
    this.analysisImages = analysisResult['result']['local_images'];
    console.log(this.analysisImages);
    this.analysisImages.forEach((imageData) => {
        this.apiService.getImage(imageData.file_access_token).subscribe((image) => imageData.image = image);
      }
    );
    if (this.selectedId === '') {
      if (this.analysisImages.length > 0) {
        this.selectedImage = this.analysisImages[0];
        this.selectedId = this.selectedImage.id;
      }
    } else {
      this.onDropBoxChange(this.selectedId);
    }
  }


  onDropBoxChange($event: any) {
    this.selectedImage  = this.analysisImages.find((result) => result.id === $event);
  }
}

export class Image {
  id: string;
  local_image: string;
  file_access_token: string;
  image: string;
  interval: string;
}
