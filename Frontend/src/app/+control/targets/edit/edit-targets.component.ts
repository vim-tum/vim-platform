import {Component, OnInit} from '@angular/core';
import {LayoutService} from "../../../shared/modules/helper/layout.service";
import {TempStorageService} from "../../../shared/modules/helper/temp-storage-service";
import {OEDAApiService, Target} from "../../../shared/modules/api/oeda-api.service";
import {ActivatedRoute, Params, Router} from "@angular/router";
import {UUID} from "angular2-uuid";
import {NotificationsService} from "angular2-notifications/dist";
import * as _ from "lodash.clonedeep";
import * as lodash from "lodash";
import {isNullOrUndefined} from "util";
import {UserService} from "../../../shared/modules/auth/user.service";

@Component({
  selector: 'edit-control-targets',
  templateUrl: './edit-targets.component.html',
})
export class EditTargetsComponent implements OnInit {


  constructor(private layout: LayoutService,
              private temp_storage: TempStorageService,
              private api: OEDAApiService,
              private userService: UserService,
              private router: Router, private route: ActivatedRoute,
              private notify: NotificationsService) {
  }

  target: Target;
  originalTarget: Target;
  pageTitle: string;
  saveButtonLabel: string;
  errorButtonLabel: string;
  availableConfigurations = [];
  selectedConfiguration: any;
  configsAvailable = false;
  targetCreatedFromConfig: boolean = false;

  /* tslint:disable */
  ngOnInit(): void {
    const ctrl = this;
    this.layout.setHeader("Target System", "");
    this.route.params.subscribe((params: Params) => {
      if (params['id']) {
        ctrl.pageTitle = "Edit Target System";
        ctrl.saveButtonLabel = "Save Changes";
        this.api.loadTargetById(params['id']).subscribe(
          (data) => {
            this.target = data;
            this.originalTarget = _(this.target);
            this.assureObjectContract();
          }
        )
      } else {
        ctrl.pageTitle = "Create Target System";
        ctrl.saveButtonLabel = "Save Target System";
        this.target = this.createTarget();
        this.originalTarget = _(this.target);

        // retrieve config json object via the api provided at localhost:5000/api/config/crowdnav
        this.api.getConfigFromAPI().subscribe((configs) => {
            for (let idx in configs) {
              if (configs.hasOwnProperty(idx)) {
                console.log(configs);
                if (!isNullOrUndefined(configs[idx])) {
                  // open the modal in UI
                  this.availableConfigurations.push(configs[idx]);
                  this.configsAvailable = true;
                }
              }
            }
            document.getElementById("openModalButton").click();
          }
        );

        this.assureObjectContract();
      }
    })
  }

  assureObjectContract() {
    if (this.target.dataProviders == null) {
      this.target.dataProviders = []
    }
    if (this.target.changeProvider == null) {
      this.target.changeProvider = {type: ""}
    }
    if (this.target.incomingDataTypes == null) {
      this.target.incomingDataTypes = []
    }
    if (this.target.changeableVariables == null) {
      this.target.changeableVariables = []
    }
  }

  createTarget(): Target {
    return {
      "id": UUID.UUID(),
      "user": "",
      "dataProviders": [],
      "primaryDataProvider": {},
      "secondaryDataProviders": [],
      "changeProvider": {
        "type": "",
        "changesApplicable": false
      },
      "name": "",
      "status": "READY",
      "description": "",
      "incomingDataTypes": [],
      "changeableVariables": [],
      "defaultVariables": []
    }
  }

  public addChangeableVariable(existingKnob) {
    if (existingKnob == null) { // for usual case, without using any configuration files
      this.target.changeableVariables.push({
        "disabled": false // mark the variable as 'not' disabled, so that user can provide a default value for it
      });
    }
    else {
      // user should not be able to add already-added variable coming from config
      if (this.target.changeableVariables.filter(variable => variable.name === existingKnob.name).length === 0) {
        this.target.changeableVariables.push(existingKnob);
      } else {
        this.notify.error("", "Variable is already added");
      }
    }
  }

  removeChangeableVariable(index) {
    this.target.changeableVariables.splice(index, 1)
  }

  addDataProvider(dataProvider) {
    if (dataProvider == null) {
      // for usual case, without using any configuration files
      this.target.dataProviders.push({
        "is_primary": false
      });
    }
    else {
      // user should not be able to add already-added data providers
      if (this.target.dataProviders.filter(variable => variable.name === dataProvider.name).length === 0) {
        // before push, mark data provider as "not primary". User will have to select it later.
        dataProvider["is_primary"] = false;
        this.target.dataProviders.push(dataProvider);
        // also push variables of pushed data provider to incoming data types
        for (let i = 0; i < dataProvider.incomingDataTypes.length; i++) {
          this.target.incomingDataTypes.push(dataProvider.incomingDataTypes[i]);
          // mark name, description and default values of pushed variables as disabled, but Scale is not disabled (TODO?)
          let pushedDataType =  this.target.incomingDataTypes[this.target.incomingDataTypes.length - 1];
          pushedDataType["disabled"] = true;
        }
      } else {
        this.notify.error("", "Data provider is already added");
      }
    }
  }

  removeDataProvider(index) {
    // also remove associated incoming data types (i.e. the added ones via configuration)
    let dataProvider = this.target.dataProviders[index];
    if (dataProvider.hasOwnProperty("incomingDataTypes"))  {
      for (let i = 0; i < dataProvider.incomingDataTypes.length; i++) {
        this.target.incomingDataTypes = this.target.incomingDataTypes.filter(dataType => dataType.name !== dataProvider.incomingDataTypes[i].name);
      }
    }
    this.target.dataProviders.splice(index, 1);
  }

  addIncomingDataType() {
    this.target.incomingDataTypes.push({
      "disabled": false
    });
    // automatically add is_default & aggregationFcn attributes if there's only one data type
    if (this.target.incomingDataTypes.length == 1) {
      this.target.incomingDataTypes[0]["is_default"] = true;
    }
  }

  // removes incoming data type from target system as well as from data provider if it does not contain any variables after deletion
  removeIncoming(index) {
    let incomingDataType = this.target.incomingDataTypes[index];
    if (incomingDataType.hasOwnProperty("dataProviderName")) {
      let dataProviderName = incomingDataType["dataProviderName"];
      // get dataProvider reference
      let dataProvider = this.target.dataProviders.find(item => item.name === dataProviderName);
      if (!isNullOrUndefined(dataProvider)) {
        if (dataProvider.hasOwnProperty("incomingDataTypes")) {
          // filter out the incoming variable from data provider
          dataProvider.incomingDataTypes.splice(dataProvider.incomingDataTypes.indexOf(incomingDataType), 1);
          // completely remove data provider if there are no associated data types
          if (dataProvider.incomingDataTypes.length === 0) {
            this.target.dataProviders.splice(this.target.dataProviders.indexOf(dataProvider), 1);
          }
        }
      }
    }
    this.target.incomingDataTypes.splice(index, 1);
  }

  hasChanges(): boolean {
    return JSON.stringify(this.target) !== JSON.stringify(this.originalTarget)
  }

  checkValidityOfTargetSystemDefinition() {

    // check if names of user-added changeable variables are not same with the ones coming from configuration
    if (this.checkDuplicateInObject('name', this.target.changeableVariables)) {
      return this.notify.error("", "Input parameters contain duplicate elements");
    }
    // check if names of user-added incoming data types are not same with the ones coming from configuration
    if (this.checkDuplicateInObject('name', this.target.incomingDataTypes)) {
      return this.notify.error("", "Incoming data types contain duplicate elements");
    }
    // check if names of data providers are not same with the ones coming from configuration
    if (this.checkDuplicateInObject('name', this.target.dataProviders)) {
      return this.notify.error("", "Data providers contain duplicate elements");
    }
  }

  // refresh primaryDataProvider & secondaryDataProviders modals, o/w there will be a bug related with sizes of respective arrays
  // it also checks if a primary data provider is selected or not
  refreshDataProvidersAndCheckValidity() {
    this.target.secondaryDataProviders = [];
    this.target.primaryDataProvider = {};
    let primary_exists = false;
    // now, mark the data provider selected by user as "primaryDataProvider", and push others to secondaryDataProviders
    for (let i = 0; i < this.target.dataProviders.length; i++) {
      let dataProvider = this.target.dataProviders[i];
      if (dataProvider["is_primary"] === true) {
        // now check if user provided a valid input for number of samples to ignore
        if (isNullOrUndefined(dataProvider["ignore_first_n_samples"])){
          dataProvider["ignore_first_n_samples"] = 0; // TODO: deal with these samples in a less ugly way
        }
        primary_exists = true;
        this.target.primaryDataProvider = dataProvider;
      } else {
        this.target.secondaryDataProviders.push(dataProvider);
      }
    }
    return primary_exists;
  }

  saveChanges() {
    const ctrl = this;
    if (!ctrl.hasErrors()) {
      this.target.defaultVariables = _(this.target.changeableVariables);
      ctrl.target.name = ctrl.target.name.trim();
      ctrl.target.user = this.userService.getAuthToken()["value"].user.name;
      console.log("user creating this experiment: ", ctrl.target.user);
      console.log(ctrl.target);

      // new ts will be created in first case
      if (ctrl.router.url.indexOf("/create") !== -1) {
        // check for validity of target system
        ctrl.checkValidityOfTargetSystemDefinition();
        let primary_data_provider_exists = this.refreshDataProvidersAndCheckValidity();
        if (!primary_data_provider_exists) {
          return ctrl.notify.error("", "Provide at least one primary data provider!");
          //return ctrl.notify.error("", "Provide at least one primary data provider and number of samples to ignore");
        }
        // and perform save operation
        ctrl.api.saveTarget(ctrl.target).subscribe(
          (new_target) => {
            ctrl.temp_storage.setNewValue(new_target);
            ctrl.notify.success("Success", "Target system is saved");
            ctrl.router.navigate(["control/targets"]);
          }
        )
      } else {
        // perform necessary checks for validity of target system
        ctrl.checkValidityOfTargetSystemDefinition();
        let primary_exists = this.refreshDataProvidersAndCheckValidity();
        if (!primary_exists) {
          return ctrl.notify.error("", "Provide at least one primary data provider!");
        }
        // everything is OK, create new uuid for edit operation
        ctrl.target.id = UUID.UUID();

        ctrl.api.saveTarget(ctrl.target).subscribe(
          (new_target) => {
            ctrl.temp_storage.setNewValue(new_target);
            ctrl.notify.success("Success", "Target system is saved");
            ctrl.router.navigate(["control/targets"]);
          }
        );
      }
      console.log("primary data provider: ", this.target.primaryDataProvider)
    }
    console.log("primary data provider: ",this.target.primaryDataProvider);
  }

  hasErrors(): boolean {
    let nr_of_selected_primary_data_providers = 0;

    if (this.target.dataProviders.length === 0) {
      this.errorButtonLabel = "Provide data provider(s)";
      return true;
    }

    // automatically add is_primary attribute if there's only one data provider
    if (this.target.dataProviders.length == 1) {
      this.target.dataProviders[0]["is_primary"] = true;
    }

    for (let i = 0; i < this.target.dataProviders.length; i++) {
      let dataProvider = this.target.dataProviders[i];
      // indicate error if user has selected more than one primary_data_provider
      if (dataProvider.hasOwnProperty("is_primary")) {
        if (dataProvider["is_primary"]) {
          nr_of_selected_primary_data_providers += 1;
          /*
          if (isNullOrUndefined(dataProvider["ignore_first_n_samples"])) {
            this.errorButtonLabel = "Provide sample size to ignore";
            return true;
          }
          */
        }
        if (nr_of_selected_primary_data_providers > 1) {
          this.errorButtonLabel = "Only one primary data provider is allowed";
          return true;
        }
      }

      // check for attributes of data providers
      if (dataProvider.type === "kafka_consumer") {
        if (dataProvider.serializer == null
          || dataProvider.kafka_uri == null
          || dataProvider.kafka_uri.length === 0
          || dataProvider.topic == null
          || dataProvider.topic.length === 0) {
          this.errorButtonLabel = "Provide valid inputs for Kafka data provider";
          return true;
        }
      } else if (dataProvider.type === "mqtt_listener") {
        if (dataProvider.serializer == null
          || dataProvider.host == null
          || dataProvider.host.length === 0
          || dataProvider.port == null
          || dataProvider.port < 1
          || dataProvider.port > 65535
          || dataProvider.topic.length === 0
          || dataProvider.topic == null
          ) {
          this.errorButtonLabel = "Provide valid inputs for MQTT data provider";
          return true;
        }
      } else if (dataProvider.type === "http_request") {
        if (dataProvider.serializer == null
          || dataProvider.url == null
          || dataProvider.url.length === 0
        ) {
          this.errorButtonLabel = "Provide valid inputs for HTTP data provider";
          return true;
        }
      } else {
        this.errorButtonLabel = "Please select data provider type";
        return true;
      }
    }

    // check for attributes of change provider
    if (this.target.changeProvider.type === "kafka_producer") {
      if (this.target.changeProvider.serializer == null
        || this.target.changeProvider.kafka_uri == null
        || this.target.changeProvider.kafka_uri.length === 0
        || this.target.changeProvider.topic == null
        || this.target.changeProvider.topic.length === 0) {
        this.errorButtonLabel = "Provide valid inputs for Kafka change provider";
        return true;
      }
    } else if (this.target.changeProvider.type === "mqtt_publisher") {
      if (this.target.changeProvider.serializer == null
        || this.target.changeProvider.host == null
        || this.target.changeProvider.host.length === 0
        || this.target.changeProvider.port == null
        || this.target.changeProvider.port < 1
        || this.target.changeProvider.port > 65535
        || this.target.changeProvider.topic.length === 0
        || this.target.changeProvider.topic == null
      ) {
        this.errorButtonLabel = "Provide valid inputs for MQTT change provider";
        return true;
      }
    } else if (this.target.changeProvider.type === "http_request") {
      if (this.target.changeProvider.serializer == null
        || this.target.changeProvider.url == null
        || this.target.changeProvider.url.length === 0
      ) {
        this.errorButtonLabel = "Provide valid inputs for http change provider";
        return true;
      }
    }

    // now check attributes of output parameters
    for (let i = 0; i < this.target.incomingDataTypes.length; i++) {
      if (this.target.incomingDataTypes[i].name == null
          || this.target.incomingDataTypes[i].length === 0
          || this.target.incomingDataTypes[i].description == null
          || this.target.incomingDataTypes[i].description === 0
          || isNullOrUndefined(this.target.incomingDataTypes[i].scale)
          || isNullOrUndefined(this.target.incomingDataTypes[i].criteria)) {
        this.errorButtonLabel = "Provide valid inputs for output parameter(s)";
        return true;
      }
    }

    // check for attributes of input parameters
    for (let i = 0; i < this.target.changeableVariables.length; i++) {
      if (this.target.changeableVariables[i].scale !== 'Boolean') {
        if (this.target.changeableVariables[i].name == null
          || this.target.changeableVariables[i].length === 0
          || this.target.changeableVariables[i].description == null
          || this.target.changeableVariables[i].description === 0
          || isNullOrUndefined(this.target.changeableVariables[i].scale)
          || isNullOrUndefined(this.target.changeableVariables[i].min)
          || isNullOrUndefined(this.target.changeableVariables[i].max)
          || isNullOrUndefined(this.target.changeableVariables[i].default)
          || this.target.changeableVariables[i].min > this.target.changeableVariables[i].max) {
          this.errorButtonLabel = "Provide valid inputs for changeable variable(s)";
          return true;
        }
      } else {
        if (this.target.changeableVariables[i].name == null
          || this.target.changeableVariables[i].length === 0
          || this.target.changeableVariables[i].description == null
          || this.target.changeableVariables[i].description === 0
          || isNullOrUndefined(this.target.changeableVariables[i].scale)
          || isNullOrUndefined(this.target.changeableVariables[i].default)
          || isNullOrUndefined(this.target.changeableVariables[i].value)) {
          this.errorButtonLabel = "Provide valid inputs for input parameter(s)!";
          return true;
        }
      }


      // if ch. var. is not created from configuration, check its default values
      if (this.target.changeableVariables[i]["disabled"] == false) {
        if(this.target.changeableVariables[i].default < this.target.changeableVariables[i].min
          || this.target.changeableVariables[i].default > this.target.changeableVariables[i].max) {
          this.errorButtonLabel = "Provide valid inputs for your input parameter(s)";
          return true;
        }
      }
      // if ch. var. is created from configuration, check its min & max
      else {
        let changeableVariable = this.target.changeableVariables[i];
        let existingDefaultVariable = this.target.defaultVariables.find(item => item.name === changeableVariable.name);
        if (existingDefaultVariable) {
          if (changeableVariable["min"] < existingDefaultVariable["min"]
            || changeableVariable["max"] > existingDefaultVariable["max"]) {
            this.errorButtonLabel = "Inputs for input parameter(s) cannot exceed limits in target system configuration";
            return true;
          }
        }
      }
    }

    if (this.target.name == null || this.target.name === "") {
      this.errorButtonLabel = "Provide valid target system name";
      return true;
    }

    if (this.target.changeableVariables.length === 0) {
      this.errorButtonLabel = "Provide at least one input parameter";
      return true;
    }

    if (this.target.incomingDataTypes.length === 0) {
      this.errorButtonLabel = "Provide at least one output parameter";
      return true;
    }

    if (isNullOrUndefined(this.target.changeProvider.changesApplicable)) {
      this.errorButtonLabel = "Provide True or False for applicability of changes to target system on the run-time";
      return true;
    }

    if (this.target.changeProvider.type == "") {
      this.errorButtonLabel = "Provide a change provider type";
      return true;
    }

    return false;
  }

  revertChanges() {
    this.target = _(this.originalTarget);
  }

  configDropdownChanged(selected_configuration_name: any) {
    this.selectedConfiguration = this.availableConfigurations.filter(config => config.name === selected_configuration_name)[0];
  }

  useConfiguration() {
    this.targetCreatedFromConfig = true;
    this.target['name'] = this.selectedConfiguration['name'];
    this.target['description'] = this.selectedConfiguration['description'];
    this.target.changeProvider['changesApplicable'] = this.selectedConfiguration['changesApplicable'];

    // kafkaHost attribute is retrieved from api
    if (this.selectedConfiguration.hasOwnProperty("kafkaHost")) {
      this.target.changeProvider['kafka_uri'] = this.selectedConfiguration['kafkaHost'];
      this.target.changeProvider['type'] = 'kafka_producer';
      this.target.changeProvider['topic'] = this.selectedConfiguration['kafkaCommandsTopic'];
      this.target.changeProvider['serializer'] = 'JSON';
    } else if (this.selectedConfiguration.hasOwnProperty("url")) {
      this.target.changeProvider['url'] = this.selectedConfiguration['url'];
      this.target.changeProvider['type'] = 'http_request';
      this.target.changeProvider['serializer'] = 'JSON';
    }

    // push each knob into defaultVariables array
    for (let knob of this.selectedConfiguration.knobs) {
      // try to guess default value of target system if not provided via api
      // https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
      if(isNullOrUndefined(knob["default"])) {
        let randomDefault = lodash.random(knob["min"], knob["max"]);
        // knob["default"] = randomDefault.toFixed(2);
        knob["default"] = randomDefault;
      }
      this.target.defaultVariables.push(_(knob));
    }
  }

  closeModalAndRevertChanges() {
    this.revertChanges();
    this.targetCreatedFromConfig = false;
  }

  // http://www.competa.com/blog/lets-find-duplicate-property-values-in-an-array-of-objects-in-javascript/
  checkDuplicateInObject(propertyName, inputArray) {
    var seenDuplicate = false,
      testObject = {};

    inputArray.map(function(item) {
      var itemPropertyName = item[propertyName];
      if (itemPropertyName in testObject) {
        testObject[itemPropertyName].duplicate = true;
        item.duplicate = true;
        seenDuplicate = true;
      }
      else {
        testObject[itemPropertyName] = item;
        delete item.duplicate;
      }
    });

    return seenDuplicate;
  }
}
