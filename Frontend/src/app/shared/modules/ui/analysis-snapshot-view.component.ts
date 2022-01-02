import {Component, Input, OnInit} from "@angular/core";
import {isNullOrUndefined} from "util";
import {OEDAApiService} from "../api/oeda-api.service";
import {Image} from "./analysis-group-view.component";

@Component({
  selector: 'analysis-snapshot-view',
  template: `
        <div *ngIf="image && image.image" class="panel-body" style="padding-top: 20px; padding-left: 2%">
          <div class="sub-title">Interval: {{image.interval}}</div>
          <div><img class="img-responsive"
                   [src]="image.image" alt="Loading image"></div>
        </div>
  `
})

export class AnalysisSnapshotViewComponent implements OnInit {
  @Input() experiment: any;
  @Input() algorithmName: string;
  @Input() step_no: any;

  image: Image;



  constructor(private apiService: OEDAApiService) {

  }

  ngOnInit(): void {
    this.fetchAnalysisResults();
  }

  fetchAnalysisResults() {
    if (!isNullOrUndefined(this.algorithmName)) {
      this.apiService.getAnalysis(this.experiment, this.step_no, this.algorithmName)
        .subscribe((analysisResult) => this.showAnalysis(analysisResult));
    }
  }

  showAnalysis(analysisResult: any) {
    this.image = analysisResult['result'];
    this.apiService.getImage(this.image.file_access_token).subscribe((image) => this.image.image = image);
  }

}


