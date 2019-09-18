import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {OedaCallbackEntity} from "../api/oeda-api.service";
import {isNullOrUndefined} from "util";

@Component({
  selector: 'experiment-stages-paginator',
  template: `
    <div class="col-md-12" [hidden]="hidden">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="row">
            <div class="col-md-4">
              <div class="card-title">
                Output Parameters
                <select class="form-control" [(ngModel)]="incoming_data_type_name" (ngModelChange)="onIncomingDataTypeChange($event)">
                  <option *ngFor="let dataType of targetSystem.incomingDataTypes" value="{{dataType.name}}">
                    {{dataType.name}}
                  </option>
                </select>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="card-title">
                Scale
                <select class="form-control" required [(ngModel)]="scale" (ngModelChange)="onScaleChange($event)">
                  <option selected>Normal</option>
                  <option>Log</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div class="panel-body" style="padding-top: 20px; padding-left: 2%">
          <div class="table-responsive">
            <table style="margin-top: 20px" class="table table-bordered table-hover" [mfData]="available_steps[step_no]" #mf="mfDataTable" [mfRowsOnPage]="10">
              <thead>
                <tr>
                  <th>
                    Stage
                  </th>
                  <th *ngIf="for_successful_experiment">
                    Result
                  </th>
                  <!-- Default Knobs Header (this is always in the same order because we retrieve it from config)-->
                  <th *ngFor="let default_knob of targetSystem.defaultVariables"> 
                    {{default_knob.name}}
                  </th>
                </tr>
              </thead>
              <tbody class="bigTable">
                <tr *ngFor="let item of mf.data" (click)="onRowClick(item)" [class.active]="item.number == selected_row">
                  <td *ngIf="item.number === -1 && experiment.executionStrategy.type !== 'forever'" data-toggle="tooltip" title="Default configuration values are shown on this row">
                    <b>All Stages</b>
                  </td>
                  <td *ngIf="item.number !== -1" data-toggle="tooltip" title="Click to draw plots">
                    {{item.number}}
                  </td>
                  <td *ngIf="for_successful_experiment && (item.number === -1 || item.stage_result == null)" data-toggle="tooltip" title="Result cannot be shown">
                    <!--a font or null value can be shown here-->
                  </td>
                  <td *ngIf="for_successful_experiment && item.number !== -1 && item.stage_result != null" data-toggle="tooltip" title="Shows result of the stage">
                    {{item.stage_result}}
                  </td>
                  <td *ngFor="let knob_key_name of ordered_keys" data-toggle="tooltip" title="Click to draw plots">
                    <!-- all stage variables that we make experiment with (if strategy is not forever) -- format: [min, max]-->
                    <span *ngIf="item.number === -1 && is_included_in_experiment(knob_key_name) && experiment.executionStrategy.type !== 'forever'">
                      <b>[{{item.knobs[knob_key_name].min}}, {{item.knobs[knob_key_name].max}}]</b>
                    </span>
    
                    <!-- all stage variables that we do "not" make experiment with (if strategy is not forever) -- format: default_value -->
                    <span *ngIf="item.number === -1 && !is_included_in_experiment(knob_key_name) && experiment.executionStrategy.type !== 'forever'">
                      <b>{{item.knobs[knob_key_name].default}}</b>
                    </span>
                    
                    <span *ngIf="item.number !== -1">
                      {{item.knobs[knob_key_name]}}
                    </span>
                  </td>
                  
                </tr>
                </tbody>
                <!--<tfoot *ngIf="get_keys(available_steps[step_no]).length > 10">-->
                <tfoot>
                  <tr>
                    <td colspan="12">
                      <mfBootstrapPaginator [rowsOnPageSet]="[5,10,25]"></mfBootstrapPaginator>
                    </td>
                  </tr>
                </tfoot>
              </table>
          </div>
        </div>
      </div>
    </div>
  `
})

export class ExperimentStagesPaginatorComponent implements OnInit {
  @Output() rowClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() scaleChanged: EventEmitter<any> = new EventEmitter<any>();
  @Output() incomingDataTypeChanged: EventEmitter<any> = new EventEmitter<any>();

  @Input() experiment: any;
  @Input() available_steps: any;
  @Input() step_no: any;
  @Input() targetSystem: any;
  @Input() incoming_data_type_name: string;
  @Input() scale: string;
  @Input() hidden: boolean;
  @Input() retrieved_data_length: number;
  @Input() for_successful_experiment: boolean;
  @Input() oedaCallback: OedaCallbackEntity;

  public selected_row: number = 0;
  public ordered_keys: any;

  public onRowClick(stage) {
    this.selected_row = stage.number;
    this.rowClicked.emit(stage);
  }

  public onScaleChange = (ev) => {
    this.scaleChanged.emit(ev);
  };

  public onIncomingDataTypeChange(ev) {
    this.incomingDataTypeChanged.emit(ev);
  }

  ngOnInit() {
    if (this.available_steps.hasOwnProperty(this.step_no)) {
      // ordered_keys is used to display knobs of All Stages row
      let step_tuple = this.available_steps[this.step_no];
      if(!isNullOrUndefined(step_tuple)) {
        this.ordered_keys = this.get_ordered_keys(step_tuple[0].knobs);
      }
    }
  }

  /** returns true if given variable is being tested in the experiment */
  is_included_in_experiment(knob_key_name: string): boolean {
    if (!isNullOrUndefined(this.experiment.changeableVariables)) {
      return this.experiment.changeableVariables.hasOwnProperty(knob_key_name);
    }
    return false;
  }

  /** returns keys of the given object */
  get_keys(object) : Array<string> {
    if (!isNullOrUndefined(object)) {
      return Object.keys(object);
    }
    return null;
  }

  /** sorts given stage objects keys with respect to executionStrategy knob key order
   * we need this function because stage object has these keys in an unordered manner
   * https://stackoverflow.com/questions/42227582/sorting-array-based-on-another-array
   */
  get_ordered_keys(stage_object) {
    let sortingArray = [];
    this.targetSystem.defaultVariables.forEach(function(default_variable){
      sortingArray.push(default_variable['name']);
    });
    let unordered_stage_keys = this.get_keys(stage_object);
    return sortingArray.filter((element)=>(unordered_stage_keys.indexOf(element) > -1));
  }
}
