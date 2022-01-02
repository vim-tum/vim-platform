import { Injectable } from "@angular/core";
import { NotificationsService } from "angular2-notifications";
import { AuthHttp } from "angular2-jwt";
import { Http, Response } from "@angular/http";
import { RESTService } from "../../util/rest-service";
import { LoggerService } from "../helper/logger.service";
import { Observable } from "rxjs/Observable";
import { DomSanitizer } from "@angular/platform-browser";
import { map } from "rxjs/operators";
import { UserService } from "../auth/user.service";

@Injectable()
export class OEDAApiService extends RESTService {
  constructor(
    http: Http,
    authHttp: AuthHttp,
    notify: NotificationsService,
    log: LoggerService,
    sanitizer: DomSanitizer,
    userService: UserService
  ) {
    super(http, authHttp, notify, log, sanitizer, userService);
  }

  public loadAllExperiments(): Observable<Experiment[]> {
    return this.doGETRequest("/experiments");
  }

  public loadExperimentById(experiment_id: string): Observable<Experiment> {
    return this.doGETRequest("/experiments/" + experiment_id);
  }

  public loadAllDataPointsOfExperiment(experiment_id: string): Observable<any> {
    return this.doGETRequest("/experiment_results/" + experiment_id);
  }

  public loadAllDataPointsOfRunningExperiment(
    experiment_id: string,
    timestamp: string
  ): Observable<any> {
    return this.doGETRequest(
      "/running_experiment_results/" + experiment_id + "/" + timestamp
    );
  }

  public loadAvailableStepsAndStagesWithExperimentId(
    experiment_id: string
  ): Observable<any> {
    return this.doGETRequest("/steps/" + experiment_id);
  }

  public getOedaCallback(experiment_id: string): Observable<any> {
    return this.doGETRequest(
      "/running_experiment_results/oeda_callback/" + experiment_id
    );
  }

  public getQQPlot(
    experiment_id: string,
    step_no: any,
    stage_no: string,
    distribution: string,
    scale: string,
    incoming_data_type_name: string
  ): Observable<any> {
    return this.doGETRequest(
      "/qqPlot/" +
        experiment_id +
        "/" +
        step_no +
        "/" +
        stage_no +
        "/" +
        distribution +
        "/" +
        scale +
        "/" +
        incoming_data_type_name
    );
  }

  public getBoxPlot(
    experiment_id: string,
    step_no: any,
    stage_no: string,
    scale: string,
    incoming_data_type_name: string
  ): Observable<any> {
    return this.doGETRequest(
      "/boxPlot/" +
        experiment_id +
        "/" +
        step_no +
        "/" +
        stage_no +
        "/" +
        scale +
        "/" +
        incoming_data_type_name
    );
  }

  public getConfigFromAPI(): Observable<any> {
    return this.doGETRequestForConfig();
  }

  public saveExperiment(experiment: Experiment): Observable<any> {
    return this.doPOSTRequest("/experiments/" + experiment.id, experiment);
  }

  public updateExperiment(experiment: Experiment): Observable<any> {
    return this.doPUTRequest("/experiments/" + experiment.id, experiment);
  }

  public deleteExperiment(experiment: Experiment): Observable<Target> {
    return this.doGETRequest("/experiments/delete/" + experiment.id);
  }

  public deleteExperimentsOlderThen(time_in_days: Number): Observable<Target> {
    return this.doGETRequest("/delete/experiments/" + time_in_days);
  }

  public downloadExperimentResults(
    experiment: Experiment,
    experiment_type: string
  ): Observable<any> {
    return this.doGETRequest(
      "/experiments/download/" + experiment_type + "/" + experiment.id
    );
  }

  public getResourceFileLink(
    resourceType: string,
    resourceName: string
  ): Observable<any> {
    return this.doGETRequest(
      `/resources/download/${resourceType}/${resourceName}`
    );
  }

  public getResourceFile(
    path_in_bucket: string,
    file_name: string,
    file_size: Number
  ): Observable<any> {
    return this.doGETRequest(
      "/file/get/" + path_in_bucket + "/" + file_name + "/" + file_size
    );
  }

  public getResourceFiles(path_in_bucket: string): Observable<any> {
    return this.doGETRequest("/file/list/" + path_in_bucket);
  }

  public getResourceFileDescription(
    path_in_bucket: string,
    file_name: string
  ): Observable<any> {
    return this.doGETRequest("/file/get/" + path_in_bucket + "/" + file_name);
  }

  public postResourceFile(
    path_in_bucket: string,
    file_name: string,
    file_obj: any
  ): Observable<File> {
    return this.doPOSTS3Request(
      "/file/upload/" + path_in_bucket + "/" + file_name,
      file_obj
    );
  }

  public deleteResourceFile(path_in_bucket: string): Observable<any> {
    return this.doGETRequest("/file/delete/" + path_in_bucket);
  }

  public loadAllTargets(): Observable<Target[]> {
    return this.doGETRequest("/targets");
  }

  public loadTargetById(id: string): Observable<Target> {
    return this.doGETRequest("/targets/" + id);
  }

  public saveTarget(target: Target): Observable<Target> {
    return this.doPOSTRequest("/targets/" + target.id, target);
  }

  public deleteTarget(target: Target): Observable<Target> {
    return this.doGETRequest("/targets/delete/" + target.id);
  }

  public updateTarget(target: Target): Observable<any> {
    return this.doPUTRequest("/targets/" + target.id, target);
  }

  public getUser(username: string): Observable<any> {
    return this.doGETRequest("/user/" + username);
  }

  public updateSystemConfig(user: UserEntity): Observable<any> {
    return this.doPOSTRequest("/system", user);
  }

  public updateUserProfile(user: UserEntity): Observable<any> {
    return this.doPUTRequest("/user/profile/" + user.name, user);
  }

  public deleteUser(user: UserEntity): Observable<any> {
    return this.doDELRequest("/user/" + user.name, user);
  }

  public registerUser(user: UserEntity): Observable<any> {
    return this.doPOSTRequest("/auth/register", user);
  }

  public changePassword(
    username: string,
    oldPassword: string,
    newPassword: string
  ): Observable<any> {
    return this.doPOSTRequest("/profile/changePassword/" + username, {
      oldPassword,
      newPassword,
    });
  }

  public resetPassword(username: string): Observable<any> {
    return this.doPOSTPublicRequest("/auth/resetPassword", { username });
  }

  public saveResetPassword(token: string, password: string): Observable<any> {
    return this.doPUTPublicRequest("/auth/resetPassword", { token, password });
  }

  public getAnalysis(
    experiment: Experiment,
    step_no: any,
    analysis_name: string
  ): Observable<any> {
    return this.doPOSTRequest(
      "/analysis/" + experiment.id + "/" + step_no + "/" + analysis_name,
      experiment
    );
  }

  public getImage(file_access_token: string): Observable<any> {
    return this.doGETRequestBlob("/files/images", file_access_token);
  }

  public getMlrMBOConfig() {
    return this.doGETRequest("/config/mlrMBO");
  }

  public getAuthorization(
    username: string
  ): Observable<{ roles: UserRole[]; permissions: Permission[] }> {
    return this.doGETRequest("/userpermission/" + username).pipe(
      map((authJSON) => {
        const permissions = Array<Permission>();
        for (const permissionJSON of authJSON["permissions"]) {
          permissions.push(Permission.fromJSON(permissionJSON));
        }
        const roles = Array<UserRole>();
        for (const roleJSON of authJSON["roles"]) {
          roles.push(UserRole.fromJSON(roleJSON));
        }
        return { roles, permissions };
      })
    );
  }

  public getRoles(): Observable<any> {
    return this.doGETRequest("/roles").pipe(
      map((data) => {
        const userRoles = Array<UserRole>();
        for (const role of data["roles"]) {
          userRoles.push(UserRole.fromJSON(role));
        }
        const permissions = Array<Permission>();
        for (const permission of data["permissions"]) {
          permissions.push(Permission.fromJSON(permission));
        }
        return { roles: userRoles, permissions: permissions };
      })
    );
  }

  public updateRole(role): Observable<any> {
    return this.doPUTRequest("/roles", role);
  }

  public saveRole(role): Observable<any> {
    return this.doPOSTRequest("/roles", role);
  }

  public deleteRole(role): Observable<any> {
    return this.doDELRequest("/roles", role);
  }

  public getUsers(): Observable<UserEntity[]> {
    return this.doGETRequest("/users");
  }

  public updateUser(username, userRoles: any): Observable<any> {
    return this.doPUTRequest("/user/" + username, userRoles);
  }

  // remove for production
  public clear_database(): Observable<any> {
    return this.doGETRequest("/delete");
  }
}

export interface Experiment {
  id: string;
  name: string;
  user: string;
  description: string;
  status: string;
  targetSystemId: string;
  changeableVariables: any;
  equal_experiment_id: string;
  executionStrategy: ExecutionStrategy;
  considered_data_types: object[];
  consideredAggregateTopics: object[];
  analysis: any;
  numberOfSteps: number;
  simulation: any;
  results_downloadable: boolean;
}

export interface StageEntity {
  number: string;
  values: object[];
  knobs: any;
  stage_result: number;
}

export interface StepEntity {
  step_no: string;
  stages: object[];
  step_name: string;
}

export interface Target {
  id: string;
  name: string;
  user: string;
  status: string;
  description: string;
  type: string;
  dataProviders: any; // generic one
  primaryDataProvider: any;
  secondaryDataProviders: any;
  changeProvider: any;
  incomingDataTypes: any;
  changeableVariables: any;
  defaultVariables: any;
  // for analysis
  parentTargetSystem: string;
  simulationType: string;
}

export interface ExecutionStrategy {
  type: string;
  sample_size: number;
  knobs: any;
  stages_count: number;
  optimizer_iterations: number;
  optimizer_iterations_in_design: number;
  acquisition_method: any;
}

export interface OedaCallbackEntity {
  status: string;
  message: string;
  index: number;
  size: number;
  complete: number;
  experiment_counter: number;
  total_experiments: number;
  stage_counter: number;
  current_knob: any;
  remaining_time_and_stages: any;
  step_no: number;
  step_name: string;
}

export interface Configuration {
  host: string;
  port: number;
  type: string;
}

export class UserRole {
  role_id: number;
  name: string;
  description: string;
  basic: boolean;
  permissions: Array<Permission>;

  constructor() {
    this.name = "";
    this.description = "";
    this.permissions = new Array<Permission>();
    this.basic = false;
  }

  static fromJSON(roleJSON: any): UserRole {
    const userRole = new UserRole();
    userRole.role_id = roleJSON.role_id;
    userRole.name = roleJSON.name;
    userRole.description = roleJSON.description;
    userRole.basic = roleJSON.basic;
    userRole.permissions = new Array<Permission>();
    if (roleJSON.permission) {
      for (const permission of roleJSON.permission) {
        userRole.permissions.push(Permission.fromJSON(permission));
      }
    }

    return userRole;
  }
}

export interface UserEntity {
  name: string;
  password: string;
  db_configuration: Map<string, string>;
  email: string;
  created_at: string;
  roles: Array<UserRole>;
}

/** a permission in the system */
export class Permission {
  /** allows access to the system status page */
  // static FOUND_SYSINFO_READ = new Permission(0, "FOUND_SYSINFO_READ");

  constructor() {}

  id: number;
  name: PermissionName;
  access_all: boolean;

  static fromJSON(permissionJSON: any): Permission {
    const permission = new Permission();
    permission.id = permissionJSON.id;
    for (let i = 0; i < PermissionNameString.NAME.length; ++i) {
      if (PermissionNameString.NAME[i] === permissionJSON.name) {
        permission.name = i;
        break;
      }
    }
    permission.access_all = permissionJSON.access_all;
    return permission;
  }

  static toJSON(
    id,
    permissionName: PermissionName,
    access_all: boolean,
    is_active: boolean
  ) {
    return {
      id: id,
      name: PermissionNameString.NAME[permissionName],
      access_all: access_all,
      is_active: is_active,
    };
  }
}

export enum PermissionName {
  GET_TARGETSYSTEM,
  WRITE_TARGETSYSTEM,
  DEL_TARGETSYSTEM,
  GET_EXPERIMENT,
  WRITE_EXPERIMENT,
  DEL_EXPERIMENT,
  WRITE_DATASTORAGE,
}

// Ugly way to map string to enums, please if update typescript to 2.4 consider to change to in-build enum string type
export class PermissionNameString {
  static NAME = [
    "GET_TARGETSYSTEM",
    "WRITE_TARGETSYSTEM",
    "DEL_TARGETSYSTEM",
    "GET_EXPERIMENT",
    "WRITE_EXPERIMENT",
    "DEL_EXPERIMENT",
    "WRITE_DATASTORAGE",
  ];
}

export class Role {
  static ADMIN = "Admin_Role";
}
