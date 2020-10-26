import {Component, EventEmitter, Input, Output, OnInit} from "@angular/core";
import {isNullOrUndefined} from "util";

@Component({
  selector: 'incoming-data-types-simulation',
  template: `
    <div class="col-md-12" *ngIf="targetSystem.name !== ''">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">Please select the output to analyze.
            </div>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="table table-striped table-bordered table-hover">
              <thead>
              <th>Name</th>
              <th>Scale</th>
              <th>Description</th>
              <th>Provider Name</th>
              <th>Provider Type</th>
              <th>Criteria</th>
              <th>Consider</th>
              <th *ngIf="is_data_type_considered()">Aggregation</th>
              </thead>
              <tbody>
              <tr *ngFor="let dataType of targetSystem.incomingDataTypes; let i = index">
                <td>{{dataType.name}}</td>
                <td>{{dataType.scale}}</td>
                <td>{{dataType.description}}</td>
                <td>{{dataType.dataProviderName}}</td>
                <td *ngIf="is_data_type_coming_from_primary(i)">Primary</td>
                <td *ngIf="!is_data_type_coming_from_primary(i)">Secondary</td>
                <td>{{dataType.criteria}}</td>
                <!-- td *ngIf="is_data_type_coming_from_primary(i)" -->
                <td>
                  <input type="checkbox" class="form-check-input"
                         (change)="data_type_checkbox_clicked(i)"
                         data-toggle="tooltip"
                         title="Select one output parameter to be optimized. You cannot aggregate data coming from primary & secondary data providers at the same time"
                         [checked]="dataType.is_considered == true">
                </td>
                <td
                  *ngIf="dataType['is_considered'] && dataType.scale == 'Metric'">
                  <select [(ngModel)]="dataType['aggregateFunction']" required>
                    <option *ngFor="let fcn of aggregateFunctionsMetric" [ngValue]="fcn.key">{{fcn.label}}</option>
                  </select>
                </td>
                <td
                  *ngIf=" dataType['is_considered'] && dataType.scale == 'Boolean'">
                  <select [(ngModel)]="dataType['aggregateFunction']" required>
                    <option *ngFor="let fcn of aggregateFunctionsBoolean" [ngValue]="fcn.key">{{fcn.label}}</option>
                  </select>
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

export class IncomingDataTypesSimulationComponent implements OnInit {
  @Input() targetSystem: any;
  @Input() experiment: any;
  @Output() incomingDataTypesChanged = new EventEmitter();

  public aggregateFunctionsMetric: any;
  public aggregateFunctionsBoolean: any;

  constructor() {
    this.aggregateFunctionsMetric = [
      {key:'avg',label:'Average'},
      {key:'min',label:'Min'},
      {key:'max',label:'Max'},
      {key:'count',label:'Count'},
      {key:'sum',label:'Sum'}
    ];
    this.aggregateFunctionsBoolean = [
      {key:'ratio-True',label:'True Ratio'},
      {key:'ratio-False',label:'False Ratio'}
    ];
  }

  ngOnInit() {
    // TODO: check if there are any corner cases: e.g. a data type from secondaryDataType is retrieved first
    this.data_type_checkbox_clicked(0); // select first data type as selected
    this.targetSystem.incomingDataTypes[0]["aggregateFunction"] = "avg"; // also set its agg. fcn.
  }

  public is_data_type_considered(): boolean {
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
   * sets respective weights of data types when user clicks
   */
  public data_type_checkbox_clicked(data_type_index): void {
    let data_type = this.targetSystem.incomingDataTypes[data_type_index];

    // adjust the clicked data type
    // first click
    if (isNullOrUndefined(data_type["is_considered"])) {
      data_type["is_considered"] = true;
    }
    // subsequent clicks (also refresh aggregateFunction)
    else {
      data_type["is_considered"] = !data_type["is_considered"];
      data_type["aggregateFunction"] = null;
    }

    /*
    // adjust the rest because we only allow single data type for selection
    for (let i = 0; i < this.targetSystem.incomingDataTypes.length; i++) {
      if (i != data_type_index) {
        this.targetSystem.incomingDataTypes[i]["is_considered"] = false;
        this.targetSystem.incomingDataTypes[i]["aggregateFunction"] = null;
      }
    }
     */

    // propagate changes to parent component
    this.incomingDataTypesChanged.emit(this.targetSystem.incomingDataTypes);
  }

  // check if user has selected a data coming from primary dp.
  public is_primary_dp_selected() {
    for (let data_type of this.targetSystem.primaryDataProvider.incomingDataTypes) {
      if (data_type["is_considered"] === true) {
        return true;
      }
    }
    return false;
  }
}
