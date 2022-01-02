import {OnInit, Component} from "@angular/core";
import {NotificationsService} from "angular2-notifications";
import {Router} from "@angular/router";
import {LayoutService} from "../../../shared/modules/helper/layout.service";
import {
  OEDAApiService,
  Experiment,
  Target,
  ExecutionStrategy,
  UserEntity
} from "../../../shared/modules/api/oeda-api.service";
import * as _ from "lodash.clonedeep";
import {isNullOrUndefined} from "util";
import {TempStorageService} from "../../../shared/modules/helper/temp-storage-service";
import {EntityService} from "../../../shared/util/entity-service";
import {hasOwnProperty} from "tslint/lib/utils";
import {isNumeric} from "rxjs/util/isNumeric";
import {UserService} from "../../../shared/modules/auth/user.service";

@Component({
  selector: 'control-experiments',
  templateUrl: './create-experiments.component.html',
})
export class CreateExperimentsComponent implements OnInit {
  experiment: Experiment;
  originalExperiment: Experiment;
  targetSystem: Target;
  originalTargetSystem: Target;
  user: UserEntity;
  availableTargetSystems: any;
  executionStrategy: any;
  variable: any;
  selectedTargetSystem: any;
  is_collapsed: boolean;
  errorButtonLabel: string;
  errorButtonLabelAnova: string;
  errorButtonLabelOptimization: string;
  errorButtonLabelTtest: string;
  defaultAlpha: number;
  defaultTTestEffectSize: number;
  defaultTTestSampleSize: number;
  maxNrOfImportantFactors: number;
  mlrMBOworking: boolean;
  stages_count: any;

  constructor(private layout: LayoutService, private api: OEDAApiService,
              private router: Router, private notify: NotificationsService,
              private temp_storage: TempStorageService,
              private userService: UserService,
              private entityService: EntityService) {
    this.availableTargetSystems = [];

    // create experiment, target system, and execution strategy
    this.executionStrategy = this.entityService.create_execution_strategy();

    this.targetSystem = this.entityService.create_target_system();
    this.experiment = this.entityService.create_experiment(this.executionStrategy);
    this.originalExperiment = _(this.experiment);
    this.defaultAlpha = 0.05; // default value to be added when an analysis is selected
    this.defaultTTestEffectSize = 0.7;
    this.defaultTTestSampleSize = 1000;
    this.is_collapsed = true;
    this.mlrMBOworking = false;
  }

  ngOnInit(): void {
    const ctrl = this;
    ctrl.layout.setHeader("Create an Experiment", "");
    ctrl.api.loadAllTargets().subscribe(
      (data) => {
        if (!isNullOrUndefined(data)) {
          for (let k = 0; k < data.length; k++) {
            if (data[k]["status"] === "READY") {
              ctrl.availableTargetSystems.push(data[k]);
            }
          }
        } else {
          this.notify.error("Error", "Please create target system first");
        }
      }
    );
  }

  public saveExperiment() {
    this.user = this.userService.getAuthToken()["value"].user;
    // console.log("current user: " + this.user.name);

    if (!this.hasErrors()) {
      // prepare other attributes
      this.experiment.executionStrategy.optimizer_iterations = Number(this.experiment.executionStrategy.optimizer_iterations);
      this.experiment.executionStrategy.sample_size = Number(this.experiment.executionStrategy.sample_size);

      // get sample size
      this.experiment.simulation.startTime = Number(this.experiment.simulation.startTime);
      this.experiment.simulation.endTime = Number(this.experiment.simulation.endTime);
      this.experiment.simulation.updateInterval = Number(this.experiment.simulation.updateInterval);
      this.experiment.analysis.sample_size = Math.floor((this.experiment.simulation.endTime - this.experiment.simulation.startTime) /
        this.experiment.simulation.updateInterval);

      // TODO: retrieve input for additional resources such as archived results

      this.experiment.user = this.user.name;

      // take the incoming data type labeled as "is_considered" to perform stage result calculation in backend
      for (let item of this.targetSystem.incomingDataTypes) {
        if (item.is_considered === true) {
          this.experiment.considered_data_types.push(item);
        }
      }

      // if the aggregate dataProvider is considered, append it to consideredAggregateTopics for subscription
      for (let item of this.targetSystem.dataProviders) {
        if (item.is_considered === true) {
          this.experiment.consideredAggregateTopics.push(item);
        }
      }

      if (this.experiment.executionStrategy.type === "single_experiment_run") {
        let knobs = {};
        for (let chVar of this.targetSystem.changeableVariables) {
          if (chVar.is_selected === true) {
            let knobArr = [];
            let factors = chVar.factorValues.split(",");
            for (let factor of factors) {
              knobArr.push(Number(factor).toFixed(2));
            }
            knobs[chVar.name] = knobArr;
          }
        }
        this.experiment.changeableVariables = knobs;
        this.experiment.executionStrategy.knobs = knobs; // also set executionStrategy knobs here
        this.experiment.executionStrategy.sample_size = this.experiment.analysis.sample_size;
      }

      this.api.saveExperiment(this.experiment).subscribe(
        (success) => {
          this.notify.success("Success", "Experiment saved");
          this.temp_storage.setNewValue(this.experiment);
          this.router.navigate(["control/experiments"]);
        }, (error) => {
          this.notify.error("Error", error.toString());
        }
      )
    }
  }

  public navigateToTargetSystemPage() {
    this.router.navigate(["control/targets/create"]).then(() => {
      console.log("navigated to target system creation page");
    });
  }

  public navigateToSimulationsPage() {
    this.router.navigate(["control/experiments/create/simulation"]).then(() => {
      console.log("navigated to simulations creation page");
    });
  }

  public targetSystemChanged(targetSystemName: any) {
    this.selectedTargetSystem = this.availableTargetSystems.find(item => item.name === targetSystemName);

    if (this.selectedTargetSystem !== undefined) {
      /*
      if (this.selectedTargetSystem.changeableVariables.length === 0) {
        this.notify.error("Error", "Target does not contain input parameters.");
        return;
      }
       */

      // remove previously added variables if they exist
      if (this.experiment.changeableVariables.length > 0) {
        this.experiment.changeableVariables = this.experiment.changeableVariables.splice();
      }

      if (this.experiment.name != null) {
        this.experiment.name = "";
      }

      // also refresh variable model if anything is left from previous state
      if (this.variable != null) {
        this.variable = null;
      }

      this.targetSystem = this.selectedTargetSystem;
      // also make a copy of original ts for changes in analysis
      this.originalTargetSystem = _(this.targetSystem);
      // relate target system with experiment
      this.experiment.targetSystemId = this.targetSystem.id;

      // set default values
      this.experiment.analysis.type = "";
      this.experiment.analysis.sample_size = 500; // same with the one in entityService's ExecutionStrategy.sample_size
      this.experiment.analysis.n = this.targetSystem.changeableVariables.length; // set number of factor's default value
      // this.experiment.analysis.nrOfImportantFactors = Math.round(Number(this.experiment.analysis.n / 3));
      // this.experiment.analysis.anovaAlpha = this.defaultAlpha;
      this.experiment.analysis.nrOfImportantFactors = 3;
      this.experiment.analysis.anovaAlpha = 0.0005;
      this.experiment.analysis.tTestAlpha = this.defaultAlpha;
      this.experiment.analysis.tTestEffectSize = this.defaultTTestEffectSize;
      this.experiment.analysis.tTestSampleSize = this.defaultTTestSampleSize;
      this.maxNrOfImportantFactors = Math.pow(2, this.targetSystem.changeableVariables.length) - 1;
      // this.experiment.executionStrategy.type = "self_optimizer";

      this.experiment.executionStrategy.type = null;
      this.acquisitionMethodChanged("gp_hedge");
      // set changeableVariable.min, changeableVariable.max as default value for factorValues for each chVar
      for (let i = 0; i < this.targetSystem.changeableVariables.length; i++) {
        let chVar = this.targetSystem.changeableVariables[i];
        chVar.factorValues = chVar.min + ", " + chVar.max;
        // set is_selected flag via click method
        this.changeable_variable_checkbox_clicked(i);
      }
    } else {
      this.notify.error("Error", "Cannot fetch selected target system, please try again");
      return;
    }
  }

  // User can select acquisition function for respective strategies
  public acquisitionMethodChanged(acquisition_method_key) {
    this.experiment.executionStrategy.acquisition_method = acquisition_method_key;
  }

  /**
   * sets is_selected flag of targetSystem.changeableVariables
   */
  public changeable_variable_checkbox_clicked(changeableVariable_index): void {
    let changeableVariable = this.targetSystem.changeableVariables[changeableVariable_index];
    if (isNullOrUndefined(changeableVariable.is_selected)) {
      changeableVariable.is_selected = true;
    }
    else
      if (changeableVariable.is_selected === true) {
      changeableVariable.is_selected = false;
      // also refresh factorValues
      changeableVariable.factorValues = null;
    }
    else
      if (changeableVariable.is_selected === false) {
      changeableVariable.is_selected = true;
    }
    this.setMaxNrOfFactors();
  }

  public setMaxNrOfFactors(): void {
    if (this.targetSystem.changeableVariables.length === 0) {
      this.maxNrOfImportantFactors = 0;
    } else {
      let selected = 0;
      for (let chVar of this.targetSystem.changeableVariables) {
        if (chVar.is_selected) {
          selected += 1;
        }
      }
      this.maxNrOfImportantFactors = Math.pow(2, selected) - 1;
    }
  }

  // called for every div that's bounded to *ngIf=!hasErrors() expression.
  public hasErrors(): boolean {
    const cond1 = this.targetSystem.status === "WORKING";
    const cond2 = this.targetSystem.status === "ERROR";
    if (cond1 || cond2) {
      this.errorButtonLabel = "Target system is not available";
      return true;
    }

    if (this.experiment.name === null || this.experiment.name.length === 0) {
      this.errorButtonLabel = "Provide experiment name";
      return true;
    }

    if (this.experiment.simulation.startTime < 0 ||
      this.experiment.simulation.startTime === null ||
      this.experiment.simulation.endTime < this.experiment.simulation.startTime) {
      this.errorButtonLabel = "Provide valid simulation start time";
      return true;
    }

    if (this.experiment.simulation.endTime <= 0 ||
      this.experiment.simulation.endTime === null ||
      this.experiment.simulation.endTime < this.experiment.simulation.startTime) {
      this.errorButtonLabel = "Provide valid simulation end time";
      return true;
    }

    if (this.experiment.simulation.updateInterval <= 0 ||
      this.experiment.simulation.updateInterval === null ||
      this.experiment.simulation.updateInterval > this.experiment.simulation.endTime) {
      this.errorButtonLabel = "Provide valid simulation update interval";
      return true;
    }

    if (isNullOrUndefined(this.experiment.simulation.resources[0]["name"]) ||
      isNullOrUndefined(this.experiment.simulation.resources[1]["name"])) {
      this.errorButtonLabel = "Provide experiment resources (RoadMap & Sumo Network)";
      return true;
    }

    if (this.experiment.executionStrategy.type === null) {
      this.errorButtonLabel = "Choose the experiment strategy";
      return true;
    }

    // check data types for analysis

    for (let item of this.targetSystem.incomingDataTypes) {
      if (item.is_considered) {
        // check aggregate functions
        if (isNullOrUndefined(item["aggregateFunction"])) {
          this.errorButtonLabel = "Provide valid aggregate function(s)";
          return true;
        }
      }
    }

    if (this.entityService.get_number_of_considered_data_types(this.targetSystem) === 0) {
      this.errorButtonLabel = "Provide at least one output data type to be analyzed";
      return true;
    }

    // iterate min, max provided by the user and checks if they are within the range of default ones
    for (let i = 0; i < this.experiment.changeableVariables.length; i++) {
      let knobArr = this.experiment.changeableVariables[i];
      for (let idx = 0; idx < knobArr.length; idx++) {
        let knob = knobArr[idx];
        let originalKnob = this.targetSystem.defaultVariables.find(x => x.name == knob.name);
        if (knob.min < originalKnob.min || knob.max > originalKnob.max || knob.max <= knob.min || knob.min >= knob.max) {
          this.errorButtonLabel = "Value(s) of input parameters should be within the range of original ones";
          return true;
        }

      }
    }

    let nrOfSelectedVariables = 0;
    for (let i = 0; i < this.targetSystem.changeableVariables.length; i++) {
      if (this.targetSystem.changeableVariables[i].is_selected) {
        nrOfSelectedVariables += 1;
      }
    }
    /*
    if (nrOfSelectedVariables == 0) {
      this.errorButtonLabel = "Provide at least one input parameter";
      return true;
    }
*/
    return false;
  }

  public hasErrorsAnova() {

    // regular check
    if (isNullOrUndefined(this.experiment.analysis.anovaAlpha) || this.experiment.analysis.anovaAlpha <= 0 || this.experiment.analysis.anovaAlpha >= 1) {
      this.errorButtonLabelAnova = "Provide valid alpha for anova";
      return true;
    }

    if (isNullOrUndefined(this.experiment.analysis.sample_size) || this.experiment.analysis.sample_size <= 0 ) {
      this.errorButtonLabelAnova = "Provide valid sample size for anova";
      return true;
    }

    if (isNullOrUndefined(this.experiment.analysis.nrOfImportantFactors) || this.experiment.analysis.nrOfImportantFactors <= 0 ) {
      this.errorButtonLabelAnova = "Provide valid number of important factors";
      return true;
    }

    // n is used for number of factors in anova
    if (isNullOrUndefined(this.experiment.analysis.n) || this.experiment.analysis.n <= 0 ) {
      this.errorButtonLabelAnova = "Provide valid number of factors";
      return true;
    }

    let selected = 0;
    for (let chVar of this.targetSystem.changeableVariables) {
      if (chVar.is_selected == true) {
        selected += 1;
      }
    }
    if (selected < 2) {
      this.errorButtonLabelAnova = "Anova cannot be used with less than 2 factors";
      return true;
    }

    if (this.experiment.analysis.nrOfImportantFactors > this.maxNrOfImportantFactors) {
      this.errorButtonLabelAnova = "Number of important factors cannot exceed " + this.maxNrOfImportantFactors;
      return true;
    }

    // TODO: some corner cases:
    // TODO: 1) [0.3, 0.4; 0.5]
    // TODO: re-factor if-else statements
    // validate comma separated values of selected variables
    for (let chVar of this.targetSystem.changeableVariables) {
      if (chVar.is_selected == true) {
        if (hasOwnProperty(chVar, "factorValues")) {
          if (!isNullOrUndefined(chVar["factorValues"])) {
            let factors = chVar["factorValues"].split(",");
            if (factors.length >= 2) {
              for (let factor of factors) {
                factor = factor.trim();
                if (!isNumeric(factor)){
                  this.errorButtonLabelAnova = "Provide numeric value(s) for factor values";
                  return true;
                }
                else {
                  // now check intervals
                  if (Number(factor) < Number(chVar["min"]) || Number(factor) > Number(chVar["max"])) {
                    this.errorButtonLabelAnova = "Provide values within min & max values of input parameter(s)";
                    return true;
                  }
                }
              }
            }
            else {
              this.errorButtonLabelAnova = "Provide at least two factor values for " + chVar.name;
              return true;
            }
          }
          else {
            this.errorButtonLabelAnova = "Provide valid value(s) for factor values";
            return true;
          }
        }
      }
    }
    return false;
  }

  public hasErrorsOptimization() {

    let execution_strategy_type = this.experiment.executionStrategy.type;
    if (this.experiment.executionStrategy.optimizer_iterations === null || this.experiment.executionStrategy.optimizer_iterations <= 0
      || isNullOrUndefined(this.experiment.executionStrategy.acquisition_method) || isNullOrUndefined(execution_strategy_type)) {
      this.errorButtonLabelOptimization = "Provide valid inputs for " + execution_strategy_type;
      return true;
    }

    if (isNullOrUndefined(this.experiment.executionStrategy.sample_size) || this.experiment.executionStrategy.sample_size <= 0 ) {
      this.errorButtonLabelOptimization = "Provide valid sample size for optimization";
      return true;
    }

    // check if initial design of mlr mbo is large enough
    if (execution_strategy_type === "mlr_mbo") {
      if (!this.mlrMBOworking) {
        this.errorButtonLabelOptimization = "mlrMBO-API is not working";
        return true;
      }

      let minimum_number_of_iterations = 0;
      for (let chVar of this.targetSystem.changeableVariables) {
        if (chVar.is_selected) {
          minimum_number_of_iterations += 4;
        }
      }
      if (this.experiment.executionStrategy.optimizer_iterations < minimum_number_of_iterations) {
        this.errorButtonLabelOptimization = "Number of optimizer iterations should be greater than " + minimum_number_of_iterations.toString() + " for " + execution_strategy_type;
        return true;
      }
    }
    else if (execution_strategy_type === "self_optimizer") {
      // check if number of iterations for skopt are enough
      let minimum_number_of_iterations = 5;
      if (this.experiment.executionStrategy.optimizer_iterations < minimum_number_of_iterations) {
        this.errorButtonLabelOptimization = "Number of optimizer iterations should be greater than " + minimum_number_of_iterations.toString() + " for " + execution_strategy_type;
        return true;
      }
    }

    return false;
  }

  public hasErrorsTtest() {
    if (isNullOrUndefined(this.experiment.analysis.tTestAlpha) || this.experiment.analysis.tTestAlpha <= 0 || this.experiment.analysis.tTestAlpha >= 1) {
      this.errorButtonLabelTtest = "Provide valid alpha for T-test";
      return true;
    }

    if (isNullOrUndefined(this.experiment.analysis.tTestEffectSize) || this.experiment.analysis.tTestEffectSize <= 0 || this.experiment.analysis.tTestEffectSize > 2) {
      this.errorButtonLabelTtest = "Provide valid effect size for T-test";
      return true;
    }

    if (isNullOrUndefined(this.experiment.analysis.tTestSampleSize) || this.experiment.analysis.tTestSampleSize <= 0) {
      this.errorButtonLabelTtest = "Provide valid sample size for T-test";
      return true;
    }
    return false;
  }

  public incomingDataTypesChanged(incomingDataTypes) {
    this.targetSystem.incomingDataTypes = incomingDataTypes;
  }

  public aggregateTopicChanged(aggregateTopics) {
    // console.log(aggregateTopics["name"] + " is considered" + aggregateTopics["is_considered"]);
  }


  public hasChanges(): boolean {
    return JSON.stringify(this.experiment) !== JSON.stringify(this.originalExperiment);
  }

  // ****************************
  // CHANGES FROM ILIAS
  // ****************************

  // User can select analysis type while creating an experiment
  experimentTypeChanged(key) {
    this.experiment.analysis.type = key;
    // refresh previously-created tuples
    this.experiment.executionStrategy = this.entityService.create_execution_strategy();
    this.stages_count = null;
    this.experiment.changeableVariables = [];
    this.experiment.analysis.method = null;
    this.experiment.analysis.data_type = null;
    this.experiment.analysis.alpha = null;

    // also refresh targetSystem variables if user has selected some of them
    this.targetSystem.changeableVariables = _(this.originalTargetSystem.changeableVariables);
    this.targetSystem.incomingDataTypes = _(this.originalTargetSystem.incomingDataTypes);

    // set executionStrategy type
    if (key === 't_test') {
      this.experiment.executionStrategy.type = "sequential"; // TODO: this might be removed depending on backend logic
    }
    else if (key === 'factorial_experiment') {
      this.experiment.executionStrategy.type = "step_explorer";  // TODO: this might be removed depending on backend logic
      this.experiment.analysis.n = this.targetSystem.changeableVariables.length; // set default value of factors (n)
    }

  }

  executionStrategyChanged(key) {
    // this.experiment.executionStrategy = this.entityService.create_execution_strategy();
    this.stages_count = null;
    this.experiment.changeableVariables = [];
    this.experiment.analysis.method = null;
    this.experiment.analysis.data_type = null;
    this.experiment.analysis.alpha = null;

    // also refresh targetSystem variables if user has selected some of them
    this.targetSystem.changeableVariables = _(this.originalTargetSystem.changeableVariables);
    this.targetSystem.incomingDataTypes = _(this.originalTargetSystem.incomingDataTypes);

    // set executionStrategy type
    this.experiment.executionStrategy.type = key;
    this.experiment.analysis.type = this.experiment.executionStrategy.type;
  }

  public is_changeable_variable_selected(i): boolean {
    // checks if at least one variable is selected for proper visualization of tables
    if (isNullOrUndefined(i)) {
      for (let changeableVariable of this.targetSystem.changeableVariables) {
        if (changeableVariable["is_selected"] == true) {
          return true;
        }
      }
    } else {
      // just checks if variable in given index is selected or not
      let variable = this.targetSystem.changeableVariables[i];
      return variable.is_selected;
    }
  }

  addChangeableVariableTtest(variable) {
    const ctrl = this;
    let knobArr = [];
    if (isNullOrUndefined(variable.target)) {
      ctrl.notify.error("Error", "Provide target value for changeable variable(s)");
      return;
    } else {
      // check number of already-added variables for different analysis options
      if (ctrl.experiment.changeableVariables.length == 2) {
        ctrl.notify.error("Error", "2 factors have already been specified for T-test");
        return;
      }
      // ch. var is empty or there's one variable. check boundaries
      if (!isNullOrUndefined(variable.target) && variable.target <= variable.max && variable.target >= variable.min) {
        // ch. var is empty, just push
        knobArr.push(_(variable));
        ctrl.experiment.changeableVariables.push(knobArr);
        return;
      } else {
        ctrl.notify.error("Error", "Provide valid value(s) for variable");
        return;
      }
    }
  }

  // assuming that user has provided different configurations for variables and wants them to use for the selected analysis test
  addVariablesFor2FactorAndSeqTest() {
    let number_of_desired_variables: number;
    if (this.experiment.analysis.type == 't_test') {
      number_of_desired_variables = 2;
    }

    if (this.experiment.changeableVariables.length >= number_of_desired_variables) {
      this.notify.error("Error", "You can't exceed " + number_of_desired_variables + " variable(s) for this test");
      return;
    }

    // check boundaries of selected variables
    for (let j = 0; j < this.targetSystem.changeableVariables.length; j++) {
      let variable = this.targetSystem.changeableVariables[j];
      if (variable.is_selected) {
        if (isNullOrUndefined(variable.target)) {
          this.notify.error("Error", "Provide valid values for variable(s)");
          return;
        } else {
          if (variable.target < variable.min || variable.target > variable.max) {
            this.notify.error("Error", "Provide valid values for variable(s)");
            return;
          }
          // everything is ok for selected variables
        }
      }
    }

    // everything is ok, push to experiment.changeableVariables array
    let knobArr = [];
    for (let variable of this.targetSystem.changeableVariables) {
      if (variable["is_selected"] == true) {
        if (!isNullOrUndefined(variable.target) ) {
          // push an array of k-v pairs instead of pushing variables directly
          let knob: any = {};
          knob.name = variable.name;
          knob.min = variable.min;
          knob.max = variable.max;
          knob.default = variable.default;
          knob.target = variable.target;
          knobArr.push(knob);
        } else {
          this.notify.error("Error", "Please specify valid values for the selected changeable variables");
          return;
        }
      }
    }
    // do not push empty k-v pair
    if (knobArr.length == 0) {
      this.notify.error("Error", "Please specify valid values for the selected changeable variables");
    } else {
      this.experiment.changeableVariables.push(knobArr);
    }

  }

  // checks if user has selected proper number of variables for analysis tests
  // and checks if user selected at least one variable to be added to experiment.changeableVariables
  public hasErrors2FactorAndSequential() {
    let nr = 0;

    for (let chVar of this.targetSystem.changeableVariables) {
      if (chVar["is_selected"] == true && isNullOrUndefined(chVar["target"])) {
        this.errorButtonLabelTtest = "Provide target value(s)";
        return true;
      }

      // check boundaries
      if (chVar["is_selected"] == true && (chVar.target < chVar.min || chVar.target > chVar.max)) {
        this.errorButtonLabelTtest = "Provide valid value(s)";
        return true;
      }

      if (chVar["is_selected"] == true && !isNullOrUndefined(chVar["target"]))
        nr += 1;
    }
    if (nr == 0) {
      this.errorButtonLabelTtest = "Select and provide value(s) for at least one variable";
      return true;
    }
    return false;
  }

  removeAllVariables() {
    this.experiment.changeableVariables.splice(0);
  }

  removeChangeableVariable(index: number) {
    this.experiment.changeableVariables.splice(index, 1);
  }

  // simple proxy
  public get_keys(obj) {
    return this.entityService.get_keys(obj);
  }

  // if one of the parameters in executionStrategy is not valid, sets stages_count to null, so that it will get hidden
  strategyParametersChanged(value) {
    if (isNullOrUndefined(value)) {
      this.stages_count = null;
    }
  }

  addResources() {
    this.experiment.simulation.resources.push({
      "disabled": false
    });
  }

  removeResource(index) {
    this.experiment.simulation.resources.splice(index, 1);
  }

  addResults() {
    this.experiment.simulation.archivedResults.push({
      "disabled": false
    });
  }

  removeResult(index) {
    this.experiment.simulation.archivedResults.splice(index, 1);
  }
}
