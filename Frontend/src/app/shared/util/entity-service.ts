import {NotificationsService} from "angular2-notifications";
import {LoggerService} from "../modules/helper/logger.service";
import {Injectable} from "@angular/core";
import {
  StageEntity,
  Experiment,
  OedaCallbackEntity,
  UserEntity,
  Target,
  ExecutionStrategy,
  StepEntity
} from "../modules/api/oeda-api.service";

import {isNullOrUndefined} from "util";
import {UUID} from "angular2-uuid";

@Injectable()
/** This class provides methods related with experiment data object(s) that are retrieved from backend */
export class EntityService {

  private decimal_places: number;

  constructor (public notify: NotificationsService, public log: LoggerService) {
    this.decimal_places = 2;
  }

  /** returns data of the selected stage from all_data structure */
  public get_data_from_local_structure(all_data, stage_no) {
    let retrieved_data = all_data[stage_no - 1];
    if (retrieved_data !== undefined) {
      return retrieved_data;
    } else {
      this.notify.error("Error", "Cannot retrieve data from local storage");
      return;
    }

  }

  /** parses single stage data with given attributes & scale, and returns values in array */
  public process_single_stage_data(single_stage_object, xAttribute, yAttribute, scale, incoming_data_type_name): Array<number> {
    const ctrl = this;
    try {
      if (single_stage_object !== undefined) {
        const processedData = [];
        single_stage_object.values.forEach(function(data_point) {
          // filter out points that are retrieved from other data providers, o/w they will be undefined
          if (!isNullOrUndefined(data_point["payload"][incoming_data_type_name])){
            // first check if log value can be calculated properly
            if (scale === "Log" && data_point["payload"][incoming_data_type_name] <= 0) {
              let err = {};
              err["message"] = "Log scale cannot be applied to "  + incoming_data_type_name;
              throw(err);
            }
            if (xAttribute !== null && yAttribute !== null) {
              const newElement = {};
              newElement[xAttribute] = data_point["createdDate"];

              if (scale === "Log") {
                newElement[yAttribute] = Number(Math.log(data_point["payload"][incoming_data_type_name]).toFixed(ctrl.decimal_places));
              } else if (scale === "Normal") {
                newElement[yAttribute] = Number(data_point["payload"][incoming_data_type_name].toFixed(ctrl.decimal_places));
              } else {
                ctrl.notify.error("Error", "Please provide a valid scale");
                return;
              }
              processedData.push(newElement);
            } else {
              // this is for plotting qq plot with JS, as it only requires raw data in log or normal scale
              if (scale === "Log") {
                processedData.push(Number(Math.log(data_point["payload"][incoming_data_type_name]).toFixed(ctrl.decimal_places)));
              } else if (scale === "Normal") {
                processedData.push(Number(data_point["payload"][incoming_data_type_name].toFixed(ctrl.decimal_places)));
              } else {
                ctrl.notify.error("Error", "Please provide a valid scale");
                return;
              }
            }
        }
        });
        return processedData;
      }
    } catch (err) {
      this.notify.error("Error", err.message);
      throw err;
    }
  }

  /** all_stage_object can contain more than one stages here */
  public process_all_stage_data(all_stage_object, xAttribute, yAttribute, scale, incoming_data_type_name): Array<number> {
    const ctrl = this;
    try {
      if (all_stage_object !== undefined) {
        const processedData = [];

        all_stage_object.forEach(function(single_stage_object) {
          const data_array = ctrl.process_single_stage_data(single_stage_object, xAttribute, yAttribute, scale, incoming_data_type_name);
          data_array.forEach(function(data_value){
            processedData.push(data_value);
          });
        });
        return processedData;
      } else {
        this.notify.error("Error", "Failed to process all stage data");
      }
    } catch (err) {
      this.notify.error("Error", err.message);
      throw err;
    }
  }

  /** data structure that is used for running and successful experiments are different
   * we pass key (step_no) - value (stages) pairs to this fcn from running exp. page to parse all data of all stages of single step*/
  public process_stages(stages, xAttribute, yAttribute, scale, incoming_data_type_name): Array<number> {
    const ctrl = this;
    try {
      if (stages !== undefined) {
        let processedData = [];
        stages.forEach(function(single_stage_object) {
          // iterates each stage but not All Stages tuple, it's just for displaying purposes
          if (Number(single_stage_object.number) !== -1) {
            const data_array = ctrl.process_single_stage_data(single_stage_object, xAttribute, yAttribute, scale, incoming_data_type_name);
            processedData = processedData.concat(data_array);
          }
        });
        return processedData;
      } else {
        this.notify.error("Error", "Failed to process all stage data for running experiment");
      }
    } catch (err) {
      this.notify.error("Error", err.message);
      throw err;
    }
  }

  /** https://stackoverflow.com/questions/979256/sorting-an-array-of-javascript-objects */
  public sort_by(field, reverse, primer) {
    if (!isNullOrUndefined(field)) {
      const key = function (x) {return primer ? primer(x[field]) : x[field]};
      return function (a, b) {
        const A = key(a), B = key(b);
        return ( (A < B) ? -1 : ((A > B) ? 1 : 0) ) * [-1, 1][+!!reverse];
      }
    }
    return function (a, b) {
      return ( (a < b) ? -1 : ((a > b) ? 1 : 0) ) * [-1, 1][+!!reverse];
    }

  }

  /** parses static response object returned from server, creates new stage-point tuple(s) and pushes them to the all_data (array of json strings) */
  public process_response_for_successful_experiment(steps_and_stages, step_no, all_data): StageEntity[] {
    if (isNullOrUndefined(steps_and_stages)) {
      this.notify.error("Error", "Cannot retrieve data from DB, please try again");
      return;
    }

    // we can retrieve more than one step and multiple stages
    for (const step_number in steps_and_stages) {
      if (steps_and_stages.hasOwnProperty(step_number)) {
        // we need to filter out the data that is specifically requested for the given step_no
        if (step_number == step_no) {
          for (const stage_index in steps_and_stages[step_number]) {
            if (steps_and_stages[step_number].hasOwnProperty(stage_index)) {
              let stage_object = steps_and_stages[step_number][stage_index];
              if (!this.isEmptyObject(stage_object)) {
                // distribute data points to empty bins
                const new_entity = this.create_stage_entity();
                new_entity.number = stage_object['number'].toString();
                new_entity.values = stage_object['values'];
                new_entity.knobs = stage_object['knobs'];
                new_entity.stage_result = stage_object['stage_result'];

                // important assumption here: we retrieve steps, stages and data points in a sorted manner w.r.t. createdDate field
                // so all_data is sth like:
                // [ 0: {number: 1, values: ..., knobs: [...]}, 1: {number: 2, values: ..., knobs: [...] }...]
                all_data.push(new_entity);
              }
            }
          }
        }
      }
    }
    return all_data;

  }

  public create_experiment(execution_strategy): Experiment {
      return {
        "id": UUID.UUID(),
        "user": "",
        "name": "",
        "description": "",
        "status": "",
        "targetSystemId": "",
        "executionStrategy": execution_strategy,
        "changeableVariables": [], // used while creating an experiment
        "considered_data_types": [],
        "consideredAggregateTopics": [],
        "analysis": {},
        "numberOfSteps": 0,
        "simulation": {
          "startTime" : 0,
          "endTime" : 500,
          "updateInterval" : 1,
          "resourcePath": "http://",
          "resultsFilename": ""
        }
      }
  }

  public create_target_system(): Target {
    return {
      "id": "",
      "user": "",
      "dataProviders": [],
      "primaryDataProvider": {
        "type": "",
        "ignore_first_n_samples": null
      },
      "secondaryDataProviders": [],
      "changeProvider": {
        "type": "",
      },
      "name": "",
      "status": "",
      "description": "",
      "type": "",
      "incomingDataTypes": [],
      "changeableVariables": [], // used while creating a target system
      "defaultVariables": []
    }
  }

  public create_execution_strategy(): ExecutionStrategy {
    return {
      type: "",
      sample_size: 500,
      knobs: [],
      stages_count: 0,
      acquisition_method: "",
      optimizer_iterations: 15,
      optimizer_iterations_in_design: 0
    }
  }

  public create_oeda_callback_entity(): OedaCallbackEntity {
    return {
      status: "Initializing...",
      message: "",
      index: 0,
      size: 0,
      complete: 0,
      experiment_counter: 0,
      total_experiments: 0,
      stage_counter: null,
      current_knob: new Map<string, number>(),
      remaining_time_and_stages: {},
      step_name: "",
      step_no: 0
    };
  }

  public create_user_entity(): UserEntity {
    return {
      name: "",
      password: "",
      db_configuration: new Map<string, string>()
    };
  }

  public create_stage_entity(): StageEntity {
    return {
      number: "",
      values: [],
      knobs: null,
      stage_result: null
    }
  }

  public create_step_entity(): StepEntity {
    return {
      step_no: "",
      stages: [],
      step_name: ""
    }
  }

  /** we do not allow user to take Log of Boolean (Nominal) data */
  public scale_allowed(user_selected_scale, data_scale) {
    if (user_selected_scale === "Log" && data_scale === "Boolean") {
      return false;
    }
    return true;
  }

  /** returns true if first stage's payload contains the given incoming data type's name */
  public is_data_type_retrieved(stage_data, incoming_data_type): boolean {
    let retrieved: boolean = false;
    if (stage_data !== undefined) {
      if (stage_data.hasOwnProperty("values")) {
        const values = stage_data.values;
        values.forEach(function(tuple) {
          if(tuple.payload.hasOwnProperty(incoming_data_type.name) && !retrieved) {
            retrieved = true;
            return retrieved;
          }
        });
      }
    }
    return retrieved;
  }

  /** tries to set the initially-selected incoming data type name by looking at the payload and target system's optimized data type(s)
   *  we retrieve stages and data points in following format
   *  e.g. [ 0: {number: 1, values: ..., knobs: [...]}, 1: {number: 2, values: ..., knobs: [...] }...]
   *  this method should be called after checking whether it's the first render of page or not.
   *  because, if it's not the first time, then user's selection of incoming data type (via dropdown UI) is important
   *  but: before plotting, we must ensure that a proper & valid incoming data type is selected
   */
  public get_candidate_data_type(experiment, targetSystem, first_stage_data) {

    if (typeof first_stage_data === 'string') {
      first_stage_data = JSON.parse(first_stage_data);
    }

    // first check if we can get one of the optimized data types from payload
    for (let k = 0; k < experiment.considered_data_types.length; k++) {
      const candidate_incoming_optimized_data_type = experiment.considered_data_types[k];
      if (candidate_incoming_optimized_data_type["is_considered"] === true) {
        if (this.is_data_type_retrieved(first_stage_data, candidate_incoming_optimized_data_type)) {
          return candidate_incoming_optimized_data_type;
        }
      }
    }

    // now check regular incoming data types
    for (let j = 0; j < targetSystem.incomingDataTypes.length; j++) {
      const candidate_incoming_data_type = targetSystem.incomingDataTypes[j];
      if (this.is_data_type_retrieved(first_stage_data, candidate_incoming_data_type)) {
        return candidate_incoming_data_type;
      }
    }
    return null;
  }

  /**
   * for experiments, we pass string representation to scatter plots & histograms
   * @param selected_stage = JSON representation of selected stage object
   * @returns string
   */
  public get_stage_details(selected_stage: any): string {
    let details: string = "Stage: ";
    details += selected_stage["number"] + " \n";
    let json_str = JSON.stringify(selected_stage["knobs"]);
    json_str = json_str.replace(/["']/g, "");
    json_str = json_str.replace(/,/g, ", ");
    // json_str = json_str.replace("{", "[");
    // json_str = json_str.replace("}", "]");
    details += json_str;
    return details;
  }

  /**
   * iterates given object and round their values to given decimal number
   */
  public round_values(iterable_object: any, decimal: number) {
    if (iterable_object == undefined)
      return iterable_object;
    Object.getOwnPropertyNames(iterable_object).forEach(key => {
      let value = iterable_object[key];
      if(typeof(value) == 'string') {
        iterable_object[key] = parseFloat(Number(value).toFixed(decimal));
      } else if (typeof(value) == 'number') {
        iterable_object[key] = parseFloat(value.toFixed(decimal));
      }
    });
    return iterable_object;
  }

  /** returns keys of the given map */
  public get_keys(object) : Array<string> {
    if (!isNullOrUndefined(object)) {
      return Object.keys(object);
    }
    return null;
  }

  /**
   * puts non-exiting knob keys & values to the actual knob object for a single stage entity.
   * it also puts min & max values of actual knob objects for all_stages entity if strategy is not forever.
   * if strategy is forever, then we don't have to alter stageKnobs at all, it just returns the same knob object.
   * All knob keys & values are iterated using targetSystem's defaultVariables
   * stageKnobs: empty or non-empty Map
   * targetSystemVariables: object[]
   * return value -> stageKnobs
   */
  public populate_knob_objects_with_variables(stageKnobs: any, targetSystemVariables: any, for_all_stages: boolean) {
    let ctrl = this;
    let knob_keys = ctrl.get_keys(stageKnobs);
    targetSystemVariables.forEach(function(target_system_knob) {
      if (knob_keys.length > 0 && !for_all_stages) {
        if (!knob_keys.includes(target_system_knob.name)) {
          stageKnobs[target_system_knob.name] = target_system_knob.default;
        }
      } else {
        // this case is for populating all_stage, initially stageKnobs is an empty Map
        // so it will insert min & max accordingly.
        let min_max_map = {};
        min_max_map["min"] = target_system_knob.min;
        min_max_map["max"] = target_system_knob.max;
        min_max_map["default"] = target_system_knob.default;
        stageKnobs[target_system_knob.name] = min_max_map;

      }
    });

    return stageKnobs
  }

  /**
   * checks if given data type was selected (considered) or not
   */
  public is_considered(considered_data_types, data_type_name): boolean {
    for (let i = 0; i < considered_data_types.length; i++) {
      if (considered_data_types["name"] === data_type_name) {
        return true;
      }
    }
    return false;
  }

  /**
   * returns number of considered data types
   */
  public get_number_of_considered_data_types(targetSystem): number {
    let number_of_considered_data_types = 0;
    for (let i = 0; i < targetSystem.incomingDataTypes.length; i++) {
      let data_type = targetSystem.incomingDataTypes[i];
      if (data_type["is_considered"] == true) {
        number_of_considered_data_types += 1
      }
    }
    return number_of_considered_data_types;
  }

  /**
   * converts a knob object with attributes into a Map<string, any>
   */
  public convert_object_into_map(object): Map<string, any> {
    let map = new Map<string, any>();
    object.forEach(function(attribute) {
      let value = object[attribute];
      map.set(attribute, value);
    });
    return map;
  }

  /**
   * @param obj, object whose emptiness will be tested
   * @returns {boolean}
   */
  public isEmptyObject(obj): boolean {
    return JSON.stringify(obj) === '{}';
  }
}
