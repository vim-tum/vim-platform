import { Component, EventEmitter, Input, Output, OnInit } from "@angular/core";
import { isNullOrUndefined } from "util";

@Component({
  selector: "input-topics-analysis",
  template: `
    <div
      class="col-md-12"
      *ngIf="simulationTargetSystem && simulationTargetSystem.name !== ''"
    >
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">
              Please select the input topics that you wish to analyze data from.
            </div>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="table table-striped table-bordered table-hover">
              <thead>
                <th>Name</th>
                <th>Description</th>
                <th>Provider type</th>
                <th>Consider</th>
              </thead>
              <tbody>
                <tr
                  *ngFor="
                    let topic of simulationTargetSystem.dataProviders;
                    let i = index
                  "
                >
                  <ng-container *ngIf="topic.experiment_type != 'analysis'">
                    <td>{{ topic.name }}</td>
                    <td>{{ topic.description }}</td>
                    <td *ngIf="isPrimaryDataProvider(topic)">Primary</td>
                    <td *ngIf="!isPrimaryDataProvider(topic)">Secondary</td>
                    <td>
                      <input
                        type="checkbox"
                        class="form-check-input"
                        (change)="topic_checkbox_clicked(i)"
                        data-toggle="tooltip"
                        title="Select an input topic"
                      />
                    </td>
                  </ng-container>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class InputTopicsAnalysisComponent implements OnInit {
  @Input() simulationTargetSystem: any;
  @Input() simulationExperiment: any;
  @Input() experiment: any;
  @Output() inputTopicChanged = new EventEmitter();

  constructor() {}

  ngOnInit() {
    if (isNullOrUndefined(this.experiment.analysis.input_topics)) {
      this.experiment.analysis.input_topics = [];
    }
  }

  public isPrimaryDataProvider(topic): boolean {
    return (
      topic.name === this.simulationTargetSystem.primaryDataProvider["name"]
    );
  }

  public topic_checkbox_clicked(topic_index): void {
    const topic = this.simulationTargetSystem.dataProviders[topic_index];

    if (
      !this.experiment.analysis.input_topics.find(
        (inputTopic) => inputTopic["name"] === topic.name
      )
    ) {
      this.experiment.analysis.input_topics.push({ name: topic.name });
    } else {
      this.experiment.analysis.input_topics = this.experiment.analysis.input_topics.filter(
        (inputTopic) => inputTopic["name"] !== topic.name
      );
    }

    // propagate changes to parent component
    this.inputTopicChanged.emit(
      this.simulationTargetSystem.dataProviders[topic_index]
    );
  }
}
