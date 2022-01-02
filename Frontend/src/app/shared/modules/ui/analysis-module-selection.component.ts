import {Component, Input, OnInit, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {LabeledInputArrayComponent} from "./labeled-input-array.component";
import {isNullOrUndefined} from "util";

@Component({
  selector: 'analysis-module-selection',
  template: `
    <div *ngIf="targetSystem.name !== ''">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">Please select the algorithms.
            </div>
          </div>
        </div>
        <div class="panel-body">
          <accordion [closeOthers]="true">
            <accordion-group [(isOpen)]="this.heatmap.selected" [isDisabled]="accordionDisabled">
        <span accordion-heading>
            <algorithm-selection-header [algorithm]="heatmap"></algorithm-selection-header>
        </span>
              <div class="col-sm-12"><labeled-input name="Save results to the data storage" inputType="checkbox"
                             [model]="heatmap" key="result_output" colSize="3"></labeled-input></div>
              <div class="col-sm-12" style="padding-top: 20px">{{accordionNote}}</div>
            </accordion-group>
            <accordion-group [(isOpen)]="this.facebookProphet.selected" [isDisabled]="accordionDisabled">
         <span accordion-heading>
            <algorithm-selection-header [algorithm]="facebookProphet"></algorithm-selection-header>
        </span>
              <div class="col-sm-12">
              <labeled-input-array name="Detector Ids" [inputTypes]="['text']" [model]="facebookProphet.parameters"
                                   [keys]="['detector_ids']" [colSize]="12"  [inputSize]="2">
              </labeled-input-array>
              </div>
              <div class="col-sm-12"><labeled-input name="Save results to the data storage" inputType="checkbox"
                                                    [model]="facebookProphet" key="result_output" colSize="3"></labeled-input></div>
              <div class="col-sm-12" style="padding-top: 20px">{{accordionNote}}</div>
            </accordion-group>
            <accordion-group [(isOpen)]="this.trafficFlowPrediction.selected" [isDisabled]="accordionDisabled">
        <span accordion-heading>
            <algorithm-selection-header [algorithm]="trafficFlowPrediction"></algorithm-selection-header>
        </span>
              <div class="col-sm-12">
              <labeled-input-array name="Detector Ids" [inputTypes]="['text']" [model]="trafficFlowPrediction.parameters"
                                   [keys]="['detector_ids']" [colSize]="12" [inputSize]="2">
              </labeled-input-array>
              </div>
              <div class="col-sm-12">
             <labeled-input name="Prediction Horizon" inputType="number"
                                                    [model]="trafficFlowPrediction.parameters" key="prediction_horizon" colSize="3">
              </labeled-input>
              </div>
              <div class="col-sm-12"><labeled-input name="Save results to the data storage" inputType="checkbox"
                                                    [model]="trafficFlowPrediction" key="result_output" colSize="3"></labeled-input></div>
              <div class="col-sm-12" style="padding-top: 20px">{{accordionNote}}</div>
            </accordion-group>
          </accordion>
        </div>
      </div>
    </div>
  `
})

export class AnalysisModuleSelectionComponent implements OnInit {

  @Input() targetSystem: any;
  @Input() experiment: any;

  @ViewChildren(LabeledInputArrayComponent)
  arraysContainer: QueryList<LabeledInputArrayComponent>;

  accordionDisabled = true;

  algorithms: Algorithm[] = [];

  heatmap: Algorithm = {
    name: 'ContourPlot',
    alias: 'Contour Plot',
    parameters: {
    },
    selected: false,
    result_output: true
  };

  facebookProphet: Algorithm = {
    name: 'AnomalyTS',
    alias: 'Anomaly Detection',
    parameters: {
      detector_ids: ['E3Muc_1']
    },
    selected: false,
    result_output: true
  };

  trafficFlowPrediction: Algorithm = {
    name: 'TrafficFlowPrediction',
    alias: 'Traffic Flow Prediction',
    parameters: {
      detector_ids: ['Muc011', 'Muc012', 'Muc021'],
      prediction_horizon: 3
    },
    selected: false,
    result_output: true
  };

  accordionNote = 'Resource files automatically attached.'

  constructor() {

  }

  ngOnInit(): void {
    this.algorithms.push(this.heatmap, this.facebookProphet, this.trafficFlowPrediction);
  }

  hasSelected(): boolean {
    return this.algorithms.some((algorithm) => algorithm.selected);
  }

  hasErrors(): boolean {
    const isEmpty = (edge): boolean => {
      return isNullOrUndefined(edge) || edge === '';
    }
    const isFacebookProphetInvalid =  this.facebookProphet.selected && this.facebookProphet.parameters['detector_ids'].some(isEmpty);
    const isTrafficFlowPredictionInvalid  = this.trafficFlowPrediction.selected
      && (this.trafficFlowPrediction.parameters['detector_ids'].some(isEmpty)
    || this.isEmpty(this.trafficFlowPrediction.parameters, 'prediction_horizon'));

    return isFacebookProphetInvalid  || isTrafficFlowPredictionInvalid ;

  }

  isEmpty(object: any, key: string): boolean {
    return !object[key] || object[key] === '';
  }

  getAlgorithms(): Algorithm[] {
    return [this.heatmap, this.facebookProphet, this.trafficFlowPrediction];
  }

}

export class Algorithm {
  name: string;
  alias: string;
  parameters: {};
  selected: boolean;
  result_output: boolean;
}

