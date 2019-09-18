import {Component, Input} from "@angular/core";
import {isNullOrUndefined} from "util";
import {OEDAApiService} from "../api/oeda-api.service";
import {NotificationsService} from "angular2-notifications/dist";

@Component({
  selector: 'ttest-analysis',
  template: `
    <!-- Show/Hide Button & Additional Buttons for Running experiments -->
    <div class="col-md-12" *ngIf="experiment.numberOfSteps > 2">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <button type="button" class="btn btn-success" (click)="btnClicked()">
            <span *ngIf="analysis_is_collapsed">Show T-test Details</span>
            <i *ngIf="analysis_is_collapsed" class="fa fa-angle-double-down" aria-hidden="true"></i>

            <span *ngIf="!analysis_is_collapsed">Hide T-test Details</span>
            <i *ngIf="!analysis_is_collapsed" class="fa fa-angle-double-up" aria-hidden="true"></i>
          </button>
        </div>

        <div class="panel-body" *ngIf="!analysis_is_collapsed && retrieved">
          <div clasS="row" style="padding-left: 1%">

            <div class="col-md-2">
              <div class="sub-title">Analysis Type</div>
              <div>
                <input type="text" name="analysis_type" value="{{experiment.analysis.type}}" disabled>
              </div>
            </div>

            <div class="col-md-2">
              <div class="sub-title">Analysis Method</div>
              <div>
                <input type="text" name="analysis_name" value="{{analysis_name}}" disabled>
              </div>
            </div>
            
            <div class="col-md-2">
              <div class="sub-title">Alpha</div>
              <div>
                <input type="text" name="tTestAlpha" value="{{tTestAlpha}}" disabled>
              </div>
            </div>

            <div class="col-md-2">
              <div class="sub-title">Given Effect Size</div>
              <div>
                <input type="text" name="tTestEffectSize" value="{{tTestEffectSize}}" disabled>
              </div>
            </div>

            <div class="col-md-2" *ngIf="statistical_significance">
              <div class="sub-title">
                <h4><span class="label label-success"><i class="fa fa-check"></i> Statistical significance is found</span></h4>
              </div>
            </div>

            <div class="col-md-2" *ngIf="!statistical_significance">
              <div class="sub-title">
                <h4><span class="label label-danger"><i class="fa fa-close"></i> Statistical significance cannot be found</span></h4>
              </div>
            </div>
            
          </div>
            
        </div>

        <!--Default to Best tail-->
        <div class="panel-body" *ngIf="!analysis_is_collapsed && retrieved">
          <div class="col-md-12">
            <div class="sub-title">
              Results of Default --> Best tail
            </div>
              
            <div class="table-responsive">
  
              <table class="table table-striped table-bordered table-hover">
                <thead>
                  <th style="padding-left: 1%" *ngFor="let key of get_keys(results)">{{key}}</th>
                </thead>
  
                <tbody>
                  <!-- Single row multiple values for t-test -->
                  <tr>
                    <td *ngFor="let key of get_keys(results)" style="padding-left: 1%">
                      {{results[key]}}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})

export class TtestAnalysisComponent {
  @Input() targetSystem: any;
  @Input() experiment: any;
  @Input() step_no: any;

  public analysis_is_collapsed: boolean;
  public results: any; // keeps track of keys & values in Default --> Best tail
  public analysis_name: string;
  public tTestAlpha: number;
  public tTestEffectSize: number;
  public retrieved: boolean; // keep track of retrieval status
  public statistical_significance: boolean; // keep track of statistical significance & respective UI tabs

  constructor(private apiService: OEDAApiService, private notify: NotificationsService) {
    this.analysis_is_collapsed = true;
    this.retrieved = false;
    this.analysis_name = "t-test";
  }

  public btnClicked(): void {
    // first case with empty results
    if (this.analysis_is_collapsed && isNullOrUndefined(this.results)) {
      // get Default --> Best tail result of T-test
      this.apiService.getAnalysis(this.experiment, this.step_no, this.analysis_name).subscribe(
        (result) => {
          let analysis = JSON.parse(result._body);
          this.tTestAlpha = this.experiment.analysis["tTestAlpha"];
          this.tTestEffectSize = this.experiment.analysis["tTestEffectSize"];
          this.results = analysis["result"]; // {different_averages: .., effect_size: .., ...}
          delete this.results["alpha"]; // no need to show it in the table, we already show it in the row

          // http://trendingsideways.com/index.php/cohens-d-formula/
          // http://staff.bath.ac.uk/pssiw/stats2/page2/page14/page14.html
          // https://en.wikipedia.org/wiki/Effect_size#Coefficient_of_determination
          let direction = this.experiment.considered_data_types[0]["criteria"];
          let direction_validity = false;
          if (direction === 'Maximize') {
            // for valid case, we should have a negative effect_size
            if (this.results["effect_size"] < -1 * this.tTestEffectSize) {
              direction_validity = true;
            }
          } else {
            if (this.results["effect_size"] > this.tTestEffectSize) {
              direction_validity = true;
            }
          }
          this.statistical_significance = (this.results["different_averages"] == true && direction_validity);

          this.notify.success("Success", "Analysis results are retrieved");
          this.retrieved = true;

        }, error1 => {
          this.retrieved = false;
          this.notify.error("", error1.message);
        }
      )
    }
    this.analysis_is_collapsed = !this.analysis_is_collapsed;
  }

  public get_keys(object): Array<string> {
      if (!isNullOrUndefined(object)) {
      return Object.keys(object);
    }
    return null;
  }


}
