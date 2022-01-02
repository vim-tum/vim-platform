import {Component, Input, OnInit, ViewChild} from "@angular/core";
import {isNullOrUndefined} from "util";
import {OEDAApiService} from "../api/oeda-api.service";
import {AnalysisGroupViewComponent, Image} from "./analysis-group-view.component";
import {AnalysisSnapshotViewComponent} from "./analysis-snapshot-view.component";

@Component({
  selector: 'analysis-result',
  template: `
    <div  class="panel panel-default chartJs">
      <div class="panel-heading">{{analysisResult['alias']}}</div>
      <div class="panel-body">
        <ng-container *ngIf="analysisResult.result['local_image']">
          <analysis-snapshot-view  #snapshot [experiment]="experiment" [step_no]="step_no"
                                   [algorithmName]="analysisResult.name"></analysis-snapshot-view>
        </ng-container>
        <analysis-group-view #group *ngIf="analysisResult.result['local_images']"
                             [experiment]="experiment" [step_no]="step_no"
                             [algorithmName]="analysisResult.name">

        </analysis-group-view>
      </div>
    </div>
  `
})

export class AnalysisResultComponent implements OnInit {
  @Input() experiment: any;
  @Input() algorithmName: string;
  @Input() step_no: any;
  @Input() analysisResult: any;

  @ViewChild('snapshot')
  analysisSnapshot: AnalysisSnapshotViewComponent;

  @ViewChild('group')
  analysisGroup: AnalysisGroupViewComponent;

  constructor() {

  }

  ngOnInit(): void {

  }

  fetchAnalysisResults() {
    if (!isNullOrUndefined(this.analysisResult.result['local_image'])) {
      this.analysisSnapshot.fetchAnalysisResults();
    }
    if (!isNullOrUndefined(this.analysisResult.result['local_images'])) {
      this.analysisGroup.fetchAnalysisResults();
    }
  }



}


