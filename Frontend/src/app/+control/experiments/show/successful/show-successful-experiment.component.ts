import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { NotificationsService } from "angular2-notifications";
import { LayoutService } from "../../../../shared/modules/helper/layout.service";
import { PlotService } from "../../../../shared/util/plot-service";
import { EntityService } from "../../../../shared/util/entity-service";
import {
  Experiment,
  Target,
  OEDAApiService,
  StageEntity,
} from "../../../../shared/modules/api/oeda-api.service";
import { AmChartsService, AmChart } from "@amcharts/amcharts3-angular";
import { isNullOrUndefined } from "util";

@Component({
  selector: "show-successful-experiment",
  templateUrl: "./show-successful-experiment.component.html",
})
export class ShowSuccessfulExperimentComponent implements OnInit {
  private scatter_plot: AmChart;
  private histogram: AmChart;
  private first_render_of_page: boolean;
  private all_data: StageEntity[];
  private decimal_places: number;

  public stage_details: string;

  public dataAvailable: boolean;
  public is_collapsed: boolean;
  public incoming_data_type: object;
  public experiment_id: string;
  public experiment: Experiment;
  public targetSystem: Target;

  public initial_threshold_for_scatter_chart: number;
  public retrieved_data_length: number; // number of data points retrieved so far
  public available_distributions: object;
  public distribution: string;
  public scale: string;
  public is_qq_plot_rendered: boolean;
  public is_box_plot_rendered: boolean;
  public is_enough_data_for_plots: boolean;
  public is_all_stages_selected: boolean;
  public available_steps = [];
  public selected_stage: any;
  public step_no: any;
  public totalNumberOfStagesForBO: number;

  constructor(
    private layout: LayoutService,
    private apiService: OEDAApiService,
    private plotService: PlotService,
    private entityService: EntityService,
    private AmCharts: AmChartsService,
    private activated_route: ActivatedRoute,
    private router: Router,
    private notify: NotificationsService
  ) {
    this.decimal_places = 4;

    this.scale = "Normal";
    this.stage_details = "All Stages";

    this.distribution = "Norm";
    this.available_distributions = [
      "Norm",
      "Gamma",
      "Logistic",
      "T",
      "Uniform",
      "Lognorm",
      "Loggamma",
    ];
    this.step_no = 1; // initially-selected step is ANOVA - step 1
    // set initial values (step selection also uses same approach)
    this.setValues();

    // subscribe to router event
    this.activated_route.params.subscribe((params: Params) => {
      // id is retrieved from URI
      if (
        params["id"] &&
        this.router.url.toString().includes("/control/experiments/show")
      ) {
        this.experiment_id = params["id"];
      }

      // distinguish between successful and interrupted
      if (this.router.url.toString().includes("interrupted")) {
        this.layout.setHeader("Interrupted Experiment Results", "");
      } else if (this.router.url.toString().includes("success")) {
        this.layout.setHeader("Successful Experiment Results", "");
      } else {
        this.layout.setHeader("Experiment Results", "");
      }
    });
  }
  /* tslint:disable */

  ngOnInit() {
    if (!isNullOrUndefined(this.experiment_id)) {
      this.apiService
        .loadExperimentById(this.experiment_id)
        .subscribe((experiment) => {
          if (!isNullOrUndefined(experiment)) {
            // check for redirect type in experiment
            // then this.experiment should be the redirect experiment
            this.experiment = experiment;
            // retrieve target system definition
            this.apiService
              .loadTargetById(experiment.targetSystemId)
              .subscribe((targetSystem) => {
                if (!isNullOrUndefined(targetSystem)) {
                  this.targetSystem = targetSystem;
                  if (
                    !isNullOrUndefined(this.experiment.equal_experiment_id) &&
                    this.experiment.equal_experiment_id != ""
                  ) {
                    // check if the equal experiment is still saved in the database
                    this.apiService
                      .loadExperimentById(this.experiment.equal_experiment_id)
                      .subscribe((equal_experiment) => {
                        if (!isNullOrUndefined(equal_experiment)) {
                          // if the old equal experiment exists, reroute to its details page
                          this.notify.success(
                            "Success",
                            "You have been redirected to an equal experiment, which already has been created"
                          );
                          this.router.navigate([
                            "control/experiments/show/" +
                              equal_experiment.id +
                              "/success",
                          ]);
                          this.experiment = equal_experiment;
                          // prepare steps & stages, fetch data, create plots
                          this.prepareStages();
                        } else {
                          this.notify.error(
                            "Error",
                            "Failed retrieving equal experiment, it got deleted please recreate your experiment"
                          );
                        }
                      });
                  } else {
                    // prepare steps & stages, fetch data, create plots
                    this.prepareStages();
                  }
                }
              });
          } else {
            this.notify.error(
              "Error",
              "Cannot retrieve details of selected experiment, make sure DB is up and running"
            );
          }
        });
    } else {
      this.notify.error(
        "Error",
        "Failed retrieving experiment id, please check URI"
      );
    }
  }

  /** uses stage_object (that can be either one stage or all_stage) and PlotService to draw plots accordingly */
  private draw_all_plots(stage_object) {
    const ctrl = this;

    // do the plotting only for simulations of type sumo
    if (this.targetSystem.simulationType != "sumo") {
      return;
    }

    if (stage_object !== undefined && stage_object.length !== 0) {
      ctrl.selectDistributionAndDrawQQPlot(ctrl.distribution);
      ctrl.selectDistributionAndDrawBoxPlot();
      // draw graphs for all_data
      if (ctrl.selected_stage.number === -1) {
        try {
          let processedData = ctrl.entityService.process_all_stage_data(
            stage_object,
            "timestamp",
            "value",
            ctrl.scale,
            ctrl.incoming_data_type["name"]
          );
          if (!isNullOrUndefined(processedData)) {
            // https://stackoverflow.com/questions/597588/how-do-you-clone-an-array-of-objects-in-javascript
            const clonedData = JSON.parse(JSON.stringify(processedData));
            ctrl.initial_threshold_for_scatter_chart = ctrl.plotService.calculate_threshold_for_given_percentile(
              clonedData,
              95,
              "value",
              ctrl.decimal_places
            );
            ctrl.stage_details = "All Stages";
            ctrl.scatter_plot = ctrl.plotService.draw_scatter_plot(
              "chartdiv",
              "filterSummary",
              processedData,
              ctrl.incoming_data_type["name"],
              ctrl.initial_threshold_for_scatter_chart,
              "All Stages",
              ctrl.decimal_places
            );
            ctrl.histogram = ctrl.plotService.draw_histogram(
              "histogram",
              processedData,
              ctrl.incoming_data_type["name"],
              "All Stages",
              ctrl.decimal_places
            );
            ctrl.is_enough_data_for_plots = true;
          } else {
            ctrl.notify.error(
              "Error",
              "Selected scale might not be appropriate for the selected output parameter"
            );
            return;
          }
        } catch (err) {
          ctrl.is_enough_data_for_plots = false;
          ctrl.notify.error("Error", err.message);
          return;
        }
      }
      // draw graphs for selected stage data
      else {
        try {
          let processedData = ctrl.entityService.process_single_stage_data(
            stage_object,
            "timestamp",
            "value",
            ctrl.scale,
            ctrl.incoming_data_type["name"]
          );
          if (!isNullOrUndefined(processedData)) {
            const clonedData = JSON.parse(JSON.stringify(processedData));
            ctrl.initial_threshold_for_scatter_chart = ctrl.plotService.calculate_threshold_for_given_percentile(
              clonedData,
              95,
              "value",
              ctrl.decimal_places
            );
            ctrl.stage_details = ctrl.entityService.get_stage_details(
              ctrl.selected_stage
            );
            ctrl.scatter_plot = ctrl.plotService.draw_scatter_plot(
              "chartdiv",
              "filterSummary",
              processedData,
              ctrl.incoming_data_type["name"],
              ctrl.initial_threshold_for_scatter_chart,
              ctrl.stage_details,
              ctrl.decimal_places
            );
            ctrl.histogram = ctrl.plotService.draw_histogram(
              "histogram",
              processedData,
              ctrl.incoming_data_type["name"],
              ctrl.stage_details,
              ctrl.decimal_places
            );
            ctrl.is_enough_data_for_plots = true;
          }
        } catch (err) {
          ctrl.is_enough_data_for_plots = false;
          ctrl.notify.error("Error", err.message);
          return;
        }
      }
    }
  }

  /** called when theoretical distribution in QQ Plot's dropdown is changed */
  public selectDistributionAndDrawQQPlot(distName) {
    this.distribution = distName;
    this.plotService
      .retrieve_qq_plot_image(
        this.experiment_id,
        this.step_no,
        this.selected_stage,
        this.distribution,
        this.scale,
        this.incoming_data_type["name"]
      )
      .subscribe(
        (response) => {
          const imageSrc = "data:image/jpg;base64," + response;
          document.getElementById("qqPlot").setAttribute("src", imageSrc);
          this.is_qq_plot_rendered = true;
        },
        (err) => {
          this.notify.error("Error", err.message);
        }
      );
  }

  /** called when theoretical distribution in QQ Plot's dropdown is changed */
  public selectDistributionAndDrawBoxPlot() {
    this.plotService
      .retrieve_box_plot_image(
        this.experiment_id,
        this.step_no,
        this.selected_stage,
        this.scale,
        this.incoming_data_type["name"]
      )
      .subscribe(
        (response) => {
          const imageSrc = "data:image/jpg;base64," + response;
          document.getElementById("boxPlot").setAttribute("src", imageSrc);
          this.is_box_plot_rendered = true;
        },
        (err) => {
          this.notify.error("Error", err.message);
        }
      );
  }

  /** called when stage dropdown (All Stages, Stage 1 [...], Stage 2 [...], ...) in main page is changed
   *  if stage name is sth like 'final_1' or 'final_2' etc. then it represents the best result of whole process
   *  if such stage is selected, then we first find respective stage number and manually assign the selected_stage */
  public stage_changed(selected_stage) {
    const ctrl = this;
    if (selected_stage !== null) {
      // find same stage from available ones for bayesian steps
      // there is no step with number "best" for anova & t-test
      if (typeof selected_stage.number == "string") {
        if (selected_stage.number.includes("best")) {
          selected_stage = this.available_steps[this.step_no].find(
            (x) => x.stage_result == selected_stage.stage_result
          );
          ctrl.notify.success(
            "",
            "You selected best configuration (Stage " +
              selected_stage.number +
              ") of this step"
          );
        }
      }
      ctrl.selected_stage = selected_stage;
    }

    if (!isNullOrUndefined(this.incoming_data_type)) {
      if (
        this.entityService.scale_allowed(
          this.scale,
          this.incoming_data_type["scale"]
        )
      ) {
        if (!isNullOrUndefined(ctrl.selected_stage.number)) {
          if (ctrl.selected_stage.number === -1) {
            if (!isNullOrUndefined(ctrl.all_data)) {
              // redraw plots with all data that was previously retrieved
              ctrl.draw_all_plots(ctrl.all_data);
            } else {
              // fetch data from server again and draw plots
              ctrl.fetch_data();
            }
          } else {
            /*
              Draw plots for the selected stage by retrieving it from local storage
            */
            const stage_data = ctrl.entityService.get_data_from_local_structure(
              ctrl.all_data,
              ctrl.selected_stage.number
            );
            if (!isNullOrUndefined(stage_data)) {
              ctrl.draw_all_plots(stage_data);
            } else {
              ctrl.notify.error("", "Please select another stage");
              return;
            }
          }
        } else {
          ctrl.notify.error(
            "Error",
            "Stage number is null or undefined, please try again"
          );
          return;
        }
      } else {
        // inform user and remove graphs from page for now
        this.is_enough_data_for_plots = false;
        this.notify.error(
          this.scale +
            " scale cannot be applied to " +
            this.incoming_data_type["name"]
        );
      }
    } else {
      this.notify.error("Please select an output parameter");
    }
  }

  /** called when incoming data type of the target system is changed
   * for_initial_processing flag is true when we determine the candidate data type by looking at the payload retrieved
   * use-case: */
  public incoming_data_type_changed(incoming_data_type_name) {
    this.incoming_data_type = this.targetSystem.incomingDataTypes.find(
      (x) => x.name == incoming_data_type_name
    );
    if (
      this.entityService.scale_allowed(
        this.scale,
        this.incoming_data_type["scale"]
      )
    ) {
      // trigger plot drawing process via stage_changed function
      this.stage_changed(null);
    } else {
      // inform user and remove graphs from page for now
      this.is_enough_data_for_plots = false;
      this.notify.error(
        this.scale +
          " scale cannot be applied to " +
          this.incoming_data_type["name"]
      );
    }
  }

  /** called when scale dropdown (Normal, Log) in main page is changed */
  public scale_changed(scale) {
    this.scale = scale;
    if (
      this.entityService.scale_allowed(
        this.scale,
        this.incoming_data_type["scale"]
      )
    ) {
      // trigger plot drawing process via stage_changed function
      this.stage_changed(null);
    } else {
      // inform user and remove graphs from page for now
      this.is_enough_data_for_plots = false;
      this.notify.error(
        this.scale +
          " scale cannot be applied to " +
          this.incoming_data_type["name"]
      );
    }
  }

  private setValues(): void {
    this.dataAvailable = false;
    this.is_all_stages_selected = false;
    this.is_qq_plot_rendered = false;
    this.is_box_plot_rendered = false;
    this.is_enough_data_for_plots = false;
    this.is_collapsed = true;
    this.first_render_of_page = true;
    this.incoming_data_type = null;
    this.all_data = [];
    this.retrieved_data_length = 0;
    this.totalNumberOfStagesForBO = 0;
    this.selected_stage = {};
    this.dataAvailable = false;
  }

  public stepNoChanged(step_no) {
    this.step_no = step_no;
    // refresh tuples and prepare plotting phase
    this.prepareStages();
  }

  private prepareStages() {
    this.setValues();
    // initially selected stage is "All Stages"
    this.selected_stage = { number: -1, knobs: {} };
    this.selected_stage.knobs = this.entityService.populate_knob_objects_with_variables(
      this.selected_stage.knobs,
      this.targetSystem.defaultVariables,
      true
    );

    this.apiService
      .loadAvailableStepsAndStagesWithExperimentId(this.experiment_id)
      .subscribe((steps) => {
        if (!isNullOrUndefined(steps)) {
          // console.log("retrieved steps", steps);
          for (let step_no in steps) {
            if (steps.hasOwnProperty(step_no)) {
              let new_stages = [];
              // push initially selected stage to top of each step
              new_stages.push(this.selected_stage);

              // iterate actual stage tuples to merge
              for (let stage of steps[step_no]) {
                // round knob values of stages to provided decimal places
                if (!isNullOrUndefined(stage["knobs"])) {
                  stage["knobs"] = this.entityService.round_values(
                    stage["knobs"],
                    this.decimal_places
                  );
                  stage[
                    "knobs"
                  ] = this.entityService.populate_knob_objects_with_variables(
                    stage["knobs"],
                    this.targetSystem.defaultVariables,
                    false
                  );
                  if (!isNullOrUndefined(stage["stage_result"])) {
                    stage["stage_result"] = Number(
                      stage["stage_result"].toFixed(this.decimal_places)
                    );
                  }
                }

                // calculate total number of stages for bayesian opt.
                if (
                  stage["number"] !== "best" &&
                  Number(step_no) != 1 &&
                  Number(step_no) != this.experiment.numberOfSteps
                ) {
                  this.totalNumberOfStagesForBO += 1;
                }
                new_stages.push(stage);
              }
              steps[step_no] = new_stages;

              if (step_no == "1") {
                steps[step_no]["name"] = "ANOVA";
              } else if (step_no == this.experiment.numberOfSteps.toString()) {
                steps[step_no]["name"] = "T-test";
              } else {
                steps[step_no]["name"] =
                  "Bayesian Run - " + (Number(step_no) - 1); // actual bayesian step is 2, but we need to show it as if it's 1
              }
            }
            this.available_steps = steps;
          }
          // stages.sort(this.entityService.sort_by('number', true, parseInt));
          this.dataAvailable = true;
          this.fetch_data();
        }
      });
  }

  /** retrieves all_data from server */
  private fetch_data() {
    const ctrl = this;
    this.apiService
      .loadAllDataPointsOfExperiment(this.experiment_id)
      .subscribe((steps_and_stages) => {
        if (isNullOrUndefined(steps_and_stages)) {
          this.notify.error(
            "Error",
            "Cannot retrieve data from DB, please try again"
          );
          return;
        }
        this.all_data = ctrl.entityService.process_response_for_successful_experiment(
          steps_and_stages,
          this.step_no,
          this.all_data
        );
        for (let stage_data of this.all_data) {
          this.retrieved_data_length += stage_data["values"].length;
        }

        if (this.first_render_of_page) {
          if (this.incoming_data_type == null)
            this.incoming_data_type = this.entityService.get_candidate_data_type(
              this.experiment,
              this.targetSystem,
              this.all_data[0]
            );
          this.first_render_of_page = false;
        }
        this.draw_all_plots(this.all_data);
      });
  }

  /** returns keys of the given map, but not empty ones */
  get_keys(object): Array<string> {
    return this.entityService.get_keys(object);
  }

  downloadExperimentResult(experiment: Experiment, experiment_type: string) {
    this.apiService
      .downloadExperimentResults(experiment, experiment_type)
      .subscribe((presigned_url) => {
        // Use the presigned_url to open a new window tab
        try {
          window.open(presigned_url);
        } catch (error) {
          console.log("Error occurred while openning presigned url : " + error);
        }
      });
  }
}
