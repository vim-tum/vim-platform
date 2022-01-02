import {Component, Input, EventEmitter, Output, OnChanges, SimpleChanges, OnInit} from "@angular/core";
import {isNullOrUndefined} from "util";

@Component({
  selector: 'labeled-input-array',
  template: `
    <div class="col-md-{{colSize}}">
      <div class="sub-title">{{name}}
        <span class="btn btn-xs btn-orange" (click)="add()"><i class="fa fa-plus"></i> Add</span>
      </div>
        <div class="row" style="margin-bottom: -5px">
          <ng-container *ngFor="let item of model[keys[0]]; let itemIndex = index; trackBy: trackByFnIndex">
            <div class="col-xs-{{inputSize}}">
              <div class="input-group" style="padding-bottom: 5px">
                <ng-container *ngFor="let key of keys; let keyIndex = index; trackBy: trackByFnKey">

                  <div class="input-group-addon" *ngIf="labels"><b>{{labels[keyIndex]}}</b></div>
                  <span [ngClass]="{'has-error': hasError || errorFunction(keyIndex, itemIndex)}">
                   <input (ngModelChange)="onModelChange($event)"  *ngIf="inputTypes[keyIndex] == 'text'" class="form-control"
                          type="text"
                          name="{{name}}-{{keyIndex}}-{{itemIndex}}"
                           style="min-width: 35px" [(ngModel)]="model[key][itemIndex]">
                    <input (ngModelChange)="onModelChange($event)"  *ngIf="inputTypes[keyIndex] == 'number'" class="form-control"
                           type="number"
                           name="{{name}}-{{keyIndex}}-{{itemIndex}}"
                           style="min-width: 35px" [(ngModel)]="model[key][itemIndex]">
                    </span>
                  <span class="input-group-btn" style="width:0px;"></span>
                </ng-container>
                <div class="input-group-addon" (click)="remove(itemIndex)"><i class="fa fa-remove"></i></div>
                </div>
              </div>
          </ng-container>
        </div>
    </div>
  `
})
export class LabeledInputArrayComponent implements OnChanges, OnInit {
  @Output() modelChanged = new EventEmitter();
  @Input() inputTypes: string[];
  @Input() labels: string[];

  counter = 0;

  @Input() minNumber;
  @Input() maxNumber;

  @Input() colSize = 6;
  @Input() inputSize = 1;
  @Input() name: any;
  @Input() model: any;
  @Input() keys: string[];
  @Input() placeholder = "";
  @Input() disabled = false;
  @Input() tooltipTitle = "";


  @Input() required = true;
  @Input() hasError = false;
  @Input() errorFunction = (keyIndex, itemIndex) => {
    if (this.required) {
      const item = this.model[this.keys[keyIndex]][itemIndex]
      return isNullOrUndefined(item) || item === '';
    } else {
      return false
    }
  };

  trackByFnKey(keyIndex: any) {
    return keyIndex;
  }
  trackByFnIndex(itemIndex: any) {
    return itemIndex;
  }

  @Input() onModelChange = (ev) => {
    this.modelChanged.emit(ev)
  };

  ngOnChanges(changes: SimpleChanges): void {
    this.modelChanged.emit(changes)
  }

  add(): void {
    this.keys.forEach(key =>  this.model[key].push(''));
  }

  remove(itemIndex: number) {
    this.keys.forEach(key => this.model[key].splice(itemIndex, 1));

  }

  ngOnInit(): void {
  }
}
