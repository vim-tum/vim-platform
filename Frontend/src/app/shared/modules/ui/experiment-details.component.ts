import {Component, Input, Output, EventEmitter, OnInit} from "@angular/core";
import {isNullOrUndefined} from "util";

@Component({
  selector: 'experiment-details',
  template: `
    <!-- Show/Hide Button & Additional Buttons for Running experiments -->
    <div class="col-md-12">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <button type="button" class="btn btn-orange"
                  (click)="is_collapsed = !is_collapsed">
            <span *ngIf="is_collapsed">Show Experiment Details</span>
            <i *ngIf="is_collapsed" class="fa fa-angle-double-down" aria-hidden="true"></i>

            <span *ngIf="!is_collapsed">Hide Experiment Details</span>
            <i *ngIf="!is_collapsed" class="fa fa-angle-double-up" aria-hidden="true"></i>
          </button>

          <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#exampleModal"
                  *ngIf="!for_successful_experiment">
            Stop Experiment
          </button>

          <div class="btn btn-group btn-toggle" style="padding-top: 5px; padding-left: 1%"
               *ngIf="!for_successful_experiment">
            <button class="btn btn-primary active" id="polling_on_button" (click)="enable_polling($event)"
                    data-toggle="tooltip" title="Click to enable polling">Polling ON
            </button>
            <button class="btn btn-default" id="polling_off_button" (click)="disable_polling($event)"
                    data-toggle="tooltip" title="Click to disable polling">Polling OFF
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Experiment Name & Description -->
    <div class="col-md-12" [hidden]="is_collapsed" style="border-top: 3px groove #5cb85c; border-right: 3px groove #5cb85c; border-left: 3px groove #5cb85c">
      <div class="panel panel-default chartJs">
        <div class="panel-body">
          <div class="row">
            <labeled-input name="Experiment Name" [model]="experiment" key="name" [colSize]="6"
                           [disabled]="true"></labeled-input>
            <labeled-input name="Experiment Description" [model]="experiment" key="description" [colSize]="6"
                           [disabled]="true"></labeled-input>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Providers & Change Provider -->
    <div class="col-md-12" [hidden]="is_collapsed" style="border-right: 3px groove #5cb85c; border-left: 3px groove #5cb85c">

      <!-- Primary Data Provider & Secondary Data Provider(s)-->
      <div class="col-md-6" style="padding-left: 0">
        <div class="panel panel-default chartJs">
          <div class="panel-heading">
            <div class="card-title">
              <div class="title pull-left">Primary Data Provider</div>
            </div>
          </div>
          <div class="panel-body" style="padding-top: 20px">

            <div class="row" *ngIf="targetSystem.primaryDataProvider.type == 'http_request'">
              <div class="col-md-3">
                <div class="sub-title">Name</div>
                <span>{{targetSystem.primaryDataProvider.name}}</span>
              </div>
              <div class="col-md-2">
                <div class="sub-title">URL</div>
                <span>{{targetSystem.primaryDataProvider.url}}</span>
              </div>
              <div class="col-md-2">
                <div class="sub-title">Port</div>
                <span>{{targetSystem.primaryDataProvider.port}}</span>
              </div>
              <div class="col-md-2">
                <div class="sub-title">Serializer</div>
                <span>{{targetSystem.primaryDataProvider.serializer}}</span>
              </div>
              <!-- <div class="col-md-2">
                <div class="sub-title">Ignore First N Samples</div>
                <span>{{targetSystem.primaryDataProvider.ignore_first_n_samples}}</span>
              </div> -->
            </div>

            <div class="row" *ngIf="targetSystem.primaryDataProvider.type == 'kafka_consumer'">
              <div class="col-md-3">
                <div class="sub-title">Name</div>
                <span>{{targetSystem.primaryDataProvider.name}}</span>
              </div>
              <div class="col-md-2">
                <div class="sub-title">Kafka URI</div>
                <span>{{targetSystem.primaryDataProvider.kafka_uri}}</span>
              </div>
              <div class="col-md-2">
                <div class="sub-title">Topic</div>
                <span>{{targetSystem.primaryDataProvider.topic}}</span>
              </div>
              <div class="col-md-2">
                <div class="sub-title">Serializer</div>
                <span>{{targetSystem.primaryDataProvider.serializer}}</span>
              </div>
              <!-- <div class="col-md-2">
                <div class="sub-title">Ignore First N Samples</div>
                <span>{{targetSystem.primaryDataProvider.ignore_first_n_samples}}</span>
              </div> -->
            </div>

            <div class="row" *ngIf="targetSystem.primaryDataProvider.type == 'mqtt_listener'">
              <div class="col-md-3">
                <div class="sub-title">Name</div>
                <span>{{targetSystem.primaryDataProvider.name}}</span>
              </div>
              <div class="col-md-3">
                <div class="sub-title">Host</div>
                <span>{{targetSystem.primaryDataProvider.host}}</span>
              </div>
              <div class="col-md-3">
                <div class="sub-title">Port</div>
                <span>{{targetSystem.primaryDataProvider.port}}</span>
              </div>
              <div class="col-md-3">
                <div class="sub-title">Topic</div>
                <span>{{targetSystem.primaryDataProvider.topic}}</span>
              </div>
              <div class="col-md-2">
                <div class="sub-title">Serializer</div>
                <span>{{targetSystem.primaryDataProvider.serializer}}</span>
              </div>
                <!--
              <div class="col-md-2">
                <div class="sub-title">Ignore First N Samples</div>
                <span>{{targetSystem.primaryDataProvider.ignore_first_n_samples}}</span>
              </div> --> 
            </div>
          </div>
        </div>

        <!-- Secondary Data Provider(s) -->
        <div class="panel panel-default chartJs" *ngIf="targetSystem.secondaryDataProviders.length > 0">
          <div class="panel-heading">
            <div class="card-title">
              <div class="title pull-left" *ngIf="targetSystem.secondaryDataProviders.length > 1">Secondary Data
                Providers
              </div>
              <div class="title pull-left" *ngIf="targetSystem.secondaryDataProviders.length == 1">Secondary Data
                Provider
              </div>
            </div>
          </div>
          <div class="panel-body" style="padding-top: 20px">
            <div class="row" *ngFor="let secondaryDataProvider of targetSystem.secondaryDataProviders">
              <div *ngIf="secondaryDataProvider.type == 'http_request'">
                <div class="col-md-3">
                  <div class="sub-title">Name</div>
                  <span>{{secondaryDataProvider.name}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">URL</div>
                  <span>{{secondaryDataProvider.url}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">Port</div>
                  <span>{{secondaryDataProvider.port}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">Serializer</div>
                  <span>{{secondaryDataProvider.serializer}}</span>
                </div>
              </div>

              <div *ngIf="secondaryDataProvider.type == 'kafka_consumer'">
                <div class="col-md-3">
                  <div class="sub-title">Name</div>
                  <span>{{secondaryDataProvider.name}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">Kafka URI</div>
                  <span>{{secondaryDataProvider.kafka_uri}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">Topic</div>
                  <span>{{secondaryDataProvider.topic}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">Serializer</div>
                  <span>{{secondaryDataProvider.serializer}}</span>
                </div>
              </div>

              <div *ngIf="secondaryDataProvider.type == 'mqtt_listener'">
                <div class="col-md-2">
                  <div class="sub-title">Name</div>
                  <span>{{secondaryDataProvider.name}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">Host</div>
                  <span>{{secondaryDataProvider.host}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">Port</div>
                  <span>{{secondaryDataProvider.port}}</span>
                </div>
                <div class="col-md-3">
                  <div class="sub-title">Topic</div>
                  <span>{{secondaryDataProvider.topic}}</span>
                </div>
                <div class="col-md-1">
                  <div class="sub-title">Serializer</div>
                  <span>{{secondaryDataProvider.serializer}}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Change Provider & Execution Strategy -->
      <div class="col-md-6" style="padding-right: 0">
        <div class="panel panel-default chartJs">
          <div class="panel-heading">
            <div class="card-title">
              <div class="title pull-left">Change Provider</div>
            </div>
          </div>
          <div class="panel-body" style="padding-top: 20px">

            <div class="row" *ngIf="targetSystem.changeProvider.type == 'http_request'">
              <div class="col-md-4">
                <div class="sub-title">URL</div>
                <span>{{targetSystem.changeProvider.url}}</span>
              </div>
              <div class="col-md-4">
                <div class="sub-title">Port</div>
                <span>{{targetSystem.changeProvider.port}}</span>
              </div>
              <div class="col-md-4">
                <div class="sub-title">Serializer</div>
                <span>{{targetSystem.changeProvider.serializer}}</span>
              </div>
            </div>

            <div class="row" *ngIf="targetSystem.changeProvider.type == 'kafka_producer'">
              <div class="col-md-4">
                <div class="sub-title">Kafka URI</div>
                <span>{{targetSystem.changeProvider.kafka_uri}}</span>
              </div>
              <div class="col-md-4">
                <div class="sub-title">Topic</div>
                <span>{{targetSystem.changeProvider.topic}}</span>
              </div>
              <div class="col-md-4">
                <div class="sub-title">Serializer</div>
                <span>{{targetSystem.changeProvider.serializer}}</span>
              </div>
            </div>

            <div class="row" *ngIf="targetSystem.changeProvider.type == 'mqtt_listener'">
              <div class="col-md-3">
                <div class="sub-title">Host</div>
                <span>{{targetSystem.changeProvider.host}}</span>
              </div>
              <div class="col-md-3">
                <div class="sub-title">Port</div>
                <span>{{targetSystem.changeProvider.port}}</span>
              </div>
              <div class="col-md-3">
                <div class="sub-title">Topic</div>
                <span>{{targetSystem.changeProvider.topic}}</span>
              </div>
              <div class="col-md-3">
                <div class="sub-title">Serializer</div>
                <span>{{targetSystem.changeProvider.serializer}}</span>
              </div>
            </div>
          </div>
        </div>

        <!--Execution Strategy-->
        <div class="panel panel-default chartJs">
          <div class="panel-heading">
            <div class="card-title">
              <div class="title pull-left">Execution Strategy</div>
            </div>
          </div>
          <div class="panel-body" style="padding-top: 20px">
            <div class="table-responsive" style="padding-top: 20px">
              <table>
                <thead>
                <th style="width: 5%">Type</th>
                <th style="width: 5%">Sample Size per Stage</th>
                <th style="width: 5%" *ngIf="experiment.executionStrategy.type == 'random'
                  || experiment.executionStrategy.type == 'mlr_mbo'
                  || experiment.executionStrategy.type == 'self_optimizer'
                  || experiment.executionStrategy.type == 'uncorrelated_self_optimizer'">
                  Optimizer Iterations
                </th>
                <!--<th style="width: 5%" *ngIf="experiment.executionStrategy.type == 'random' -->
                  <!--|| experiment.executionStrategy.type == 'mlr_mbo' -->
                  <!--|| experiment.executionStrategy.type == 'self_optimizer' -->
                  <!--|| experiment.executionStrategy.type == 'uncorrelated_self_optimizer'">-->
                  <!--Optimizer Iterations in Design-->
                <!--</th>-->
                <th style="width: 5%" *ngIf="experiment.executionStrategy.type == 'mlr_mbo'
                  || experiment.executionStrategy.type == 'self_optimizer'
                  || experiment.executionStrategy.type == 'uncorrelated_self_optimizer'">Acquisition Method
                </th>
                </thead>
                <tbody>
                  <td style="padding-top: 1%">{{experiment.executionStrategy.type}}</td>
                  <td>{{experiment.executionStrategy.sample_size}}</td>
                  <td *ngIf="experiment.executionStrategy.type == 'random'
                  || experiment.executionStrategy.type == 'mlr_mbo'
                  || experiment.executionStrategy.type == 'self_optimizer'
                  || experiment.executionStrategy.type == 'uncorrelated_self_optimizer'">
                    {{experiment.executionStrategy.optimizer_iterations}}
                  </td>
                  <!--<td *ngIf="experiment.executionStrategy.type == 'random' -->
                    <!--|| experiment.executionStrategy.type == 'mlr_mbo' -->
                    <!--|| experiment.executionStrategy.type == 'self_optimizer' -->
                    <!--|| experiment.executionStrategy.type == 'uncorrelated_self_optimizer'">-->
                    <!--{{experiment.executionStrategy.optimizer_iterations_in_design}}-->
                  <!--</td>-->
                  <td *ngIf="experiment.executionStrategy.type == 'mlr_mbo'
                    || experiment.executionStrategy.type == 'self_optimizer'
                    || experiment.executionStrategy.type == 'uncorrelated_self_optimizer'">
                    {{experiment.executionStrategy.acquisition_method}}
                  </td>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- Incoming Data Types -->
    <div class="col-md-12" [hidden]="is_collapsed" style="border-right: 3px groove #5cb85c; border-left: 3px groove #5cb85c">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
              <div class="title pull-left">Output Parameters</div>
          </div>
        </div>
        <div class="panel-body" style="padding-top: 20px">
          <div class="table-responsive" style="padding-top: 20px">
            <table style="margin-top: 5px" class="table table-striped table-bordered table-hover">
              <thead>
              <th style="padding-left: 1%">Name</th>
              <th style="padding-left: 1%">Scale</th>
              <th style="padding-left: 1%">Description</th>
              <th style="padding-left: 1%">Data Provider Name</th>
              <th style="padding-left: 1%">Optimization Criteria</th>
              <th style="padding-left: 1%">Consider</th>
              <th style="padding-left: 1%">Aggregate Function</th>
              </thead>
              <tbody>
              <tr *ngFor="let dataType of combined_data_types" style="padding-left: 1%">
                <td>{{dataType.name}}</td>
                <td>{{dataType.scale}}</td>
                <td>{{dataType.description}}</td>
                <td>{{dataType.dataProviderName}}</td>
                <td>{{dataType.criteria}}</td>
                <td *ngIf="is_considered(dataType.name)">Yes</td>
                <td *ngIf="!is_considered(dataType.name)">No</td>
                <td>{{dataType.aggregateFunction}}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ANOVA Properties -->
    <div class="col-md-12" [hidden]="is_collapsed" style="border-right: 3px groove #5cb85c; border-left: 3px groove #5cb85c">

      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">Factorial ANOVA Details</div>
          </div>
        </div>

        <div class="panel-body" style="padding-top: 20px">

          <!--Factors-->
          <div class="table-responsive" style="padding-top: 20px">
            <table style="margin-top: 5px" class="table table-striped table-bordered table-hover">
              <thead>
              <th style="padding-left: 1%">Name</th>
              <th style="padding-left: 1%">Factors</th>
              </thead>
              <tbody>
              <tr *ngFor="let name of get_keys(experiment.changeableVariables)" style="padding-left: 1%">
                <td>{{name}}</td>
                <td>{{experiment.changeableVariables[name]}}</td>
              </tr>
              </tbody>
            </table>
          </div>

          <!-- Sample Size for ANOVA -->
          <labeled-input [disabled]="true" inputType="number" name="Number of samples collected for each configuration"
                         [model]="experiment.analysis" key="sample_size" [colSize]="3" [minNumber]="1" tooltipTitle='Number of samples to be collected from each experiment'></labeled-input>

          <!-- Alpha -->
          <labeled-input [disabled]="true" inputType="number" name="Significance level (alpha)" [model]="experiment.analysis" key="anovaAlpha" [colSize]="3" tooltipTitle='Alpha value that will be used as significance threshold for analysis phase'></labeled-input>

          <!-- Number of Important Factors -->
          <labeled-input [disabled]="true" inputType="number" name="Maximum number of significant ANOVA interactions" [model]="experiment.analysis" key="nrOfImportantFactors" [colSize]="3" tooltipTitle='Maximum number of significant interactions to consider in step #2, should be at least 1'></labeled-input>
        </div>
      </div>
    </div>

    <!-- Bayesian optimization properties -->
    <div class="col-md-12" [hidden]="is_collapsed" style="border-right: 3px groove #5cb85c; border-left: 3px groove #5cb85c">

      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">Bayesian Optimization Details</div>
          </div>
        </div>

        <div class="panel-body" style="padding-top: 20px">
          <!-- executionStrategy type -->
          <labeled-input [disabled]="true" name="Optimizer Type" [model]="experiment.executionStrategy" key="type" [colSize]="3"></labeled-input>

          <!-- Acquisition method -->
          <labeled-input [disabled]="true" name="Acquisition Method" [model]="experiment.executionStrategy" key="acquisition_method" [colSize]="3"></labeled-input>

          <!-- optimizer_iterations -->
          <labeled-input [disabled]="true" inputType="number" name="Total number of iterations" [model]="experiment.executionStrategy" key="optimizer_iterations" [colSize]="3"></labeled-input>

          <!-- sample size -->
          <labeled-input [disabled]="true" inputType="number" name="Number of samples collected for each configuration" [model]="experiment.executionStrategy" key="sample_size" [colSize]="3" tooltipTitle='Number of samples to be collected from each optimization experiment'></labeled-input>

        </div>

      </div>
    </div>


    <!-- T-test properties -->
    <div class="col-md-12" [hidden]="is_collapsed" style="border-right: 3px groove #5cb85c; border-left: 3px groove #5cb85c; border-bottom: 3px groove #5cb85c;">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">T-test Details</div>
          </div>
        </div>
        <div class="panel-body" style="padding-top: 20px">

          <!-- Alpha -->
          <labeled-input [disabled]="true" inputType="number" name="Significance level (alpha)" [model]="experiment.analysis" key="tTestAlpha" [colSize]="3" tooltipTitle='Alpha value that will be used as significance threshold for step #3'></labeled-input>

          <!-- Cohen's coefficient -->
          <labeled-input [disabled]="true" inputType="number" name="Minimum effect size (Cohen's d coefficient)" [model]="experiment.analysis" key="tTestEffectSize" [colSize]="3" tooltipTitle='Alpha value that will be used as significance threshold for Bayesian Optimization Step'></labeled-input>

          <!-- sample size for optimization -->
          <labeled-input [disabled]="true" inputType="number" name="Number of samples collected for default & best configurations" [model]="experiment.analysis" key="tTestSampleSize" [colSize]="3" [minNumber]="1" tooltipTitle='Number of samples to be collected for both default configuration of target system and best knobs of optimization process'></labeled-input>
        </div>
      </div>
    </div>

    <!-- Modal for stop experiment-->
    <div class="modal fade" id="exampleModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
         aria-hidden="true" *ngIf="!for_successful_experiment">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="exampleModalLabel">Please confirm</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            Do you really want to stop the whole experiment?
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">No</button>
            <button type="button" class="btn btn-primary" (click)="stopRunningExperiment($event)" data-dismiss="modal">
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})

export class ExperimentDetailsComponent implements OnInit {
  @Input() targetSystem: any;
  @Input() experiment: any;
  @Input() is_collapsed: boolean;
  @Input() experiment_type: string;
  @Input() oedaCallback: any;
  @Input() for_successful_experiment: boolean;

  @Output() enable_polling_btn_clicked = new EventEmitter<MouseEvent>();
  @Output() disable_polling_btn_clicked = new EventEmitter<MouseEvent>();
  @Output() stop_experiment_btn_clicked = new EventEmitter<MouseEvent>();

  combined_data_types: any;

  /** combines unselected data types of targetSystem and selected data types of experiment */
  ngOnInit(): void {
    console.log(this.experiment);
    console.log("chVar", this.experiment.changeableVariables);
    this.combined_data_types = [];
    for (let considered_data_type of this.experiment.considered_data_types) {
      this.combined_data_types.push(considered_data_type);
    }
    for (let data_type of this.targetSystem.incomingDataTypes) {
      // previous array includes the data type
      let data = this.combined_data_types.find( function( element ) {
        return element.name === data_type["name"];
      } );
      // previous array does not include the iterated data type
      if( !data ) {
        this.combined_data_types.push(data_type);
      }
    }
  }

  /** considered_data_types are retrieved from experiment definition.
   * so, this function checks if given data type was selected (considered) or not
   * same func with the one in EntityService
   */
  is_considered(data_type_name) {
    for (let i = 0; i < this.experiment.considered_data_types.length; i++) {
      if (this.experiment.considered_data_types[i]["name"] === data_type_name) {
        return true;
      }
    }
    return false;
  }

  /** returns keys of the given map */
  get_keys(object) : Array<string> {
    if (!isNullOrUndefined(object)) {
      return Object.keys(object);
    }
    return null;
  }

  public enable_polling(event: MouseEvent) {
    this.enable_polling_btn_clicked.emit(event);
  }

  public disable_polling(event: MouseEvent) {
    this.disable_polling_btn_clicked.emit(event);
  }

  public stopRunningExperiment(event: MouseEvent) {
    this.stop_experiment_btn_clicked.emit(event);
  }
}
