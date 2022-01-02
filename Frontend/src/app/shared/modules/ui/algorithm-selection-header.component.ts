import {Component, Input, OnInit} from "@angular/core";
import {OEDAApiService} from "../api/oeda-api.service";
import {NotificationsService} from "angular2-notifications/dist";
import {EntityService} from "../../util/entity-service";
import {Algorithm} from "./analysis-module-selection.component";

@Component({
  selector: 'algorithm-selection-header',
  template: `
                <switch [(status)]="this.algorithm.selected" [onText]="'Analyze'"
                        [offText]="'Skip'" [onColor]="'green'" [offColor]="'yellow'"></switch>
                {{algorithm.alias}}
  `
})

export class AlgorithmSelectionHeaderComponent implements OnInit {

  @Input()
  algorithm: Algorithm;

  constructor() {
  }

  ngOnInit(): void {
  }



}

