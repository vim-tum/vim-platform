import {NgModule} from "@angular/core";
import {DebugElementComponent} from "./debug-element.component";
import {LabeledInputComponent} from "./labeled-input.component";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {LabeledInputSelectComponent} from "./labeled-input-select.component";
import {ExperimentDetailsComponent} from "./experiment-details.component";
import {ExperimentStagesComponent} from "./experiment-stages.component";
import {ExperimentStagesPaginatorComponent} from "./experiment-stages-paginator.component";
import {TtestAnalysisComponent} from "./ttest-analysis.component";
import {DataTableModule} from "angular2-datatable";
import {IncomingDataTypesComponent} from "./incoming-data-types-optimization.component";
import {IncomingDataTypesAnalysisComponent} from "./incoming-data-types-analysis.component";
import {ExperimentStagesPaginatorRunningComponent} from "./experiment-stages-paginator-running.component";
import {AnovaAnalysisComponent} from "./anova-analysis.component";
import {IncomingDataTypesSimulationComponent} from "./incoming-data-types-simulation.component";
import {AggregateTopicsComponent} from "./aggregate-topics";
import {InputTopicsAnalysisComponent} from "./input-topics-analysis.component";
import {AnalysisModuleComponent} from "./analysis-module.component";
import {PermissionButtonComponent} from "./permission-button";
import {UiSwitchModule} from "angular2-ui-switch/src/index";
import {UserFormComponent} from "./user-form.component";
import {AnalysisModuleSelectionComponent} from "./analysis-module-selection.component";
import {AccordionModule} from "ngx-bootstrap";
import {BootstrapSwitchModule} from "angular2-bootstrap-switch";
import {AlgorithmSelectionHeaderComponent} from "./algorithm-selection-header.component";
import {LabeledInputArrayComponent} from "./labeled-input-array.component";
import {ResourceFilesViewlistComponent} from "./resource-files-viewlist.component";
import {AnalysisGroupViewComponent} from "./analysis-group-view.component";
import {AnalysisSnapshotViewComponent} from "./analysis-snapshot-view.component";
import {AnalysisResultComponent} from "./analysis-result.component";

const uiElements = [
  DebugElementComponent,
  LabeledInputComponent,
  LabeledInputSelectComponent,
  LabeledInputArrayComponent,
  ExperimentDetailsComponent,
  ExperimentStagesComponent,
  ExperimentStagesPaginatorComponent,
  ExperimentStagesPaginatorRunningComponent,
  AnovaAnalysisComponent,
  TtestAnalysisComponent,
  IncomingDataTypesComponent,
  IncomingDataTypesAnalysisComponent,
  IncomingDataTypesSimulationComponent,
  AggregateTopicsComponent,
  InputTopicsAnalysisComponent,
  AnalysisModuleComponent,
  AnalysisModuleSelectionComponent,
  AlgorithmSelectionHeaderComponent,
  PermissionButtonComponent,
  UserFormComponent,
  ResourceFilesViewlistComponent,
  AnalysisGroupViewComponent,
  AnalysisSnapshotViewComponent,
  AnalysisResultComponent
];

@NgModule({

  imports: [
    CommonModule,
    FormsModule,
    DataTableModule,
    UiSwitchModule,
    AccordionModule,
    BootstrapSwitchModule,
  ],
  exports: uiElements,
  providers: [],
  declarations: uiElements
})
export class UIModule {
}
