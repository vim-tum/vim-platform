import {Component, EventEmitter, Input, Output} from "@angular/core";
import {isNullOrUndefined} from "util";
import {OEDAApiService} from "../api/oeda-api.service";
import {NotificationsService} from "angular2-notifications/dist";
import {EntityService} from "../../util/entity-service";

@Component({
  selector: 'incoming-data-types-analysis',
  template: `
    <div class="col-md-12" *ngIf="targetSystem.name !== '' && experiment.analysis.type !== undefined">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">Output Parameters for Analysis</div>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="table table-striped table-bordered table-hover">
              <thead>
                <th>Name</th>
                <th>Scale</th>
                <th>Description</th>
                <th>Select</th>
              </thead>
              <tbody>
              <tr *ngFor="let dataType of targetSystem.incomingDataTypes; let i = index">
                <td>{{dataType.name}}</td>
                <td>{{dataType.scale}}</td>
                <td>{{dataType.description}}</td>
                <td>
                  <input type="checkbox" class="form-check-input"
                         (change)="data_type_checkbox_clicked(i)"
                         data-toggle="tooltip"
                         [checked]="dataType['is_considered'] == true"
                         title="Select one output parameter for analysis. You can only select one of these data types">
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})

export class IncomingDataTypesAnalysisComponent {
  @Input() targetSystem: any;
  @Input() experiment: any;

  @Output() analysisDataTypeChanged = new EventEmitter();

  public aggregateFunctionsMetric: any;
  public aggregateFunctionsBoolean: any;

  constructor(private apiService: OEDAApiService, private notify: NotificationsService, private entityService: EntityService) {
    this.aggregateFunctionsMetric = [
      {key:'avg',label:'Average'},
      {key:'min',label:'Min'},
      {key:'max',label:'Max'},
      {key:'count',label:'Count'},
      {key:'sum',label:'Sum'},
      {key:'percentiles-1', label:'1st Percentile'},
      {key:'percentiles-5', label:'5th Percentile'},
      {key:'percentiles-25', label:'25th Percentile'},
      {key:'percentiles-50', label:'50th Percentile (median)'},
      {key:'percentiles-75', label:'75th Percentile'},
      {key:'percentiles-95', label:'95th Percentile'},
      {key:'percentiles-99', label:'99th Percentile'},
      {key:'sum_of_squares', label:'Sum of Squares'},
      {key:'variance', label:'Variance'},
      {key:'std_deviation', label:'Std. Deviation'}
    ];
    this.aggregateFunctionsBoolean = [
      {key:'ratio-True',label:'True Ratio'},
      {key:'ratio-False',label:'False Ratio'}
    ];
  }

  public get_keys(object): Array<string> {
    if (!isNullOrUndefined(object)) {
      return Object.keys(object);
    }
    return null;
  }

  public is_data_type_selected(): boolean {
    for (let dataType of this.targetSystem.incomingDataTypes) {
      if (dataType["is_considered"] == true) {
        return true;
      }
    }
    return false;
  }

  /**
   * checks whether given data type is coming from primaryDataProvider of targetSystem
   */
  public is_data_type_coming_from_primary(data_type_index): boolean {
    let data_type_name = this.targetSystem.incomingDataTypes[data_type_index]["name"];
    for (let data_type of this.targetSystem.primaryDataProvider.incomingDataTypes) {
      if (data_type["name"] == data_type_name) {
        return true;
      }
    }
    return false;
  }

  /**
   * sets respective attributes of data types when user clicks
   */
  public data_type_checkbox_clicked(data_type_index): void {
    let data_type = this.targetSystem.incomingDataTypes[data_type_index];

    // first click
    if (isNullOrUndefined(data_type["is_considered"])) {
      data_type["is_considered"] = true;
    }
    // subsequent clicks
    else {
      data_type["is_considered"] = !data_type["is_considered"];
    }

    // make other data types "not-selected"
    for (let i = 0; i < this.targetSystem.incomingDataTypes.length; i++) {
      if (i != data_type_index) {
        let data_type = this.targetSystem.incomingDataTypes[i];
        if (!isNullOrUndefined(data_type["is_considered"])) {
          data_type["is_considered"] = false;
        }
      }
    }

    // propagate changes to parent component if there's at least one selected data type
    for (let i = 0; i < this.targetSystem.incomingDataTypes.length; i++) {
      let data_type = this.targetSystem.incomingDataTypes[i];
      if (data_type["is_considered"] == true) {
        this.analysisDataTypeChanged.emit(data_type);
        return;
      }
    }
    // no dataType is selected, send null
    this.analysisDataTypeChanged.emit(null);
  }
}
