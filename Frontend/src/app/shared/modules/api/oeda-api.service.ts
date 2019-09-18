import {Injectable} from "@angular/core";
import {NotificationsService} from "angular2-notifications";
import {AuthHttp} from "angular2-jwt";
import {Http, Response} from "@angular/http";
import {RESTService} from "../../util/rest-service";
import {LoggerService} from "../helper/logger.service";
import {Observable} from "rxjs/Observable";


@Injectable()
export class OEDAApiService extends RESTService {

  constructor(http: Http, authHttp: AuthHttp, notify: NotificationsService, log: LoggerService) {
    super(http, authHttp, notify, log);
  }

  public loadAllExperiments(): Observable<Experiment[]> {
    return this.doGETPublicRequest("/experiments")
  }

  public loadExperimentById(experiment_id: string): Observable<Experiment> {
    return this.doGETPublicRequest("/experiments/" + experiment_id)
  }

  public loadAllDataPointsOfExperiment(experiment_id: string): Observable<any> {
    return this.doGETPublicRequest("/experiment_results/" + experiment_id)
  }

  public loadAllDataPointsOfRunningExperiment(experiment_id: string, timestamp: string): Observable<any> {
    return this.doGETPublicRequest("/running_experiment_results/" + experiment_id + "/" + timestamp)
  }

  public loadAvailableStepsAndStagesWithExperimentId(experiment_id: string): Observable<any> {
    return this.doGETPublicRequest("/steps/" + experiment_id)
  }

  public getOedaCallback(experiment_id: string): Observable<any> {
    return this.doGETPublicRequest("/running_experiment_results/oeda_callback/" + experiment_id)
  }

  public getQQPlot(experiment_id: string, step_no: any, stage_no: string, distribution: string, scale: string, incoming_data_type_name: string): Observable<any> {
    return this.doGETPublicRequest("/qqPlot/" + experiment_id + "/" + step_no + "/" + stage_no + "/" + distribution + "/" + scale + "/" + incoming_data_type_name);
  }

  public getBoxPlot(experiment_id: string, step_no: any, stage_no: string, scale: string, incoming_data_type_name: string): Observable<any> {
    return this.doGETPublicRequest("/boxPlot/" + experiment_id + "/" + step_no + "/" + stage_no + "/" + scale + "/" + incoming_data_type_name);
  }

  public getConfigFromAPI(): Observable<any> {
    return this.doGETPublicRequestForConfig()
  }

  public saveExperiment(experiment: Experiment): Observable<any> {
    return this.doPOSTPublicRequest("/experiments/" + experiment.id, experiment)
  }

  public updateExperiment(experiment: Experiment): Observable<any> {
    return this.doPUTPublicRequest("/experiments/" + experiment.id, experiment)
  }

  public deleteExperiment(experiment: Experiment): Observable<Target> {
    return this.doGETPublicRequest("/experiments/delete/" + experiment.id)
  }

  public loadAllTargets(): Observable<Target[]> {
    return this.doGETPublicRequest("/targets")
  }

  public loadTargetById(id: string): Observable<Target> {
    return this.doGETPublicRequest("/targets/" + id)
  }

  public saveTarget(target: Target): Observable<Target> {
    return this.doPOSTPublicRequest("/targets/" + target.id, target)
      .map((res: Response) => res.json())
  }

  public deleteTarget(target: Target): Observable<Target> {
    return this.doGETPublicRequest("/targets/delete/" + target.id)
  }

  public updateTarget(target: Target): Observable<any> {
    return this.doPUTPublicRequest("/targets/" + target.id, target)
  }

  public updateUser(user: UserEntity): Observable<any> {
    return this.doPOSTPublicRequest("/user/" + user.name, user);
  }

  public registerUser(user: UserEntity): Observable<any> {
    return this.doPOSTPublicRequest("/auth/register", user);
  }

  public getAnalysis(experiment: Experiment, step_no: any, analysis_name: string): Observable<any> {
    return this.doPOSTPublicRequest("/analysis/" + experiment.id + "/" + step_no + "/" + analysis_name, experiment);
  }

  public getMlrMBOConfig() {
    return this.doGETPublicRequest("/config/mlrMBO")
  }

  // remove for production
  public clear_database(): Observable<any> {
    return this.doGETPublicRequest("/delete");
  }
}

export interface Experiment {
  id: string,
  name: string,
  user: string,
  description: string,
  status: string,
  targetSystemId: string,
  changeableVariables: any,
  executionStrategy: ExecutionStrategy,
  considered_data_types: object[],
  analysis: any
  numberOfSteps: number
}

export interface StageEntity {
  number: string,
  values: object[],
  knobs: any,
  stage_result: number
}

export interface StepEntity {
  step_no: string,
  stages: object[],
  step_name: string
}


export interface Target {
  id: string,
  name: string,
  user: string,
  status: string,
  description: string,
  dataProviders: any, // generic one
  primaryDataProvider: any,
  secondaryDataProviders: any,
  changeProvider: any,
  incomingDataTypes: any,
  changeableVariables: any,
  defaultVariables: any
}

export interface ExecutionStrategy {
  type: string,
  sample_size: number,
  knobs: any,
  stages_count: number,
  optimizer_iterations: number,
  acquisition_method: any
}

export interface OedaCallbackEntity {
  status: string,
  message: string,
  index: number,
  size: number,
  complete: number,
  experiment_counter: number,
  total_experiments: number,
  stage_counter: number,
  current_knob: any,
  remaining_time_and_stages: any
  step_no: number,
  step_name: string
}

export interface Configuration {
  host: string,
  port: number,
  type: string
}

export interface UserEntity {
  name: string,
  password: string,
  db_configuration: Map<string, string>
}
