import {Component, EventEmitter, Input, Output, OnInit} from "@angular/core";
import {isNullOrUndefined} from "util";

@Component({
  selector: 'aggregate-topics',
  template: `
    <div class="col-md-12" *ngIf="targetSystem.name !== ''">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">Please select the aggregate topics that you wish to collect data from.
            </div>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="table table-striped table-bordered table-hover">
              <thead>
              <th>Name</th>
              <th>Description</th>
              <th>Consider</th>
              </thead>
              <tbody>
              <tr *ngFor="let topic of targetSystem.dataProviders; let i = index">
                <td>{{topic.name}}</td>
                <td>{{topic.description}}</td>
                <td *ngIf="isPrimaryDataProvider(topic)">Primary</td>
                <td *ngIf="!isPrimaryDataProvider(topic)">Secondary</td>
                <td>
                  <input type="checkbox" class="form-check-input"
                         (change)="topic_checkbox_clicked(i)"
                         data-toggle="tooltip"
                         title="Select an aggregate topic"
                         [checked]="topic.is_considered == true">
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

export class AggregateTopicsComponent implements OnInit {
  @Input() targetSystem: any;
  @Input() experiment: any;
  @Output() aggregateTopicChanged = new EventEmitter();

  constructor() {

  }

  ngOnInit() {
    // TODO: check if there are any corner cases: e.g. a data type from secondaryDataType is retrieved first
    // this.topic_checkbox_clicked(0);
    // console.log(this.targetSystem.primaryDataProvider);
  }

  public is_topic_considered(): boolean {
    for (const topic of this.targetSystem.dataProviders) {
      if (topic["is_considered"] === true) {
        return true;
      }
    }
    return false;
  }


  public isPrimaryDataProvider(topic): boolean {
    return topic.name === this.targetSystem.primaryDataProvider["name"];
  }

  public topic_checkbox_clicked(topic_index): void {
    const topic = this.targetSystem.dataProviders[topic_index];

    // adjust the clicked topic
    // first click
    if (isNullOrUndefined(topic["is_considered"])) {
      topic["is_considered"] = true;
    } else {
      // subsequent clicks (also refresh aggregateFunction)
      topic["is_considered"] = !topic["is_considered"];
    }

    let anyPrimarySubtopic = false;
    for (let i = 0; i < this.targetSystem.incomingDataTypes.length; i++) {
      let data_type = this.targetSystem.incomingDataTypes[i];
      // console.log(data_type.name + " is :" + data_type["is_considered"]);
      if (this.is_data_type_coming_from_primary(i) && data_type["is_considered"] == true) {
        anyPrimarySubtopic = true;
        break;
      }
    }

    if (!anyPrimarySubtopic && this.isPrimaryDataProvider(topic) && !topic["is_considered"]) {
      // select the first incoming type of the primary data provider as output
      this.change_data_type_selection(0);

    }

    /*
    console.log("[aggregate topics] primary DP considered: " + this.targetSystem.primaryDataProvider["is_considered"]);
    // selection propagated from incoming data types
    if (!this.targetSystem.primaryDataProvider["is_considered"]) {
      this.topic_checkbox_clicked(0);
    }

   */

    // propagate changes to parent component
    this.aggregateTopicChanged.emit(this.targetSystem.dataProviders[topic_index]);
  }

  public is_data_type_coming_from_primary(data_type_index): boolean {
    let data_type_name = this.targetSystem.incomingDataTypes[data_type_index]["name"];
    for (let data_type of this.targetSystem.primaryDataProvider.incomingDataTypes) {
      if (data_type["name"] == data_type_name) {
        return true;
      }
    }
    return false;
  }

  public change_data_type_selection(data_type_index): void {
    let data_type = this.targetSystem.incomingDataTypes[data_type_index];

    // mark data_type as considered and refresh aggregateFunction
    data_type["is_considered"] = true;
    data_type["aggregateFunction"] = null;

    // propagate changes to parent component
    // this.incomingDataTypesChanged.emit(this.targetSystem.incomingDataTypes);
  }

}
