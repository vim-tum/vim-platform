import {Component, Input} from "@angular/core";
import {isNullOrUndefined} from "util";
import {OEDAApiService} from "../api/oeda-api.service";
import {NotificationsService} from "angular2-notifications/dist";
import {EntityService} from "../../util/entity-service";
import * as _ from "lodash";

@Component({
  selector: 'anova-analysis',
  template: `
    <div class="col-md-12">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <button type="button" class="btn btn-success" (click)="btnClicked()">
            <span *ngIf="analysis_is_collapsed">Show ANOVA Results</span>
            <i *ngIf="analysis_is_collapsed" class="fa fa-angle-double-down" aria-hidden="true"></i>

            <span *ngIf="!analysis_is_collapsed">Hide ANOVA Results</span>
            <i *ngIf="!analysis_is_collapsed" class="fa fa-angle-double-up" aria-hidden="true"></i>
          </button>
        </div>

        <div class="panel-body" *ngIf="!analysis_is_collapsed && retrieved">
          <div clasS="row" style="padding-left: 1%">

            <div class="col-md-3">
              <div class="sub-title">Analysis Type</div>
              <div>
                <input type="text" name="analysis_type" value="{{experiment.analysis.type}}" disabled>
              </div>
            </div>

            <div class="col-md-3">
              <div class="sub-title">Analysis Method</div>
              <div>
                <input type="text" name="analysis_name" value="{{analysis_name}}" disabled>
              </div>
            </div>

            <div class="col-md-3">
              <div class="sub-title">Number of Important Factors</div>
              <div>
                <input type="text" name="nrOfImportantFactors" value="{{nrOfImportantFactors}}" disabled>
              </div>
            </div>

            <div class="col-md-3">
              <div class="sub-title">Alpha</div>
              <div>
                <input type="text" name="anovaAlpha" value="{{anovaAlpha}}" disabled>
              </div>
            </div>
          </div>
          
          <div class="row" style="padding-left: 1%">
            <div class="col-md-6" *ngIf="eligible_for_next_step">
              <div class="sub-title" style="overflow:hidden">
                <h4><span class="label label-success"><i class="fa fa-check"></i> Significant factor(s) selected for Bayesian Optimization are marked with *</span></h4>
              </div>
            </div>

            <div class="col-md-6" *ngIf="!eligible_for_next_step">
              <div class="sub-title">
                <h4><span class="label label-danger"><i class="fa fa-close"></i> Significant factor(s) are not found</span></h4>
              </div>
            </div>
          </div>
            
        </div>
          
        <div class="panel-body" *ngIf="!analysis_is_collapsed && retrieved">
          <div class="col-md-12">
            <div class="table-responsive">
  
              <table class="table table-striped table-bordered table-hover">
                <thead>
                  <th style="padding-left: 1%">Attribute</th>
                  <th *ngFor="let key of inner_keys" style="padding-left: 1%">{{key}}</th>
                </thead>
  
                <tbody>
                <!-- Multiple row multiple values for anova -->
                <tr *ngFor="let key of ordered_keys">
                  <td style="padding-left: 1%">
                    <span *ngIf="!results[key]['is_selected']">{{key}}</span>
                    <span *ngIf="results[key]['is_selected']" style="color: #4cae4c">{{key}} *</span>
                  </td>
                  <td *ngFor="let k of get_keys(results[key])" style="padding-left: 1%">
                    <span *ngIf='results[key][k] == undefined'>&nbsp;</span>
                    <span *ngIf='results[key][k] != undefined'>{{results[key][k]}}</span>
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

export class AnovaAnalysisComponent {
  @Input() targetSystem: any;
  @Input() experiment: any;
  @Input() step_no: any;
  @Input() for_successful_experiment: boolean;

  public analysis_is_collapsed: boolean;
  public ordered_keys: any; // keeps track of ordered keys that are sorted in backend's controller w.r.t. PR(>F) in ascending order
  public inner_keys: any;
  public results: any; // keeps track of keys & values in incoming obj
  public analysis_name: string;
  public eligible_for_next_step: boolean;
  public nrOfImportantFactors: number;
  public anovaAlpha: number;
  public retrieved: boolean; // keep track of retrieval status

  constructor(private apiService: OEDAApiService, private notify: NotificationsService, private entityService: EntityService) {
    this.analysis_is_collapsed = true;
    this.retrieved = false;
    this.analysis_name = "two-way-anova";
    this.inner_keys = [];
    this.ordered_keys = [];
  }

  public btnClicked(): void {
    // first case with empty results
    if (this.analysis_is_collapsed && isNullOrUndefined(this.results)) {
      // adjust retrieved step_no to always show anova results in UI for running-experiment
      if (this.step_no !== 1 && !this.for_successful_experiment) {
        this.step_no = 1;
      }
      this.apiService.getAnalysis(this.experiment, this.step_no, this.analysis_name).subscribe(
        (result) => {
          let analysis = JSON.parse(result._body);
          this.eligible_for_next_step = analysis["eligible_for_next_step"];
          this.nrOfImportantFactors = this.experiment.analysis["nrOfImportantFactors"];
          this.anovaAlpha = this.experiment.analysis["anovaAlpha"];
          delete analysis['createdDate'];
          delete analysis['result'];

          // naming convention with backend server
          this.results = analysis["anova_result"]; // {C(x): {F: 0.2, PR(>F): 0.4} ... }
          this.ordered_keys = analysis["ordered_keys"]; // Residual, exploration_percentage etc. ordered w.r.t PR(>F)
          console.log(this.results);
          // concatenate inner keys of tuples, e.g. F, PR(>F), df, eta_sq ...
          for (let key of this.ordered_keys) {
            let tuple = this.results[key];
            for (let key of this.get_keys(tuple)) {
              if (!this.inner_keys.includes(key)) {
                this.inner_keys.push(key);
              }
            }
          }

          // if anova was successful, mark the ones less than alpha, also consider nrOfImportantFactors that was provided by user
          let nrSelectedInteractions = 0;
          if (this.eligible_for_next_step) {
            for (let key of this.ordered_keys) {
              if (nrSelectedInteractions < this.experiment.analysis.nrOfImportantFactors) {
                if (!isNullOrUndefined(this.results[key]['PR(>F)'])) {
                  if (this.results[key]['PR(>F)'] < this.experiment.analysis['anovaAlpha']) {
                    this.results[key]["is_selected"] = true;
                    nrSelectedInteractions += 1;
                  }
                }
              }
            }
          }
          this.notify.success("Success", "Analysis results are retrieved");
          this.retrieved = true;
        }, error1 => {
          this.retrieved = false;
        }
      )
    }
    this.analysis_is_collapsed = !this.analysis_is_collapsed;
  }

  // returns keys that do not include "is_selected" key,
  // as we already mark it visually in first cell(s) of table
  public get_keys(object): Array<string> {
    if (!isNullOrUndefined(object)) {
      let original_keys = Object.keys(object);
      original_keys = original_keys.filter(value => value !== 'is_selected');
      return original_keys;
    }
    return null;
  }


}
