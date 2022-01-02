import {Component, Input, OnInit, QueryList, ViewChildren} from "@angular/core";
import {isNullOrUndefined} from "util";
import {OEDAApiService} from "../api/oeda-api.service";
import {Algorithm} from "./analysis-module-selection.component";
import {AnalysisResultComponent} from "./analysis-result.component";

@Component({
  selector: 'analysis-module',
  template: `
    <div class="col-md-12" *ngFor="let analysisResult of analysisResults; trackBy: trackByFnIndex">
      <analysis-result [step_no]="step_no" [algorithmName]="analysisResult['name']" [experiment]="experiment"
                       [analysisResult]="analysisResult"></analysis-result>
    </div>
  `
})

export class AnalysisModuleComponent implements OnInit {
  @Input() targetSystem: any;
  @Input() experiment: any;
  @Input() step_no: any;

  analysisResults = [];

  @ViewChildren(AnalysisResultComponent)
  analysisResultsComponent: QueryList<AnalysisResultComponent>;


  constructor(private apiService: OEDAApiService) {

  }

  ngOnInit(): void {
    this.fetchAnalysisResults();
  }

  fetchAnalysisResults() {
    if (!isNullOrUndefined(this.experiment.analysis['algorithms'])) {
      this.experiment.analysis['algorithms'].filter((algorithm: Algorithm) => algorithm.selected).forEach((algorithm: Algorithm) => {
        this.apiService.getAnalysis(this.experiment, this.step_no, algorithm.name)
          .subscribe((analysisResult) => {
            analysisResult['alias'] = algorithm.alias;
            this.analysisResults.push(analysisResult);
          });
      });
    }
  }

  updateAnalysisResults(algorithmNames: string[]) {
    this.analysisResultsComponent.filter((analysisResult) =>
      !!algorithmNames.find((name) => name === analysisResult.algorithmName))
      .forEach((analysisResult) => analysisResult.fetchAnalysisResults());
  }

  trackByFnIndex(itemIndex: any) {
    return itemIndex;
  }
}
