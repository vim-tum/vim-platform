import {Component, OnInit, OnDestroy} from '@angular/core';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {NotificationsService} from "angular2-notifications";
import {LayoutService} from "../../../../shared/modules/helper/layout.service";
import {Experiment, Target, OEDAApiService, StepEntity, StageEntity, OedaCallbackEntity} from "../../../../shared/modules/api/oeda-api.service";
import {AmChart} from "@amcharts/amcharts3-angular";
import {isNullOrUndefined} from "util";
import {Observable} from "rxjs/Observable";
import {PlotService} from "../../../../shared/util/plot-service";
import {EntityService} from "../../../../shared/util/entity-service";
import {TempStorageService} from "../../../../shared/modules/helper/temp-storage-service";

@Component({
  selector: 'show-running-experiment',
  templateUrl: './show-running-experiment.component.html'
})

// QQ plot reference: https://gist.github.com/mbostock/4349187

export class ShowRunningExperimentComponent implements OnInit, OnDestroy {
  private scatter_plot: AmChart;
  private histogram: AmChart;

  public dataAvailable: boolean;
  public is_collapsed: boolean;
  public first_render_of_page: boolean;

  private divId: string;
  private histogramDivId: string;
  private qqPlotDivId: string;
  private filterSummaryId: string;
  private histogramLogDivId: string;
  private processedData: any;
  private timer: any;
  private subscription: any;
  private first_render_of_plots: boolean;
  private experiment_ended: boolean;
  private timestamp: string;
  private stage_details: string;
  private decimal_places: number;

  public experiment_id: string;
  public experiment: Experiment;
  public targetSystem: Target;

  public initial_threshold_for_scatter_plot: number;
  public nr_points_to_be_filtered: number;

  // following attributes are used for QQ plotting in Python
  public available_distributions: object;
  public distribution: string;
  public scale: string;
  public is_qq_plot_rendered: boolean;

  public is_enough_data_for_plots: boolean;
  public is_all_stages_selected: boolean;

  public callbackRetrieved: boolean;

  public incoming_data_type: object;

  public available_steps = {}; // main data structure difference with successful-experiment component

  public selected_stage: any;

  public oedaCallback: OedaCallbackEntity;

  public step_no: any;


  constructor(private layout: LayoutService,
              private apiService: OEDAApiService,
              private entityService: EntityService,
              private plotService: PlotService,
              private activated_route: ActivatedRoute,
              private router: Router,
              private notify: NotificationsService,
              private temp_storage: TempStorageService
  ) {

    this.layout.setHeader("Experiment Results", "");
    this.callbackRetrieved = false;
    this.dataAvailable = false;
    this.is_all_stages_selected = false;
    this.is_qq_plot_rendered = false;
    this.is_enough_data_for_plots = false;
    this.experiment_ended = false;
    this.is_collapsed = true;
    this.first_render_of_page = true;
    this.scale = "Normal";
    this.first_render_of_plots = true;
    this.decimal_places = 4;
    this.distribution = "Norm";
    this.available_distributions = ['Norm', 'Gamma', 'Logistic', 'T', 'Uniform', 'Lognorm', 'Loggamma'];
    this.incoming_data_type = null;
    this.oedaCallback = this.entityService.create_oeda_callback_entity();


    this.divId = "chartdiv";
    this.histogramDivId = "histogram";
    this.histogramLogDivId = "histogram_log";
    this.filterSummaryId = "filterSummary";
    this.qqPlotDivId = "qqPlot";
    this.step_no = 1; // initially selected step is "ANOVA step"

    // subscribe to router event
    this.activated_route.params.subscribe((params: Params) => {
      // id is retrieved from URI
      if (params["id"] && this.router.url.toString().includes("/control/experiments/show")) {
        this.experiment_id = params["id"];
      }
    });
  }

  /* tslint:disable */

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnInit() {
    if (!isNullOrUndefined(this.experiment_id)) {
      this.apiService.loadExperimentById(this.experiment_id).subscribe(experiment => {
        if (!isNullOrUndefined(experiment)) {
          this.experiment = experiment;
          this.experiment.id = this.experiment_id;
          if (!isNullOrUndefined(experiment.targetSystemId)) {
            // retrieve target system
            this.apiService.loadTargetById(experiment.targetSystemId).subscribe(targetSystem => {
              if (!isNullOrUndefined(targetSystem)) {
                this.targetSystem = targetSystem;
                this.targetSystem.id = this.experiment.targetSystemId;
                // polling using Timer (2 sec interval) for real-time data visualization
                this.timer = Observable.timer(1000, 2000);
                this.subscription = this.timer.subscribe(() => {
                  this.fetch_oeda_callback();
                });
              }
            });
          }
        } else {
          this.notify.error("Error", "Cannot retrieve details of selected experiment, make sure DB is up and running");
        }
      });
    } else {
      this.notify.error("Error", "Failed retrieving experiment id, please check URI");
    }

  }

  private fetch_oeda_callback() {
    const ctrl = this;

    // also set "polling-on" button disabled, because polling is already on
    if (document.getElementById("polling_on_button"))
      document.getElementById("polling_on_button").setAttribute('disabled', 'true');

    ctrl.apiService.getOedaCallback(ctrl.experiment_id).subscribe(oedaCallback => {
      if(!isNullOrUndefined(oedaCallback)) {
        ctrl.oedaCallback["status"] = oedaCallback.status;
        ctrl.oedaCallback["stage_counter"] = oedaCallback.stage_counter;
        ctrl.oedaCallback["step_no"] = oedaCallback.step_no;
        ctrl.oedaCallback["step_name"] = oedaCallback.step_name;
        ctrl.callbackRetrieved = true;

        // keywords (index, size) are same for the first two cases, but they indicate different things
        if (oedaCallback.status === "PROCESSING") {
          ctrl.oedaCallback["message"] = oedaCallback.message;
        } else if (oedaCallback.status == "IGNORING_SAMPLES" || oedaCallback.status == "COLLECTING_DATA") {
          ctrl.oedaCallback["index"] = oedaCallback.index;
          ctrl.oedaCallback["size"] = oedaCallback.size;
          ctrl.oedaCallback["complete"] = (Number(oedaCallback.index)) / (Number(oedaCallback.size));

          // round knob values to provided decimal places
          oedaCallback.current_knob = ctrl.entityService.round_values(oedaCallback.current_knob, ctrl.decimal_places);
          // remaining_time_and_stages is a experiment-wise unique dict that contains remaining stages and time
          ctrl.oedaCallback.remaining_time_and_stages["remaining_time"] = oedaCallback.remaining_time_and_stages["remaining_time"];
          ctrl.oedaCallback.remaining_time_and_stages["remaining_stages"] = oedaCallback.remaining_time_and_stages["remaining_stages"];
          ctrl.oedaCallback.current_knob = oedaCallback.current_knob;
          // fetch data from backend
          if (oedaCallback.status == "COLLECTING_DATA") {
            if (ctrl.first_render_of_page) {
              ctrl.apiService.loadAllDataPointsOfExperiment(ctrl.experiment_id).subscribe(response => {
                let is_successful_fetch = ctrl.process_response(response);
                ctrl.dataAvailable = true; // should be placed before drawing all plots to render required html components but after processing response
                if (ctrl.incoming_data_type == null) {
                  // first stage data, start from 1 because All Stages tuple is located in [0], make All Stages of first step "selected"
                  ctrl.selected_stage = ctrl.available_steps[ctrl.step_no]["stages"][0];
                  let first_stage_data = ctrl.available_steps[ctrl.step_no]["stages"][1];
                  ctrl.incoming_data_type = ctrl.entityService.get_candidate_data_type(ctrl.experiment, ctrl.targetSystem, first_stage_data);
                }
                if (is_successful_fetch && !isNullOrUndefined(ctrl.incoming_data_type)) {
                  ctrl.first_render_of_page = false;
                  ctrl.draw_all_plots();
                }
              });
            }
            else {
              if (ctrl.timestamp == undefined) {
                ctrl.timestamp = "-1";
              }
              ctrl.apiService.loadAllDataPointsOfRunningExperiment(ctrl.experiment_id, ctrl.timestamp).subscribe(response => {
                ctrl.process_response(response);
                ctrl.dataAvailable = true; // should be placed before drawing all plots to render required html components but after processing response

                if (ctrl.incoming_data_type == null) {
                  let first_stage_data = ctrl.available_steps[ctrl.step_no]["stages"][1];
                  ctrl.incoming_data_type = ctrl.entityService.get_candidate_data_type(ctrl.experiment, ctrl.targetSystem, first_stage_data);
                }
                ctrl.draw_all_plots();
              });
            }
          }

        } else if (oedaCallback.status == "EXPERIMENT_DONE") {
          if (oedaCallback.remaining_time_and_stages["remaining_stages"] == 0) {
            // set temporary status to remove callback in backend
            this.experiment.status = "POLLING_FINISHED";
            this.apiService.updateExperiment(this.experiment).subscribe((resp) => {
              ctrl.disable_polling("Success", "Data is up-to-date, stopped polling.");
              // switch to successful experiment page to show other plots to the user
              ctrl.router.navigate(["control/experiments/show/" + ctrl.experiment_id + "/success"]).then(() => {
                console.log("Navigated to successful experiments page");
              });
            });


          }
        }
      }
    });
  }

  /** refactoring this method (integrating it into entityService) makes significant/drastic changes in user-experience
   * in terms of delays,
   * spikes while validating/updating available_steps.
   */
  private process_response(steps) {
    // hasOwnProperty checks are used to avoid inherited attributes
    const ctrl = this;
    if (isNullOrUndefined(steps)) {
      ctrl.notify.error("Error", "Cannot retrieve data from DB, please try again");
      return;
    }
    if (ctrl.first_render_of_page) {
      // we can retrieve one or more steps at first render
      for (let step_no in steps) {
        if (steps.hasOwnProperty(step_no)) {
          // we can retrieve one or more stages within retrieved step(s)
          // distribute retrieved stages to empty step entities
          let step_entity = ctrl.entityService.create_step_entity();
          step_entity.step_no = step_no;

          // for each new step, push "All Stages" to respective step's stages array
          let all_stages_tpl = {"number": -1, "knobs": {}};
          all_stages_tpl.knobs = ctrl.entityService.populate_knob_objects_with_variables(all_stages_tpl.knobs, ctrl.targetSystem.defaultVariables, true);
          step_entity.stages.push(all_stages_tpl);

          // iterate stages of retrieved step
          for (let stage_no in steps[step_no]) {
            if (steps[step_no].hasOwnProperty(stage_no)) {
              let stage_object = steps[step_no][stage_no];
              // sometimes stage_object can be {}, so avoid this case, we also retrieve step_name as key, so also filter out that
              if (this.get_keys(stage_object).length !== 0) {
                // distribute data points to empty bins
                const stage_entity = this.entityService.create_stage_entity();
                stage_entity.number = stage_object['number'];
                stage_entity.values = stage_object['values'];
                stage_entity.knobs = ctrl.entityService.round_values(stage_object['knobs'], ctrl.decimal_places);
                stage_entity.knobs = ctrl.entityService.populate_knob_objects_with_variables(stage_entity.knobs, ctrl.targetSystem.defaultVariables, false);
                stage_entity.stage_result = stage_object['stage_result'];

                // get step_name from stage definition
                step_entity.step_name = stage_object['step_name'];
                step_entity.stages.push(stage_entity);
              }
            }
          }
          step_entity.stages.sort(this.entityService.sort_by('number', true, parseInt));
          ctrl.available_steps[step_no] = step_entity;
        }
      }
      // for the first_render we always get a new step, inform user
      this.notify.success("Success", "New step has been fetched");
      ctrl.first_render_of_page = false;
      return true;
    }
    else {
      // we can retrieve one or more steps upon other polls
      // so, iterate the these steps & their stages to concatenate respective data points
      // corner case: we return sth like this from backend "new_tuples[step_no] = dict()", where dict can be empty
      let timestamp_updated = false;
      let new_step_added = false;
      for (let step_no in steps) {
        if (steps.hasOwnProperty(step_no)) {
          let step: StepEntity;
          if (this.available_steps.hasOwnProperty(step_no)) {
            step = this.available_steps[step_no];
          }
          else {
            // we retrieved a new step, update new_step_added flag to inform user at the end
            step = this.entityService.create_step_entity();
            // for each step, check existence of "All Stages" tuple in step.stages
            let all_stages_tpl = {"number": -1, "knobs": {}};
            all_stages_tpl.knobs = ctrl.entityService.populate_knob_objects_with_variables(all_stages_tpl.knobs, ctrl.targetSystem.defaultVariables, true);
            step.stages.push(all_stages_tpl);
            new_step_added = true;
          }

          for (let stage_no in steps[step_no]) {
            // check if we retrieve empty stages in steps (above-mentioned corner case)
            if (steps[step_no].hasOwnProperty(stage_no) && this.get_keys(steps[step_no][stage_no]).length != 0 ){
              let stage_object = steps[step_no][stage_no];
              // find the retrieved stage in available stages
              let existing_stage = step.stages.find(entity => entity['number'] === stage_object.number);

              // we have found an existing stage, concat its values with existing one
              if (existing_stage !== undefined) {
                // let stage_index = parsed_json_object['number'] - 1;
                if (stage_object['values'].length > 0) {
                  existing_stage['values'] = existing_stage['values'].concat(stage_object['values']);
                }
                // update whole tuple by finding index and replacing
                const existing_stage_idx = step["stages"].indexOf(stage_object);
                step.stages[existing_stage_idx] = existing_stage;
              }
              else {
                // a new stage has been fetched, create a new bin for it, and push all the values to the bin,
                // also push bin to available_steps, round knob values to provided decimal places
                const number = stage_object.number;
                const values = stage_object.values;
                let knobs = ctrl.entityService.round_values(stage_object['knobs'], ctrl.decimal_places);
                knobs = ctrl.entityService.populate_knob_objects_with_variables(knobs, ctrl.targetSystem.defaultVariables, false);
                const new_stage = {"number": number, "knobs": knobs, "values": values};
                step.stages.push(new_stage);
                step.step_name = stage_object.step_name; // get step_name from stage definition
              }
              // update timestamp if we have retrieved any data
              // we need to update timestamp with last data of the last retrieved stage
              // first, we get last stage
              let stage_indices = this.get_keys(steps[step_no]); // ["1", "2", "3"...] note that they do not start from 0 because we save them DB starting from 1
              let last_stage_idx = stage_indices.length;

              if (Number(stage_no) == last_stage_idx) {
                let data_point_length = stage_object['values'].length;
                if (data_point_length > 0) {
                  ctrl.timestamp = stage_object.values[data_point_length - 1]['createdDate'];
                  timestamp_updated = true;
                }
              }
            }
          }
          step.stages.sort(this.entityService.sort_by('number', true, parseInt));
          this.available_steps[step_no] = step;
        }
      }
      if (new_step_added)
        this.notify.success("Success", "New step has been fetched");
      return timestamp_updated;
    }
  }

  /** uses stage_object (that can be either one stage or all_stage) and PlotService to draw plots accordingly */
  private draw_all_plots() {
    const ctrl = this;
    // set it to false in case a new scale is selected
    ctrl.is_enough_data_for_plots = false;

    // if user has not selected anything, plot All Stages of the selected step
    if (ctrl.selected_stage.number == -1) {
      ctrl.processedData = ctrl.entityService.process_stages(ctrl.available_steps[ctrl.step_no].stages, "timestamp", "value", ctrl.scale, ctrl.incoming_data_type["name"]);
      ctrl.stage_details = "All Stages";
    }
    // if any other stage is selected
    else {
      // All Stage tuple is located in stages[0]
      ctrl.processedData = ctrl.available_steps[ctrl.step_no].stages[ctrl.selected_stage.number];
      ctrl.processedData = ctrl.entityService.process_single_stage_data(ctrl.processedData,"timestamp", "value", ctrl.scale, ctrl.incoming_data_type["name"]);
      // ctrl.processedData is the stage object here
      ctrl.stage_details = ctrl.entityService.get_stage_details(ctrl.selected_stage);
    }

    if (!isNullOrUndefined(ctrl.processedData)) {
      // https://stackoverflow.com/questions/597588/how-do-you-clone-an-array-of-objects-in-javascript
      const clonedData = JSON.parse(JSON.stringify(ctrl.processedData));
      ctrl.initial_threshold_for_scatter_plot = ctrl.plotService.calculate_threshold_for_given_percentile(clonedData, 95, 'value', ctrl.decimal_places);
      // just to inform user about how many points are above the calculated threshold (95-percentile)
      ctrl.nr_points_to_be_filtered = ctrl.processedData.filter(function (item) {
        return item.value > ctrl.initial_threshold_for_scatter_plot;
      }).length;

      // just to override the text in div
      // if user previously clicked in the chart; but new data has come, so we should update div that tells user updated threshold and number of points to filtered.
      // document.getElementById(ctrl.filterSummaryId).innerHTML = "<p>Threshold for 95-percentile: <b>" + ctrl.initial_threshold_for_scatter_plot + "</b> and # of points to be removed: <b>" + ctrl.nr_points_to_be_filtered + "</b></p>";

      if (ctrl.first_render_of_plots) {
        ctrl.scatter_plot = ctrl.plotService.draw_scatter_plot(ctrl.divId, ctrl.filterSummaryId, ctrl.processedData, ctrl.incoming_data_type["name"], ctrl.initial_threshold_for_scatter_plot, ctrl.stage_details, ctrl.decimal_places);
        ctrl.histogram = ctrl.plotService.draw_histogram(ctrl.histogramDivId, ctrl.processedData, ctrl.incoming_data_type["name"], ctrl.stage_details, ctrl.decimal_places);
        ctrl.first_render_of_plots = false;
      } else {
        // now update (validate) values & threshold value and its guide (line) of the scatter plot & also update title
        ctrl.scatter_plot.dataProvider = ctrl.processedData;
        ctrl.scatter_plot.graphs[0].negativeBase = ctrl.initial_threshold_for_scatter_plot;
        ctrl.scatter_plot.valueAxes[0].guides[0].value = ctrl.initial_threshold_for_scatter_plot;
        ctrl.scatter_plot.titles[0].text = ctrl.stage_details;
        // also rename label of charts in case of a change
        ctrl.scatter_plot.valueAxes[0].title = ctrl.incoming_data_type["name"];
        ctrl.histogram.categoryAxis.title = ctrl.incoming_data_type["name"];
        // https://docs.amcharts.com/3/javascriptcharts/AmChart, following refers to validateNow(validateData = true, skipEvents = false)
        ctrl.scatter_plot.ignoreZoomed = true;
        ctrl.scatter_plot.validateNow(true, false);
        ctrl.histogram.dataProvider = ctrl.plotService.categorize_data(ctrl.processedData, ctrl.decimal_places);
        ctrl.histogram.validateData();
      }
      ctrl.is_enough_data_for_plots = true;
    } else {
      ctrl.is_enough_data_for_plots = false;
      this.notify.error("Cannot retrieve data from server, please restart experiment");
    }
  }

  /** called when stage (All Stages, Stage 1 [...], Stage 2 [...], ...) in experiment-stages-paginator is changed */
  stage_changed(selected_stage) {
    if (selected_stage !== null)
      this.selected_stage = selected_stage;
    if (!isNullOrUndefined(this.incoming_data_type)) {
      if (this.entityService.scale_allowed(this.scale, this.incoming_data_type["scale"])) {
        this.draw_all_plots();
      } else {
        // inform user and remove graphs from page for now
        this.is_enough_data_for_plots = false;
        this.notify.error(this.scale + " scale cannot be applied to " + this.incoming_data_type["name"]);
      }
    } else {
      this.is_enough_data_for_plots = false;
      this.notify.error("Incoming data type is null, select it from dropdown list");
    }

  }

  /** called when scale dropdown (Normal, Log) in main page is changed */
  scale_changed(user_selected_scale) {
    this.scale = user_selected_scale;
    if (this.entityService.scale_allowed(this.scale, this.incoming_data_type["scale"])) {
      this.draw_all_plots();
    } else {
      // inform user and remove graphs from page for now
      this.is_enough_data_for_plots = false;
      this.notify.error(this.scale + " scale cannot be applied to " + this.incoming_data_type["name"]);
    }
  }

  /** called when incoming data type of the target system is changed */
  incoming_data_type_changed(incoming_data_type_name) {
    this.incoming_data_type = this.targetSystem.incomingDataTypes.find(x => x.name == incoming_data_type_name);
    if (this.entityService.scale_allowed(this.scale, this.incoming_data_type["scale"])) {
      this.draw_all_plots();
    } else {
      // inform user and remove graphs from page for now
      this.is_enough_data_for_plots = false;
      this.notify.error(this.scale + " scale cannot be applied to " + this.incoming_data_type["name"]);
    }
  }

  /** returns keys of the given map */
  get_keys(object) : Array<string> {
    return this.entityService.get_keys(object);
  }

  is_considered(data_type_name) {
    return this.entityService.is_considered(this.experiment.considered_data_types, data_type_name);
  }

  // helper function that filters out data above the given threshold
  filter_outliers(event) {
    const target = event.target || event.srcElement || event.currentTarget;
    const idAttr = target.attributes.id;
    const value = idAttr.nodeValue;
    console.log(target);
    console.log(idAttr);
    console.log(value);
  }

  /** disables polling upon user click, and informs user */
  disable_polling(status: string, content: string) {
    document.getElementById("polling_off_button").setAttribute('class', 'btn btn-primary active');
    document.getElementById("polling_off_button").setAttribute('disabled', 'true');
    document.getElementById("polling_on_button").setAttribute('class', 'btn btn-default');
    document.getElementById("polling_on_button").removeAttribute('disabled');
    this.subscription.unsubscribe();
    if (!isNullOrUndefined(status) && !isNullOrUndefined(content)) {
      this.notify.success(status, content);
    } else {
      this.notify.success("Success", "Polling disabled");
    }
  }

  /** re-creates the subscription object to periodically fetch data from server */
  enable_polling() {
    document.getElementById("polling_on_button").setAttribute('class', 'btn btn-primary active');
    document.getElementById("polling_on_button").setAttribute('disabled', 'true');
    document.getElementById("polling_off_button").setAttribute('class', 'btn btn-default');
    document.getElementById("polling_off_button").removeAttribute('disabled');

    this.subscription = this.timer.subscribe(() => {
      this.fetch_oeda_callback();
    });
    this.notify.success("Success", "Polling enabled");
  }

  stopRunningExperiment(): void {
    this.experiment.status = "INTERRUPTED";
    this.apiService.updateExperiment(this.experiment).subscribe(() => {
      this.targetSystem.status = "READY";
      this.apiService.updateTarget(this.targetSystem).subscribe(() => {
        this.subscription.unsubscribe();
        // set temp_storage so that experiments page will reflect the new status of it
        this.temp_storage.setNewValue(this.experiment);
        this.notify.success("Success", "Experiment stopped successfully");
        // switch to regular experiments page
        this.router.navigate(["control/experiments"]);
      }, errorResp2 => {
        this.notify.error("Error", errorResp2.message);
      });
    }, errorResp => {
      this.notify.error("Error", errorResp.message);
    });
  }

  public stepNoChanged(step_no) {
    this.step_no = step_no;
  }

}
