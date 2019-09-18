import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {OedaCallbackEntity} from "../api/oeda-api.service";
import {isNullOrUndefined} from "util";

@Component({
  selector: 'experiment-stages',
  template: `
    <div class="col-md-12" [hidden]="hidden">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="row">
              <div class="col-md-6">
                <div class="title pull-left">Stages of Experiment</div>
              </div>

              <div class="col-md-3">
                <div class="title pull-left">Output Parameters</div>
              </div>

              <div class="col-md-3">
                <div class="title pull-left">Scale of Results</div>
              </div>
            </div>
          </div>
        </div>
        <div class="panel-body" style="padding-top: 20px; padding-left: 2%">
          <div class="row">
            <div class="col-md-6">
              <div>
                <select class="form-control" required [(ngModel)]="selected_stage" (ngModelChange)="onStageChange($event)">
                  <option *ngFor="let i of available_stages; let first_stage = first;" [ngValue]="i">
                    <div *ngIf="first_stage">All Stages</div>
                    <div *ngIf="!first_stage">Stage: {{ i.number }}
                      <div *ngFor="let key of get_keys(i.knobs); let last_knob=last; let first_knob=first;">
                        <b *ngIf="first_knob">[</b>
                        <b>{{key}}: {{i.knobs[key]}}</b>
                        <b *ngIf="!last_knob">,</b>
                        <b *ngIf="last_knob">]</b>
                      </div>
                    </div>
                  </option>
                </select>
              </div>
            </div>

            <div class="col-md-3">
              <div class="card-title">
                <select class="form-control" [(ngModel)]="incoming_data_type" (ngModelChange)="onIncomingDataTypeChange($event)">
                  <option *ngFor="let dataType of targetSystem.incomingDataTypes" [ngValue]="dataType">
                    {{dataType.name}}
                  </option>
                </select>
              </div>
            </div>

            <div class="col-md-3">
              <div class="card-title">
                <select class="form-control" required [(ngModel)]="scale" (ngModelChange)="onScaleChange($event)">
                  <option [selected]="true">Normal</option>
                  <option>Log</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})

export class ExperimentStagesComponent implements OnInit {
  @Output() scaleChanged = new EventEmitter();
  @Output() incomingDataTypeChanged = new EventEmitter();
  @Output() stageChanged = new EventEmitter();

  @Input() experiment: any;
  @Input() selected_stage: any;
  @Input() available_steps: any;
  @Input() step_no: any;
  @Input() targetSystem: any;
  @Input() incoming_data_type: object;
  @Input() scale: string;
  @Input() hidden: boolean;
  @Input() for_successful_experiment: boolean;
  @Input() oedaCallback: OedaCallbackEntity;

  public available_stages = [];

  @Input() onScaleChange = (ev) => {
    this.scaleChanged.emit(ev);
  };

  @Input() onStageChange = (ev) => {
    this.stageChanged.emit(ev);
  };

  @Input() onIncomingDataTypeChange = (ev) => {
    this.incomingDataTypeChanged.emit(ev);
  };

  ngOnInit() {
    // prepare available_stages due to legacy logic
    this.available_stages = this.available_steps[this.step_no]["stages"];
  }

  /** returns keys of the given map */
  get_keys(object) : Array<string> {
    if (!isNullOrUndefined(object)) {
      return Object.keys(object);
    }
    return null;
  }


}
